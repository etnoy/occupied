import { translator } from "@occupied/lib/i18n/translations.js";
import test from "node:test";
import assert from "node:assert/strict";
import type { Program } from "@occupied/lib/types.js";
import {
  randomEditor,
  randomEntries,
  randomErrors,
  buildRandom,
  hasRandomChanges,
  countSummary,
} from "@occupied/lib/models/random-model.js";
import { references, removeStep } from "@occupied/lib/models/model.js";
import { randomReferences } from "@occupied/lib/models/model.js";
import {
  dependentNames,
  stepEntries,
  timeSourceChoices,
} from "@occupied/lib/models/step-model.js";

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
  assert.equal(randomEntries(next)[0].name, "light.a +1");
});

void test("untitled random events and steps omit category names and preserve custom titles", () => {
  const p = program();
  delete p.steps!.evening.name;
  const editor = randomEditor(p);
  editor.form.on.entities = ["light.a"];
  const next = buildRandom(p, editor);
  const catalog = {
    entities: [{ entity_id: "light.a", name: "Living room lamp" }],
  };
  assert.equal(randomEntries(next, catalog)[0].name, "Living room lamp");
  assert.equal(
    stepEntries(next, catalog)[0].name,
    "Living room lamp · Turn on",
  );
  assert.equal(next.random![editor.id].name, undefined);
  assert.equal(next.steps!.evening.name, undefined);
  next.random![editor.id].name = "Evening activity";
  next.steps!.evening.name = "Evening lights";
  assert.equal(randomEntries(next, catalog)[0].name, "Evening activity");
  assert.equal(stepEntries(next, catalog)[0].name, "Evening lights");
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

void test("random count ranges save, reopen, and display both inclusive bounds", () => {
  const p = program(),
    editor = randomEditor(p);
  editor.form.on.entities = ["light.a"];
  editor.form.minCount = "2";
  editor.form.maxCount = "6";
  assert.deepEqual(randomErrors(p, editor), {});
  const next = buildRandom(p, editor),
    event = next.random![editor.id],
    reopened = randomEditor(next, randomEntries(next)[0]);
  assert.deepEqual(event.count, { min: 2, max: 6 });
  assert.equal(reopened.form.minCount, "2");
  assert.equal(reopened.form.maxCount, "6");
  assert.deepEqual(buildRandom(next, reopened), next);
  assert.equal(countSummary(event.count), "2–6");
  assert.equal(countSummary(5), "5");
  assert.equal(countSummary(undefined), "3");
  reopened.form.maxCount = "02";
  assert.equal(buildRandom(next, reopened).random![editor.id].count, 2);
});

void test("legacy fixed counts initialize both fields without changing the count", () => {
  const p = program(),
    editor = randomEditor(p);
  editor.form.on.entities = ["light.a"];
  editor.form.minCount = editor.form.maxCount = "6";
  const next = buildRandom(p, editor),
    reopened = randomEditor(next, randomEntries(next)[0]);
  assert.equal(reopened.form.minCount, "6");
  assert.equal(reopened.form.maxCount, "6");
  assert.equal(buildRandom(next, reopened).random![editor.id].count, 6);
});

void test("zero minimum and fixed zero counts save, reopen, and display", () => {
  for (const maximum of [0, 1, 6]) {
    const p = program(),
      editor = randomEditor(p);
    editor.form.on.entities = ["light.a"];
    editor.form.minCount = "0";
    editor.form.maxCount = String(maximum);
    assert.deepEqual(randomErrors(p, editor), {});
    const next = buildRandom(p, editor);
    const count = next.random![editor.id].count;
    assert.deepEqual(count, maximum === 0 ? 0 : { min: 0, max: maximum });
    assert.equal(countSummary(count), maximum === 0 ? "0" : `0–${maximum}`);
    const reopened = randomEditor(next, randomEntries(next)[0]);
    assert.equal(reopened.form.minCount, "0");
    assert.equal(reopened.form.maxCount, String(maximum));
    assert.deepEqual(buildRandom(next, reopened), next);
  }
});

void test("fixed zero counts need no feasible window while positive maxima still do", () => {
  const p = program(),
    editor = randomEditor(p);
  editor.form.on.entities = ["light.a"];
  editor.form.minCount = editor.form.maxCount = "0";
  editor.form.minDuration = editor.form.maxDuration = "6h";
  assert.deepEqual(randomErrors(p, editor), {});
  editor.form.end.start = editor.form.start.start;
  assert.deepEqual(randomErrors(p, editor), {});
  editor.form.end.mode = "duration";
  editor.form.end.minDuration = "1m";
  assert.deepEqual(randomErrors(p, editor), {});
  editor.form.maxCount = "1";
  assert.ok(randomErrors(p, editor).minDuration);
  editor.form.maxCount = "0";
  editor.form.minDuration = "0s";
  assert.ok(randomErrors(p, editor).minDuration);
});

void test("window duration ends save fixed and ranged durations and validate their bounds", () => {
  const p = program();
  const editor = randomEditor(p);
  editor.form.on.entities = ["light.a"];
  Object.assign(editor.form.end, {
    mode: "duration",
    minDuration: "1h",
    maxDuration: "2h",
  });
  assert.deepEqual(randomErrors(p, editor), {});
  const next = buildRandom(p, editor);
  assert.deepEqual(next.random![editor.id].end, {
    duration: { min: "1h", max: "2h" },
  });
  const reopened = randomEditor(next, randomEntries(next)[0]);
  assert.equal(reopened.form.end.mode, "duration");
  assert.equal(reopened.form.end.minDuration, "1h");
  assert.equal(reopened.form.end.maxDuration, "2h");
  assert.deepEqual(buildRandom(next, reopened), next);
  editor.form.end.maxDuration = "60m";
  assert.deepEqual(buildRandom(p, editor).random![editor.id].end, {
    duration: { min: "1h" },
  });
  editor.form.end.maxDuration = "30m";
  assert.ok(randomErrors(p, editor)["end.maxDuration"]);
  editor.form.end.minDuration = "0s";
  assert.ok(randomErrors(p, editor)["end.minDuration"]);
  editor.form.end.minDuration = "1m";
  editor.form.end.maxDuration = "2m";
  assert.ok(randomErrors(p, editor).minDuration);
});

void test("window-start sources include other random windows and exclude self and descendants", () => {
  const p = program();
  const parent = randomEditor(p);
  parent.form.on.entities = ["light.a"];
  const first = buildRandom(p, parent);
  const child = randomEditor(first);
  child.form.on.entities = ["light.a"];
  Object.assign(child.form.start, {
    mode: "relative",
    anchor: `random:${parent.id}`,
    startOffset: "10m",
  });
  Object.assign(child.form.end, {
    mode: "duration",
    minDuration: "1h",
    maxDuration: "1h",
  });
  assert.deepEqual(randomErrors(first, child), {});
  const next = buildRandom(first, child);
  assert.deepEqual(next.random![child.id].start, {
    relative_to: { random: parent.id, start_offset: "10m" },
  });
  assert.deepEqual(randomReferences(next, parent.id), [
    ["random", child.id, "start", "relative_to", "random"],
  ]);
  assert.ok(
    timeSourceChoices(next, undefined, {}, translator(), "new_random").some(
      (choice) => choice.value === `random:${parent.id}`,
    ),
  );
  assert.ok(
    timeSourceChoices(next, undefined, {}, translator(), parent.id).every(
      (choice) => !choice.value.startsWith("random:"),
    ),
  );
  assert.ok(
    timeSourceChoices(next).every(
      (choice) => !choice.value.startsWith("random:"),
    ),
  );
  Object.assign(parent.form.start, {
    mode: "relative",
    anchor: `random:${child.id}`,
  });
  assert.ok(randomErrors(next, parent)["start.anchor"]);
});

void test("count bounds reject invalid integers and reversed ranges before saving", () => {
  const p = program(),
    editor = randomEditor(p);
  editor.form.on.entities = ["light.a"];
  for (const field of ["minCount", "maxCount"] as const) {
    for (const value of ["", " ", "-1", "1.5", "1001", "invalid"]) {
      editor.form.minCount = "2";
      editor.form.maxCount = "6";
      editor.form[field] = value;
      assert.ok(randomErrors(p, editor)[field], `${field}: ${value}`);
      assert.throws(() => buildRandom(p, editor));
    }
  }
  editor.form.minCount = "6";
  editor.form.maxCount = "2";
  assert.ok(randomErrors(p, editor).maxCount);
  assert.throws(() => buildRandom(p, editor));
  editor.form.minCount = "0";
  editor.form.maxCount = "1000";
  assert.deepEqual(randomErrors(p, editor), {});
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
  editor.form.minCount = "1.5";
  editor.form.sameEntities = false;
  const errors = randomErrors(program(), editor);
  assert.ok(errors.maxDuration);
  assert.ok(errors.minCount);
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
  assert.throws(() => buildRandom(next, reopened), /random_changed_error/);
});

void test("service phases with equal entities share the start selection", () => {
  const p = program();
  p.random = {
    tv: {
      start: { absolute_time: { start: "18:00" } },
      end: { absolute_time: { start: "23:00" } },
      on: { action: "remote.turn_on", entities: ["remote.tv"] },
      off: { action: "remote.turn_off", entities: ["remote.tv"] },
    },
  };
  const editor = randomEditor(p, randomEntries(p)[0]);
  assert.equal(editor.form.sameEntities, true);
  editor.form.on.entities = ["remote.other"];
  assert.deepEqual(buildRandom(p, editor).random!.tv.off.entities, [
    "remote.other",
  ]);
  p.random.tv.off.entities = ["remote.other"];
  assert.equal(randomEditor(p, randomEntries(p)[0]).form.sameEntities, false);
  p.random.tv.off = { action: "scene.turn_on", entities: ["scene.end"] };
  assert.equal(randomEditor(p, randomEntries(p)[0]).form.sameEntities, false);
});
