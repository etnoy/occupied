import type { OccupiedPanel } from "../../occupied-panel.js";
import type { StepEntry, Translate } from "../types.js";
import { stepEditor } from "../models/step-model.js";
import { focusEditor } from "./step-editor-controller.js";

export function startStep(
  panel: OccupiedPanel,
  entry?: StepEntry | null,
  parent?: StepEntry,
) {
  if (panel.stepEditor) {
    panel.requestStepExit(() => startStep(panel, entry, parent));

    return;
  }
  showStep(panel, entry, parent);
}

function showStep(
  panel: OccupiedPanel,
  entry?: StepEntry | null,
  parent?: StepEntry,
) {
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

function scrollStepEditorIntoView(panel: OccupiedPanel, id: string) {
  panel.shadowRoot
    .getElementById(`step-editor-${id}`)
    ?.querySelector<HTMLElement>(".step-editor")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function openStep(panel: OccupiedPanel, entry: StepEntry) {
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

function showEntry(panel: OccupiedPanel, entry: StepEntry) {
  showStep(panel, entry);
}

export function actionSummary(entry: StepEntry, t: Translate) {
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

export function stepTree(entries: StepEntry[]) {
  const seen = new Set<string>(),
    ordered: { entry: StepEntry; depth: number }[] = [];
  const append = (entry: StepEntry, depth: number) => {
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
  const isRoot = (step: StepEntry) =>
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
