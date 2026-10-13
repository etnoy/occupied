// Generated from dom.ts by pnpm run build. Do not edit.
/**
Bridge object properties and nonstandard events to Home Assistant elements.
*/
export function properties(node, values) {
  const apply = (next) => {
    for (const [key, value] of Object.entries(next)) {
      if (node[key] !== value) {
        node[key] = value;
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
