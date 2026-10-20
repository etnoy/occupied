import test from "node:test";
import assert from "node:assert/strict";
import { timelineNow } from "@occupied/lib/actions/timeline-now.js";

void test("now marker follows the clock and native regeneration, clips to the visible plot, and cleans up", (context) => {
  context.mock.timers.enable({ apis: ["Date", "setInterval"], now: 1000 });
  const previousStyle = Object.getOwnPropertyDescriptor(
    globalThis,
    "getComputedStyle",
  );
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true,
    value: () => ({ getPropertyValue: () => "#123456" }),
  });
  context.after(() => {
    if (previousStyle) {
      Object.defineProperty(globalThis, "getComputedStyle", previousStyle);
    } else {
      Reflect.deleteProperty(globalThis, "getComputedStyle");
    }
  });

  interface Marker {
    id: string;
    data?: number[][];
    renderItem?: (
      params: {
        coordSys: { x: number; y: number; width: number; height: number };
      },
      api: { coord(value: number[]): number[]; value(index: number): number },
    ) => {
      type: string;
      children: {
        style: { text?: string; stroke?: string; lineDash?: number[] };
      }[];
    };
  }

  const chart = {
    _chartData: [{ id: "light.a" }] as Marker[],
    _generateData() {
      chart._chartData = [{ id: "light.a" }];
    },
  };
  const generate = chart._generateData;
  const action = timelineNow(chart as unknown as HTMLElement, "Now")!;
  assert.equal(chart._chartData.length, 2);
  assert.deepEqual(chart._chartData[1]!.data, [[1000]]);
  context.mock.timers.tick(30_000);
  assert.deepEqual(chart._chartData[1]!.data, [[31_000]]);
  chart._generateData();
  assert.equal(chart._chartData.length, 2);
  action.update("Nu");
  const render = chart._chartData[1]!.renderItem!;
  const params = { coordSys: { x: 100, y: 10, width: 400, height: 90 } };
  const api = { coord: () => [300, 0], value: () => 31_000 };
  assert.equal(render(params, api)?.children[1]?.style.text, "Nu");
  assert.deepEqual(render(params, { ...api, coord: () => [99, 0] }), {
    type: "group",
    children: [],
  });
  assert.deepEqual(render(params, { ...api, coord: () => [501, 0] }), {
    type: "group",
    children: [],
  });
  const positions: ({ x: number; alignRight: boolean } | null)[] = [];
  action.update({
    label: "Now",
    onNowPosition: (position) => {
      positions.push(position);
    },
  });
  const positionedRender = chart._chartData[1]!.renderItem!;
  assert.equal(positionedRender(params, api)?.children[1]?.style.text, "");
  assert.deepEqual(positions.at(-1), { x: 300, alignRight: false });
  positionedRender(params, { ...api, coord: () => [490, 0] });
  assert.deepEqual(positions.at(-1), { x: 490, alignRight: true });
  assert.deepEqual(
    positionedRender(params, { ...api, coord: () => [501, 0] }),
    { type: "group", children: [] },
  );
  assert.equal(positions.at(-1), null);
  const setRange = (start: number, end: number, eventTime?: string) =>
    action.update({
      label: "Now",
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      eventTime,
      onNowPosition: (position) => {
        positions.push(position);
      },
    });
  setRange(0, 86_400_000);
  assert.ok(chart._chartData.some((series) => series.id === "occupied-now"));
  setRange(86_400_000, 172_800_000);
  assert.deepEqual(
    chart._chartData.map((series) => series.id),
    ["light.a"],
  );
  assert.equal(positions.at(-1), null);
  chart._generateData();
  assert.equal(chart._chartData.length, 1);
  setRange(-86_400_000, 0);
  assert.equal(chart._chartData.length, 1);
  setRange(0, 31_000);
  assert.equal(chart._chartData.length, 1);
  setRange(31_000, 40_000);
  assert.equal(chart._chartData.length, 2);
  context.mock.timers.tick(30_000);
  assert.equal(chart._chartData.length, 1);
  assert.equal(positions.at(-1), null);
  setRange(86_400_000, 172_800_000, "1970-01-02T01:00:00Z");
  assert.deepEqual(
    chart._chartData.map((series) => series.id),
    ["light.a", "occupied-event"],
  );
  const hoveredTime = "2026-10-16T18:03:04Z";
  action.update({ label: "Now", eventTime: hoveredTime });
  assert.equal(chart._chartData.length, 3);
  assert.equal(chart._chartData[2]!.id, "occupied-event");
  assert.deepEqual(chart._chartData[2]!.data, [[Date.parse(hoveredTime)]]);
  const hoverRender = chart._chartData[2]!.renderItem!;
  assert.equal(hoverRender(params, api)?.children[0]?.style.stroke, "#123456");
  assert.deepEqual(hoverRender(params, api)?.children[0]?.style.lineDash, []);
  assert.deepEqual(
    hoverRender(params, { ...api, coord: () => [501, 0] }),
    { type: "group", children: [] },
  );
  chart._generateData();
  assert.equal(chart._chartData.length, 3);
  action.update({ label: "Now", eventTime: "2026-10-16T23:00:00Z" });
  assert.deepEqual(chart._chartData[2]!.data, [
    [Date.parse("2026-10-16T23:00:00Z")],
  ]);
  action.update({ label: "Now", eventTime: null });
  assert.equal(chart._chartData.length, 2);
  assert.equal(chart._chartData[1]!.id, "occupied-now");
  action.update({ label: "Now", eventTime: "invalid" });
  assert.equal(chart._chartData.length, 2);
  action.update({ label: "Now", eventTime: hoveredTime });
  action.destroy();
  assert.equal(chart._generateData, generate);
  assert.deepEqual(chart._chartData, [{ id: "light.a" }]);
  context.mock.timers.tick(30_000);
  assert.equal(chart._chartData.length, 1);
});

void test("now adapter leaves unsupported native charts alone", () => {
  assert.equal(timelineNow({} as HTMLElement, "Now"), undefined);
});
