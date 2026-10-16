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
    ) => { children: { style: { text?: string } }[] } | null;
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
  assert.equal(render(params, { ...api, coord: () => [99, 0] }), null);
  assert.equal(render(params, { ...api, coord: () => [501, 0] }), null);
  action.destroy();
  assert.equal(chart._generateData, generate);
  assert.deepEqual(chart._chartData, [{ id: "light.a" }]);
  context.mock.timers.tick(30_000);
  assert.equal(chart._chartData.length, 1);
});

void test("now adapter leaves unsupported native charts alone", () => {
  assert.equal(timelineNow({} as HTMLElement, "Now"), undefined);
});
