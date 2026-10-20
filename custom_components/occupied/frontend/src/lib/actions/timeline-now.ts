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
export interface NowPosition {
  x: number;
  alignRight: boolean;
}

interface MarkerOptions {
  label: string;
  eventTime?: string | null;
  startTime?: string;
  endTime?: string;
  onNowPosition?: (position: NowPosition | null) => void;
}

export function timelineNow(
  node: HTMLElement,
  options: string | MarkerOptions,
) {
  const chart = node as HTMLElement & {
    _generateData?: () => void;
    _chartData?: TimelineSeries[];
  };
  const generate = chart._generateData;
  if (typeof generate !== "function") {
    return;
  }
  let current = typeof options === "string" ? { label: options } : options;
  const markerId = "occupied-now";
  const eventMarkerId = "occupied-event";
  const refresh = () => {
    const now = Date.now();
    const showNow =
      (current.startTime === undefined ||
        now >= Date.parse(current.startTime)) &&
      (current.endTime === undefined || now < Date.parse(current.endTime));
    if (!showNow) {
      current.onNowPosition?.(null);
    }
    if (!chart._chartData) {
      return;
    }
    const color =
      getComputedStyle(node).getPropertyValue("--primary-text-color").trim() ||
      "#333";
    const eventTime = current.eventTime ? Date.parse(current.eventTime) : NaN;
    const markers = [
      ...(showNow
        ? [
            {
              id: markerId,
              time: now,
              text: current.onNowPosition ? "" : current.label,
              color,
              dashed: true,
            },
          ]
        : []),
      ...(Number.isFinite(eventTime)
        ? [
            {
              id: eventMarkerId,
              time: eventTime,
              text: "",
              color:
                getComputedStyle(node)
                  .getPropertyValue("--info-color")
                  .trim() || "#039be5",
              dashed: false,
            },
          ]
        : []),
    ];
    chart._chartData = [
      ...chart._chartData.filter(
        (series) => series.id !== markerId && series.id !== eventMarkerId,
      ),
      ...markers.map((marker) => ({
        id: marker.id,
        type: "custom",
        silent: true,
        animation: false,
        z: 10,
        tooltip: { show: false },
        encode: { x: 0 },
        data: [[marker.time]],
        renderItem: (params: RenderParameters, api: RenderApi) => {
          const { x, y, width, height } = params.coordSys;
          const position = api.coord([api.value(0), 0])[0]!;
          if (position < x || position > x + width) {
            if (marker.id === markerId) {
              current.onNowPosition?.(null);
            }

            // HA 2026.5 assumes every rendered point has a graphic element
            // while updating chart interactions. Keep clipped markers as an
            // empty group instead of returning ECharts' null render result.
            return { type: "group", children: [] };
          }
          const alignRight = position > x + width - 40;
          if (marker.id === markerId) {
            current.onNowPosition?.({ x: position, alignRight });
          }

          return {
            type: "group",
            children: [
              {
                type: "line",
                shape: { x1: position, x2: position, y1: y, y2: y + height },
                style: {
                  stroke: marker.color,
                  lineWidth: 2,
                  lineDash: marker.dashed ? [4, 3] : [],
                },
              },
              {
                type: "text",
                style: {
                  x: position + (alignRight ? -4 : 4),
                  y: y + 2,
                  text: marker.text,
                  fill: marker.color,
                  fontSize: 12,
                  fontWeight: "bold",
                  align: alignRight ? "right" : "left",
                  verticalAlign: "top",
                },
              },
            ],
          };
        },
      })),
    ];
  };
  chart._generateData = () => {
    generate.call(chart);
    refresh();
  };
  refresh();
  const timer = globalThis.setInterval(refresh, 30_000);

  return {
    update(next: string | MarkerOptions) {
      current = typeof next === "string" ? { label: next } : next;
      refresh();
    },
    destroy() {
      globalThis.clearInterval(timer);
      chart._generateData = generate;
      chart._chartData = chart._chartData?.filter(
        (series) => series.id !== markerId && series.id !== eventMarkerId,
      );
    },
  };
}
