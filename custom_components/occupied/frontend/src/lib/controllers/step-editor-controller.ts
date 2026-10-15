import { prepareCustomAction } from "../utils/custom-action.js";
import type { OccupiedPanel } from "../../occupied-panel.js";
import { required, offsetErrors } from "../utils/util.js";
import { stepEntries, editorErrors, buildStep } from "../models/step-model.js";

export function focusEditor(panel: OccupiedPanel, key?: string) {
  const target = key
    ? panel.shadowRoot.querySelector<HTMLElement>(
        `[data-builder-field="${CSS.escape(key)}"]`,
      )
    : panel.shadowRoot.querySelector<HTMLElement>(
        '.step-editor [aria-invalid="true"]',
      ) ||
      panel.shadowRoot.querySelector<HTMLElement>(
        '.step-editor [data-builder-field="days"][aria-describedby]',
      ) ||
      panel.shadowRoot.querySelector<HTMLElement>(
        '.step-editor [data-builder-field="name"]',
      );
  target?.focus();
}

export function createStepEditorContext(panel: OccupiedPanel) {
  const editor = panel.stepEditor!,
    form = editor.form,
    time = form.timing,
    t = panel.t,
    editing = editor.existing;

  const epoch = panel.epoch;
  const isCurrent = () =>
    panel.epoch === epoch && panel.activeEditor === editor;

  const refresh = (key?: string) => {
    panel.flush();
    focusEditor(panel, key);
  };

  const changed = (key: string) => {
    editor.changed = true;
    panel.version++;
    panel.validatedVersion = -1;
    delete editor.errors[key];
    if (key === "days") {
      const { anchor } = editorErrors(panel.draft, editor);
      if (anchor) {
        editor.errors.anchor = anchor;
      } else {
        delete editor.errors.anchor;
      }
    }

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

    panel.flush();
  };

  const submit = async () => {
    if (!isCurrent()) {
      return;
    }
    editor.errors = editorErrors(panel.draft, editor);
    if (Object.keys(editor.errors).length > 0) {
      return refresh();
    }
    try {
      try {
        await prepareCustomAction(panel, form);
      } catch (error) {
        if (!isCurrent()) {
          return;
        }
        editor.errors.customYaml =
          error instanceof Error ? error.message : String(error);

        return refresh("customYaml");
      }

      if (!isCurrent()) {
        return;
      }

      const candidate = buildStep(panel.draft, editor);
      editor.candidatePath = required(
        stepEntries(candidate).find((entry) => entry.id === editor.id),
      ).path;
      if (panel.document?.source === "file") {
        if (form.kind === "custom") {
          const version = panel.version;
          const validation = await panel.ws("editor_validate", {
            program: candidate,
          });

          if (panel.version !== version || !isCurrent()) {
            return;
          }

          if (!validation.valid) {
            panel.showIssues(validation);
            if (validation.issues.length > 0) {
              panel.focusIssue(validation.issues[0]);
            }

            return;
          }
        }

        panel.change([], candidate);
        panel.selectedStep = editor.id;
        panel.stepEditor = null;
        panel.renderView();
      } else {
        await panel.save(candidate);
      }
    } catch (error) {
      if (isCurrent()) {
        panel.fail(error);
      }
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
    stepId: editor.id,
    refresh,
    changed,
    submit,
    cancel,
  };
}

export type StepEditorContext = ReturnType<typeof createStepEditorContext>;
