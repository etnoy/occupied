import test from "node:test";
import assert from "node:assert/strict";
import { stepTree } from "@occupied/lib/controllers/steps.js";
import { randomEntries } from "@occupied/lib/models/random-model.js";
import { stepEntries } from "@occupied/lib/models/step-model.js";
import type { Program } from "@occupied/lib/types.js";

const tree = (steps: Program["steps"]) =>
  stepTree(stepEntries({ steps })).map(({ entry, depth }) => [entry.id, depth]);

void test("step branches and siblings follow start times while preserving hierarchy", () => {
  assert.deepEqual(
    tree({
      evening: { timing: { absolute_time: { start: "20:00" } } },
      child: {
        timing: { relative_to: { step: "morning", start_offset: "-1h" } },
      },
      morning: { timing: { absolute_time: { start: "06:00" } } },
      secondChild: {
        timing: { relative_to: { step: "morning", start_offset: "-2h" } },
      },
      grandchild: { timing: { relative_to: { step: "child" } } },
    }),
    [
      ["morning", 0],
      ["secondChild", 1],
      ["child", 1],
      ["grandchild", 2],
      ["evening", 0],
    ],
  );
});

void test("broken references and cycles keep every step visible once", () => {
  assert.deepEqual(
    tree({
      orphan: { timing: { relative_to: { step: "missing" } } },
      a: { timing: { relative_to: { step: "b" } } },
      b: { timing: { relative_to: { step: "a" } } },
      self: { timing: { relative_to: { step: "self" } } },
    }),
    [
      ["orphan", 0],
      ["a", 0],
      ["b", 1],
      ["self", 0],
    ],
  );
});

void test("mixed activity sorts roots and siblings while indenting cross-type dependencies", () => {
  const program: Program = {
    steps: {
      late: { timing: { absolute_time: { start: "20:00" } } },
      shared: { timing: { absolute_time: { start: "06:00" } } },
      child: {
        timing: { relative_to: { step: "shared", start_offset: "30m" } },
      },
      afterRandom: {
        timing: { relative_to: { random: "shared", start_offset: "10m" } },
      },
    },
    random: {
      shared: {
        on: {},
        off: {},
        start: { absolute_time: { start: "08:00" } },
        end: { absolute_time: { start: "09:00" } },
      },
      nested: {
        on: {},
        off: {},
        end: { absolute_time: { start: "07:00" } },
        start: { relative_to: { step: "shared", start_offset: "15m" } },
      },
      grandchild: {
        on: {},
        off: {},
        end: { absolute_time: { start: "10:00" } },
        start: { relative_to: { random: "shared", start_offset: "20m" } },
      },
    },
  };
  const entries = [
    ...stepEntries(program),
    ...randomEntries(program).map((entry) => ({
      ...entry,
      id: `random:${entry.id}`,
    })),
  ];
  assert.deepEqual(
    stepTree(entries).map(({ entry, depth, branches }) => [
      entry.id,
      depth,
      branches,
    ]),
    [
      ["shared", 0, []],
      ["random:nested", 1, [true]],
      ["child", 1, [false]],
      ["random:shared", 0, []],
      ["afterRandom", 1, [true]],
      ["random:grandchild", 1, [false]],
      ["late", 0, []],
    ],
  );
});

void test("mixed cycles and missing random references remain visible exactly once", () => {
  assert.deepEqual(
    stepTree([
      { id: "orphan", timing: { relative_to: { random: "missing" } } },
      { id: "step", timing: { relative_to: { random: "event" } } },
      { id: "random:event", start: { relative_to: { step: "step" } } },
    ]).map(({ entry, depth }) => [entry.id, depth]),
    [
      ["orphan", 0],
      ["step", 0],
      ["random:event", 1],
    ],
  );
});

void test("connector branches continue through descendants and stop at the last sibling", () => {
  const steps: Program["steps"] = {
    morning: { timing: { absolute_time: { start: "06:00" } } },
    breakfast: { timing: { relative_to: { step: "morning" } } },
    day: { timing: { relative_to: { step: "breakfast" } } },
    work: { timing: { relative_to: { step: "breakfast" } } },
    lunch: { timing: { relative_to: { step: "morning", start_offset: "6h" } } },
    evening: { timing: { absolute_time: { start: "20:00" } } },
  };
  assert.deepEqual(
    stepTree(stepEntries({ steps })).map(({ entry, branches }) => [
      entry.id,
      branches,
    ]),
    [
      ["morning", []],
      ["breakfast", [true]],
      ["day", [true, true]],
      ["work", [true, false]],
      ["lunch", [false]],
      ["evening", []],
    ],
  );
});
