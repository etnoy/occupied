import test from "node:test";
import assert from "node:assert/strict";
import { historyChartProperties } from "@occupied/lib/actions/history-chart.js";

void test("history chart keeps removed series present with empty data", () => {
  const chart = {} as HTMLElement & { data?: unknown[] };
  const action = historyChartProperties(chart, {
    data: [
      {
        entity_id: "light.one",
        name: "One",
        data: [{ state: "on", state_localize: "On", last_changed: 1 }],
      },
      {
        entity_id: "occupied-step:one",
        name: "One actions",
        data: [],
        markers: [{ time: 1, description: "One" }],
      },
    ],
  });

  action.update({
    data: [
      {
        entity_id: "occupied-step:one",
        name: "One actions",
        data: [],
        markers: [{ time: 2, description: "One" }],
      },
    ],
  });

  assert.deepEqual(chart.data, [
    {
      entity_id: "occupied-step:one",
      name: "One actions",
      data: [],
      markers: [{ time: 2, description: "One" }],
    },
    {
      entity_id: "light.one",
      name: "One",
      data: [],
    },
  ]);
});

void test("unrelated chart property updates preserve the current data array", () => {
  const chart = {} as HTMLElement & { data?: unknown[]; narrow?: boolean };
  const data = [{ entity_id: "light.one", name: "One", data: [] }];
  const action = historyChartProperties(chart, { data, narrow: false });
  const rendered = chart.data;
  action.update({ data, narrow: true });
  assert.equal(chart.data, rendered);
  assert.equal(chart.narrow, true);

  action.update({ data: [], narrow: true });
  assert.notEqual(chart.data, rendered);
  const cleared = chart.data;
  const empty: typeof data = [];
  action.update({ data: empty, narrow: false });
  const retained = chart.data;
  action.update({ data: empty, narrow: true });
  assert.equal(chart.data, retained);
  assert.deepEqual(chart.data, cleared);
});
