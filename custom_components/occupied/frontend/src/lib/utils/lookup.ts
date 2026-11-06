// Read dynamic keys while retaining the finite contract of domain lookup tables.
export function lookup<T extends object>(
  table: T,
  key: PropertyKey,
): T[keyof T] | undefined {
  // SAFETY: the own-property check restricts indexing to keys present in this table.
  // SAFETY: The proxy forwards property keys to its original typed target without changing their values.
  return Object.hasOwn(table, key) ? table[key as keyof T] : undefined;
}
