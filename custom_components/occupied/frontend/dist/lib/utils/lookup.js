// Generated from custom_components/occupied/frontend/src/lib/utils/lookup.ts by pnpm run build. Do not edit.
// Read dynamic keys while retaining the finite contract of domain lookup tables.
export function lookup(table, key) {
  // SAFETY: the own-property check restricts indexing to keys present in this table.
  // SAFETY: The proxy forwards property keys to its original typed target without changing their values.
  return Object.hasOwn(table, key) ? table[key] : undefined;
}
