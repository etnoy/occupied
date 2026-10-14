export function properties(node: HTMLElement, values: Record<string, unknown>) {
  const apply = (next: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(next)) {
      if ((node as unknown as Record<string, unknown>)[key] !== value) {
        (node as unknown as Record<string, unknown>)[key] = value;
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
