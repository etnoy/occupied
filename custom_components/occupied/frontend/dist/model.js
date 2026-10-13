// Generated from model.ts by pnpm run build. Do not edit.
// Draft operations only. Sampling, validation and identifier migration stay in HA.
export const copy = (value) => structuredClone(value);
export const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const resourceKinds = {
  steps: "step",
  activities: "activity",
  activity_windows: "window",
};
export function get(object, path) {
  let value = object;
  for (const key of path) {
    value = value?.[key];
  }
  // Dynamic JSON paths are the boundary of the advanced editor. Callers supply
  // the expected field type; the backend validates edited values before saving.
  return value;
}
export function set(object, path, value) {
  if (path.length === 0) {
    throw new Error("Cannot set an empty path");
  }
  let parent = object;
  for (const [i, key] of path.slice(0, -1).entries()) {
    parent = parent[key] ??= typeof path[i + 1] === "number" ? [] : {};
  }
  const last = path.at(-1);
  if (value === undefined) {
    delete parent[last];
  } else {
    parent[last] = value;
  }
}
export function resources(program) {
  return (program.routines || []).flatMap((r) => [
    { ...r, kind: "routine" },
    ...["steps", "activities", "activity_windows"].flatMap((k) =>
      (r[k] || []).map((x) => ({
        ...x,
        kind: resourceKinds[k],
        routine: r.id,
      })),
    ),
  ]);
}
export function identifier(program, name) {
  let base = name
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
  if (!/^[a-z]/.test(base)) {
    base = "item_" + base;
  }
  base ||= "item";
  const used = new Set(resources(program).map((x) => x.id));
  let id = base,
    n = 2;
  while (used.has(id)) {
    id = `${base}_${n++}`;
  }
  return id;
}
export function references(program, id) {
  const found = [];
  function visit(value, path) {
    if (!value || typeof value !== "object") {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "data" || key === "weights") {
        continue;
      } // Opaque service payloads are never typed references.
      if ((key === "relative_to" || key === "step") && child === id) {
        found.push([...path, key]);
      } else if (typeof child === "object") {
        visit(child, [...path, Array.isArray(value) ? Number(key) : key]);
      }
    }
  }
  visit(program, []);
  return found;
}
export function removeResource(program, path) {
  const item = get(program, path),
    ids = [item.id];
  if (path[0] === "routines" && path.length === 2) {
    ids.push(
      ...["steps", "activities", "activity_windows"].flatMap((k) =>
        (item[k] || []).map((x) => x.id),
      ),
    );
  }
  const outside = ids
    .flatMap((id) => references(program, id))
    .filter((p) => path.some((k, i) => p[i] !== k));
  if (outside.length > 0) {
    throw new Error(
      `Referenced by ${outside.map((p) => p.join(" → ")).join(", ")}. Remove these references first.`,
    );
  }
  get(program, path.slice(0, -1)).splice(Number(path.at(-1)), 1);
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
    for (const k of ["steps", "activities", "activity_windows"]) {
      for (const child of item[k] || []) {
        const next = identifier(staged, `${child.id}_copy`);
        map.set(child.id, next);
        child.id = next;
      }
    }
    const rewrite = (value) => {
      if (!value || typeof value !== "object") {
        return;
      }
      for (const [k, v] of Object.entries(value)) {
        if (k === "data" || k === "weights") {
          continue;
        }
        if (
          (k === "step" || k === "relative_to") &&
          typeof v === "string" &&
          map.has(v)
        ) {
          value[k] = map.get(v);
        } else if (typeof v === "object") {
          rewrite(v);
        }
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
    for (const s of steps) {
      if (!blocked.has(s.when?.relative_to) || blocked.has(s.id)) {
        continue;
      }
      blocked.add(s.id);
      changed = true;
    }
  }
  return steps.filter((x) => !blocked.has(x.id));
}
