import type { OccupiedPanel } from "./occupied-panel.js";
import type { StepEntry, Translate } from "./types.js";
import { days } from "./model.js";
import { stepEditor, simpleStep, hasStepChanges } from "./step-model.js";
import { focusEditor } from "./step-editor-controller.js";

export function startStep(
  panel: OccupiedPanel,
  entry?: StepEntry | null,
  parent?: StepEntry,
) {
  panel.stepEditor = stepEditor(panel.draft, entry, parent);
  panel.tab = "routines";
  panel.error = "";
  panel.issues = [];
  panel.renderView();
  focusEditor(panel);
}

/** Switch cards only after the user agrees to discard pending form changes. */
export function openStep(panel: OccupiedPanel, entry: StepEntry) {
  if (panel.busy || panel.stepEditor?.id === entry.id) return;
  if (
    panel.stepEditor &&
    hasStepChanges(panel.stepEditor) &&
    !window.confirm(panel.t("Discard unsaved changes and open another step?"))
  )
    return;
  if (simpleStep(entry)) startStep(panel, entry);
  else {
    panel.stepEditor = null;
    panel.error = "";
    panel.issues = [];
    panel.selectedStep = panel.selectedStep === entry.id ? null : entry.id;
    panel.renderView();
  }
}

export function actionSummary(entry: StepEntry, t: Translate) {
  const action = entry.actions?.[0]?.action || "";
  if (action === "scene.turn_on") return t("Activate scene");
  if (simpleStep(entry))
    return /^(?:(?:light|switch)\.)?turn_(on|off)$/.test(action)
      ? t(action.endsWith("turn_off") ? "Turn off" : "Turn on")
      : action;
  return t("Custom actions");
}

export function daySummary(selected: string[], t: Translate) {
  if (selected.length === 7) return t("Every day");
  if (selected.join() === days.slice(0, 5).join()) return t("Weekdays");
  if (selected.join() === days.slice(5).join()) return t("Weekends");
  return selected.map((day) => t(day)).join(", ");
}

export function stepTree(entries: StepEntry[]) {
  const seen = new Set<string>(),
    ordered: { entry: StepEntry; depth: number }[] = [];
  const append = (entry: StepEntry, depth: number) => {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    ordered.push({ entry, depth });
    for (const child of entries)
      if (child.when?.relative_to === entry.id) append(child, depth + 1);
  };
  const isRoot = (step: StepEntry) =>
    !step.when?.relative_to ||
    !entries.some((parent) => parent.id === step.when?.relative_to);
  for (const step of entries) if (isRoot(step)) append(step, 0);
  // Cycles have no root; list any remaining steps at the top level.
  for (const step of entries) append(step, 0);
  return ordered;
}

export function stepSymbol(entry: StepEntry) {
  if (entry.kind !== "steps") return "◷";
  return entry.actions?.every((action) => action.action.endsWith("turn_off"))
    ? "○"
    : "●";
}
