import { properties } from "./dom.js";
import type { PreviewHistoryEntity } from "../utils/timeline.js";

// Keep the timeline's series IDs stable while preview data changes. HA 2026.5's
// chart update path does not guard null series returned by ECharts replaceMerge.
export function historyChartProperties(
  node: HTMLElement,
  values: Record<string, unknown>,
) {
  const known = new Map<string, PreviewHistoryEntity>();
  let previousInput: PreviewHistoryEntity[] | undefined;
  let previousData: PreviewHistoryEntity[] | undefined;
  const retainSeries = (next: Record<string, unknown>) => {
    const data = next.data;
    if (!Array.isArray(data)) {
      return next;
    }
    const current = data as PreviewHistoryEntity[];
    if (current === previousInput) {
      return { ...next, data: previousData };
    }
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

    previousInput = current;
    previousData = [...current, ...removed];

    return { ...next, data: previousData };
  };
  const binding = properties(node, retainSeries(values));

  return {
    update(next: Record<string, unknown>) {
      binding.update(retainSeries(next));
    },
  };
}
