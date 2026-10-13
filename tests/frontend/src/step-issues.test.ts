import test from "node:test";
import assert from "node:assert/strict";
import { stepEntries } from "@occupied/step-model.js";
import { warningStepId } from "@occupied/step-issues.js";

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
