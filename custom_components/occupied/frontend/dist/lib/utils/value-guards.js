// Generated from custom_components/occupied/frontend/src/lib/utils/value-guards.ts by pnpm run build. Do not edit.
// Representation checks are confined to reusable guards at HA/DOM boundaries.
export function isString(value) {
  return typeof value === "string";
}
export function isNumber(value) {
  return typeof value === "number";
}
export function isObject(value) {
  return value !== null && typeof value === "object";
}
export function isFunction(value) {
  return typeof value === "function";
}
