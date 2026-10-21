import test from "node:test";
import assert from "node:assert/strict";
import { stepTree } from "@occupied/lib/controllers/steps.js";
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
