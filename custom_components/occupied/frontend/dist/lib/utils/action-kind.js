// Generated from custom_components/occupied/frontend/src/lib/utils/action-kind.ts by pnpm run build. Do not edit.
import { actionForm, actionErrors, buildAction } from "../models/step-model.js";
import {
  actionYaml,
  mappedControl,
  simpleMapping,
  customExample,
} from "./custom-action.js";
import { coverActions } from "./cover.js";
export function changeActionKind(form, value, confirmReplace) {
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
    form.entities = acceptedEntities(kind, form.entities);
  }
  form.kind = kind;
  if (!(kind === "entities" && ["turn_on", "turn_off"].includes(value))) {
    delete form.stagger;
  }
  if (kind === "entities") {
    form.action = value;
  }
  if (kind === "service" && !form.service.includes(".")) {
    form.service = `homeassistant.${form.action}`;
  }
  if (
    kind === "cover" &&
    coverActions.every(([action]) => action !== form.service)
  ) {
    form.service = "cover.open_cover";
  }
  return {};
}
export function acceptedEntities(kind, entities) {
  if (kind === "service") {
    return [...entities];
  }
  const domains = {
    entities: ["light", "switch"],
    cover: ["cover"],
    scene: ["scene"],
  };
  const accepted = entities.filter((entity) =>
    domains[kind]?.includes(entity.split(".", 1)[0]),
  );
  return kind === "scene" ? accepted.slice(0, 1) : accepted;
}
