import type { PreviewHistoryEntity } from "../utils/timeline.js";

interface TooltipPoint {
  value: [string, Date | number, Date | number, ...unknown[]];
}

// HA's native timeline clips its final interval at endTime. Adapt only the
// tooltip arguments so its native date/duration formatting can show the next
// planned transition without changing the rendered interval or chart axis.
export function timelineTooltip(
  node: HTMLElement,
  data: PreviewHistoryEntity[],
) {
  const chart = node as HTMLElement & {
    _renderTooltip?: (point: TooltipPoint | TooltipPoint[]) => unknown;
  };
  const render = chart._renderTooltip;
  if (typeof render !== "function") {
    return;
  }
  let histories = data;
  const adapt = (point: TooltipPoint): TooltipPoint => {
    const [entity, start] = point.value;
    const end = histories
      .find((history) => history.entity_id === entity)
      ?.data.find((state) => state.last_changed === Number(start))?.end_time;

    return end === undefined
      ? point
      : {
          ...point,
          value: [entity, start, new Date(end), ...point.value.slice(3)],
        };
  };
  chart._renderTooltip = (point) =>
    render.call(
      chart,
      Array.isArray(point) ? point.map((item) => adapt(item)) : adapt(point),
    );

  return {
    update(next: PreviewHistoryEntity[]) {
      histories = next;
    },
    destroy() {
      chart._renderTooltip = render;
    },
  };
}
