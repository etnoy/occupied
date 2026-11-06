// Generated from custom_components/occupied/frontend/src/lib/actions/dom.ts by pnpm run build. Do not edit.
// Native HA custom elements expose properties beyond HTMLElement's standard API.
export function properties(node, values) {
  // SAFETY: callers supply the native element's property contract; only those supplied keys are read/written.
  // SAFETY: The queried native HA element owns these documented DOM members; optional extension methods are checked before use.
  const target = node;
  const apply = (next) => {
    for (const key in next) {
      if (target[key] !== next[key]) {
        Reflect.set(target, key, next[key]);
      }
    }
  };
  apply(values);
  return { update: apply };
}
export function reference(node, callback) {
  callback(node);
  return {
    update(next) {
      next(node);
    },
  };
}
export function validity(node, message) {
  node.setCustomValidity(message);
  return {
    update(next) {
      node.setCustomValidity(next);
    },
  };
}
