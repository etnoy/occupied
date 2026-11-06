// Representation checks are confined to reusable guards at HA/DOM boundaries.
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

export function isFunction(
  value: unknown,
): value is (...args: never[]) => void {
  return typeof value === "function";
}
