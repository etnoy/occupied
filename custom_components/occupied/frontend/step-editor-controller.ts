import type { OccupiedPanel } from "./occupied-panel.js";
import { entityName, required } from "./util.js";
import {
  stepEntries,
  editorErrors,
  offsetErrors,
  buildStep,
} from "./step-model.js";

export function focusEditor(panel: OccupiedPanel, key?: string) {
  const target = key
    ? panel.shadowRoot.querySelector<HTMLElement>(
        `[data-builder-field="${CSS.escape(key)}"]`,
      )
    : panel.shadowRoot.querySelector<HTMLElement>(
        '.routine-editor [aria-invalid="true"]',
      ) ||
      panel.shadowRoot.querySelector<HTMLElement>(
        '.routine-editor [data-builder-field="name"]',
      );
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
        if (errors[offset]) {
          editor.errors[offset] = errors[offset];
        } else {
          delete editor.errors[offset];
        }
      }
    }
    // Svelte updates the existing inputs and HA selectors; typing retains focus.
    panel.flush();
  };
  const submit = async () => {
    if (!editing && !form.name.trim() && form.entities.length > 0) {
      const target = `${entityName(panel.catalog, form.entities[0])}${form.entities.length > 1 ? ` +${form.entities.length - 1}` : ""}`;
      form.name =
        form.kind === "entities"
          ? `${target} ${t(form.action === "turn_off" ? "off" : "on")}`
          : target;
    }
    editor.errors = editorErrors(panel.draft, editor);
    if (Object.keys(editor.errors).length > 0) {
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
      } else {
        await panel.save(candidate);
      }
    } catch (error) {
      panel.fail(error);
    }
  };
  const cancel = () => {
    panel.requestStepExit(() => {
      panel.shadowRoot.getElementById(`step-card-${editor.id}`)?.focus();
    });
  };
  return {
    panel,
    // New facades notify Svelte of in-place form and validation changes.
    editor: new Proxy(editor, {}),
    form: new Proxy(form, {}),
    time: new Proxy(time, {}),
    t,
    editing,
    refresh,
    changed,
    submit,
    cancel,
  };
}

export type StepEditorContext = ReturnType<typeof createStepEditorContext>;
