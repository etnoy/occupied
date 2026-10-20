// Generated from custom_components/occupied/frontend/src/lib/actions/history-chart.ts by pnpm run build. Do not edit.
import { properties } from "./dom.js";
// Keep the timeline's series IDs stable while preview data changes. HA 2026.5's
// chart update path does not guard null series returned by ECharts replaceMerge.
export function historyChartProperties(node, values) {
  const known = new Map();
  const retainSeries = (next) => {
    const data = next.data;
    if (!Array.isArray(data)) {
      return next;
    }
    const current = data;
    const ids = new Set(current.map((entity) => entity.entity_id));
    for (const entity of current) {
      known.set(entity.entity_id, entity);
    }
    const removed = [...known.values()]
      .filter((entity) => !ids.has(entity.entity_id))
      .map((entity) => {
        const empty = { ...entity, data: [] };
        if (entity.markers) {
          empty.markers = [];
        } else {
          delete empty.markers;
        }
        return empty;
      });
    return { ...next, data: [...current, ...removed] };
  };
  const binding = properties(node, retainSeries(values));
  return {
    update(next) {
      binding.update(retainSeries(next));
    },
  };
}
