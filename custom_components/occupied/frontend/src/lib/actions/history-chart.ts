import { properties } from "./dom.js";
import type { PreviewHistoryEntity } from "../utils/timeline.js";

export interface HistoryChartProperties {
  data?: PreviewHistoryEntity[];
  hass?: import("../types.js").HomeAssistant;
  names?: Record<string, string>;
  startTime?: Date;
  endTime?: Date;
  showNames?: boolean;
  narrow?: boolean;
  paddingYAxis?: number;
  clickForMoreInfo?: boolean;
}

// Keep the timeline's series IDs stable while preview data changes. HA 2026.5's
// chart update path does not guard null series returned by ECharts replaceMerge.
export function historyChartProperties(
  node: HTMLElement,
  values: HistoryChartProperties,
) {
  const known = new Map<string, PreviewHistoryEntity>();

  const retainSeries = (next: HistoryChartProperties) => {
    const data = next.data;

    if (!Array.isArray(data)) {
      return next;
    }

    const current = data;
    const ids = new Set(current.map((entity) => entity.entity_id));

    for (const entity of current) {
      known.set(entity.entity_id, entity);
    }

    const removed = [...known.values()].flatMap((entity) => {
      if (ids.has(entity.entity_id)) {
        return [];
      }

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
    update(next: HistoryChartProperties) {
      binding.update(retainSeries(next));
    },
  };
}
