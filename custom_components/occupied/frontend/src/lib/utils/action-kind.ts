import type { ActionForm, FieldErrors } from "../types.js";
import { actionForm, actionErrors, buildAction } from "../models/step-model.js";
import {
  actionYaml,
  mappedControl,
  simpleMapping,
  customExample,
} from "./custom-action.js";
import { coverActions } from "./cover.js";
import { setActionEntities, updateEntitySetting } from "./entity-settings.js";

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
      delete form.entitySettings;
      Object.assign(form, next);
      // The next YAML conversion must reflect any edits in the GUI.
      delete form.customYaml;
      delete form.customAccepted;
      delete form.customActions;

      return {};
    }
    if (!confirmReplace("custom_yaml_replace_confirm")) {
      return {};
    }
  }
  if (form.kind !== kind) {
    setActionEntities(form, acceptedEntities(kind, form.entities));
    delete form.entitySettings;
  }
  form.kind = kind;
  if (!(kind === "entities" && ["turn_on", "turn_off"].includes(value))) {
    delete form.stagger;
  }
  if (kind === "entities") {
    form.action = value;
    if (value === "turn_off" && form.entitySettings) {
      for (const entity of Object.keys(form.entitySettings)) {
        updateEntitySetting(form, entity, "brightness", "");
      }
    }
  }
  if (kind === "service" && !form.service.includes(".")) {
    form.service = `homeassistant.${form.action}`;
  }
  if (
    kind === "remote" &&
    !["remote.turn_on", "remote.turn_off"].includes(form.service)
  ) {
    form.service = `remote.${form.action === "turn_off" ? "turn_off" : "turn_on"}`;
  }
  if (
    kind === "cover" &&
    coverActions.every(([action]) => action !== form.service)
  ) {
    form.service = "cover.open_cover";
  }

  return {};
}

export function acceptedEntities(kind: string, entities: string[]): string[] {
  if (kind === "service") {
    return [...entities];
  }
  const domains: Record<string, string[]> = {
    entities: ["light", "switch"],
    cover: ["cover"],
    remote: ["remote"],
    scene: ["scene"],
  };
  const accepted = entities.filter((entity) =>
    domains[kind]?.includes(entity.split(".", 1)[0]),
  );

  return kind === "scene" ? accepted.slice(0, 1) : accepted;
}
