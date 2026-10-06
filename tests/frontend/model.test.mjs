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
