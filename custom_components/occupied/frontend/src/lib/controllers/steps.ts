import type { LoadedOccupiedPanel } from "../../occupied-panel.js";
import type { StepEntry, Translate } from "../types.js";
import {
  dependentNames,
  stepEditor,
  stepEntries,
} from "../models/step-model.js";
import { copy, removeStep } from "../models/model.js";
import { focusEditor } from "./step-editor-controller.js";

export async function deleteStep(panel: LoadedOccupiedPanel, id: string) {
  if (
    !panel.document ||
    panel.busy ||
    panel.stale ||
    dependentNames(panel.draft, id).length > 0
  ) {
    return false;
  }
  const entry = stepEntries(panel.draft, panel.catalog, panel.t).find(
    (step) => step.id === id,
  );
  if (!entry) {
    return true;
  }
  const candidate = copy(panel.draft);
  removeStep(candidate, entry.path);
  if (panel.document.source === "file") {
    panel.selectedStep = null;
    panel.stepEditor = null;
    panel.change([], candidate, true);

    return true;
  }
  if (await panel.save(candidate)) {
    panel.selectedStep = null;
    panel.stepEditor = null;

    return true;
  }

  return false;
}

export function startStep(
  panel: LoadedOccupiedPanel,
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
  panel: LoadedOccupiedPanel,
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

function scrollStepEditorIntoView(panel: LoadedOccupiedPanel, id: string) {
  panel.shadowRoot
    .getElementById(`step-editor-${id}`)
    ?.querySelector<HTMLElement>(".step-editor")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function openStep(panel: LoadedOccupiedPanel, entry: StepEntry) {
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

function showEntry(panel: LoadedOccupiedPanel, entry: StepEntry) {
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
