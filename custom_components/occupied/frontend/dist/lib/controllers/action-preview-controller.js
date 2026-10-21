// Generated from custom_components/occupied/frontend/src/lib/controllers/action-preview-controller.ts by pnpm run build. Do not edit.
import { copy } from "../models/model.js";
import { actionErrors, buildAction } from "../models/step-model.js";
import { prepareCustomAction } from "../utils/custom-action.js";
export function previewAction(panel, form) {
  return panel.run(async (epoch) => {
    const editor = panel.activeEditor;
    const snapshot = copy({ ...form });
    const errors = Object.values(actionErrors(snapshot));
    if (errors.length > 0) {
      throw new Error(errors.map((key) => panel.t(key)).join("\n"));
    }
    await prepareCustomAction(panel, snapshot);
    if (panel.epoch !== epoch || panel.activeEditor !== editor) {
      return;
    }
    const result = await panel.ws("action_preview", {
      action: buildAction(snapshot),
      execute: true,
    });
    if (panel.epoch !== epoch || panel.activeEditor !== editor) {
      return;
    }
    if (!result.valid) {
      throw new Error(result.issues.map((issue) => issue.message).join("\n"));
    }
    const failures = result.outcomes.filter(
      (outcome) => outcome.status !== "dispatched",
    );
    if (failures.length > 0) {
      throw new Error(
        failures
          .map((outcome) =>
            `${panel.t(`action_test_${outcome.status}`)} ${outcome.detail || ""}`.trim(),
          )
          .join("\n"),
      );
    }
    return panel.t("action_test_dispatched");
  });
}
