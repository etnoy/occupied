import test from "node:test";
import assert from "node:assert/strict";
import {
  around,
  duplicate,
  identifier,
  parentSteps,
  references,
  removeResource,
} from "../../custom_components/occupied/frontend/model.js";
import {
  buildStep,
  stepEditor,
  stepEntries,
  simpleStep,
  editorErrors,
  offsetErrors,
  dependentNames,
  timingSummary,
} from "../../custom_components/occupied/frontend/step-model.js";

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
  assert.notEqual(item.steps[0].id, "dinner");
  assert.equal(item.steps[1].when.relative_to, item.steps[0].id);
  assert.equal(item.activity_windows[0].between.start.step, item.steps[0].id);
  assert.equal(item.steps[0].actions[0].data.step, "dinner");
  assert.deepEqual(item.steps[0].actions[0].targets.groups, ["room"]);
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
function create(program, name, entities = ["light.living_room"], parent) {
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
    next.groups.length,
    0,
    "entity selection must not require groups",
  );
  assert.equal(simpleStep(entry), true);
  assert.deepEqual(
    entry.actions.map((a) => a.data),
    [{ brightness_pct: 60 }, {}],
  );
  assert.deepEqual(next.lighting.managed_targets.entities, ["light.a"]);
  assert.deepEqual(next.lighting.baseline, [
    { targets: { entities: ["light.a"] }, state: "off" },
  ]);
});
test("related routines use stable step anchors and reject cycles and incompatible days", () => {
  const { program: first } = create(empty(), "Evening");
  const parent = stepEntries(first)[0];
  const { program: next } = create(first, "Kitchen", ["light.kitchen"], parent);
  const child = stepEntries(next)[1];
  assert.equal(child.when.relative_to, parent.id);
  assert.equal(child.when.offset_range.fixed, "30m");
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
  p.groups.push({
    id: "living",
    name: "Living",
    entities: ["light.living_room"],
  });
  p.routines[0].probability = 0.8;
  p.routines[0].defaults = { time_distribution: "triangular" };
  const step = p.routines[0].steps[0];
  step.actions[0].targets = { groups: ["living"] };
  step.actions[0].data = { brightness_pct: 60, color_temp_kelvin: 2700 };
  step.description = "Keep this";
  step.probability = 0.9;
  const editor = stepEditor(p, stepEntries(p)[0]);
  editor.form.name = "Renamed";
  const next = buildStep(p, editor),
    expected = structuredClone(p);
  expected.routines[0].steps[0].name = "Renamed";
  assert.deepEqual(next, expected);
  assert.equal(simpleStep(stepEntries(next)[0]), true);
});
test("editing entity selection does not modify a shared group or replace existing baselines", () => {
  const { program: p } = create(empty(), "Evening");
  p.groups = [
    { id: "living", name: "Living", entities: ["light.living_room"] },
  ];
  p.routines[0].steps[0].actions[0].targets = { groups: ["living"] };
  p.lighting.baseline[0].state = "on";
  p.lighting.baseline[0].brightness_pct = 40;
  const editor = stepEditor(p, stepEntries(p)[0]);
  editor.form.entities.push("light.kitchen");
  const next = buildStep(p, editor);
  assert.deepEqual(next.groups, p.groups);
  assert.deepEqual(next.lighting.baseline[0], p.lighting.baseline[0]);
  assert.deepEqual(next.lighting.baseline[1], {
    targets: { entities: ["light.kitchen"] },
    state: "off",
  });
});
test("widening a legacy item's weekdays retains siblings and inherited defaults", () => {
  const { program: p } = create(empty(), "Evening");
  p.routines[0].days = ["mon"];
  p.routines[0].defaults = { probability: 0.6 };
  p.routines[0].steps[0].days = ["mon"];
  p.routines[0].steps.push({
    ...structuredClone(p.routines[0].steps[0]),
    id: "sibling",
    name: "Sibling",
  });
  const editor = stepEditor(p, stepEntries(p)[0]);
  editor.form.days = ["mon", "tue"];
  const next = buildStep(p, editor);
  assert.deepEqual(next.routines[0].steps, [p.routines[0].steps[1]]);
  assert.deepEqual(next.routines[1].defaults, p.routines[0].defaults);
  assert.deepEqual(stepEntries(next).find((e) => e.id === editor.id).days, [
    "mon",
    "tue",
  ]);
});
test("start/end bounds and signed sun offsets preserve overnight semantics", () => {
  const p = empty(),
    editor = stepEditor(p);
  Object.assign(editor.form, { name: "Night", entities: ["light.a"] });
  editor.form.timing.start = "23:50";
  editor.form.timing.end = "00:20";
  let next = buildStep(p, editor);
  assert.deepEqual(next.routines[0].steps[0].when.clock_range, {
    earliest: "23:50",
    latest: "00:20",
    cross_midnight: true,
  });
  assert.equal(next.routines[0].steps[0].allow_cross_boundary, true);
  Object.assign(editor.form.timing, {
    mode: "relative",
    anchor: "sun:sunset",
    startOffset: "-35m",
    endOffset: "-25m",
  });
  next = buildStep(p, editor);
  assert.deepEqual(next.routines[0].steps[0].when.sun_range.offset_range, {
    min: "-35m",
    max: "-25m",
  });
  assert.equal(
    timingSummary(stepEntries(next)[0], []),
    "25–35 min before sunset",
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
  p.routines[1].steps[0].when.offset_range = { min: "5m", max: "20m" };
  const entry = stepEntries(p)[1];
  assert.equal(simpleStep(entry), true);
  const editor = stepEditor(p, entry);
  editor.form.name = "New breakfast";
  assert.deepEqual(buildStep(p, editor).routines[1].steps[0].when, entry.when);
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
      actions: [...entry.actions, { action: "turn_off" }],
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
  assert.equal(entry.actions[0].action, "cover.set_cover_position");
  assert.deepEqual(entry.actions[0].targets.entities, ["cover.a", "cover.b"]);
  assert.deepEqual(entry.actions[0].data, { position: 50 });
  next.groups.push({
    id: "blinds",
    name: "Blinds",
    entities: ["cover.a", "cover.b"],
  });
  next.routines[0].steps[0].actions[0].targets = { groups: ["blinds"] };
  const edit = stepEditor(next, stepEntries(next)[0]);
  edit.form.data = '{"position": 75}';
  assert.deepEqual(stepEntries(buildStep(next, edit))[0].actions[0].targets, {
    groups: ["blinds"],
  });
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
  assert.deepEqual(parent.when.clock_range, {
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
    stepEntries(buildStep(empty(), editor))[0].when.clock_range.cross_midnight,
    true,
  );
  editor.form.timing.end = "25:00";
  assert.match(editorErrors(empty(), editor).end, /valid/);
});

test("clearing optional ends restores fixed timing and retains existing weekdays", () => {
  const { program: p } = create(empty(), "Morning");
  p.routines[0].steps[0].days = ["mon", "wed"];
  p.routines[0].steps[0].when.clock_range = {
    earliest: "06:40:10",
    latest: "07:20:30",
  };
  const edit = stepEditor(p, stepEntries(p)[0]);
  assert.equal(edit.form.timing.start, "06:40:10");
  assert.equal(edit.form.timing.end, "07:20:30");
  edit.form.timing.end = "";
  const fixed = buildStep(p, edit);
  assert.deepEqual(fixed.routines[0].steps[0].when.clock_range, {
    earliest: "06:40:10",
    latest: "06:40:10",
    cross_midnight: false,
  });
  assert.deepEqual(fixed.routines[0].steps[0].days, ["mon", "wed"]);
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
    buildStep(window, reopened).routines[0].steps[0].when.sun_range
      .offset_range,
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
