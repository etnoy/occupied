// Generated from custom_components/occupied/frontend/src/lib/actions/timeline-markers.ts by pnpm run build. Do not edit.
// Replace the empty native series for command rows with point symbols. Keeping
// their IDs preserves native row ordering, name measurement, zoom and resize.
export function timelineMarkers(node, data) {
  const chart = node;
  const generate = chart._generateData;
  if (typeof generate !== "function") {
    return;
  }
  let histories = data;
  const refresh = () => {
    const color =
      getComputedStyle(node).getPropertyValue("--primary-color").trim() ||
      "#03a9f4";
    chart._chartData = chart._chartData?.map((series) => {
      const row = histories.find((history) => history.entity_id === series.id);
      if (!row?.markers) {
        return series;
      }
      return {
        id: row.entity_id,
        name: row.name,
        type: "custom",
        progressive: 0,
        z: 5,
        animation: false,
        dimensions: ["id", "time", "description"],
        encode: { x: 1, y: 0 },
        itemStyle: { color },
        renderItem: (params, api) => {
          const [x, y] = api.coord([api.value(1), api.value(0)]);
          const plot = params.coordSys;
          if (
            x < plot.x ||
            x > plot.x + plot.width ||
            y < plot.y ||
            y > plot.y + plot.height
          ) {
            // HA 2026.5 assumes every rendered point has a graphic element
            // while updating chart interactions, so use an empty group for
            // clipped points instead of ECharts' null render result.
            return { type: "group", children: [] };
          }
          return {
            type: "polygon",
            shape: {
              points: [
                [x, y - 7],
                [x + 7, y],
                [x, y + 7],
                [x - 7, y],
              ],
            },
            style: { fill: color },
          };
        },
        data: row.markers.map((marker) => ({
          value: [row.entity_id, marker.time, marker.description],
        })),
        tooltip: {
          formatter: (point) => {
            const content = document.createElement("div");
            content.style.whiteSpace = "pre-wrap";
            content.style.maxWidth = "320px";
            content.style.overflowWrap = "anywhere";
            content.textContent = point.value[2];
            return content;
          },
        },
      };
    });
  };
  chart._generateData = () => {
    if ("isConnected" in node && !node.isConnected) {
      return;
    }
    generate.call(chart);
    refresh();
  };
  refresh();
  return {
    update(next) {
      histories = next;
      refresh();
    },
    destroy() {
      chart._generateData = generate;
    },
  };
}
