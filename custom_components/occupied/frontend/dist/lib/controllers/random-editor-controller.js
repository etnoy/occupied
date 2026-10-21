// Generated from custom_components/occupied/frontend/src/lib/controllers/random-editor-controller.ts by pnpm run build. Do not edit.
import { prepareCustomAction } from "../utils/custom-action.js";
import { copy, randomReferences } from "../models/model.js";
import {
  canShareEntities,
  randomEditor,
  randomErrors,
  buildRandom,
} from "../models/random-model.js";
import { focusEditor } from "./step-editor-controller.js";
import { setActionEntities } from "../utils/entity-settings.js";
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
  panel.tab = "steps";
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
  const epoch = panel.epoch;
  const isCurrent = () =>
    panel.epoch === epoch && panel.activeEditor === editor;
  const refresh = (key) => {
    panel.flush();
    focusEditor(panel, key);
  };
  const changed = (key) => {
    if (!canShareEntities(form.on, form.off)) {
      form.sameEntities = false;
    }
    if (form.sameEntities) {
      setActionEntities(form.off, form.on.entities);
    }
    panel.version++;
    panel.validatedVersion = -1;
    const errors = randomErrors(panel.draft, editor);
    for (const field of Object.keys(editor.errors)) {
      if (errors[field]) {
        editor.errors[field] = errors[field];
      } else {
        delete editor.errors[field];
      }
    }
    delete editor.errors[key];
    if (key === "minCount" || key === "maxCount") {
      if (errors[key]) {
        editor.errors[key] = errors[key];
      }
      if (errors.maxCount === "random_count_order_error") {
        editor.errors.maxCount = errors.maxCount;
      }
    }
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
        return options && (key === "showEndTime" || key === "showEndOffset")
          ? options[key]
          : Reflect.get(target, key);
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
    ...(edge === "start" && { randomId: editor.id }),
    changed: (key) => changed(`${edge}.${key}`),
    refresh: (key) => refresh(key ? `${edge}.${key}` : undefined),
  });
  const action = (phase) => ({
    editor: scopedEditor(`${phase}.`),
    setErrors: (errors) => {
      for (const [key, message] of Object.entries(errors)) {
        editor.errors[`${phase}.${key}`] = message;
      }
    },
    form: new Proxy(form[phase], {}),
    t,
    fieldPrefix: `${phase}.`,
    changed: (key) => changed(`${phase}.${key}`),
  });
  const submit = async () => {
    if (!isCurrent()) {
      return;
    }
    editor.errors = randomErrors(panel.draft, editor);
    if (Object.keys(editor.errors).length > 0) {
      return refresh(Object.keys(editor.errors)[0]);
    }
    try {
      for (const phase of ["on", "off"]) {
        try {
          await prepareCustomAction(panel, form[phase]);
          if (!isCurrent()) {
            return;
          }
        } catch (error) {
          if (!isCurrent()) {
            return;
          }
          editor.errors[`${phase}.customYaml`] =
            error instanceof Error ? error.message : String(error);
          return refresh(`${phase}.customYaml`);
        }
      }
      const candidate = buildRandom(panel.draft, editor);
      editor.candidatePath = ["random", editor.id];
      if (panel.document?.source === "file") {
        if (form.on.kind === "custom" || form.off.kind === "custom") {
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
        panel.randomEditor = null;
        panel.change([], candidate, true);
      } else {
        await panel.save(candidate);
      }
    } catch (error) {
      if (isCurrent()) {
        panel.fail(error);
      }
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
  if (randomReferences(candidate, editor.id).length > 0) {
    panel.error = panel.t("random_dependents_error");
    panel.flush();
    return;
  }
  delete candidate.random?.[editor.id];
  if (panel.document?.source === "file") {
    panel.randomEditor = null;
    panel.change([], candidate, true);
    return;
  }
  await panel.save(candidate);
}
