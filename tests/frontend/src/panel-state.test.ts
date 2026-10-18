import test from "node:test";
import assert from "node:assert/strict";
import type { OccupiedPanel } from "@occupied/occupied-panel.js";

type OptionalProgramState = {
  [
    Key in "draft" | "saved" | "document" | "previewProgram"
  ]: undefined extends OccupiedPanel[Key] ? true : false;
};

const optional: OptionalProgramState = {
  draft: true,
  saved: true,
  document: true,
  previewProgram: true,
};
void test("program state types admit the unloaded lifecycle", () => {
  assert.deepEqual(optional, {
    draft: true,
    saved: true,
    document: true,
    previewProgram: true,
  });
});
