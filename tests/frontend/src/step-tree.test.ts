import test from "node:test";
import assert from "node:assert/strict";
import { stepTree } from "@occupied/lib/controllers/steps.js";
import { stepEntries } from "@occupied/lib/models/step-model.js";
import type { Program } from "@occupied/lib/types.js";

const tree = (steps: Program["steps"]) =>
  stepTree(stepEntries({ steps })).map(({ entry, depth }) => [entry.id, depth]);

void test("step branches follow configuration order regardless of start times", () => {
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
      ["evening", 0],
      ["morning", 0],
      ["child", 1],
      ["grandchild", 2],
      ["secondChild", 1],
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
