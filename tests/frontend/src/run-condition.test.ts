import test from "node:test";
import assert from "node:assert/strict";
import {
  managedOffEntities,
  runConditionForm,
  runConditionErrors,
  runConditionValue,
  runConditionStateOptions,
} from "@occupied/lib/models/run-condition.js";

void test("optional condition defaults to no gate with a retained 30 second enforcement delay", () => {
  const form = runConditionForm();
  assert.equal(form.enabled, false);
  assert.equal(form.enforceState, false);
  assert.equal(form.startDelay, "30s");
  assert.deepEqual(runConditionErrors(form), {});
  assert.equal(runConditionValue(form), undefined);
});

void test("editing enforcement and delay preserves the other run condition settings", () => {
  const scalar = runConditionForm({
    entity_id: "sensor.alarm",
    state: "armed_away",
  });
  assert.deepEqual(scalar.states, ["armed_away"]);
  const form = runConditionForm({
    entity_id: "alarm_control_panel.alarm",
    state: ["armed_away", "armed_night"],
    enforce_state_on_start: true,
    start_delay: "45s",
  });
  assert.deepEqual(runConditionErrors(form), {});
  form.startDelay = "50s";
  form.enforceState = false;
  assert.equal(runConditionValue(form)?.start_delay, "50s");
  assert.equal(runConditionValue(form)?.enforce_state_on_start, false);
  assert.deepEqual(runConditionValue(form)?.state, [
    "armed_away",
    "armed_night",
  ]);
});

void test("invalid states, entity IDs and out of bounds delays receive field errors", () => {
  const form = runConditionForm({
    entity_id: "bad",
    state: ["unknown", "unavailable"],
  });
  form.startDelay = "1h1s";
  assert.deepEqual(Object.keys(runConditionErrors(form)).sort(), [
    "entityId",
    "startDelay",
    "states",
  ]);
  for (const delay of ["0s", "30s", "1h"]) {
    form.startDelay = delay;
    assert.equal(runConditionErrors(form).startDelay, undefined);
  }
  for (const delay of ["", "-1s", "30", "1d"]) {
    form.startDelay = delay;
    assert.ok(runConditionErrors(form).startDelay);
  }
});

void test("enforcement defaults off and retains a customized delay", () => {
  const form = runConditionForm({ entity_id: "sensor.alarm", state: "armed" });
  form.startDelay = "1m";
  assert.deepEqual(runConditionErrors(form), {});
  assert.deepEqual(runConditionValue(form), {
    entity_id: "sensor.alarm",
    state: ["armed"],
    enforce_state_on_start: false,
    start_delay: "1m",
  });
});

void test("alarm suggestions retain custom states without suggesting unresolved values", () => {
  const choices = runConditionStateOptions(
    "alarm_control_panel.house",
    ["custom", "armed_away"],
    "unavailable",
  );
  assert.ok(
    choices.includes("armed_away") &&
      choices.includes("armed_night") &&
      choices.includes("custom"),
  );
  assert.equal(choices.filter((choice) => choice === "armed_away").length, 1);
  assert.ok(!choices.includes("unavailable"));
});

void test("extra off entities round trip, deduplicate, and validate supported domains", () => {
  const config = {
    entity_id: "sensor.alarm",
    state: "armed",
    off_entities: ["light.bathroom", "switch.fan"],
  };
  const form = runConditionForm(config);
  form.offEntities.push("light.bathroom");
  assert.deepEqual(config.off_entities, ["light.bathroom", "switch.fan"]);
  assert.deepEqual(runConditionValue(form)?.off_entities, config.off_entities);
  assert.deepEqual(runConditionErrors(form), {});
  form.offEntities.push("cover.blind");
  assert.equal(
    runConditionErrors(form).offEntities,
    "run_condition_off_entities_error",
  );
});

void test("extra off entity warnings find step, custom, disabled and random targets", () => {
  const program = {
    steps: {
      regular: { timing: {}, entities: ["light.regular"] },
      disabled: {
        timing: {},
        enabled: false,
        actions: [{ entities: { "switch.custom": {} } }],
      },
    },
    random: {
      event: {
        start: {},
        end: {},
        on: { entities: ["light.random_on"] },
        off: { actions: [{ entities: ["light.random_off"] }] },
      },
    },
  };
  assert.deepEqual(
    managedOffEntities(program, [
      "light.extra",
      "light.regular",
      "switch.custom",
      "light.random_on",
      "light.random_off",
      "light.regular",
    ]),
    ["light.regular", "switch.custom", "light.random_on", "light.random_off"],
  );
});
