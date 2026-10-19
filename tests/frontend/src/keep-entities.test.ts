import test from "node:test";
import assert from "node:assert/strict";
import { actionForm } from "@occupied/lib/models/step-model.js";
import { changeActionKind } from "@occupied/lib/utils/action-kind.js";

void test("switching to service keeps selected lights and switches", () => {
  const form = actionForm({
    action: "turn_on",
    entities: ["light.a", "switch.b"],
  });
  changeActionKind(form, "service", () => false);
  assert.deepEqual(form.entities, ["light.a", "switch.b"]);
});

void test("kind changes retain only compatible domains and one scene", () => {
  for (const [kind, expected] of [
    ["cover", ["cover.blind"]],
    ["scene", ["scene.first"]],
    ["turn_on", ["light.a", "switch.b"]],
  ] as const) {
    const form = actionForm({
      action: "script.turn_on",
      entities: [
        "light.a",
        "cover.blind",
        "remote.tv",
        "scene.first",
        "scene.second",
        "switch.b",
      ],
    });
    changeActionKind(form, kind, () => false);
    assert.deepEqual(form.entities, expected);
  }
});

void test("incompatible selections become empty and same-kind on/off stays unchanged", () => {
  const form = actionForm({ action: "turn_on", entities: ["light.a"] });
  changeActionKind(form, "turn_off", () => false);
  assert.deepEqual(form.entities, ["light.a"]);
  changeActionKind(form, "scene", () => false);
  assert.deepEqual(form.entities, []);
});
