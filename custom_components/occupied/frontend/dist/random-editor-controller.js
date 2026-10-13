// Generated from random-editor-controller.ts by pnpm run build. Do not edit.
import { copy } from "./model.js";
import { randomEditor, randomErrors, buildRandom } from "./random-model.js";
import { focusEditor } from "./step-editor-controller.js";
export function openRandom(panel, entry) {
  if (panel.busy) {
    return;
  }
  if (panel.activeEditor) {
    const same = !!entry && panel.randomEditor?.id === entry.id;
    panel.requestStepExit(() => {
      if (!same) {
        openRandom(panel, entry);
      }
    });
    return;
  }
  panel.randomEditor = randomEditor(panel.draft, entry);
  panel.tab = "random";
  panel.error = "";
  panel.issues = [];
  panel.renderView();
  focusEditor(panel, "name");
  if (entry) {
    panel.shadowRoot
      .getElementById(`random-editor-${entry.id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
export function createRandomEditorContext(panel) {
  const editor = panel.randomEditor,
    form = editor.form,
    t = panel.t;
  const refresh = (key) => {
    panel.flush();
    focusEditor(panel, key);
  };
  const changed = (key) => {
    if (form.on.kind !== "entities" || form.off.kind !== "entities") {
      form.sameEntities = false;
    }
    if (form.sameEntities) {
      form.off.entities = [...form.on.entities];
    }
    panel.version++;
    panel.validatedVersion = -1;
    // Keep submitted errors current while allowing untouched fields to stay quiet.
    const errors = randomErrors(panel.draft, editor);
    for (const field of Object.keys(editor.errors)) {
      if (errors[field]) {
        editor.errors[field] = errors[field];
      } else {
        delete editor.errors[field];
      }
    }
    delete editor.errors[key];
    panel.flush();
  };
  const scopedEditor = (prefix, options) =>
    new Proxy(editor, {
      get(target, key) {
        if (key === "errors") {
          return Object.fromEntries(
            Object.entries(target.errors)
              .filter(([field]) => field.startsWith(prefix))
              .map(([field, message]) => [field.slice(prefix.length), message]),
          );
        }
        if (options && (key === "showEndTime" || key === "showEndOffset")) {
          return options[key];
        }
        return Reflect.get(target, key);
      },
      set(target, key, value) {
        if (options && (key === "showEndTime" || key === "showEndOffset")) {
          options[key] = value;
          return true;
        }
        return Reflect.set(target, key, value);
      },
    });
  const timing = (edge) => ({
    editor: scopedEditor(`${edge}.`, editor[`${edge}Options`]),
    form: new Proxy(form, {}),
    time: new Proxy(form[edge], {}),
    t,
    fieldPrefix: `${edge}.`,
    changed: (key) => changed(`${edge}.${key}`),
    refresh: (key) => refresh(key ? `${edge}.${key}` : undefined),
  });
  const action = (phase) => ({
    editor: scopedEditor(`${phase}.`),
    form: new Proxy(form[phase], {}),
    t,
    fieldPrefix: `${phase}.`,
    changed: (key) => changed(`${phase}.${key}`),
  });
  const submit = async () => {
    editor.errors = randomErrors(panel.draft, editor);
    if (Object.keys(editor.errors).length > 0) {
      return refresh(Object.keys(editor.errors)[0]);
    }
    try {
      const candidate = buildRandom(panel.draft, editor);
      editor.candidatePath = ["random", editor.id];
      if (panel.document?.source === "file") {
        panel.randomEditor = null;
        panel.change([], candidate, true);
      } else {
        await panel.save(candidate);
      }
    } catch (error) {
      panel.fail(error);
    }
  };
  const cancel = () =>
    panel.requestStepExit(() =>
      panel.shadowRoot.getElementById(`random-card-${editor.id}`)?.focus(),
    );
  const context = { editor: new Proxy(editor, {}), t, changed };
  return {
    ...context,
    form: new Proxy(form, {}),
    timing,
    action,
    submit,
    cancel,
  };
}
export async function deleteRandom(panel) {
  const editor = panel.randomEditor;
  if (!editor || panel.busy) {
    return;
  }
  const candidate = copy(panel.draft);
  delete candidate.random?.[editor.id];
  if (panel.document?.source === "file") {
    panel.randomEditor = null;
    panel.change([], candidate, true);
    return;
  }
  // Keep the open editor until the guarded save succeeds, preserving edits on failure.
  await panel.save(candidate);
}
