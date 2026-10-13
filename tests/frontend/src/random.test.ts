import test from "node:test";
import assert from "node:assert/strict";
import type { Program } from "@occupied/types.js";
import {
  randomEditor,
  randomEntries,
  randomErrors,
  buildRandom,
  hasRandomChanges,
} from "@occupied/random-model.js";
import { references, removeStep } from "@occupied/model.js";
import { dependentNames, timeSourceChoices } from "@occupied/step-model.js";

function program(): Program {
  return {
    schema_version: 1,
    name: "House",
    steps: {
      evening: {
        name: "Evening",
        timing: { absolute_time: { start: "18:00", end: "18:30" } },
        action: "turn_on",
        entities: ["light.a"],
      },
    },
  };
}

void test("a first random event uses the selected start entities at both ends", () => {
  const p = program(),
    editor = randomEditor(p);
  editor.form.on.entities = ["switch.b", "light.a", "light.a"];
  const next = buildRandom(p, editor),
    event = next.random![editor.id];
  assert.deepEqual(event.on, {
    action: "turn_on",
    entities: ["light.a", "switch.b"],
  });
  assert.deepEqual(event.off, {
    action: "turn_off",
    entities: ["light.a", "switch.b"],
  });
  assert.equal(event.count, 3);
  assert.equal(event.name, undefined);
  assert.equal(p.random, undefined);
  assert.equal(hasRandomChanges(editor), true);
  assert.equal(randomEntries(next)[0].name, "light.a · Random event");
});

void test("every random field roundtrips including timed step boundaries and distinct scenes", () => {
  const p = program();
  p.random = {
    living: {
      name: "Evening activity",
      enabled: false,
      days: ["mon", "fri"],
      start: {
        relative_to: {
          step: "evening",
          start_offset: "-5m",
          end_offset: "10m",
        },
      },
      end: { relative_to: { sun: "sunset", start_offset: "2h" } },
      min_duration: "30s",
      max_duration: "1h",
      count: 5,
      on: {
        action: "light.turn_on",
        entities: ["light.a"],
        data: { brightness_pct: 60 },
      },
      off: {
        action: "scene.turn_on",
        entities: ["scene.bedtime"],
        data: { transition: 3 },
      },
    },
  };
  const editor = randomEditor(p, randomEntries(p)[0]);
  assert.equal(editor.form.sameEntities, false);
  assert.equal(hasRandomChanges(editor), false);
  assert.deepEqual(buildRandom(p, editor), p);
  editor.form.name = "";
  assert.equal(buildRandom(p, editor).random!.living.name, undefined);
});

void test("random sources include all steps even when a random ID matches a step ID", () => {
  const p = program(),
    editor = randomEditor(p);
  editor.id = "evening";
  editor.form.start.mode = "relative";
  editor.form.start.anchor = "step:evening";
  editor.form.on.entities = ["light.a"];
  assert.deepEqual(randomErrors(p, editor), {});
  assert.ok(
    timeSourceChoices(p).some((source) => source.value === "step:evening"),
  );
  const next = buildRandom(p, editor);
  assert.deepEqual(references(next, "evening"), [
    ["random", "evening", "start", "relative_to", "step"],
  ]);
  assert.deepEqual(dependentNames(next, "evening"), ["evening"]);
  assert.throws(() => removeStep(next, ["steps", "evening"]));
});

void test("duration, count, and both actions report separate field errors", () => {
  const editor = randomEditor(program());
  editor.form.minDuration = "15m";
  editor.form.maxDuration = "5m";
  editor.form.count = "1.5";
  editor.form.sameEntities = false;
  const errors = randomErrors(program(), editor);
  assert.ok(errors.maxDuration);
  assert.ok(errors.count);
  assert.ok(errors["on.entities"]);
  assert.ok(errors["off.entities"]);
  editor.form.minDuration = "-1m";
  editor.form.maxDuration = "169h";
  assert.ok(randomErrors(program(), editor).minDuration);
  assert.ok(randomErrors(program(), editor).maxDuration);
});

void test("overnight windows are editable and undersized windows fail before saving", () => {
  const p = program(),
    editor = randomEditor(p);
  editor.form.on.entities = ["light.a"];
  editor.form.start.start = "23:00";
  editor.form.end.start = "01:00";
  assert.deepEqual(randomErrors(p, editor), {});
  editor.form.minDuration = "3h";
  assert.ok(randomErrors(p, editor).minDuration);
  editor.form.minDuration = "5m";
  editor.form.end.start = "23:00";
  assert.ok(randomErrors(p, editor)["end.start"]);
});

void test("two random boundaries can depend on a step and preserve independent weekday choices", () => {
  const p = program(),
    editor = randomEditor(p);
  editor.form.on.entities = ["light.a"];
  editor.form.days = ["sat"];
  editor.form.start = {
    ...editor.form.start,
    mode: "relative",
    anchor: "step:evening",
  };
  editor.form.end = {
    ...editor.form.end,
    mode: "relative",
    anchor: "step:evening",
    startOffset: "2h",
  };
  const next = buildRandom(p, editor);
  assert.equal(references(next, "evening").length, 2);
  assert.deepEqual(next.random![editor.id].days, ["sat"]);
  editor.form.start.anchor = "step:missing";
  assert.ok(randomErrors(p, editor)["start.anchor"]);
});

void test("independent end targets are preserved and random IDs stay stable through renames", () => {
  const p = program(),
    editor = randomEditor(p);
  editor.form.on.entities = ["light.a"];
  editor.form.off.entities = ["light.b"];
  editor.form.sameEntities = false;
  const next = buildRandom(p, editor),
    reopened = randomEditor(next, randomEntries(next)[0]);
  reopened.form.name = "Changed title";
  assert.equal(reopened.id, editor.id);
  assert.deepEqual(
    buildRandom(next, reopened).random![editor.id].off.entities,
    ["light.b"],
  );
  assert.notEqual(randomEditor(next).id, editor.id);
  delete next.random![editor.id];
  assert.throws(() => buildRandom(next, reopened), /changed elsewhere/);
});
