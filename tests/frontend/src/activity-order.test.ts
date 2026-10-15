import test from "node:test";
import assert from "node:assert/strict";
import type { HomeAssistant, Program } from "@occupied/lib/types.js";
import {
  chronologicalEntries,
  applyActivityOrder,
  moveActivity,
  readActivityOrder,
  writeActivityOrder,
} from "@occupied/lib/utils/activity-order.js";

const at = (start: string) => ({ absolute_time: { start } });
const entries = (...ids: string[]) => ids.map((id) => ({ id }));
const ids = (values: { id: string }[]) => values.map((value) => value.id);

void test("steps sort by start time, including signed offsets and stable ties", () => {
  const program: Program = {
    steps: {
      evening: { timing: at("19:00") },
      after: {
        timing: { relative_to: { step: "morning", start_offset: "1h" } },
      },
      morning: { timing: at("06:00:30") },
      before: {
        timing: { relative_to: { step: "morning", start_offset: "-30m" } },
      },
      tied: { timing: at("19:00") },
    },
  };
  const original = structuredClone(program);
  assert.deepEqual(
    ids(
      chronologicalEntries(
        entries(...Object.keys(program.steps!)),
        program,
        "steps",
      ),
    ),
    ["before", "morning", "after", "evening", "tied"],
  );
  assert.deepEqual(program, original);
});

void test("solar, entity and capped times use Home Assistant's timezone", () => {
  const program: Program = {
    steps: {
      evening: { timing: at("19:00") },
      sunset: {
        timing: { relative_to: { sun: "sunset", start_offset: "-30m" } },
      },
      capped: {
        timing: { relative_to: { sun: "sunset" }, latest_at: at("17:00") },
      },
      alarm: { timing: { relative_to: { entity: "sensor.alarm" } } },
      calendar: {
        timing: {
          relative_to: { entity: "calendar.work", attribute: "start_time" },
        },
      },
      localCalendar: {
        timing: {
          relative_to: { entity: "calendar.local", attribute: "start_time" },
        },
      },
    },
  };
  const hass: Pick<HomeAssistant, "states" | "config"> = {
    config: { time_zone: "Europe/Stockholm" },
    states: {
      "sun.sun": {
        state: "above_horizon",
        attributes: { next_setting: "2026-06-01T20:00:00Z" },
      },
      "sensor.alarm": { state: "05:30:00", attributes: {} },
      "calendar.work": {
        state: "off",
        attributes: { start_time: "2026-06-01T07:00:00+02:00" },
      },
      "calendar.local": {
        state: "off",
        attributes: { start_time: "2026-06-01 08:00:00" },
      },
    },
  };
  assert.deepEqual(
    ids(
      chronologicalEntries(
        entries(...Object.keys(program.steps!)),
        program,
        "steps",
        hass,
      ),
    ),
    ["alarm", "calendar", "localCalendar", "capped", "evening", "sunset"],
  );
});

void test("unavailable solar sources have a daily fallback; unknowns and cycles sort last", () => {
  const program: Program = {
    steps: {
      unknown: { timing: { relative_to: { entity: "sensor.missing" } } },
      cycle: { timing: { relative_to: { step: "cycle" } } },
      sunset: { timing: { relative_to: { sun: "sunset" } } },
      sunrise: { timing: { relative_to: { sun: "sunrise" } } },
      early: { timing: at("05:00") },
      midnight: {
        timing: { relative_to: { step: "early", start_offset: "-6h" } },
      },
    },
  };
  assert.deepEqual(
    ids(
      chronologicalEntries(
        entries(...Object.keys(program.steps!)),
        program,
        "steps",
      ),
    ),
    ["early", "sunrise", "sunset", "midnight", "unknown", "cycle"],
  );
});

void test("random windows sort by start and resolve dependent duration and overnight ends", () => {
  const program: Program = {
    steps: { dinner: { timing: at("18:00") } },
    random: {
      after: {
        start: { relative_to: { random: "first", start_offset: "30m" } },
        end: at("23:00"),
        on: {},
        off: {},
      },
      first: {
        start: { relative_to: { step: "dinner" } },
        end: { duration: { min: "1h" } },
        on: {},
        off: {},
      },
      overnight: { start: at("23:00"), end: at("01:00"), on: {}, off: {} },
      morning: {
        start: { relative_to: { random: "overnight", start_offset: "5h" } },
        end: at("08:00"),
        on: {},
        off: {},
      },
      cycle: {
        start: { relative_to: { random: "cycle" } },
        end: { duration: { min: "1h" } },
        on: {},
        off: {},
      },
    },
  };
  assert.deepEqual(
    ids(
      chronologicalEntries(
        entries(...Object.keys(program.random!)),
        program,
        "random",
      ),
    ),
    ["morning", "first", "after", "overnight", "cycle"],
  );
});

void test("manual moves preserve chronology for new entries and ignore deleted IDs", () => {
  const chronological = entries("morning", "noon", "evening", "new");
  const order = moveActivity(["morning", "noon", "evening"], "evening", 0);
  assert.deepEqual(order, ["evening", "morning", "noon"]);
  assert.deepEqual(
    ids(applyActivityOrder(chronological, [...order, "deleted"])),
    ["evening", "morning", "noon", "new"],
  );
  assert.deepEqual(
    ids(applyActivityOrder(chronological, null)),
    ids(chronological),
  );
  assert.deepEqual(moveActivity(order, "evening", 99), [
    "morning",
    "noon",
    "evening",
  ]);
  assert.deepEqual(moveActivity(order, "noon", -1), [
    "noon",
    "evening",
    "morning",
  ]);
  assert.deepEqual(moveActivity(order, "missing", 0), order);
});

void test("saved orders are isolated by key, resettable and resilient to corrupt or blocked storage", (context) => {
  const values = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  context.after(() => {
    if (descriptor) {
      Object.defineProperty(globalThis, "localStorage", descriptor);
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      length: 0,
      clear: () => values.clear(),
      key: () => null,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  writeActivityOrder("instance-a:steps", ["b", "a"]);
  assert.deepEqual(readActivityOrder("instance-a:steps"), ["b", "a"]);
  assert.equal(readActivityOrder("instance-a:random"), null);
  assert.equal(readActivityOrder("instance-b:steps"), null);
  writeActivityOrder("instance-a:steps", null);
  assert.equal(readActivityOrder("instance-a:steps"), null);
  values.set("bad", "{broken");
  assert.equal(readActivityOrder("bad"), null);
  values.set("bad", '["a", 2]');
  assert.equal(readActivityOrder("bad"), null);
  context.mock.property(globalThis, "localStorage", {
    length: 0,
    clear: () => {},
    key: () => null,
    removeItem: () => {},
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  });
  assert.equal(readActivityOrder("blocked"), null);
  assert.doesNotThrow(() => writeActivityOrder("blocked", ["a"]));
});
