import type { RunCondition, FieldErrors, Program, Action } from "../types.js";
import { durationSeconds } from "../utils/util.js";

export interface RunConditionForm {
  enabled: boolean;
  entityId: string;
  states: string[];
  enforceState: boolean;
  startDelay: string;
  offEntities: string[];
}

export function runConditionForm(config?: RunCondition): RunConditionForm {
  return {
    enabled: !!config,
    entityId: config?.entity_id || "",
    states: config ? [config.state].flat() : [],
    enforceState: config?.enforce_state_on_start ?? false,
    startDelay: config?.start_delay ?? "30s",
    offEntities: [...(config?.off_entities ?? [])],
  };
}

export function runConditionErrors(form: RunConditionForm): FieldErrors {
  if (!form.enabled) {
    return {};
  }
  const errors: FieldErrors = {};
  if (!/^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(form.entityId)) {
    errors.entityId = "run_condition_entity_error";
  }
  if (
    form.states.length === 0 ||
    form.states.some(
      (state) => !state.trim() || ["unknown", "unavailable"].includes(state),
    )
  ) {
    errors.states = "run_condition_states_error";
  }
  if (
    form.offEntities.some(
      (entity) => !/^(light|switch)\.[a-z0-9_]+$/.test(entity),
    )
  ) {
    errors.offEntities = "run_condition_off_entities_error";
  }
  const delay = durationSeconds(form.startDelay);
  if (!Number.isFinite(delay) || delay < 0 || delay > 3600) {
    errors.startDelay = "run_condition_delay_error";
  }

  return errors;
}

export function runConditionValue(
  form: RunConditionForm,
): RunCondition | undefined {
  if (!form.enabled) {
    return;
  }

  return {
    entity_id: form.entityId,
    state: [...new Set(form.states)],
    enforce_state_on_start: form.enforceState,
    start_delay: form.startDelay,
    ...(form.offEntities.length > 0 && {
      off_entities: [...new Set(form.offEntities)],
    }),
  };
}

export function runConditionStateOptions(
  entity: string,
  states: string[],
  current?: string,
) {
  return [
    ...new Set([
      ...(entity.startsWith("alarm_control_panel.")
        ? [
            "armed_away",
            "armed_night",
            "armed_home",
            "armed_vacation",
            "armed_custom_bypass",
            "disarmed",
            "arming",
            "pending",
            "triggered",
          ]
        : []),
      ...states,
      ...(current && !["unknown", "unavailable"].includes(current)
        ? [current]
        : []),
    ]),
  ];
}

export function managedOffEntities(
  program: Program,
  entities: string[],
): string[] {
  const managed = new Set<string>();
  const visit = (action: Action) => {
    const targets = action.entities ?? [];
    for (const entity of Array.isArray(targets)
      ? targets
      : Object.keys(targets)) {
      managed.add(entity);
    }
    for (const child of action.actions ?? []) {
      visit(child);
    }
  };
  for (const step of Object.values(program.steps ?? {})) {
    visit(step);
  }
  for (const event of Object.values(program.random ?? {})) {
    visit(event.on);
    visit(event.off);
  }

  const overlaps = new Set<string>();
  for (const entity of entities) {
    if (managed.has(entity)) {
      overlaps.add(entity);
    }
  }

  return [...overlaps];
}
