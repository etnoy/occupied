import { properties } from "./dom.js";

// A queued Lit update can run after Svelte removes the native HA chart. Empty
// its public input before detaching so it never resolves colors without styles.
export function historyChartProperties(
  node: HTMLElement,
  values: Record<string, unknown>,
) {
  const binding = properties(node, values);

  return {
    update: binding.update,
    destroy() {
      Object.assign(node, { data: [] });
    },
  };
}
