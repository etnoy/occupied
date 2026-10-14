// Generated from custom_components/occupied/frontend/src/lib/controllers/steps.ts by pnpm run build. Do not edit.
import { stepEditor } from "../models/step-model.js";
import { focusEditor } from "./step-editor-controller.js";
export function startStep(panel, entry, parent) {
  if (panel.stepEditor) {
    panel.requestStepExit(() => startStep(panel, entry, parent));
    return;
  }
  showStep(panel, entry, parent);
}
function showStep(panel, entry, parent) {
  panel.stepEditor = stepEditor(panel.draft, entry, parent);
  panel.tab = "steps";
  panel.error = "";
  panel.issues = [];
  panel.renderView();
  focusEditor(panel);
  if (entry) {
    scrollStepEditorIntoView(panel, entry.id);
  }
}
function scrollStepEditorIntoView(panel, id) {
  panel.shadowRoot
    .getElementById(`step-editor-${id}`)
    ?.querySelector(".step-editor")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
export function openStep(panel, entry) {
  if (panel.busy) {
    return;
  }
  if (panel.stepEditor?.id === entry.id) {
    panel.requestStepExit(() => {
      panel.selectedStep = null;
      panel.shadowRoot.getElementById(`step-card-${entry.id}`)?.focus();
    });
    return;
  }
  if (panel.stepEditor) {
    panel.requestStepExit(() => openStep(panel, entry));
    return;
  }
  showEntry(panel, entry);
}
function showEntry(panel, entry) {
  showStep(panel, entry);
}
export function actionSummary(entry, t) {
  if (entry.actions || entry.action === "set_state") {
    return `${t("custom_yaml")} · ${entry.actions?.length || 1} ${t("actions")}`;
  }
  if (entry.action === "scene.turn_on") {
    return t("activate_scene");
  }
  if (entry.action === "turn_on" || entry.action === "turn_off") {
    return t(entry.action === "turn_off" ? "turn_off" : "turn_on");
  }
  return entry.action;
}
export function stepTree(entries) {
  const seen = new Set(),
    ordered = [];
  const append = (entry, depth) => {
    if (seen.has(entry.id)) {
      return;
    }
    seen.add(entry.id);
    ordered.push({ entry, depth });
    for (const child of entries) {
      if (child.timing.relative_to?.step === entry.id) {
        append(child, depth + 1);
      }
    }
  };
  const isRoot = (step) =>
    !step.timing.relative_to?.step ||
    entries.every((parent) => parent.id !== step.timing.relative_to?.step);
  for (const step of entries) {
    if (isRoot(step)) {
      append(step, 0);
    }
  }
  // Cycles have no root; list any remaining steps at the top level.
  for (const step of entries) {
    append(step, 0);
  }
  return ordered;
}
