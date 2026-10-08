import { required } from "@occupied/types.js";
import type { Program, StepEntry, When } from "@occupied/types.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  around,
  duplicate,
  identifier,
  parentSteps,
  references,
  removeResource,
} from "@occupied/model.js";
import {
  buildStep,
  stepEditor,
  stepEntries,
  simpleStep,
  editorErrors,
  offsetErrors,
  dependentNames,
  timingSummary,
  timingExplanation,
} from "@occupied/step-model.js";

const program = () => ({
  groups: [{ id: "room", name: "Room", entities: ["light.a"] }],
  routines: [
    {
      id: "evening",
      name: "Evening",
      steps: [
        {
          id: "dinner",
          name: "Dinner",
          when: { clock_range: { earliest: "18:00", latest: "18:30" } },
          actions: [
            {
              action: "turn_on",
              targets: { groups: ["room"] },
              data: { step: "dinner", groups: ["room"] },
            },
          ],
        },
        {
          id: "bed",
          name: "Bed",
          when: { relative_to: "dinner", offset_range: { fixed: "1h" } },
          actions: [],
        },
      ],
      activities: [],
      activity_windows: [
        {
          id: "visits",
          name: "Visits",
          between: { start: { step: "dinner" }, end: { step: "bed" } },
        },
      ],
    },
  ],
});
test("new identifiers derive once and remain unique", () => {
  const p = program();
  assert.equal(identifier(p, "Room"), "room_2");
  assert.equal(identifier(p, "123 bedroom"), "item_123_bedroom");
  p.groups[0].name = "New label";
  assert.equal(p.groups[0].id, "room");
});
test("routine copies rewrite internal typed references while preserving opaque data", () => {
  const p = program(),
    item = duplicate(p, ["routines", 0]);
  assert.notEqual(required(item.steps)[0].id, "dinner");
  assert.equal(
    required(required(item.steps)[1].when).relative_to,
    required(item.steps)[0].id,
  );
  assert.equal(
    required(required(item.activity_windows)[0].between).start.step,
    required(item.steps)[0].id,
  );
  assert.equal(
    required(required(required(item.steps)[0].actions)[0].data).step,
    "dinner",
  );
  assert.deepEqual(
    required(required(required(item.steps)[0].actions)[0].targets).groups,
    ["room"],
  );
});
test("referenced deletes fail and routine deletion permits internal references", () => {
  const p = program();
  assert.equal(references(p, "dinner").length, 2);
  assert.throws(
    () => removeResource(p, ["routines", 0, "steps", 0]),
    /Referenced/,
  );
  assert.throws(() => removeResource(p, ["groups", 0]), /Referenced/);
  removeResource(p, ["routines", 0]);
  assert.equal(p.routines.length, 0);
});
test("parent picker excludes self and descendants", () => {
  const p = program();
  assert.deepEqual(parentSteps(p, "dinner"), []);
  assert.deepEqual(
    parentSteps(p, "bed").map((x) => x.id),
    ["dinner"],
  );
});
test("approximate clock configuration handles midnight explicitly", () => {
  assert.deepEqual(around("20:00", 15), {
    earliest: "19:45",
    latest: "20:15",
    cross_midnight: false,
  });
  assert.deepEqual(around("00:05", 15), {
    earliest: "23:50",
    latest: "00:20",
    cross_midnight: true,
  });
  assert.throws(() => around("20:00", 720));
});

const empty = () => ({
  schema_version: 1,
  name: "Home",
  groups: [],
  routines: [],
  lighting: { managed_targets: { entities: [], groups: [] }, baseline: [] },
});
function create(
  program: Program,
  name: string,
  entities = ["light.living_room"],
  parent?: StepEntry,
) {
  const editor = stepEditor(program, null, parent);
  Object.assign(editor.form, { name, entities });
  return { editor, program: buildStep(program, editor) };
}
test("entity-first creation supports mixed domains with brightness and manages only lights", () => {
  const p = empty(),
    editor = stepEditor(p);
  Object.assign(editor.form, {
    name: "Evening",
    entities: ["light.a", "switch.b"],
    brightness: 60,
  });
  const next = buildStep(p, editor),
    entry = stepEntries(next)[0];
  assert.equal(
    p.routines.length,
    0,
    "building must not mutate the source draft",
  );
  assert.equal(
    required(next.groups).length,
    0,
    "entity selection must not require groups",
  );
  assert.equal(simpleStep(entry), true);
  assert.deepEqual(
    required(entry.actions).map((a) => a.data),
    [{ brightness_pct: 60 }, {}],
  );
  assert.deepEqual(required(required(next.lighting).managed_targets).entities, [
    "light.a",
  ]);
  assert.deepEqual(required(next.lighting).baseline, [
    { targets: { entities: ["light.a"] }, state: "off" },
  ]);
});
test("related routines use stable step anchors and reject cycles and incompatible days", () => {
  const { program: first } = create(empty(), "Evening");
  const parent = stepEntries(first)[0];
  const { program: next } = create(first, "Kitchen", ["light.kitchen"], parent);
  const child = stepEntries(next)[1];
  assert.equal(required(child.when).relative_to, parent.id);
  assert.equal(required(required(child.when).offset_range).fixed, "30m");
  assert.deepEqual(child.days, parent.days);
  assert.deepEqual(dependentNames(next, parent.id), ["Kitchen"]);
  const edit = stepEditor(next, stepEntries(next)[0]);
  edit.form.timing = {
    ...edit.form.timing,
    mode: "relative",
    anchor: `step:${child.id}`,
  };
  assert.match(editorErrors(next, edit).anchor, /circular/);
  edit.form.timing.mode = "absolute";
  edit.form.days = ["mon"];
  assert.match(editorErrors(next, edit).days, /Kitchen depends/);
});
test("renaming preserves group references, all advanced settings and existing lighting exactly", () => {
  const { program: p } = create(empty(), "Evening");
  required(p.groups).push({
    id: "living",
    name: "Living",
    entities: ["light.living_room"],
  });
  required(p.routines)[0].probability = 0.8;
  required(p.routines)[0].defaults = { time_distribution: "triangular" };
  const step = required(required(p.routines)[0].steps)[0];
  required(step.actions)[0].targets = { groups: ["living"] };
  required(step.actions)[0].data = {
    brightness_pct: 60,
    color_temp_kelvin: 2700,
  };
  step.description = "Keep this";
  step.probability = 0.9;
  const editor = stepEditor(p, stepEntries(p)[0]);
  editor.form.name = "Renamed";
  const next = buildStep(p, editor),
    expected = structuredClone(p);
  required(required(expected.routines)[0].steps)[0].name = "Renamed";
  assert.deepEqual(next, expected);
  assert.equal(simpleStep(stepEntries(next)[0]), true);
});
test("editing entity selection does not modify a shared group or replace existing baselines", () => {
  const { program: p } = create(empty(), "Evening");
  p.groups = [
    { id: "living", name: "Living", entities: ["light.living_room"] },
  ];
  required(required(required(p.routines)[0].steps)[0].actions)[0].targets = {
    groups: ["living"],
  };
  required(required(p.lighting).baseline)[0].state = "on";
  required(required(p.lighting).baseline)[0].brightness_pct = 40;
  const editor = stepEditor(p, stepEntries(p)[0]);
  editor.form.entities.push("light.kitchen");
  const next = buildStep(p, editor);
  assert.deepEqual(next.groups, p.groups);
  assert.deepEqual(
    required(required(next.lighting).baseline)[0],
    required(required(p.lighting).baseline)[0],
  );
  assert.deepEqual(required(required(next.lighting).baseline)[1], {
    targets: { entities: ["light.kitchen"] },
    state: "off",
  });
});
test("widening a legacy item's weekdays retains siblings and inherited defaults", () => {
  const { program: p } = create(empty(), "Evening");
  required(p.routines)[0].days = ["mon"];
  required(p.routines)[0].defaults = { probability: 0.6 };
  required(required(p.routines)[0].steps)[0].days = ["mon"];
  required(required(p.routines)[0].steps).push({
    ...structuredClone(required(required(p.routines)[0].steps)[0]),
    id: "sibling",
    name: "Sibling",
  });
  const editor = stepEditor(p, stepEntries(p)[0]);
  editor.form.days = ["mon", "tue"];
  const next = buildStep(p, editor);
  assert.deepEqual(required(next.routines)[0].steps, [
    required(required(p.routines)[0].steps)[1],
  ]);
  assert.deepEqual(
    required(next.routines)[1].defaults,
    required(p.routines)[0].defaults,
  );
  assert.deepEqual(
    required(stepEntries(next).find((e) => e.id === editor.id)).days,
    ["mon", "tue"],
  );
});
test("start/end bounds and signed sun offsets preserve overnight semantics", () => {
  const p = empty(),
    editor = stepEditor(p);
  Object.assign(editor.form, { name: "Night", entities: ["light.a"] });
  editor.form.timing.start = "23:50";
  editor.form.timing.end = "00:20";
  let next = buildStep(p, editor);
  assert.deepEqual(
    required(required(required(next.routines)[0].steps)[0].when).clock_range,
    {
      earliest: "23:50",
      latest: "00:20",
      cross_midnight: true,
    },
  );
  assert.equal(
    required(required(next.routines)[0].steps)[0].allow_cross_boundary,
    true,
  );
  Object.assign(editor.form.timing, {
    mode: "relative",
    anchor: "sun:sunset",
    startOffset: "-35m",
    endOffset: "-25m",
  });
  next = buildStep(p, editor);
  assert.deepEqual(
    required(
      required(required(required(next.routines)[0].steps)[0].when).sun_range,
    ).offset_range,
    {
      min: "-35m",
      max: "-25m",
    },
  );
  assert.equal(
    timingSummary(stepEntries(next)[0], []),
    "Runs at a random time between 35 minutes and 25 minutes before sunset.",
  );
});
test("existing fractional-minute ranges remain editable and untouched on rename", () => {
  const { program: first } = create(empty(), "Wake");
  const { program: p } = create(
    first,
    "Breakfast",
    ["light.kitchen"],
    stepEntries(first)[0],
  );
  required(required(required(p.routines)[1].steps)[0].when).offset_range = {
    min: "5m",
    max: "20m",
  };
  const entry = stepEntries(p)[1];
  assert.equal(simpleStep(entry), true);
  const editor = stepEditor(p, entry);
  editor.form.name = "New breakfast";
  assert.deepEqual(
    required(required(buildStep(p, editor).routines)[1].steps)[0].when,
    entry.when,
  );
  assert.deepEqual(around("20:00:30", 7.5), {
    earliest: "19:53",
    latest: "20:08",
    cross_midnight: false,
  });
});
test("complex activities and mixed actions stay outside the simple editor", () => {
  const { program: p } = create(empty(), "Evening");
  const entry = stepEntries(p)[0];
  assert.equal(simpleStep({ ...entry, kind: "activities" }), false);
  assert.equal(
    simpleStep({
      ...entry,
      actions: [...required(entry.actions), { action: "turn_off" }],
    }),
    false,
  );
  assert.equal(
    simpleStep({ ...entry, actions: [{ action: "safety_off" }] }),
    false,
  );
});

test("scene steps round-trip without adding managed lights", () => {
  const p = empty(),
    editor = stepEditor(p);
  Object.assign(editor.form, {
    name: "Morning",
    kind: "scene",
    entities: ["scene.morning"],
  });
  const next = buildStep(p, editor),
    entry = stepEntries(next)[0];
  assert.equal(simpleStep(entry), true);
  assert.deepEqual(entry.actions, [
    {
      action: "scene.turn_on",
      targets: { entities: ["scene.morning"] },
      data: {},
    },
  ]);
  assert.deepEqual(next.lighting, p.lighting);
  const edit = stepEditor(next, entry);
  assert.equal(edit.form.kind, "scene");
  edit.form.name = "Wake up";
  assert.deepEqual(
    stepEntries(buildStep(next, edit))[0].actions,
    entry.actions,
  );
  edit.form.entities.push("scene.other");
  assert.match(editorErrors(next, edit).entities, /one Home Assistant scene/);
});

test("entity service steps validate data and preserve group targets on action edits", () => {
  const p = empty(),
    editor = stepEditor(p);
  Object.assign(editor.form, {
    name: "Blinds",
    kind: "service",
    service: "cover.set_cover_position",
    entities: ["cover.a", "cover.b"],
    data: '{"position": 50}',
  });
  const next = buildStep(p, editor),
    entry = stepEntries(next)[0];
  assert.equal(simpleStep(entry), true);
  assert.equal(required(entry.actions)[0].action, "cover.set_cover_position");
  assert.deepEqual(required(required(entry.actions)[0].targets).entities, [
    "cover.a",
    "cover.b",
  ]);
  assert.deepEqual(required(entry.actions)[0].data, { position: 50 });
  required(next.groups).push({
    id: "blinds",
    name: "Blinds",
    entities: ["cover.a", "cover.b"],
  });
  required(required(required(next.routines)[0].steps)[0].actions)[0].targets = {
    groups: ["blinds"],
  };
  const edit = stepEditor(next, stepEntries(next)[0]);
  edit.form.data = '{"position": 75}';
  assert.deepEqual(
    required(stepEntries(buildStep(next, edit))[0].actions)[0].targets,
    {
      groups: ["blinds"],
    },
  );
  edit.form.data = "[]";
  assert.match(editorErrors(next, edit).data, /JSON object/);
  edit.form.service = "invalid";
  assert.match(editorErrors(next, edit).service, /domain.service/);
});

test("explicit step start intervals and second-precision relative offsets", () => {
  const editor = stepEditor(empty());
  Object.assign(editor.form, {
    name: "Morning",
    entities: ["light.bedroom"],
    days: ["mon", "tue", "wed", "thu", "fri"],
  });
  Object.assign(editor.form.timing, {
    mode: "absolute",
    start: "06:40:00",
    end: "07:20:00",
  });
  const first = buildStep(empty(), editor),
    parent = stepEntries(first)[0];
  assert.deepEqual(required(parent.when).clock_range, {
    earliest: "06:40:00",
    latest: "07:20:00",
    cross_midnight: false,
  });
  const child = stepEditor(first, null, parent);
  Object.assign(child.form, { name: "Breakfast", entities: ["light.kitchen"] });
  Object.assign(child.form.timing, {
    startOffset: "10s",
    endOffset: "20m",
  });
  const next = buildStep(first, child),
    breakfast = stepEntries(next)[1];
  assert.deepEqual(breakfast.when, {
    relative_to: parent.id,
    offset_range: { min: "10s", max: "20m" },
  });
  child.form.timing.startOffset = "30m";
  assert.match(editorErrors(first, child).endOffset, /at least/);
  editor.form.timing.start = "23:50";
  editor.form.timing.end = "00:20";
  assert.equal(
    required(
      required(stepEntries(buildStep(empty(), editor))[0].when).clock_range,
    ).cross_midnight,
    true,
  );
  editor.form.timing.end = "25:00";
  assert.match(editorErrors(empty(), editor).end, /valid/);
});

test("clearing optional ends restores fixed timing and retains existing weekdays", () => {
  const { program: p } = create(empty(), "Morning");
  required(required(p.routines)[0].steps)[0].days = ["mon", "wed"];
  required(required(required(p.routines)[0].steps)[0].when).clock_range = {
    earliest: "06:40:10",
    latest: "07:20:30",
  };
  const edit = stepEditor(p, stepEntries(p)[0]);
  assert.equal(edit.form.timing.start, "06:40:10");
  assert.equal(edit.form.timing.end, "07:20:30");
  edit.form.timing.end = "";
  const fixed = buildStep(p, edit);
  assert.deepEqual(
    required(required(required(fixed.routines)[0].steps)[0].when).clock_range,
    {
      earliest: "06:40:10",
      latest: "06:40:10",
      cross_midnight: false,
    },
  );
  assert.deepEqual(required(required(fixed.routines)[0].steps)[0].days, [
    "mon",
    "wed",
  ]);
  Object.assign(edit.form.timing, {
    mode: "relative",
    anchor: "sun:sunrise",
    startOffset: "-10s",
    endOffset: "20m",
  });
  const window = buildStep(p, edit);
  const reopened = stepEditor(window, stepEntries(window)[0]);
  assert.equal(reopened.form.timing.startOffset, "-10s");
  assert.equal(reopened.form.timing.endOffset, "20m");
  reopened.form.timing.endOffset = "";
  assert.deepEqual(
    required(
      required(
        required(required(buildStep(window, reopened).routines)[0].steps)[0]
          .when,
      ).sun_range,
    ).offset_range,
    { fixed: "-10s" },
  );
});

test("offset form validation explains format, range and ordering errors", () => {
  for (const value of [
    "30m",
    "1h",
    "1h30m",
    "10s",
    "-30m",
    "+30m",
    "1.5s",
    "0s",
  ])
    assert.deepEqual(offsetErrors({ startOffset: value, endOffset: "" }), {});
  for (const value of ["", "30", "00:30", "1m2h", "30minutes", "-", "1h 30m"])
    assert.match(
      offsetErrors({ startOffset: value, endOffset: "" }).startOffset,
      /Use h, m or s/,
    );
  assert.match(offsetErrors({ startOffset: "169h" }).startOffset, /seven days/);
  assert.match(
    offsetErrors({ startOffset: "1h", endOffset: "abc" }).endOffset,
    /Use h, m or s/,
  );
  assert.match(
    offsetErrors({ startOffset: "1h", endOffset: "169h" }).endOffset,
    /seven days/,
  );
  assert.match(
    offsetErrors({ startOffset: "1h", endOffset: "30m" }).endOffset,
    /at least/,
  );
  assert.deepEqual(
    offsetErrors({ startOffset: "-30m", endOffset: "-10m" }),
    {},
  );
});

test("HA time sources and all solar events round-trip through the step editor", () => {
  const { program: p } = create(empty(), "Morning");
  for (const anchor of [
    "sun:dawn",
    "sun:dusk",
    "sun:noon",
    "sun:midnight",
    "entity:sensor.next_alarm",
    "entity:input_datetime.wake",
    "entity:calendar.work:start_time",
    "entity:calendar.work:end_time",
  ]) {
    const editor = stepEditor(p, stepEntries(p)[0]);
    Object.assign(editor.form.timing, {
      mode: "relative",
      anchor,
      startOffset: "-30m",
      endOffset: "-10m",
    });
    assert.deepEqual(editorErrors(p, editor), {});
    const saved = buildStep(p, editor);
    const reopened = stepEditor(saved, stepEntries(saved)[0]);
    assert.equal(reopened.form.timing.anchor, anchor);
    assert.equal(reopened.form.timing.startOffset, "-30m");
    assert.equal(reopened.form.timing.endOffset, "-10m");
    assert.ok(timingSummary(stepEntries(saved)[0], []));
  }
});

test("timing explanation describes signed offsets and window bounds directly", () => {
  const entries = [{ id: "kitchen", name: "Kitchen lights" }];
  const base = {
    mode: "relative",
    anchor: "step:kitchen",
    startOffset: "0s",
    endOffset: "",
  };
  for (const [startOffset, endOffset, expected] of [
    ["2h", "", "Runs 2 hours after Kitchen lights step."],
    ["-20m", "", "Runs 20 minutes before Kitchen lights step."],
    ["0s", "", "Runs at the same time as Kitchen lights step."],
    [
      "-20m",
      "1h",
      "Runs at a random time between 20 minutes before and 1 hour after Kitchen lights step.",
    ],
    [
      "10m",
      "1h",
      "Runs at a random time between 10 minutes and 1 hour after Kitchen lights step.",
    ],
    [
      "-1h",
      "-20m",
      "Runs at a random time between 1 hour and 20 minutes before Kitchen lights step.",
    ],
    [
      "0s",
      "1h",
      "Runs at a random time between the start of Kitchen lights step and 1 hour after Kitchen lights step.",
    ],
    [
      "-20m",
      "0s",
      "Runs at a random time between 20 minutes before Kitchen lights step and the start of Kitchen lights step.",
    ],
    ["1h", "60m", "Runs 1 hour after Kitchen lights step."],
    [
      "1h30m10s",
      "",
      "Runs 1 hour 30 minutes 10 seconds after Kitchen lights step.",
    ],
    ["1.5s", "", "Runs 1.5 seconds after Kitchen lights step."],
  ])
    assert.equal(
      timingExplanation({ ...base, startOffset, endOffset }, entries),
      expected,
    );
  assert.equal(
    timingExplanation({ ...base, startOffset: "bad" }, entries),
    "Enter valid offsets to see when this step runs.",
  );
  assert.equal(
    timingExplanation(
      { ...base, startOffset: "1h", endOffset: "-1h" },
      entries,
    ),
    "Enter valid offsets to see when this step runs.",
  );
  assert.equal(
    timingExplanation({ ...base, anchor: "" }, entries),
    "Choose a step or event.",
  );
  assert.equal(
    timingExplanation(
      { ...base, anchor: "sun:sunset", startOffset: "-20m" },
      entries,
    ),
    "Runs 20 minutes before sunset.",
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
    "Runs at the same time as Work · start.",
  );
  assert.equal(
    timingExplanation({
      ...base,
      anchor: "entity:sensor.alarm",
      startOffset: "1h",
    }),
    "Runs 1 hour after sensor.alarm.",
  );
});

test("absolute timing explanation follows fixed, random and overnight windows", () => {
  const base = { mode: "absolute", start: "18:00", end: "" };
  assert.equal(
    timingExplanation(base),
    "Runs at 18:00. Add an end of window to introduce randomness.",
  );
  assert.equal(
    timingExplanation({ ...base, end: "18:30" }),
    "Runs at a random time between 18:00 and 18:30.",
  );
  assert.equal(
    timingExplanation({ ...base, start: "23:00", end: "00:30" }),
    "Runs at a random time between 23:00 and 00:30 the next day.",
  );
  assert.equal(
    timingExplanation({ ...base, end: "18:00:00" }),
    "Runs at 18:00. Start and end are the same, so the time is fixed.",
  );
});

test("unitless zero offsets validate, describe and save as canonical durations", () => {
  const { program: p } = create(empty(), "Morning");
  for (const [startOffset, endOffset, expectedRange] of [
    ["0", "", { fixed: "0s" }],
    ["0", "45m", { min: "0s", max: "45m" }],
    ["-20m", "0", { min: "-20m", max: "0s" }],
    ["0", "0", { min: "0s", max: "0s" }],
  ]) {
    for (const anchor of ["sun:sunrise", "entity:sensor.next_alarm"]) {
      const editor = stepEditor(p, stepEntries(p)[0]);
      Object.assign(editor.form.timing, {
        mode: "relative",
        anchor,
        startOffset,
        endOffset,
      });
      assert.deepEqual(offsetErrors(editor.form.timing), {});
      assert.deepEqual(editorErrors(p, editor), {});
      const saved = stepEntries(buildStep(p, editor))[0];
      assert.deepEqual(
        required(
          required(saved.when).sun_range || required(saved.when).entity_range,
        ).offset_range,
        expectedRange,
      );
      assert.match(timingExplanation(editor.form.timing), /^Runs /);
      const reopened = stepEditor(buildStep(p, editor), saved);
      assert.deepEqual(editorErrors(p, reopened), {});
    }
  }
  assert.equal(
    timingExplanation(
      {
        mode: "relative",
        anchor: "step:morning",
        startOffset: "0",
        endOffset: "",
      },
      [{ id: "morning", name: "Morning" }],
    ),
    "Runs at the same time as Morning step.",
  );
  assert.match(
    offsetErrors({ startOffset: "30m", endOffset: "0" }).endOffset,
    /at least/,
  );
  assert.match(
    offsetErrors({ startOffset: "30", endOffset: "" }).startOffset,
    /Use h, m or s/,
  );
});

test("step list descriptions share the editor wording without editing hints", () => {
  const entries = [{ id: "kitchen", name: "Kitchen lights" }];
  const cases: [When, string][] = [
    [{ clock_range: { earliest: "18:00", latest: "18:00" } }, "Runs at 18:00."],
    [
      {
        clock_range: {
          earliest: "23:50",
          latest: "00:20",
          cross_midnight: true,
        },
      },
      "Runs at a random time between 23:50 and 00:20 the next day.",
    ],
    [
      { relative_to: "kitchen", offset_range: { fixed: "2h" } },
      "Runs 2 hours after Kitchen lights step.",
    ],
    [
      { relative_to: "kitchen", offset_range: { fixed: "0s" } },
      "Runs at the same time as Kitchen lights step.",
    ],
    [
      { relative_to: "kitchen", offset_range: { min: "-20m", max: "1h" } },
      "Runs at a random time between 20 minutes before and 1 hour after Kitchen lights step.",
    ],
    [
      { sun_range: { sun: "sunset", offset_range: { fixed: "-20m" } } },
      "Runs 20 minutes before sunset.",
    ],
  ];
  for (const [when, expected] of cases)
    assert.equal(timingSummary({ when }, entries), expected);
  assert.equal(
    timingSummary(
      {
        when: {
          entity_range: {
            entity_id: "input_datetime.wake",
            offset_range: { fixed: "0s" },
          },
        },
      },
      [],
      (v) => v,
      [{ value: "entity:input_datetime.wake", name: "Wake-up time" }],
    ),
    "Runs at the same time as Wake-up time.",
  );
});
