// Draft operations only. Sampling, validation and identifier migration stay in HA.
export const copy = (value) => structuredClone(value);
export const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export function get(object, path) {
  return path.reduce((v, k) => v?.[k], object);
}
export function set(object, path, value) {
  let parent = object;
  path.slice(0, -1).forEach((key, i) => {
    parent = parent[key] ??= typeof path[i + 1] === "number" ? [] : {};
  });
  if (value === undefined) delete parent[path.at(-1)];
  else parent[path.at(-1)] = value;
}
export function resources(program) {
  return [
    ...(program.groups || []).map((x) => ({ ...x, kind: "group" })),
    ...(program.routines || []).flatMap((r) => [
      { ...r, kind: "routine" },
      ...["steps", "activities", "activity_windows"].flatMap((k) =>
        (r[k] || []).map((x) => ({
          ...x,
          kind:
            k === "steps" ? "step" : k === "activities" ? "activity" : "window",
          routine: r.id,
        })),
      ),
    ]),
  ];
}
export function identifier(program, name) {
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
export function references(program, id) {
  const found = [];
  function visit(value, path) {
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
export function removeResource(program, path) {
  const item = get(program, path),
    ids = [item.id];
  if (path[0] === "routines" && path.length === 2)
    ids.push(
      ...["steps", "activities", "activity_windows"].flatMap((k) =>
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
  get(program, path.slice(0, -1)).splice(path.at(-1), 1);
}
export function duplicate(program, path) {
  const item = copy(get(program, path)),
    map = new Map();
  item.name += " copy";
  map.set(item.id, identifier(program, item.name));
  item.id = map.get(item.id);
  const staged = copy(program);
  get(staged, path.slice(0, -1)).push(item);
  if (path[0] === "routines" && path.length === 2) {
    for (const k of ["steps", "activities", "activity_windows"])
      for (const child of item[k] || []) {
        const next = identifier(staged, `${child.id}_copy`);
        map.set(child.id, next);
        child.id = next;
      }
    const rewrite = (value) => {
      if (!value || typeof value !== "object") return;
      for (const [k, v] of Object.entries(value)) {
        if (k === "data" || k === "weights") continue;
        if ((k === "step" || k === "relative_to") && map.has(v))
          value[k] = map.get(v);
        else if (typeof v === "object") rewrite(v);
      }
    };
    rewrite(item);
  }
  get(program, path.slice(0, -1)).push(item);
  return item;
}
export function parentSteps(program, child) {
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
export function around(clock, minutes) {
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
  const format = (n) => {
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
export function newItem(program, kind) {
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
