import test from "node:test";
import assert from "node:assert/strict";
import { actionForm, actionErrors } from "@occupied/lib/models/step-model.js";
import { randomEditor } from "@occupied/lib/models/random-model.js";
import { changeActionKind } from "@occupied/lib/utils/action-kind.js";

void test("new random end service actions default to homeassistant.turn_off", () => {
  const form = randomEditor({}).form.off;
  changeActionKind(form, "service", () => false);
  assert.equal(form.service, "homeassistant.turn_off");
  assert.equal(actionErrors(form).service, undefined);
});

void test("shorthand actions start with a full service name", () => {
  for (const action of ["turn_on", "turn_off"]) {
    const form = actionForm({ action, entities: ["light.test"] });
    assert.equal(form.service, `homeassistant.${action}`);
    changeActionKind(form, "service", () => false);
    assert.equal(actionErrors(form).service, undefined);
  }
});

void test("switching to service repairs a shorthand buffer using the current action", () => {
  const form = actionForm({ action: "turn_on", entities: ["light.test"] });
  form.service = "turn_on";
  changeActionKind(form, "turn_off", () => false);
  changeActionKind(form, "service", () => false);
  assert.equal(form.service, "homeassistant.turn_off");
  assert.equal(actionErrors(form).service, undefined);
});

void test("explicit script and cover services survive a kind change", () => {
  for (const action of ["script.turn_on", "cover.close_cover"]) {
    const form = actionForm({
      action,
      entities: [`${action.split(".", 1)[0]}.test`],
    });
    changeActionKind(form, "service", () => false);
    assert.equal(form.service, action);
    assert.equal(actionErrors(form).service, undefined);
  }
});
