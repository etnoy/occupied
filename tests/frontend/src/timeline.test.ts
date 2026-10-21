import { translator } from "@occupied/lib/i18n/translations.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarDayPlan,
  calendarStateHistory,
  previewStateHistory,
  previewTimelineData,
  staggerTransitions,
  eventDetails,
  groupPreviewEvents,
  previewNowIndex,
} from "@occupied/lib/utils/timeline.js";
import type { Plan, PlannedEvent, Program } from "@occupied/lib/types.js";
import { shiftScheduleDate } from "@occupied/lib/utils/time-format.js";

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

void test("event-list Now marker separates complete groups and includes the day's edges", () => {
  const day = plan([
    event(5, "light.turn_on"),
    event(5, "scene.turn_on"),
    event(9, "light.turn_off"),
    event(9, "switch.turn_off"),
  ]);
  const groups = groupPreviewEvents(day.events);
  for (const [instant, expected] of [
    [day.start, 0],
    [time(4), 0],
    [time(5), 2],
    [time(8), 2],
    [time(9), 4],
    [time(23), 4],
    [day.end, -1],
    ["2026-10-12T23:59:59Z", -1],
  ] as const) {
    assert.equal(previewNowIndex(day, groups, Date.parse(instant)), expected);
  }
  assert.equal(previewNowIndex(undefined, groups, Date.parse(time(8))), -1);
  assert.equal(previewNowIndex(day, [], Date.parse(time(8))), -1);
});

void test("event-list Now marker uses absolute time across repeated DST hours", () => {
  const day = {
    ...plan([]),
    simulation_date: "2026-10-25",
    timezone: "Europe/Stockholm",
    start: "2026-10-25T00:00:00+02:00",
    end: "2026-10-26T00:00:00+01:00",
  };
  const groups = [
    { event: { time: "2026-10-25T02:30:00+02:00" } },
    { event: { time: "2026-10-25T02:30:00+01:00" } },
  ];
  assert.equal(
    previewNowIndex(day, groups, Date.parse("2026-10-25T02:15:00+01:00")),
    1,
  );
  assert.equal(
    previewNowIndex(day, groups, Date.parse("2026-10-25T23:59:59+01:00")),
    2,
  );
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

void test("preview groups simultaneous actions by source and combines matching on/off targets", () => {
  const first = {
    ...event(7, "light.turn_on", "light.bedroom"),
    source_id: "morning",
  };
  const second = {
    ...first,
    action: { action: "switch.turn_on", entities: ["switch.coffee"] },
  };
  const off = {
    ...first,
    action: { action: "light.turn_off", entities: ["light.hall"] },
  };
  const custom = {
    ...first,
    action: { ...first.action, data: { brightness: 20 } },
  };
  const otherStep = { ...first, source_id: "breakfast" };
  const later = { ...first, time: time(8) };
  const random = { ...first, kind: "random_start" };
  const events = [first, second, off, otherStep, custom, later, random];
  const original = JSON.stringify(events);
  const groups = groupPreviewEvents(events);
  assert.equal(groups.length, 4);
  assert.equal(groups[0]!.event, first);
  assert.equal(groups[0]!.actions.length, 3);
  assert.deepEqual(groups[0]!.actions[0]!.entities, [
    "light.bedroom",
    "switch.coffee",
  ]);
  assert.deepEqual(groups[0]!.actions[0]!.events, [first, second]);
  assert.equal(groups[0]!.actions[1]!.event, off);
  assert.equal(groups[0]!.actions[2]!.event, custom);
  assert.equal(groups[1]!.event, otherStep);
  assert.equal(groups[2]!.event, later);
  assert.equal(groups[3]!.event, random);
  assert.equal(JSON.stringify(events), original);
  assert.deepEqual(groupPreviewEvents([]), []);
});

void test("preview grouping keeps scene actions and superseded calls separate", () => {
  const first = { ...event(18, "light.turn_on"), source_id: "evening" };
  const scene = {
    ...first,
    action: { action: "scene.turn_on", entities: ["scene.evening"] },
  };
  const superseded = { ...first, superseded: true };
  const sameInstant = { ...first, time: "2026-10-13T20:00:00+02:00" };
  const groups = groupPreviewEvents([first, scene, superseded, sameInstant]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.actions.length, 3);
  assert.deepEqual(groups[0]!.actions[0]!.events, [first, sameInstant]);
  assert.deepEqual(groups[0]!.actions[0]!.entities, ["light.bedroom"]);
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
void test("calendar day bounds preserve backend 23/25 hour DST days", () => {
  for (const [date, start, end, hours] of [
    [
      "2026-03-29",
      "2026-03-28T23:00:00+00:00",
      "2026-03-29T22:00:00+00:00",
      23,
    ],
    [
      "2026-10-25",
      "2026-10-24T22:00:00+00:00",
      "2026-10-25T23:00:00+00:00",
      25,
    ],
  ] as const) {
    const current = {
      ...plan([]),
      timezone: "Europe/Stockholm",
      simulation_date: date,
      start,
      end,
    };
    const slice = calendarDayPlan([current], date)!;
    assert.equal(slice.start, start);
    assert.equal(slice.end, end);
    assert.equal(
      (Date.parse(slice.end) - Date.parse(slice.start)) / 3_600_000,
      hours,
    );
  }
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

void test("extra off entities appear as full-day off rows even without scheduled events", () => {
  const program: Program = {
    run_condition: {
      entity_id: "alarm_control_panel.house",
      state: "armed_away",
      off_entities: ["light.bathroom", "switch.fan", "light.bathroom"],
    },
  };
  const empty = plan([]);
  const names = { "light.bathroom": "Bathroom", "switch.fan": "Fan" };
  const original = structuredClone(program);
  for (const history of [
    previewStateHistory(empty, program, names),
    calendarStateHistory([empty], empty, program, names),
  ]) {
    assert.deepEqual(
      history.map((row) => row.name),
      ["Bathroom", "Fan"],
    );
    for (const row of history) {
      assert.deepEqual(row.data, [
        {
          state: "off",
          state_localize: "Off",
          last_changed: Date.parse(empty.start),
        },
      ]);
    }
  }
  assert.deepEqual(program, original);
});

void test("extra entity rows preserve scheduled targets and show unknown for disabled managed targets", () => {
  const program: Program = {
    run_condition: {
      entity_id: "sensor.alarm",
      state: "armed",
      off_entities: ["light.bedroom", "switch.disabled", "light.bathroom"],
    },
    steps: {
      on: { timing: {}, entities: ["light.bedroom"], action: "turn_on" },
      disabled: {
        timing: {},
        enabled: false,
        entities: ["switch.disabled"],
        action: "turn_on",
      },
    },
  };
  const history = previewStateHistory(
    plan([event(18, "light.turn_on"), event(19, "light.turn_off")]),
    program,
  );
  assert.deepEqual(
    history
      .find((row) => row.entity_id === "light.bedroom")
      ?.data.map((state) => state.state),
    ["off", "on", "off"],
  );
  assert.deepEqual(
    history
      .find((row) => row.entity_id === "switch.disabled")
      ?.data.map((state) => state.state),
    ["unknown"],
  );
  assert.deepEqual(
    history
      .find((row) => row.entity_id === "light.bathroom")
      ?.data.map((state) => state.state),
    ["off"],
  );
});

for (const [timezone, date, start, end] of [
  [
    "America/Santiago",
    "2026-09-06",
    "2026-09-06T04:00:00+00:00",
    "2026-09-07T03:00:00+00:00",
  ],
  [
    "America/Havana",
    "2026-03-08",
    "2026-03-08T05:00:00+00:00",
    "2026-03-09T04:00:00+00:00",
  ],
  [
    "Africa/Cairo",
    "2026-04-24",
    "2026-04-23T22:00:00+00:00",
    "2026-04-24T21:00:00+00:00",
  ],
  [
    "Asia/Beirut",
    "2026-03-29",
    "2026-03-28T22:00:00+00:00",
    "2026-03-29T21:00:00+00:00",
  ],
] as const) {
  void test(`calendar slices use backend bounds at a midnight DST gap in ${timezone}`, () => {
    const first = { ...event(0, "light.turn_on"), time: start };
    const prior = {
      ...event(0, "light.turn_off"),
      time: new Date(Date.parse(start) - 1).toISOString(),
    };
    const following = { ...event(0, "light.turn_off"), time: end };
    const current = {
      ...plan([prior, first, following]),
      timezone,
      simulation_date: date,
      start,
      end,
    };
    const slice = calendarDayPlan([current], date)!;
    assert.equal(Date.parse(slice.start), Date.parse(start));
    assert.equal(Date.parse(slice.end), Date.parse(end));
    assert.deepEqual(slice.events, [first]);
    assert.equal(
      (Date.parse(slice.end) - Date.parse(slice.start)) / 3_600_000,
      23,
    );
  });
}

void test("predictable steps and random lights retain state bars alongside scene and targetless service markers", () => {
  const on = {
    ...event(18, "light.turn_on"),
    source_id: "random_light",
    kind: "random_start",
  };
  const off = {
    ...event(19, "light.turn_off"),
    source_id: "random_light",
    kind: "random_end",
  };
  const scene = event(20, "scene.turn_on", "scene.evening");
  const service = {
    ...event(21, "notify.send_message"),
    source_id: "notify",
    action: {
      action: "notify.send_message",
      entities: [],
      data: { message: "<hello>" },
    },
  };
  const current = plan([event(7, "light.turn_on"), on, off, scene, service]);
  const original = structuredClone(current);
  const rows = previewTimelineData(current, {
    steps: { notify: { timing: {}, name: "Evening message" } },
  });
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows[0].data.map((state) => state.state),
    ["off", "on", "off"],
  );
  assert.equal(rows[0].data[1].last_changed, Date.parse(time(7)));
  assert.match(
    rows[1].markers![0].description,
    /scene.turn_on · scene.evening/,
  );
  assert.equal(rows[2].name, "Evening message");
  assert.match(
    rows[2].markers![0].description,
    /notify.send_message · {"message":"<hello>"}/,
  );
  assert.deepEqual(current, original);
});

void test("marker rows group simultaneous actions and keep repeated commands without leaking calendar context", () => {
  const first = {
    ...event(18, "script.turn_on", "script.evening"),
    source_id: "evening",
  };
  const second = {
    ...event(18, "notify.send_message", "notify.phone"),
    source_id: "evening",
  };
  const current = {
    ...plan([
      first,
      second,
      { ...first, time: time(19) },
      { ...first, time: time(20), superseded: true },
      { ...first, time: "2026-10-14T00:00:00Z" },
    ]),
    history_events: [{ ...first, time: "2026-10-12T18:00:00Z" }],
    future_events: [{ ...first, time: "2026-10-14T18:00:00Z" }],
  };
  const rows = previewTimelineData(current, {});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].markers?.length, 2);
  assert.match(
    rows[0].markers![0].description,
    /script.turn_on · script.evening\nnotify.send_message · notify.phone/,
  );
  assert.deepEqual(rows[0].data, []);
});

void test("opaque random actions use markers and random cover targets retain strips", () => {
  const current = plan([
    { ...event(18, "remote.send_command", "remote.tv"), kind: "random_start" },
    { ...event(19, "cover.open_cover", "cover.blinds"), kind: "random_start" },
  ]);
  const rows = previewTimelineData(current, {});
  assert.equal(rows.length, 2);
  assert.equal(rows[0].entity_id, "cover.blinds");
  assert.equal(rows[0].data.at(-1)?.state_localize, "Open");
  assert.equal(rows[1].markers?.length, 1);
});

void test("Harmony service on/off actions render as state bars, including activity data", () => {
  for (const domain of ["homeassistant", "remote"]) {
    const on = {
      ...event(18, `${domain}.turn_on`, "remote.harmony"),
      source_id: "random_3",
      kind: "random_start",
      action: {
        action: `${domain}.turn_on`,
        entities: ["remote.harmony"],
        data: { activity: "TV" },
      },
    };
    const off = {
      ...event(19, `${domain}.turn_off`, "remote.harmony"),
      source_id: "random_3",
      kind: "random_end",
    };
    const current = plan([on, off]);
    const original = structuredClone(current);
    const rows = previewTimelineData(
      current,
      {},
      {
        "remote.harmony": "Harmony Hub",
      },
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].entity_id, "remote.harmony");
    assert.equal(rows[0].name, "Harmony Hub");
    assert.equal(rows[0].markers, undefined);
    assert.deepEqual(
      rows[0].data.map((state) => [state.state, state.last_changed]),
      [
        ["off", Date.parse(time(0))],
        ["on", Date.parse(time(18))],
        ["off", Date.parse(time(19))],
      ],
    );
    assert.deepEqual(current, original);
  }
});

void test("explicit on/off services support other device domains and mixed generic targets", () => {
  const targets = [
    "remote.tv",
    "fan.bedroom",
    "media_player.tv",
    "input_boolean.away",
    "light.hall",
  ];
  for (const generic of [false, true]) {
    const events = [18, 19].flatMap<PlannedEvent>((hour) => {
      const service = hour === 18 ? "turn_on" : "turn_off";

      return generic
        ? {
            ...event(hour, `homeassistant.${service}`),
            action: { action: `homeassistant.${service}`, entities: targets },
          }
        : targets.map((entity) =>
            event(hour, `${entity.split(".", 1)[0]}.${service}`, entity),
          );
    });
    const rows = previewTimelineData(plan(events), {});
    assert.equal(rows.length, targets.length);
    for (const row of rows) {
      assert.equal(row.markers, undefined);
      assert.deepEqual(
        row.data.map((state) => state.state),
        ["off", "on", "off"],
      );
    }
  }
});

void test("scene activation, scripts, targetless calls, and mismatched services stay as markers", () => {
  for (const [service, target] of [
    ["scene.turn_on", "scene.evening"],
    ["homeassistant.turn_on", "scene.evening"],
    ["script.turn_on", "script.evening"],
    ["homeassistant.turn_on", "script.evening"],
    ["remote.turn_on", "fan.bedroom"],
    ["notify.send_message", "notify.phone"],
  ]) {
    const rows = previewTimelineData(plan([event(18, service, target)]), {});
    assert.equal(rows.length, 1);
    assert.equal(rows[0].markers?.length, 1);
    assert.deepEqual(rows[0].data, []);
  }
  const targetless = event(18, "homeassistant.turn_on");
  targetless.action.entities = [];
  assert.equal(
    previewTimelineData(plan([targetless]), {})[0].markers?.length,
    1,
  );
});

void test("opaque remote commands invalidate an on/off projection until the next explicit state", () => {
  const rows = previewTimelineData(
    plan([
      event(18, "remote.turn_on", "remote.harmony"),
      event(19, "remote.toggle", "remote.harmony"),
      event(20, "homeassistant.turn_off", "remote.harmony"),
    ]),
    {},
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows[0].data.map((state) => state.state),
    ["off", "on", "unknown", "off"],
  );
  assert.equal(rows[1].markers?.length, 1);
  assert.match(rows[1].markers![0].description, /remote.toggle/);
});

void test("remote on/off bars retain overnight history and the next day's tooltip boundary", () => {
  const current = {
    ...plan([]),
    history_events: [
      {
        ...event(23, "homeassistant.turn_on", "remote.harmony"),
        time: "2026-10-12T23:30:00Z",
      },
      {
        ...event(23, "remote.turn_off", "remote.harmony"),
        time: "2026-10-12T23:45:00Z",
        superseded: true,
      },
    ],
    future_events: [
      {
        ...event(1, "remote.turn_off", "remote.harmony"),
        time: "2026-10-14T01:00:00Z",
      },
    ],
  };
  const rows = previewTimelineData(current, {});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].markers, undefined);
  assert.deepEqual(rows[0].data, [
    {
      state: "on",
      state_localize: "On",
      last_changed: Date.parse(time(0)),
      end_time: Date.parse("2026-10-14T01:00:00Z"),
    },
  ]);
});
