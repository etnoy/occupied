import { translator } from "@occupied/lib/i18n/translations.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarDayPlan,
  calendarStateHistory,
  previewStateHistory,
  staggerTransitions,
  eventDetails,
} from "@occupied/lib/utils/timeline.js";
import type { Plan, PlannedEvent } from "@occupied/lib/types.js";
import {
  calendarMidnight,
  shiftScheduleDate,
} from "@occupied/lib/utils/time-format.js";

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
  action: string,
  entity = "light.bedroom",
): PlannedEvent => ({
  time: time(hour),
  source_id: `${action}-${hour}`,
  kind: "step",
  action: { action, entities: [entity] },
});
const plan = (events: PlannedEvent[]): Plan => ({
  simulation_date: "2026-10-13",
  timezone: "UTC",
  behavior_hash: "hash",
  start: time(0),
  end: "2026-10-14T00:00:00Z",
  events,
  steps: {},
  issues: [],
});

void test("event details omit stagger metadata while preserving random labels, superseded state, and friendly names", () => {
  const details = eventDetails(
    {
      ...event(18, "light.turn_on"),
      kind: "random_end",
      tick: 2,
      tick_count: 3,
      period_seconds: 120,
      superseded: true,
      action: {
        action: "light.turn_on",
        entities: ["light.a", "light.b"],
        data: { brightness: 100 },
      },
    },
    "Evening",
    "UTC",
    translator(),
    undefined,
    { "light.a": "Kitchen", "light.b": "Hall" },
  );
  assert.equal(details.source, "Evening · Random end");
  assert.equal(details.action, "On · Superseded");
  assert.equal(details.actionState, "on");
  assert.equal(details.targets, "Kitchen, Hall");
  assert.equal(details.time, "18:00:00");
  const simple = eventDetails(
    event(18, "light.turn_off"),
    "Bedtime",
    "UTC",
    translator(),
  );
  assert.equal(simple.source, "Bedtime · step");
  assert.equal(simple.action, "Off");
  assert.equal(simple.actionState, "off");
  assert.equal(simple.targets, "light.bedroom");
});
void test("event details localize time and common actions while preserving custom services", () => {
  for (const [service, expected] of [
    ["switch.turn_on", "On"],
    ["homeassistant.turn_off", "Off"],
    ["scene.turn_on", "Activate scene"],
    ["cover.open_cover", "Open cover"],
    ["notify.send_message", "notify.send_message"],
  ]) {
    const details = eventDetails(
      event(18, service),
      "Evening",
      "Europe/Stockholm",
      translator(),
      { language: "en", time_format: "12" },
    );
    assert.equal(details.action, expected);
    const states: Record<string, string> = {
      "switch.turn_on": "on",
      "homeassistant.turn_off": "off",
    };
    assert.equal(details.actionState, states[service]);
    assert.equal(details.time, "8:00:00 PM");
  }
  const cover = eventDetails(
    {
      ...event(18, "cover.set_cover_position", "cover.blinds"),
      action: {
        action: "cover.set_cover_position",
        entities: ["cover.blinds"],
        data: { position: 45 },
      },
    },
    "Blinds",
    "UTC",
    translator(),
  );
  assert.equal(cover.action, "Set cover position · 45%");
});

void test("lights and switches start off until the first typed action", () => {
  const histories = previewStateHistory(
    plan([
      event(18, "light.turn_on"),
      event(19, "light.turn_off"),
      event(18, "switch.turn_on", "switch.outlet"),
    ]),
    {},
    { "light.bedroom": "Bedroom" },
  );
  assert.equal(histories[0].name, "Bedroom");
  assert.deepEqual(
    histories[0].data.map((s) => [s.state, s.last_changed]),
    [
      ["off", Date.parse(time(0))],
      ["on", Date.parse(time(18))],
      ["off", Date.parse(time(19))],
    ],
  );
  assert.equal(histories[0].data[0].state_localize, "Off");
  assert.equal(histories[1].data[0].state, "off");
  assert.equal(histories[1].data[0].state_localize, "Off");
});
void test("opaque explicit target becomes unknown, and scene effects stay opaque", () => {
  const histories = previewStateHistory(
    plan([
      event(18, "light.turn_on"),
      event(19, "script.turn_on"),
      event(20, "scene.turn_on", "scene.evening"),
    ]),
    {},
  );
  assert.deepEqual(
    histories[0].data.map((s) => s.state),
    ["off", "on", "unknown"],
  );
  assert.equal(histories.length, 1);
});
void test("simultaneous events retain planner order", () => {
  const histories = previewStateHistory(
    plan([event(18, "light.turn_on"), event(18, "light.turn_off")]),
    {},
  );
  assert.deepEqual(
    histories[0].data.map((s) => s.state),
    ["off", "off"],
  );
});
void test("overnight chart state continues from yesterday until the after-midnight action", () => {
  const current = {
    ...plan([
      { ...event(0, "light.turn_off"), time: "2026-10-13T00:20:00Z" },
      event(18, "light.turn_on"),
    ]),
    history_events: [
      { ...event(23, "light.turn_on"), time: "2026-10-12T23:30:00Z" },
    ],
  };
  const original = structuredClone(current);
  const day = calendarDayPlan([current], "2026-10-13")!;
  const histories = calendarStateHistory([current], day, {});
  assert.deepEqual(
    histories[0].data.map((s) => [s.state, s.last_changed]),
    [
      ["on", Date.parse(time(0))],
      ["off", Date.parse("2026-10-13T00:20:00Z")],
      ["on", Date.parse(time(18))],
    ],
  );
  assert.equal(day.events.length, 2);
  assert.deepEqual(current, original);
});
void test("prior state remains visible on days without actions and ignores superseded ticks", () => {
  const current = {
    ...plan([]),
    history_events: [
      {
        ...event(18, "switch.turn_on", "switch.outlet"),
        time: "2026-10-12T18:00:00Z",
      },
      {
        ...event(23, "switch.turn_off", "switch.outlet"),
        time: "2026-10-12T23:00:00Z",
        superseded: true,
      },
    ],
  };
  const histories = calendarStateHistory([current], current, {});
  assert.deepEqual(
    histories[0].data.map((s) => [s.state, s.last_changed]),
    [["on", Date.parse(time(0))]],
  );
});
void test("calendar day bounds follow the plan timezone and 23/25 hour DST days", () => {
  for (const [date, next, hours] of [
    ["2026-03-29", "2026-03-30", 23],
    ["2026-10-25", "2026-10-26", 25],
  ] as const) {
    const start = calendarMidnight(date, "Europe/Stockholm");
    const end = calendarMidnight(next, "Europe/Stockholm");
    assert.equal((Date.parse(end) - Date.parse(start)) / 3_600_000, hours);
  }
  assert.equal(
    calendarMidnight("2026-10-13", "Europe/Stockholm"),
    "2026-10-12T22:00:00.000Z",
  );
});

void test("stagger spans retain their full period across calendar slices and skip superseded projection", () => {
  const ticks: PlannedEvent[] = [
    {
      ...event(18, "light.turn_on"),
      time: "2026-10-13T18:00:30Z",
      tick: 1,
      tick_count: 4,
      period_seconds: 120,
      authored_at: time(18),
      occurrence_id: "evening",
      configured_index: 0,
    },
    {
      ...event(18, "light.turn_on"),
      time: "2026-10-13T18:01:00Z",
      tick: 2,
      tick_count: 4,
      period_seconds: 120,
      authored_at: time(18),
      occurrence_id: "evening",
      configured_index: 0,
      superseded: true,
    },
  ];
  const groups = staggerTransitions(plan(ticks.slice(1)));
  assert.equal(groups.length, 1);
  assert.equal(groups[0].start, time(18));
  assert.equal(groups[0].end, "2026-10-13T18:02:00.000Z");
  assert.equal(groups[0].interval, 30);
  assert.equal(groups[0].count, 4);
  const histories = previewStateHistory(
    plan([
      ticks[0],
      { ...event(18, "light.turn_off"), time: "2026-10-13T18:00:45Z" },
      ticks[1],
    ]),
    {},
  );
  assert.deepEqual(
    histories[0].data.map((state) => state.state),
    ["off", "on", "off"],
  );
});

void test("overnight tooltip context uses the first actual state change without extending chart data", () => {
  const current = {
    ...plan([event(18, "light.turn_on")]),
    future_events: [
      {
        ...event(0, "light.turn_off"),
        time: "2026-10-14T00:05:00Z",
        superseded: true,
      },
      { ...event(0, "light.turn_on"), time: "2026-10-14T00:10:00Z" },
      { ...event(0, "light.turn_off"), time: "2026-10-14T00:20:00Z" },
      {
        ...event(1, "light.turn_on", "light.tomorrow_only"),
        time: "2026-10-14T01:00:00Z",
      },
    ],
  };
  const history = calendarStateHistory([current], current, {});
  assert.equal(history.length, 1);
  assert.deepEqual(
    history[0].data.map((s) => s.last_changed),
    [Date.parse(time(0)), Date.parse(time(18))],
  );
  assert.equal(
    history[0].data.at(-1)?.end_time,
    Date.parse("2026-10-14T00:20:00Z"),
  );
  assert.equal(current.end, "2026-10-14T00:00:00Z");
  assert.equal(current.events.length, 1);
});
