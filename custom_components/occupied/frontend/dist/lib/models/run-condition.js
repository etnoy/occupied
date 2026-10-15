// Generated from custom_components/occupied/frontend/src/lib/models/run-condition.ts by pnpm run build. Do not edit.
import { durationSeconds } from "../utils/util.js";
export function runConditionForm(config) {
  return {
    enabled: !!config,
    entityId: config?.entity_id || "",
    states: config ? [config.state].flat() : [],
    enforceState: config?.enforce_state_on_start ?? false,
    startDelay: config?.start_delay ?? "30s",
  };
}
export function runConditionErrors(form) {
  if (!form.enabled) {
    return {};
  }
  const errors = {};
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
  const delay = durationSeconds(form.startDelay);
  if (!Number.isFinite(delay) || delay < 0 || delay > 3600) {
    errors.startDelay = "run_condition_delay_error";
  }
  return errors;
}
export function runConditionValue(form) {
  if (!form.enabled) {
    return;
  }
  return {
    entity_id: form.entityId,
    state: [...new Set(form.states)],
    enforce_state_on_start: form.enforceState,
    start_delay: form.startDelay,
  };
}
export function runConditionStateOptions(entity, states, current) {
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
