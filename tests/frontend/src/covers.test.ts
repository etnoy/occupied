import test from "node:test";
import assert from "node:assert/strict";
import {
  actionForm,
  actionErrors,
  buildAction,
  buildStep,
  stepEditor,
  stepEntries,
} from "@occupied/lib/models/step-model.js";
import { coverActions, coverTarget } from "@occupied/lib/utils/cover.js";
import {
  randomEditor,
  randomEntries,
  randomErrors,
  buildRandom,
} from "@occupied/lib/models/random-model.js";
import {
  previewStateHistory,
  calendarStateHistory,
} from "@occupied/lib/utils/timeline.js";
import type {
  Action,
  Plan,
  PlannedEvent,
  Program,
} from "@occupied/lib/types.js";
import { randomExplanation } from "@occupied/lib/utils/random-explanation.js";

const cover = (action: string, data?: Action["data"]): Action => ({
  action,
  entities: ["cover.blind"],
  ...(data && { data }),
});

void test("all dedicated cover commands round-trip through the step editor as native services", () => {
  for (const [action] of coverActions) {
    let data: Action["data"];
    if (action === "cover.set_cover_position") {
      data = { position: 0 };
    } else if (action === "cover.set_cover_tilt_position") {
      data = { tilt_position: 100 };
    }
    const source = cover(action, data);
    const p: Program = {
      steps: {
        blind: {
          ...source,
          days: ["mon"],
          timing: { absolute_time: { start: "08:00" } },
        },
      },
    };
    const editor = stepEditor(p, stepEntries(p)[0]);
    assert.equal(editor.form.kind, "cover");
    assert.deepEqual(actionErrors(editor.form), {});
    assert.deepEqual(buildStep(p, editor), p);
    assert.match(stepEntries(p)[0].name, /cover.blind/);
  }
});

void test("cover fields validate targets and integer percentages without requiring JSON", () => {
  const form = actionForm(cover("cover.open_cover"));
  form.service = "cover.set_cover_position";
  form.data = "not JSON";
  for (const value of [
    "",
    " ",
    "-1",
    "101",
    "10.5",
    "NaN",
    "Infinity",
    "true",
  ]) {
    form.position = value;
    assert.ok(actionErrors(form).position, value);
  }
  for (const value of ["0", "60", "100"]) {
    form.position = value;
    assert.deepEqual(actionErrors(form), {});
    assert.deepEqual(
      buildAction(form),
      cover("cover.set_cover_position", { position: Number(value) }),
    );
  }
  form.service = "cover.set_cover_tilt_position";
  assert.ok(actionErrors(form).tiltPosition);
  form.tiltPosition = "25";
  assert.deepEqual(
    buildAction(form),
    cover(form.service, { tilt_position: 25 }),
  );
  form.service = "cover.stop_cover";
  assert.deepEqual(buildAction(form), cover(form.service));
  form.entities = ["light.blind"];
  assert.ok(actionErrors(form).entities);
  form.service = "light.turn_on";
  assert.ok(actionErrors(form).service);
});

void test("unsupported or nonstandard cover payloads stay editable as generic services", () => {
  for (const source of [
    cover("cover.toggle"),
    cover("cover.set_cover_position", { position: "60" }),
    cover("cover.set_cover_position", { position: true }),
    cover("cover.set_cover_position", { position: 101 }),
    cover("cover.set_cover_position", {
      position: 60,
      vendor: { speed: "slow" },
    }),
  ]) {
    const form = actionForm(source);
    assert.equal(form.kind, "service");
    assert.deepEqual(buildAction(form).data, source.data || {});
  }
});

void test("random events share cover targets and preserve independent position/tilt commands", () => {
  const p: Program = {
    random: {
      blinds: {
        days: ["mon"],
        start: { absolute_time: { start: "08:00" } },
        end: { absolute_time: { start: "09:00" } },
        min_duration: "5m",
        max_duration: "15m",
        count: 3,
        on: cover("cover.set_cover_position", { position: 60 }),
        off: cover("cover.set_cover_tilt_position", { tilt_position: 0 }),
      },
    },
  };
  const editor = randomEditor(p, randomEntries(p)[0]);
  assert.equal(editor.form.sameEntities, true);
  assert.deepEqual(randomErrors(p, editor), {});
  assert.deepEqual(buildRandom(p, editor), p);
  const explanation = randomExplanation(editor.form, p, { entities: [] });
  assert.match(explanation, /set the position of cover.blind to 60%/);
  assert.match(explanation, /set the tilt of cover.blind to 0%/);
  editor.form.on.entities = ["cover.other"];
  assert.deepEqual(buildRandom(p, editor).random!.blinds.off.entities, [
    "cover.other",
  ]);
  editor.form.off.tiltPosition = "101";
  assert.ok(randomErrors(p, editor)["off.tiltPosition"]);
  editor.form.sameEntities = false;
  editor.form.off.tiltPosition = "25";
  assert.deepEqual(buildRandom(p, editor).random!.blinds.off.entities, [
    "cover.blind",
  ]);
});

void test("cover projection tracks axes separately and does not guess stopped or opaque positions", () => {
  const tilted = coverTarget(
    cover("cover.set_cover_tilt_position", { tilt_position: 25 }),
  );
  const opened = coverTarget(cover("cover.open_cover"), tilted);
  assert.deepEqual(opened, { position: 100, tilt_position: 25 });
  const stopped = coverTarget(cover("cover.stop_cover"), opened);
  assert.deepEqual(stopped, tilted);
  assert.deepEqual(coverTarget(cover("cover.stop_cover_tilt"), stopped), {});
  assert.deepEqual(coverTarget(cover("script.turn_on"), opened), {});
  assert.deepEqual(
    coverTarget(cover("cover.set_cover_position", { position: false }), opened),
    {},
  );
});

const time = (hour: number) =>
  `2026-10-13T${String(hour).padStart(2, "0")}:00:00Z`;
const event = (hour: number, action: Action, kind = "step"): PlannedEvent => ({
  time: time(hour),
  source_id: "blinds",
  kind,
  action: {
    action: action.action!,
    entities: action.entities as string[],
    data: action.data,
  },
});
const plan = (events: PlannedEvent[]): Plan => ({
  simulation_date: "2026-10-13",
  timezone: "UTC",
  behavior_hash: "hash",
  start: time(0),
  end: "2026-10-14T00:00:00Z",
  steps: {},
  issues: [],
  events,
});

void test("cover preview strips show targets, unknown stops, and random start/end actions", () => {
  const histories = previewStateHistory(
    plan([
      event(
        8,
        cover("cover.set_cover_position", { position: 60 }),
        "random_start",
      ),
      event(9, cover("cover.set_cover_tilt_position", { tilt_position: 25 })),
      event(10, cover("cover.stop_cover")),
      event(11, cover("cover.stop_cover_tilt")),
      event(12, cover("cover.open_cover")),
      event(13, cover("cover.close_cover"), "random_end"),
      event(14, cover("script.turn_on")),
    ]),
    {},
    { "cover.blind": "Blinds" },
  );
  assert.equal(histories[0].name, "Blinds");
  assert.deepEqual(
    histories[0].data.map((value) => value.state_localize),
    [
      "Unknown",
      "Position 60%",
      "Position 60% · Tilt 25%",
      "Tilt 25%",
      "Unknown",
      "Open",
      "Closed",
      "Unknown",
    ],
  );
});

void test("calendar cover projection resets daily and preserves overnight target ordering", () => {
  const previous = {
    ...plan([
      {
        ...event(23, cover("cover.set_cover_position", { position: 80 })),
        time: "2026-10-12T23:00:00Z",
      },
      {
        ...event(
          0,
          cover("cover.set_cover_tilt_position", { tilt_position: 25 }),
        ),
        time: "2026-10-13T00:20:00Z",
      },
    ]),
    simulation_date: "2026-10-12",
  };
  const current = plan([
    event(8, cover("cover.close_cover")),
    event(8, cover("cover.stop_cover")),
  ]);
  const history = calendarStateHistory([previous, current], current, {});
  assert.deepEqual(
    history[0].data.map((value) => value.state_localize),
    ["Unknown", "Tilt 25%", "Tilt 25%"],
  );
});
