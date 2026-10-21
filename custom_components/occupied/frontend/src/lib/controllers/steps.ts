import type { LoadedOccupiedPanel } from "../../occupied-panel.js";
import type { StepEntry, TimeSource, Translate } from "../types.js";
import {
  dependentNames,
  stepEditor,
  stepEntries,
} from "../models/step-model.js";
import { copy, removeStep } from "../models/model.js";
import { focusEditor } from "./step-editor-controller.js";
import { editableEntityMapping } from "../utils/entity-settings.js";
import { timingOrder } from "../utils/timing-order.js";
import type { TimedEntry } from "../utils/timing-order.js";

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
  if (panel.activeEditor) {
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
  if (panel.activeEditor) {
    panel.requestStepExit(() => openStep(panel, entry));

    return;
  }
  showEntry(panel, entry);
}

function showEntry(panel: LoadedOccupiedPanel, entry: StepEntry) {
  showStep(panel, entry);
}

export function actionSummary(entry: StepEntry, t: Translate) {
  const mapping = editableEntityMapping(entry);
  if (mapping) {
    return t(mapping.action);
  }
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

export function stepTree<T extends TimedEntry>(
  entries: T[],
  sources: Pick<TimeSource, "value" | "today_time">[] = [],
  relatedEntries: TimedEntry[] = [],
) {
  const sortedEntries = [...entries].sort(
    timingOrder([...entries, ...relatedEntries], sources),
  );
  const seen = new Set<string>(),
    ordered: { entry: T; depth: number }[] = [];
  const parentId = (entry: T) => {
    const relative = (entry.timing || entry.start)?.relative_to;

    return (
      relative?.step ||
      (relative?.random ? `random:${relative.random}` : undefined)
    );
  };
  const append = (entry: T, depth: number) => {
    if (seen.has(entry.id)) {
      return;
    }
    seen.add(entry.id);
    ordered.push({ entry, depth });
    for (const child of sortedEntries) {
      if (parentId(child) === entry.id) {
        append(child, depth + 1);
      }
    }
  };
  const isRoot = (entry: T) =>
    !parentId(entry) ||
    entries.every((parent) => parent.id !== parentId(entry));
  for (const step of sortedEntries) {
    if (isRoot(step)) {
      append(step, 0);
    }
  }

  for (const step of sortedEntries) {
    append(step, 0);
  }

  return ordered;
}
