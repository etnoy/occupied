import test from "node:test";
import assert from "node:assert/strict";
import type { Program } from "@occupied/types.js";
import {
  copy,
  identifier,
  parentSteps,
  references,
  removeStep,
} from "@occupied/model.js";
import {
  buildStep,
  stepEditor,
  stepEntries,
  hasStepChanges,
  editorErrors,
  formTiming,
  timeSourceChoices,
} from "@occupied/step-model.js";
import { timingForm, timingExplanation, offsetErrors } from "@occupied/util.js";

const program = (): Program => ({
  schema_version: 1,
  name: "House",
  steps: {
    dinner: {
      name: "Dinner",
      timing: { absolute_time: { start: "18:00", end: "18:30" } },
      action: "turn_on",
      entities: ["light.a", "switch.a"],
    },
    bed: {
      name: "Bed",
      timing: { relative_to: { step: "dinner", start_offset: "1h" } },
      action: "turn_off",
      entities: ["light.a"],
    },
  },
});
void test("IDs are stable map keys and references block deleting a parent", () => {
  const p = program();
  assert.equal(identifier(p, "Dinner"), "dinner_2");
  assert.deepEqual(references(p, "dinner"), [
    ["steps", "bed", "timing", "relative_to", "step"],
  ]);
  assert.throws(() => removeStep(p, ["steps", "dinner"]));
  removeStep(p, ["steps", "bed"]);
  removeStep(p, ["steps", "dinner"]);
  assert.deepEqual(p.steps, {});
});
void test("parent picker excludes self and descendants", () => {
  assert.deepEqual(parentSteps(program(), "dinner"), []);
  assert.deepEqual(
    parentSteps(program(), "bed").map((e) => e.id),
    ["dinner"],
  );
});
void test("new mixed-domain step has one action and no hidden configuration", () => {
  const p = program(),
    editor = stepEditor(p);
  editor.form.entities = ["light.b", "switch.b"];
  const next = buildStep(p, editor);
  assert.equal(next.steps?.[editor.id].action, "turn_on");
  assert.deepEqual(next.steps?.[editor.id].entities, ["light.b", "switch.b"]);
  assert.equal(next.steps?.[editor.id].name, undefined);
  assert.deepEqual(Object.keys(next).sort(), [
    "name",
    "schema_version",
    "steps",
  ]);
  assert.equal(Object.keys(p.steps || {}).length, 2);
});
void test("blank titles are editable and generated names remain display-only", () => {
  const p = program(),
    editor = stepEditor(p, stepEntries(p)[0]);
  editor.form.name = "";
  assert.equal(editorErrors(p, editor).name, undefined);
  const next = buildStep(p, editor);
  assert.equal(next.steps?.dinner.name, undefined);
  assert.match(stepEntries(next)[0].name, /light.a/);
  assert.equal(stepEditor(next, stepEntries(next)[0]).form.name, "");
});
void test("related creation inherits targets and weekdays without a container", () => {
  const p = program();
  p.steps!.dinner.days = ["mon"];
  const editor = stepEditor(p, null, stepEntries(p)[0]);
  assert.deepEqual(editor.form.entities, ["light.a", "switch.a"]);
  assert.deepEqual(editor.form.days, ["mon"]);
  const next = buildStep(p, editor);
  assert.deepEqual(next.steps?.[editor.id].timing.relative_to, {
    step: "dinner",
    start_offset: "30m",
  });
});
void test("parent and dependent weekdays can be edited independently", () => {
  const p = program(),
    parent = stepEditor(p, stepEntries(p)[0]);
  parent.form.days = ["mon"];
  assert.deepEqual(editorErrors(p, parent), {});
  const next = buildStep(p, parent);
  assert.deepEqual(next.steps?.dinner.days, ["mon"]);
  assert.deepEqual(next.steps?.bed, p.steps?.bed);
  const child = stepEditor(next, stepEntries(next)[1]);
  child.form.days = ["tue"];
  assert.deepEqual(editorErrors(next, child), {});
  assert.deepEqual(buildStep(next, child).steps?.bed.days, ["tue"]);
  child.form.days = [];
  assert.match(editorErrors(next, child).days, /at least one day/);
});
void test("cycle errors identify the relevant field", () => {
  const p = program(),
    editor = stepEditor(p, stepEntries(p)[0]);
  editor.form.timing = {
    mode: "relative",
    anchor: "step:bed",
    startOffset: "1h",
    endOffset: "",
    start: "",
    end: "",
  };
  assert.match(editorErrors(p, editor).anchor, /circular/);
});
void test("signed and second-precision sources round-trip", () => {
  for (const relative_to of [
    { step: "dinner", start_offset: "10s", end_offset: "1m30s" },
    { sun: "dawn", start_offset: "-1.5s" },
    { entity: "sensor.alarm", end_offset: "10m" },
    {
      entity: "calendar.work",
      attribute: "start_time" as const,
      start_offset: "-10m",
    },
  ]) {
    const timing = { relative_to };
    const expected = {
      relative_to: {
        ...relative_to,
        start_offset: relative_to.start_offset || "0s",
      },
    };
    assert.deepEqual(formTiming(timingForm(timing)), expected);
  }
});
void test("absolute fixed and overnight windows round-trip without flags", () => {
  for (const absolute_time of [
    { start: "18:00" },
    { start: "23:50:30", end: "00:05:10" },
  ]) {
    assert.deepEqual(formTiming(timingForm({ absolute_time })), {
      absolute_time,
    });
  }
});
void test("service payloads and qualified actions remain editable", () => {
  const p = program();
  p.steps!.dinner = {
    ...p.steps!.dinner,
    action: "light.turn_on",
    entities: ["light.a"],
    data: { brightness_pct: 55 },
  };
  const editor = stepEditor(p, stepEntries(p)[0]);
  assert.equal(editor.form.kind, "service");
  editor.form.name = "Renamed";
  assert.deepEqual(buildStep(p, editor).steps?.dinner.data, {
    brightness_pct: 55,
  });
});
void test("scene data and selection round-trip", () => {
  const p = program();
  p.steps!.dinner = {
    ...p.steps!.dinner,
    action: "scene.turn_on",
    entities: ["scene.evening"],
    data: { transition: 5 },
  };
  const editor = stepEditor(p, stepEntries(p)[0]);
  assert.equal(editor.form.kind, "scene");
  assert.deepEqual(buildStep(p, editor).steps?.dinner.data, { transition: 5 });
  editor.form.entities.push("scene.other");
  assert.ok(editorErrors(p, editor).entities);
});
void test("disabled state and edits leave siblings intact", () => {
  const p = program(),
    editor = stepEditor(p, stepEntries(p)[0]);
  const sibling = copy(p.steps!.bed);
  assert.equal(hasStepChanges(editor), false);
  editor.form.enabled = false;
  assert.equal(hasStepChanges(editor), true);
  const next = buildStep(p, editor);
  assert.equal(next.steps?.dinner.enabled, false);
  assert.deepEqual(next.steps?.bed, sibling);
});
void test("source picker offers all supported solar sources", () => {
  assert.deepEqual(
    timeSourceChoices(program(), "bed")
      .filter((s) => s.group === "Solar events")
      .map((s) => s.value),
    [
      "sun:sunrise",
      "sun:sunset",
      "sun:dawn",
      "sun:dusk",
      "sun:noon",
      "sun:midnight",
    ],
  );
});
void test("offsets validate unit format, bounds, and ordering", () => {
  assert.deepEqual(offsetErrors({ startOffset: "0", endOffset: "10s" }), {});
  assert.ok(offsetErrors({ startOffset: "1h", endOffset: "-1h" }).endOffset);
  assert.ok(offsetErrors({ startOffset: "bad" }).startOffset);
  assert.ok(offsetErrors({ startOffset: "169h" }).startOffset);
});

void test("timing explanation describes signed offsets and window bounds directly", () => {
  const entries = [{ id: "kitchen", name: "Kitchen lights" }];
  const base = {
    mode: "relative",
    anchor: "step:kitchen",
    startOffset: "0s",
    endOffset: "",
  };
  for (const [startOffset, endOffset, expected] of [
    ["2h", "", "Runs 2 hours after Kitchen lights"],
    ["-20m", "", "Runs 20 minutes before Kitchen lights"],
    ["0s", "", "Runs at the same time as Kitchen lights"],
    [
      "-20m",
      "1h",
      "Runs at a random time between 20 minutes before and 1 hour after Kitchen lights",
    ],
    [
      "10m",
      "1h",
      "Runs at a random time between 10 minutes and 1 hour after Kitchen lights",
    ],
    [
      "-1h",
      "-20m",
      "Runs at a random time between 1 hour and 20 minutes before Kitchen lights",
    ],
    [
      "0s",
      "1h",
      "Runs at a random time between the start of Kitchen lights and 1 hour after Kitchen lights",
    ],
    [
      "-20m",
      "0s",
      "Runs at a random time between 20 minutes before Kitchen lights and the start of Kitchen lights",
    ],
    ["1h", "60m", "Runs 1 hour after Kitchen lights"],
    ["1h30m10s", "", "Runs 1 hour 30 minutes 10 seconds after Kitchen lights"],
    ["1.5s", "", "Runs 1.5 seconds after Kitchen lights"],
  ]) {
    assert.equal(
      timingExplanation({ ...base, startOffset, endOffset }, entries),
      `${expected}${endOffset ? "" : ". Add an end offset to introduce randomness"}`,
    );
  }
  assert.equal(
    timingExplanation({ ...base, startOffset: "bad" }, entries),
    "Enter valid offsets to see when this step runs",
  );
  assert.equal(
    timingExplanation(
      { ...base, startOffset: "1h", endOffset: "-1h" },
      entries,
    ),
    "Enter valid offsets to see when this step runs",
  );
  assert.equal(
    timingExplanation({ ...base, anchor: "" }, entries),
    "Choose a step or event",
  );
  assert.equal(
    timingExplanation(
      { ...base, anchor: "sun:sunset", startOffset: "-20m" },
      entries,
    ),
    "Runs 20 minutes before sunset. Add an end offset to introduce randomness",
  );
  const sources = [
    { value: "entity:calendar.work:start_time", name: "Work · start" },
  ];
  assert.equal(
    timingExplanation(
      { ...base, anchor: sources[0].value },
      [],
      (v) => v,
      sources,
    ),
    "Runs at the same time as Work · start. Add an end offset to introduce randomness",
  );
  assert.equal(
    timingExplanation({
      ...base,
      anchor: "entity:sensor.alarm",
      startOffset: "1h",
    }),
    "Runs 1 hour after sensor.alarm. Add an end offset to introduce randomness",
  );
});

void test("absolute timing explanation follows fixed, random and overnight windows", () => {
  const base = { mode: "absolute", start: "18:00", end: "" };
  assert.equal(
    timingExplanation(base),
    "Runs at 18:00. Add an end of window to introduce randomness",
  );
  assert.equal(
    timingExplanation({ ...base, end: "18:30" }),
    "Runs at a random time between 18:00 and 18:30",
  );
  assert.equal(
    timingExplanation({ ...base, start: "23:00", end: "00:30" }),
    "Runs at a random time between 23:00 and 00:30 the next day",
  );
  assert.equal(
    timingExplanation({ ...base, end: "18:00:00" }),
    "Runs at 18:00. Start and end are the same, so the time is fixed",
  );
});

void test("untitled parent picker labels match the cards and use HA friendly names", () => {
  const p = program();
  delete p.steps!.dinner.name;
  const catalog = {
    entities: [{ entity_id: "light.a", name: "Kitchen" }],
    services: {},
  };
  const card = stepEntries(p, catalog)[0];
  assert.match(card.name, /Kitchen/);
  const source = timeSourceChoices(p, "bed", catalog).find(
    (s) => s.value === "step:dinner",
  );
  assert.equal(source?.name, card.name);
});
