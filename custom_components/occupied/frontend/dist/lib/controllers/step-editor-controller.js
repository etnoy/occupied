// Generated from custom_components/occupied/frontend/src/lib/controllers/step-editor-controller.ts by pnpm run build. Do not edit.
import { prepareCustomAction } from "../utils/custom-action.js";
import { required, offsetErrors } from "../utils/util.js";
import { stepEntries, editorErrors, buildStep } from "../models/step-model.js";
export function focusEditor(panel, key) {
  const target = key
    ? panel.shadowRoot.querySelector(
        `[data-builder-field="${CSS.escape(key)}"]`,
      )
    : panel.shadowRoot.querySelector('.step-editor [aria-invalid="true"]') ||
      panel.shadowRoot.querySelector(
        '.step-editor [data-builder-field="days"][aria-describedby]',
      ) ||
      panel.shadowRoot.querySelector(
        '.step-editor [data-builder-field="name"]',
      );
  target?.focus();
}
export function createStepEditorContext(panel) {
  const editor = panel.stepEditor,
    form = editor.form,
    time = form.timing,
    t = panel.t,
    editing = editor.existing;
  const refresh = (key) => {
    panel.flush();
    focusEditor(panel, key);
  };
  const changed = (key) => {
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
    editor.errors = editorErrors(panel.draft, editor);
    if (Object.keys(editor.errors).length > 0) {
      return refresh();
    }
    try {
      try {
        await prepareCustomAction(panel, form);
      } catch (error) {
        editor.errors.customYaml =
          error instanceof Error ? error.message : String(error);
        return refresh("customYaml");
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
          if (panel.version !== version || panel.activeEditor !== editor) {
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
    stepId: editor.id,
    refresh,
    changed,
    submit,
    cancel,
  };
}
