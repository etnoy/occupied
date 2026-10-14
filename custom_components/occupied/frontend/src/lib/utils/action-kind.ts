import type { ActionForm, FieldErrors } from "../types.js";
import { actionForm, actionErrors, buildAction } from "../models/step-model.js";
import {
  actionYaml,
  mappedControl,
  simpleMapping,
  customExample,
} from "./custom-action.js";
import { coverActions } from "./cover.js";

export function changeActionKind(
  form: ActionForm,
  value: string,
  confirmReplace: (message: string) => boolean,
): FieldErrors {
  const kind = value === "turn_on" || value === "turn_off" ? "entities" : value;
  if (kind === "custom" && form.kind !== "custom") {
    const errors = actionErrors(form);
    if (Object.keys(errors).length > 0) {
      if (form.entities.length === 0 && form.kind === "entities") {
        form.customYaml ||= customExample;
        form.kind = "custom";

        return {};
      }

      return errors;
    }
    if (!form.customYaml) {
      const source =
        form.kind === "entities" ? mappedControl(form) : buildAction(form);
      form.customYaml = actionYaml(source);
      form.customAccepted = form.customYaml;
      form.customActions = [source];
    }
    form.kind = "custom";

    return {};
  }
  if (form.kind === "custom" && kind !== "custom") {
    const accepted =
      form.customAccepted === form.customYaml &&
      form.customActions?.length === 1
        ? simpleMapping(form.customActions[0])
        : undefined;
    const next = accepted ? actionForm(accepted) : undefined;
    const compatible =
      next &&
      next.kind === kind &&
      (kind !== "entities" || next.action === value);
    if (compatible) {
      const buffer = {
        customYaml: form.customYaml,
        customAccepted: form.customAccepted,
        customActions: form.customActions,
      };
      Object.assign(form, next, buffer);

      return {};
    }
    if (!confirmReplace("custom_yaml_replace_confirm")) {
      return {};
    }
  }
  if (form.kind !== kind) {
    form.entities = [];
  }
  form.kind = kind;
  if (!(kind === "entities" && ["turn_on", "turn_off"].includes(value))) {
    delete form.stagger;
  }
  if (kind === "entities") {
    form.action = value;
  }
  if (
    kind === "cover" &&
    coverActions.every(([action]) => action !== form.service)
  ) {
    form.service = "cover.open_cover";
  }

  return {};
}
