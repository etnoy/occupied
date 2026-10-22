import test from "node:test";
import assert from "node:assert/strict";
import { stepEntries } from "@occupied/lib/models/step-model.js";
import { randomEntries } from "@occupied/lib/models/random-model.js";
import {
  warningStepId,
  warningRandomId,
} from "@occupied/lib/utils/step-issues.js";

const entries = stepEntries({
  schema_version: 1,
  name: "House",
  steps: Object.fromEntries(
    ["heater", "heater_2"].map((id) => [
      id,
      {
        action: "turn_on" as const,
        entities: ["switch.heater"],
        timing: { absolute_time: { start: "18:00" } },
      },
    ]),
  ),
});

void test("entity warnings belong to their exact step, including multiple targets", () => {
  for (const entity of ["switch.heater", "switch.other"]) {
    assert.equal(
      warningStepId(
        {
          severity: "warning",
          message: `Unresolved entity: ${entity}`,
          model_path: ["steps", "heater_2", "entities"],
        },
        entries,
      ),
      "heater_2",
    );
  }
  assert.equal(
    warningStepId(
      {
        severity: "warning",
        message: "Missing entity",
        path: "$.steps.heater_2.entities",
      },
      entries,
    ),
    "heater_2",
  );
});

void test("general warnings, missing steps, and errors stay in the general issue list", () => {
  for (const issue of [
    { severity: "warning", message: "No baseline" },
    {
      severity: "warning",
      message: "Missing",
      model_path: ["steps", "removed", "entities"],
    },
    {
      severity: "warning",
      message: "Missing",
      path: "$.steps.heater_extra.entities",
    },
    {
      severity: "error",
      message: "Invalid",
      model_path: ["steps", "heater", "timing"],
    },
  ]) {
    assert.equal(warningStepId(issue, entries), undefined);
  }
});

void test("random action warnings belong to the exact event for either phase", () => {
  const random = randomEntries({
    schema_version: 1,
    name: "House",
    random: Object.fromEntries(
      ["heater", "heater_2"].map((id) => [
        id,
        {
          start: { absolute_time: { start: "18:00" } },
          end: { duration: { min: "1h" } },
          on: { action: "turn_on" as const, entities: ["switch.heater"] },
          off: { action: "turn_off" as const, entities: ["switch.other"] },
        },
      ]),
    ),
  });
  for (const phase of ["on", "off"]) {
    for (const location of [
      { model_path: ["random", "heater_2", phase, "entities"] },
      { model_path: ["random", "heater_2", phase, "actions", 0, "entities"] },
      { path: `$.random.heater_2.${phase}.entities` },
    ]) {
      const issue = {
        severity: "warning",
        message: "Missing entity",
        ...location,
      };
      assert.equal(warningRandomId(issue, random), "heater_2");
      assert.equal(warningStepId(issue, entries), undefined);
    }
  }
  for (const location of [
    { model_path: ["steps", "heater", "entities"] },
    { model_path: ["random", "removed", "on", "entities"] },
    { path: "$.random.heater_extra.on.entities" },
    {},
  ]) {
    assert.equal(
      warningRandomId(
        { severity: "warning", message: "Missing", ...location },
        random,
      ),
      undefined,
    );
  }
  assert.equal(
    warningRandomId(
      {
        severity: "error",
        message: "Invalid",
        model_path: ["random", "heater", "on"],
      },
      random,
    ),
    undefined,
  );
});

void test("blocking off entity conflicts receive orange activity cards", () => {
  assert.equal(
    warningStepId(
      {
        code: "off_entity_conflict",
        severity: "error",
        message: "Entity conflict",
        model_path: ["steps", "heater_2", "entities", 0],
      },
      entries,
    ),
    "heater_2",
  );
  assert.equal(
    warningStepId(
      {
        code: "off_entity_conflict",
        severity: "error",
        message: "Entity conflict",
        model_path: ["run_condition", "off_entities", 0],
      },
      entries,
    ),
    undefined,
  );
});
