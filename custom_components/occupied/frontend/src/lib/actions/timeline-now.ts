interface RenderParameters {
  coordSys: { x: number; y: number; width: number; height: number };
}

interface RenderApi {
  coord(value: number[]): number[];
  value(index: number): number;
}

interface TimelineSeries {
  id?: string;
  [key: string]: unknown;
}

// Use a native custom series so the marker follows HA's plot, zoom and resize.
// Like the tooltip adapter, leave unsupported native chart versions alone.
export function timelineNow(node: HTMLElement, label: string) {
  const chart = node as HTMLElement & {
    _generateData?: () => void;
    _chartData?: TimelineSeries[];
  };
  const generate = chart._generateData;
  if (typeof generate !== "function") {
    return;
  }
  let text = label;
  const markerId = "occupied-now";
  const refresh = () => {
    if (!chart._chartData) {
      return;
    }
    const color =
      getComputedStyle(node).getPropertyValue("--primary-text-color").trim() ||
      "#333";
    chart._chartData = [
      ...chart._chartData.filter((series) => series.id !== markerId),
      {
        id: markerId,
        type: "custom",
        silent: true,
        animation: false,
        z: 10,
        tooltip: { show: false },
        encode: { x: 0 },
        data: [[Date.now()]],
        renderItem: (params: RenderParameters, api: RenderApi) => {
          const { x, y, width, height } = params.coordSys;
          const position = api.coord([api.value(0), 0])[0]!;
          if (position < x || position > x + width) {
            return null;
          }
          const alignRight = position > x + width - 40;

          return {
            type: "group",
            children: [
              {
                type: "line",
                shape: { x1: position, x2: position, y1: y, y2: y + height },
                style: { stroke: color, lineWidth: 2, lineDash: [4, 3] },
              },
              {
                type: "text",
                style: {
                  x: position + (alignRight ? -4 : 4),
                  y: y + 2,
                  text,
                  fill: color,
                  fontSize: 12,
                  fontWeight: "bold",
                  align: alignRight ? "right" : "left",
                  verticalAlign: "top",
                },
              },
            ],
          };
        },
      },
    ];
  };
  chart._generateData = () => {
    generate.call(chart);
    refresh();
  };
  refresh();
  const timer = globalThis.setInterval(refresh, 30_000);

  return {
    update(next: string) {
      text = next;
      refresh();
    },
    destroy() {
      globalThis.clearInterval(timer);
      chart._generateData = generate;
      chart._chartData = chart._chartData?.filter(
        (series) => series.id !== markerId,
      );
    },
  };
}
