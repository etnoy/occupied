import type { OccupiedPanel } from "./occupied-panel.js";
import { entityName, required } from "./util.js";
import {
  stepEntries,
  editorErrors,
  offsetErrors,
  buildStep,
} from "./step-model.js";
import { createEditorFields } from "./editor-fields.js";

export function focusEditor(panel: OccupiedPanel, key?: string) {
  const target = key
    ? panel.shadowRoot.querySelector<HTMLElement>(
        `[data-builder-field="${key}"]`,
      )
    : panel.shadowRoot.querySelector<HTMLElement>(
        '.routine-editor [aria-invalid="true"]',
      ) || panel.shadowRoot.querySelector<HTMLElement>(".routine-editor h2");
  target?.focus();
}

export function createStepEditorContext(panel: OccupiedPanel) {
  const editor = panel.stepEditor!,
    form = editor.form,
    time = form.timing,
    t = panel.t,
    editing = editor.existing;
  const refresh = (key?: string) => {
    panel.flush();
    focusEditor(panel, key);
  };
  const changed = (key: string) => {
    editor.changed = true;
    panel.version++;
    panel.validatedVersion = -1;
    delete editor.errors[key];
    if (["startOffset", "endOffset"].includes(key)) {
      const errors = offsetErrors(time);
      for (const offset of ["startOffset", "endOffset"]) {
        if (errors[offset]) editor.errors[offset] = errors[offset];
        else delete editor.errors[offset];
      }
    }
    // Lit updates the existing inputs and HA selectors; typing retains focus.
    panel.flush();
  };
  const { field, error } = createEditorFields(panel, changed, (key) =>
    focusEditor(panel, key),
  );
  const submit = async () => {
    if (
      !editing &&
      editor.stage === 2 &&
      !form.name.trim() &&
      form.entities.length
    ) {
      const target = `${entityName(panel.catalog, form.entities[0])}${form.entities.length > 1 ? ` +${form.entities.length - 1}` : ""}`;
      form.name =
        form.kind === "entities"
          ? `${target} ${t(form.action === "turn_off" ? "off" : "on")}`
          : target;
    }
    editor.errors = editorErrors(
      panel.draft,
      editor,
      editing ? 2 : editor.stage,
    );
    if (Object.keys(editor.errors).length) return refresh();
    if (!editing && editor.stage < 2) {
      editor.stage++;
      return refresh();
    }
    try {
      const candidate = buildStep(panel.draft, editor);
      editor.candidatePath = required(
        stepEntries(candidate).find((entry) => entry.id === editor.id),
      ).path;
      if (panel.document?.source === "file") {
        panel.change([], candidate);
        panel.selectedStep = editor.id;
        panel.stepEditor = null;
        panel.renderView();
      } else await panel.save(candidate);
    } catch (error) {
      panel.fail(error);
    }
  };
  const cancel = () => {
    panel.stepEditor = null;
    panel.error = "";
    panel.issues = [];
    panel.version++;
    panel.renderView();
  };
  const back = () => {
    editor.stage--;
    refresh();
  };
  return {
    panel,
    editor,
    form,
    time,
    t,
    editing,
    refresh,
    changed,
    field,
    error,
    submit,
    cancel,
    back,
  };
}

export type StepEditorContext = ReturnType<typeof createStepEditorContext>;
