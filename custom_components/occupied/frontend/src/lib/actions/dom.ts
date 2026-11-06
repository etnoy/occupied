// Native HA custom elements expose properties beyond HTMLElement's standard API.
export function properties<T extends object>(node: HTMLElement, values: T) {
  // SAFETY: callers supply the native element's property contract; only those supplied keys are read/written.
  // SAFETY: The queried native HA element owns these documented DOM members; optional extension methods are checked before use.
  const target = node as HTMLElement & T;

  const apply = (next: T) => {
    for (const key in next) {
      if (target[key] !== next[key]) {
        Reflect.set(target, key, next[key]);
      }
    }
  };

  apply(values);

  return { update: apply };
}

export function reference(
  node: HTMLElement,
  callback: (node: HTMLElement) => void,
) {
  callback(node);

  return {
    update(next: (node: HTMLElement) => void) {
      next(node);
    },
  };
}

export function validity(node: HTMLInputElement, message: string) {
  node.setCustomValidity(message);

  return {
    update(next: string) {
      node.setCustomValidity(next);
    },
  };
}
