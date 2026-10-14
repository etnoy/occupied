// Generated from model.ts by pnpm run build. Do not edit.
export const copy = (value) => structuredClone(value);
export const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
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
export function identifier(program, name, collection = "steps") {
  let base = name
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
  if (!/^[a-z]/.test(base)) {
    base = "item_" + base;
  }
  base ||= "item";
  const used = new Set(Object.keys(program[collection] || {}));
  let id = base,
    n = 2;
  while (used.has(id)) {
    id = `${base}_${n++}`;
  }
  return id;
}
export function references(program, id) {
  const result = Object.entries(program.steps || {})
    .filter(([, step]) => step.timing.relative_to?.step === id)
    .map(([key]) => ["steps", key, "timing", "relative_to", "step"]);
  for (const [key, event] of Object.entries(program.random || {})) {
    for (const edge of ["start", "end"]) {
      if (event[edge].relative_to?.step === id) {
        result.push(["random", key, edge, "relative_to", "step"]);
      }
    }
  }
  return result;
}
export function removeStep(program, path) {
  const id = String(path[1]);
  if (references(program, id).length > 0) {
    throw new Error(
      "Steps or random events depend on this step. Change their timing first.",
    );
  }
  delete program.steps?.[id];
}
export function parentSteps(program, child) {
  const blocked = new Set([child]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, step] of Object.entries(program.steps || {})) {
      if (
        !(
          step.timing.relative_to?.step &&
          blocked.has(step.timing.relative_to.step)
        ) ||
        blocked.has(id)
      ) {
        continue;
      }
      blocked.add(id);
      changed = true;
    }
  }
  return Object.entries(program.steps || {})
    .filter(([id]) => !blocked.has(id))
    .map(([id, step]) => ({ ...step, id, name: step.name || id }));
}
export function parentRandomEvents(program, child) {
  const blocked = new Set([child]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, event] of Object.entries(program.random || {})) {
      const parent = event.start.relative_to?.random;
      if (parent && blocked.has(parent) && !blocked.has(id)) {
        blocked.add(id);
        changed = true;
      }
    }
  }
  return Object.entries(program.random || {})
    .filter(([id]) => !blocked.has(id))
    .map(([id, event]) => ({ ...event, id }));
}
export function randomReferences(program, id) {
  return Object.entries(program.random || {})
    .filter(([, event]) => event.start.relative_to?.random === id)
    .map(([key]) => ["random", key, "start", "relative_to", "random"]);
}
