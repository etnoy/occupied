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
  buildRoutine,
  routineEditor,
  routineEntries,
  simpleRoutine,
  editorErrors,
  dependentNames,
  timingSummary,
} from "../../custom_components/occupied/frontend/routine-model.js";

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
  const editor = routineEditor(program, null, parent);
  Object.assign(editor.form, { name, entities });
  return { editor, program: buildRoutine(program, editor) };
}
test("entity-first creation supports mixed domains with brightness and manages only lights", () => {
  const p = empty(),
    editor = routineEditor(p);
  Object.assign(editor.form, {
    name: "Evening",
    entities: ["light.a", "switch.b"],
    brightness: 60,
  });
  const next = buildRoutine(p, editor),
    entry = routineEntries(next)[0];
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
  assert.equal(simpleRoutine(entry), true);
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
  const parent = routineEntries(first)[0];
  const { program: next } = create(first, "Kitchen", ["light.kitchen"], parent);
  const child = routineEntries(next)[1];
  assert.equal(child.when.relative_to, parent.id);
  assert.equal(child.when.offset_range.fixed, "30m");
  assert.deepEqual(child.days, parent.days);
  assert.deepEqual(dependentNames(next, parent.id), ["Kitchen"]);
  const edit = routineEditor(next, routineEntries(next)[0]);
  edit.form.timing = {
    ...edit.form.timing,
    mode: "relative",
    parent: child.id,
  };
  assert.match(editorErrors(next, edit).parent, /circular/);
  edit.form.timing.mode = "clock";
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
  const editor = routineEditor(p, routineEntries(p)[0]);
  editor.form.name = "Renamed";
  const next = buildRoutine(p, editor),
    expected = structuredClone(p);
  expected.routines[0].steps[0].name = "Renamed";
  assert.deepEqual(next, expected);
  assert.equal(simpleRoutine(routineEntries(next)[0]), true);
});
test("editing entity selection does not modify a shared group or replace existing baselines", () => {
  const { program: p } = create(empty(), "Evening");
  p.groups = [
    { id: "living", name: "Living", entities: ["light.living_room"] },
  ];
  p.routines[0].steps[0].actions[0].targets = { groups: ["living"] };
  p.lighting.baseline[0].state = "on";
  p.lighting.baseline[0].brightness_pct = 40;
  const editor = routineEditor(p, routineEntries(p)[0]);
  editor.form.entities.push("light.kitchen");
  const next = buildRoutine(p, editor);
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
  const editor = routineEditor(p, routineEntries(p)[0]);
  editor.form.days = ["mon", "tue"];
  const next = buildRoutine(p, editor);
  assert.deepEqual(next.routines[0].steps, [p.routines[0].steps[1]]);
  assert.deepEqual(next.routines[1].defaults, p.routines[0].defaults);
  assert.deepEqual(routineEntries(next).find((e) => e.id === editor.id).days, [
    "mon",
    "tue",
  ]);
});
test("clock variation, signed sun offsets and before/after preserve overnight semantics", () => {
  const p = empty(),
    editor = routineEditor(p);
  Object.assign(editor.form, { name: "Night", entities: ["light.a"] });
  editor.form.timing.time = "00:05";
  editor.form.timing.variation = 15;
  let next = buildRoutine(p, editor);
  assert.deepEqual(next.routines[0].steps[0].when.clock_range, {
    earliest: "23:50",
    latest: "00:20",
    cross_midnight: true,
  });
  assert.equal(next.routines[0].steps[0].allow_cross_boundary, true);
  Object.assign(editor.form.timing, {
    mode: "sun",
    direction: "before",
    offset: 30,
    variation: 5,
  });
  next = buildRoutine(p, editor);
  assert.deepEqual(next.routines[0].steps[0].when.sun_range.offset_range, {
    min: "-35m",
    max: "-25m",
  });
  assert.equal(
    timingSummary(routineEntries(next)[0], []),
    "25–35 min before sunset",
  );
});
test("existing fractional-minute ranges remain editable and untouched on rename", () => {
  const { program: first } = create(empty(), "Wake");
  const { program: p } = create(
    first,
    "Breakfast",
    ["light.kitchen"],
    routineEntries(first)[0],
  );
  p.routines[1].steps[0].when.offset_range = { min: "5m", max: "20m" };
  const entry = routineEntries(p)[1];
  assert.equal(simpleRoutine(entry), true);
  const editor = routineEditor(p, entry);
  editor.form.name = "New breakfast";
  assert.deepEqual(
    buildRoutine(p, editor).routines[1].steps[0].when,
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
  const entry = routineEntries(p)[0];
  assert.equal(simpleRoutine({ ...entry, kind: "activities" }), false);
  assert.equal(
    simpleRoutine({
      ...entry,
      actions: [...entry.actions, { action: "turn_off" }],
    }),
    false,
  );
  assert.equal(
    simpleRoutine({ ...entry, actions: [{ action: "safety_off" }] }),
    false,
  );
});
