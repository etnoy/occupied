import test from "node:test";
import assert from "node:assert/strict";
import { timelineMarkers } from "@occupied/lib/actions/timeline-markers.js";

void test("marker action restores native chart series when destroyed", () => {
  const previousStyle = Object.getOwnPropertyDescriptor(
    globalThis,
    "getComputedStyle",
  );
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true,
    value: () => ({ getPropertyValue: () => "#123456" }),
  });
  try {
    const nativeSeries = { id: "occupied-step:one", type: "line" };
    const chart = {
      _chartData: [nativeSeries] as { id: string; type?: string }[],
      _generateData() {
        chart._chartData = [nativeSeries];
      },
    };
    const generate = chart._generateData;
    const action = timelineMarkers(chart as unknown as HTMLElement, [
      {
        entity_id: nativeSeries.id,
        name: "One",
        data: [],
        markers: [{ time: 1, description: "One" }],
      },
    ])!;

    assert.equal(chart._chartData[0]?.type, "custom");
    action.destroy();
    assert.deepEqual(chart._chartData, [nativeSeries]);
    assert.equal(chart._generateData, generate);
  } finally {
    if (previousStyle) {
      Object.defineProperty(globalThis, "getComputedStyle", previousStyle);
    } else {
      Reflect.deleteProperty(globalThis, "getComputedStyle");
    }
  }
});
