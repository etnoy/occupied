import type { Action, ActionForm, Stagger } from "../types.js";
import { durationSeconds } from "./util.js";
import { actionTargets, actionYaml } from "./custom-action.js";

export function staggerPeriodError(settings: Stagger): string | undefined {
  const seconds = durationSeconds(settings.period ?? "2m");

  return Number.isFinite(seconds) && seconds >= 1 && seconds <= 1800
    ? undefined
    : "stagger_period_error";
}

function customStaggerAction(form: ActionForm): Action | undefined {
  if (
    form.customAccepted !== form.customYaml ||
    form.customActions?.length !== 1
  ) {
    return;
  }
  const action = form.customActions[0];
  if (
    actionTargets(action).some((entity) => !/^(light|switch)\./.test(entity))
  ) {
    return;
  }
  if (action.action === "set_state" && !Array.isArray(action.entities)) {
    return Object.values(action.entities || {}).every((settings) =>
      ["on", "off"].includes(String(settings.state)),
    )
      ? action
      : undefined;
  }

  return /^(?:(?:light|switch)\.)?turn_(on|off)$/.test(action.action || "")
    ? action
    : undefined;
}

export function supportsStagger(form: ActionForm): boolean {
  return (
    form.kind === "entities" ||
    (form.kind === "service" &&
      /^(light|switch)\.turn_(on|off)$/.test(form.service)) ||
    (form.kind === "custom" && !!customStaggerAction(form))
  );
}

export function staggerSettings(form: ActionForm): Stagger {
  const current =
    form.kind === "custom" ? customStaggerAction(form)?.stagger : form.stagger;

  return {
    enabled: current?.enabled ?? false,
    period: current?.period ?? "2m",
  };
}

export function applyStagger(form: ActionForm, settings: Stagger) {
  const source = form.kind === "custom" ? customStaggerAction(form) : form;
  if (!source) {
    return;
  }
  if (
    (source.stagger?.enabled ?? false) === (settings.enabled ?? false) &&
    (source.stagger?.period ?? "2m") === (settings.period ?? "2m")
  ) {
    return;
  }
  source.stagger = { ...settings };
  if (form.kind === "custom") {
    form.customYaml = actionYaml(source);
    form.customAccepted = form.customYaml;
  }
}
