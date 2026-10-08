import type {
  Program,
  Path,
  Resource,
  ResourceKind,
  EditableResource,
  ScheduledItem,
  Routine,
  Group,
} from "./types.js";
// Draft operations only. Sampling, validation and identifier migration stay in HA.
export const copy = <T>(value: T): T => structuredClone(value);
export const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export function get<T = unknown>(object: unknown, path: Path): T {
  let value: unknown = object;
  for (const key of path)
    value =
      value == null
        ? undefined
        : (value as Record<string | number, unknown>)[key];
  // Dynamic JSON paths are the boundary of the advanced editor. Callers supply
  // the expected field type; the backend validates edited values before saving.
  return value as T;
}
export function set(object: unknown, path: Path, value: unknown) {
  if (!path.length) throw new Error("Cannot set an empty path");
  let parent = object as Record<string | number, unknown>;
  path.slice(0, -1).forEach((key, i) => {
    parent = (parent[key] ??=
      typeof path[i + 1] === "number" ? [] : {}) as Record<
      string | number,
      unknown
    >;
  });
  const last = path[path.length - 1];
  if (value === undefined) delete parent[last];
  else parent[last] = value;
}

export function resources(program: Program): Resource[] {
  return [
    ...(program.groups || []).map((x) => ({ ...x, kind: "group" as const })),
    ...(program.routines || []).flatMap((r) => [
      { ...r, kind: "routine" as const },
      ...(["steps", "activities", "activity_windows"] as const).flatMap((k) =>
        (r[k] || []).map((x) => ({
          ...x,
          kind:
            k === "steps"
              ? ("step" as const)
              : k === "activities"
                ? ("activity" as const)
                : ("window" as const),
          routine: r.id,
        })),
      ),
    ]),
  ];
}
export function identifier(program: Program, name: string) {
  let base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!/^[a-z]/.test(base)) base = "item_" + base;
  base ||= "item";
  const used = new Set(resources(program).map((x) => x.id));
  let id = base,
    n = 2;
  while (used.has(id)) id = `${base}_${n++}`;
  return id;
}
export function references(program: Program, id: string) {
  const found: Path[] = [];
  function visit(value: unknown, path: Path) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "data" || key === "weights") continue; // Opaque service payloads are never typed references.
      if ((key === "relative_to" || key === "step") && child === id)
        found.push([...path, key]);
      else if (key === "groups" && Array.isArray(child) && child.includes(id))
        found.push([...path, key]);
      else if (typeof child === "object")
        visit(child, [...path, Array.isArray(value) ? Number(key) : key]);
    }
  }
  visit(program, []);
  return found;
}
export function removeResource(program: Program, path: Path) {
  const item = get<EditableResource>(program, path),
    ids = [item.id];
  if (path[0] === "routines" && path.length === 2)
    ids.push(
      ...(["steps", "activities", "activity_windows"] as const).flatMap((k) =>
        (item[k] || []).map((x) => x.id),
      ),
    );
  const outside = ids
    .flatMap((id) => references(program, id))
    .filter((p) => !path.every((k, i) => p[i] === k));
  if (outside.length)
    throw new Error(
      `Referenced by ${outside.map((p) => p.join(" → ")).join(", ")}. Remove these references first.`,
    );
  get<unknown[]>(program, path.slice(0, -1)).splice(Number(path.at(-1)), 1);
}
export function duplicate(program: Program, path: Path): EditableResource {
  const item = copy(get<EditableResource>(program, path)),
    map = new Map<string, string>();
  item.name += " copy";
  map.set(item.id, identifier(program, item.name));
  item.id = map.get(item.id)!;
  const staged = copy(program);
  get<unknown[]>(staged, path.slice(0, -1)).push(item);
  if (path[0] === "routines" && path.length === 2) {
    for (const k of ["steps", "activities", "activity_windows"] as const)
      for (const child of item[k] || []) {
        const next = identifier(staged, `${child.id}_copy`);
        map.set(child.id, next);
        child.id = next;
      }
    const rewrite = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      for (const [k, v] of Object.entries(value)) {
        if (k === "data" || k === "weights") continue;
        if (
          (k === "step" || k === "relative_to") &&
          typeof v === "string" &&
          map.has(v)
        )
          (value as Record<string, unknown>)[k] = map.get(v);
        else if (typeof v === "object") rewrite(v);
      }
    };
    rewrite(item);
  }
  get<unknown[]>(program, path.slice(0, -1)).push(item);
  return item;
}
export function parentSteps(program: Program, child?: string) {
  const steps = resources(program).filter((x) => x.kind === "step");
  const blocked = new Set([child]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const s of steps)
      if (blocked.has(s.when?.relative_to) && !blocked.has(s.id)) {
        blocked.add(s.id);
        changed = true;
      }
  }
  return steps.filter((x) => !blocked.has(x.id));
}
export function around(clock: string, minutes: number) {
  const [h, m, s = 0] = clock.split(":").map(Number),
    center = h * 3600 + m * 60 + s;
  if (
    !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(clock) ||
    !Number.isInteger(center) ||
    !Number.isFinite(minutes) ||
    minutes < 0 ||
    minutes >= 720
  )
    throw new Error("Choose a clock time and a spread below 720 minutes.");
  const format = (n: number) => {
    n = (Math.round(n) + 86400) % 86400;
    const value = `${String(Math.floor(n / 3600)).padStart(2, "0")}:${String(Math.floor(n / 60) % 60).padStart(2, "0")}`;
    return n % 60 ? `${value}:${String(n % 60).padStart(2, "0")}` : value;
  };
  const spread = Math.round(minutes * 60);
  return {
    earliest: format(center - spread),
    latest: format(center + spread),
    cross_midnight: center - spread < 0 || center + spread >= 86400,
  };
}
export function newItem(program: Program, kind: "group"): Group;
export function newItem(
  program: Program,
  kind: "routine",
): Routine & {
  steps: ScheduledItem[];
  activities: ScheduledItem[];
  activity_windows: ScheduledItem[];
};
export function newItem(
  program: Program,
  kind: "step",
): ScheduledItem & { actions: NonNullable<ScheduledItem["actions"]> };
export function newItem(
  program: Program,
  kind: "activity" | "window",
): ScheduledItem;
export function newItem(
  program: Program,
  kind: ResourceKind,
): Group | Routine | ScheduledItem;
export function newItem(
  program: Program,
  kind: ResourceKind,
): Group | Routine | ScheduledItem {
  const name = {
    group: "New group",
    routine: "New routine",
    step: "New step",
    activity: "New activity",
    window: "New window",
  }[kind];
  const item = { id: identifier(program, name), name };
  if (kind === "group") return { ...item, entities: [] };
  if (kind === "routine")
    return {
      ...item,
      days: [...days],
      steps: [],
      activities: [],
      activity_windows: [],
    };
  if (kind === "window")
    return {
      ...item,
      between: { start: { clock: "18:00" }, end: { clock: "22:00" } },
      cycles: { min: 1, max: 3 },
      targets: { groups: [], entities: [] },
    };
  const when = { clock_range: around("20:00", 15) };
  if (kind === "activity")
    return {
      ...item,
      when,
      duration: { fixed: "45m" },
      resources: [],
      on_start: [],
      on_end: [],
      start_conditions: [],
      ownership_conditions: [],
      stop_behavior: "end_if_owned",
    };
  return {
    ...item,
    when,
    actions: [
      {
        action: "turn_on",
        targets: { groups: [], entities: [] },
        data: { brightness_pct: 70 },
      },
    ],
  };
}
