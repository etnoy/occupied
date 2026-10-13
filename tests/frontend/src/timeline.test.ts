import test from "node:test";
import assert from "node:assert/strict";
import { previewStateHistory } from "@occupied/timeline.js";
import type { Plan, PlannedEvent, Program } from "@occupied/types.js";
import { shiftScheduleDate } from "@occupied/time-format.js";

void test("schedule navigation shifts calendar days across DST, leap days, and year boundaries", () => {
  for (const [date, offset, expected] of [
    ["2026-03-29", 1, "2026-03-30"],
    ["2026-10-25", -1, "2026-10-24"],
    ["2024-02-28", 1, "2024-02-29"],
    ["2024-03-01", -1, "2024-02-29"],
    ["2026-12-31", 1, "2027-01-01"],
  ] as const) {
    assert.equal(shiftScheduleDate(date, offset), expected);
  }
});

const time = (hour: number) =>
  `2026-10-13T${String(hour).padStart(2, "0")}:00:00Z`;
const event = (
  hour: number,
  service: string,
  options: Partial<PlannedEvent> = {},
): PlannedEvent => ({
  time: time(hour),
  source_id: `${service}-${hour}`,
  kind: "step",
  action: { action: service, targets: { entities: ["switch.bedroom"] } },
  ...options,
});
const plan = (events: PlannedEvent[]): Plan => ({
  simulation_date: "2026-10-13",
  timezone: "Europe/Stockholm",
  behavior_hash: "revision",
  start: time(0),
  end: "2026-10-14T00:00:00Z",
  events,
  steps: {},
  intervals: [],
  issues: [],
});
const managed: Program = {
  lighting: {
    managed_targets: { entities: ["light.bedroom"] },
    baseline: [{ targets: { entities: ["light.bedroom"] }, state: "off" }],
  },
};
const lightEvent = (
  hour: number,
  service: string,
  options: Partial<PlannedEvent> = {},
) =>
  event(hour, `light.${service}`, {
    ...options,
    action: {
      action: `light.${service}`,
      targets: { entities: ["light.bedroom"] },
    },
  });

void test("on and relative off steps become one named entity strip with exact transitions", () => {
  const history = previewStateHistory(
    plan([event(18, "switch.turn_on"), event(19, "switch.turn_off")]),
    {},
    { "switch.bedroom": "Bedroom" },
  );
  assert.equal(history.length, 1);
  assert.equal(history[0].name, "Bedroom");
  assert.deepEqual(history[0].data, [
    {
      state: "unknown",
      state_localize: "Unknown",
      last_changed: Date.parse(time(0)),
    },
    { state: "on", state_localize: "On", last_changed: Date.parse(time(18)) },
    { state: "off", state_localize: "Off", last_changed: Date.parse(time(19)) },
  ]);
});

void test("entity baselines establish starting states without borrowing current HA state", () => {
  const history = previewStateHistory(
    plan([lightEvent(18, "turn_on")]),
    managed,
  );
  assert.equal(history[0].data[0].state, "off");
  assert.equal(history[0].data.at(-1)?.state, "on");
  const unmanaged = {
    ...managed,
    lighting: { ...managed.lighting, managed_targets: {} },
  };
  assert.equal(
    previewStateHistory(plan([lightEvent(18, "turn_on")]), unmanaged)[0].data[0]
      .state,
    "unknown",
  );
});

void test("overlapping windows keep a light on until the last lease ends", () => {
  const history = previewStateHistory(
    plan([
      lightEvent(8, "turn_on", { kind: "window_start", lease_id: "first" }),
      lightEvent(9, "turn_on", { kind: "window_start", lease_id: "second" }),
      lightEvent(10, "turn_off", { kind: "window_end", lease_id: "first" }),
      lightEvent(11, "turn_off", { kind: "window_end", lease_id: "second" }),
    ]),
    managed,
  );
  assert.deepEqual(
    history[0].data.map((state) => [state.state, state.last_changed]),
    [
      ["off", Date.parse(time(0))],
      ["on", Date.parse(time(8))],
      ["off", Date.parse(time(11))],
    ],
  );
});

void test("routine intents suppress later windows, and safety-off suppresses later on steps", () => {
  const events = [
    event(8, "switch.turn_off"),
    event(9, "switch.turn_on", { kind: "window_start", lease_id: "window" }),
    event(10, "switch.turn_on"),
    event(11, "switch.turn_off", { kind: "window_end", lease_id: "window" }),
    event(12, "switch.turn_off", { priority: 30 }),
    event(13, "switch.turn_on"),
  ];
  assert.deepEqual(
    previewStateHistory(plan(events), {})[0].data.map((state) => [
      state.state,
      state.last_changed,
    ]),
    [
      ["unknown", Date.parse(time(0))],
      ["off", Date.parse(time(8))],
      ["on", Date.parse(time(10))],
      ["off", Date.parse(time(12))],
    ],
  );
});

void test("opaque declared effects become unknown while events do not change device states", () => {
  const events = [
    lightEvent(8, "turn_on"),
    event(9, "script.turn_on", {
      action: {
        action: "script.turn_on",
        targets: { entities: ["script.room"] },
        resources: ["light.bedroom"],
      },
    }),
    event(10, "event.fire", {
      action: { action: "event.fire", targets: { entities: [] } },
    }),
  ];
  const history = previewStateHistory(plan(events), managed);
  assert.equal(history.length, 1);
  assert.equal(history[0].data.at(-1)?.state, "unknown");
  assert.equal(history[0].data.at(-1)?.last_changed, Date.parse(time(9)));
});

void test("day edges and simultaneous ordered actions retain the final intended state", () => {
  const before = {
    ...event(0, "switch.turn_on"),
    time: "2026-10-12T23:00:00Z",
  };
  const after = { ...event(1, "switch.turn_on"), time: "2026-10-14T01:00:00Z" };
  const history = previewStateHistory(
    plan([
      after,
      before,
      event(18, "switch.turn_on"),
      event(18, "switch.turn_off"),
    ]),
    {},
  );
  assert.deepEqual(
    history[0].data.map((state) => [state.state, state.last_changed]),
    [
      ["on", Date.parse(time(0))],
      ["off", Date.parse(time(18))],
    ],
  );
});
