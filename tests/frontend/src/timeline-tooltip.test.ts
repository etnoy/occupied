import test from "node:test";
import assert from "node:assert/strict";
import { timelineTooltip } from "@occupied/lib/actions/timeline-tooltip.js";

const native = (point: unknown) => point;

void test("native tooltip receives the real overnight end and duration while plotted values stay clipped", () => {
  const start = new Date("2026-10-13T18:00:00Z");
  const midnight = new Date("2026-10-14T00:00:00Z");
  const end = new Date("2026-10-14T00:20:00Z");
  const chart = { _renderTooltip: native };
  const action = timelineTooltip(chart as unknown as HTMLElement, [
    {
      entity_id: "light.a",
      name: "A",
      data: [
        {
          state: "on",
          state_localize: "On",
          last_changed: Number(start),
          end_time: Number(end),
        },
      ],
    },
  ])!;
  const point = { name: "On", value: ["light.a", start, midnight, "On"] };
  const expected = { ...point, value: ["light.a", start, end, "On"] };
  assert.deepEqual(chart._renderTooltip(point), expected);
  assert.deepEqual(chart._renderTooltip([point]), [expected]);
  assert.equal(point.value[2], midnight);
  action.update([]);
  assert.equal(chart._renderTooltip(point), point);
  action.destroy();
  assert.equal(chart._renderTooltip, native);
});

void test("tooltip adapter leaves unsupported native chart versions alone", () => {
  assert.equal(timelineTooltip({} as HTMLElement, []), undefined);
});
