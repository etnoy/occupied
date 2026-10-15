import test from "node:test";
import assert from "node:assert/strict";
import {
  runConditionForm,
  runConditionErrors,
  runConditionValue,
  runConditionStateOptions,
} from "@occupied/lib/models/run-condition.js";

void test("optional condition defaults to no gate with a retained 30 second enforcement delay", () => {
  const form = runConditionForm();
  assert.equal(form.enabled, false);
  assert.equal(form.legacyEnforceState, undefined);
  assert.equal(form.startDelay, "30s");
  assert.deepEqual(runConditionErrors(form), {});
  assert.equal(runConditionValue(form), undefined);
});

void test("editing delay preserves the legacy enforcement value without controlling the HA switch", () => {
  const scalar = runConditionForm({
    entity_id: "sensor.alarm",
    state: "armed_away",
  });
  assert.deepEqual(scalar.states, ["armed_away"]);
  const form = runConditionForm({
    entity_id: "alarm_control_panel.8124_aaa_zone_1_alarm",
    state: ["armed_away", "armed_night"],
    enforce_state_on_start: true,
    start_delay: "45s",
  });
  assert.deepEqual(runConditionErrors(form), {});
  form.startDelay = "50s";
  assert.equal(runConditionValue(form)?.start_delay, "50s");
  assert.equal(runConditionValue(form)?.enforce_state_on_start, true);
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

void test("delay remains editable without introducing a legacy enforcement option", () => {
  const form = runConditionForm({ entity_id: "sensor.alarm", state: "armed" });
  form.startDelay = "1m";
  assert.deepEqual(runConditionErrors(form), {});
  assert.deepEqual(runConditionValue(form), {
    entity_id: "sensor.alarm",
    state: ["armed"],
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
