// Generated from custom_components/occupied/frontend/src/lib/actions/history-chart.ts by pnpm run build. Do not edit.
import { properties } from "./dom.js";
// A queued Lit update can run after Svelte removes the native HA chart. Empty
// its public input before detaching so it never resolves colors without styles.
export function historyChartProperties(node, values) {
  const binding = properties(node, values);
  return {
    update: binding.update,
    destroy() {
      Object.assign(node, { data: [] });
    },
  };
}
