// Generated from custom_components/occupied/frontend/src/lib/models/step-model.ts by pnpm run build. Do not edit.
import { remoteErrors } from "../utils/remote.js";
import { en, translator } from "../i18n/translations.js";
import {
  durationSeconds,
  offsetErrors,
  timingForm,
  entityName,
} from "../utils/util.js";
import {
  copy,
  days,
  identifier,
  parentSteps,
  parentRandomEvents,
  references,
} from "./model.js";
import { coverActions, coverField, isCoverAction } from "../utils/cover.js";
import {
  actionTargets,
  actionTargetSummary,
  actionYaml,
  mappedControl,
} from "../utils/custom-action.js";
import {
  editableEntityMapping,
  entitySettingsData,
  entitySettingsErrors,
} from "../utils/entity-settings.js";
import { staggerPeriodError } from "../utils/stagger.js";
const sorted = (values) => [...new Set(values)].sort();
const actionLabels = {
  turn_on: "turn_on",
  turn_off: "turn_off",
  "scene.turn_on": "activate_scene",
  ...Object.fromEntries(coverActions),
};
function stepDisplayName(step, catalog, t) {
  const action = editableEntityMapping(step)?.action || step.action || "";
  const label =
    step.actions || action === "set_state"
      ? "custom_yaml"
      : actionLabels[action] || action;
  return `${actionTargetSummary(step, catalog)} · ${t(label)}`;
}
export function stepEntries(program, catalog, t = translator()) {
  return Object.entries(program.steps || {}).map(([id, step]) => ({
    ...step,
    id,
    path: ["steps", id],
    days: [...(step.days || days)],
    name: step.name || stepDisplayName(step, catalog, t),
  }));
}
export const solarEvents = [
  "sunrise",
  "sunset",
  "dawn",
  "dusk",
  "noon",
  "midnight",
];
export function timeSourceChoices(
  program,
  id,
  catalog = {},
  t = translator(),
  randomId,
) {
  const allowed = new Set(parentSteps(program, id).map((step) => step.id));
  return [
    ...stepEntries(
      program,
      catalog.entities ? { entities: catalog.entities } : undefined,
      t,
    )
      .filter((step) => allowed.has(step.id))
      .map((step) => ({
        value: `step:${step.id}`,
        name: step.name,
        group: t("steps"),
      })),
    ...(randomId
      ? parentRandomEvents(program, randomId).map((event) => {
          const first = actionTargets(event.on)[0];
          const name =
            event.name ||
            (catalog.entities
              ? entityName({ entities: catalog.entities }, first)
              : first);
          return {
            value: `random:${event.id}`,
            name: `${t("end_of")} ${name}`,
            group: t("random_events"),
          };
        })
      : []),
    ...(catalog.time_sources?.map((source) => {
      const solarLabels = {
        sunrise: "sunrise_label",
        sunset: "sunset_label",
        dawn: "dawn_label",
        dusk: "dusk_label",
        noon: "solar_noon",
        midnight: "solar_midnight",
      };
      const groupKey = [
        "solar_events",
        "calendars",
        "home_assistant_times",
      ].find((key) => en[key] === source.group);
      return {
        ...source,
        name: source.value.startsWith("sun:")
          ? t(solarLabels[source.value.slice(4)] || source.name)
          : source.name,
        group: groupKey ? t(groupKey) : source.group,
      };
    }) ||
      solarEvents.map((event) => ({
        value: `sun:${event}`,
        name: t(event),
        group: t("solar_events"),
      }))),
  ];
}
export function stepEditor(program, entry, parent) {
  const source = entry || parent;
  const form = {
    ...actionForm(source),
    name: entry ? program.steps?.[entry.id]?.name || "" : "",
    enabled: entry?.enabled !== false,
    days: [...(source?.days || days)],
    timing: timingForm(entry?.timing),
  };
  if (parent) {
    Object.assign(form.timing, {
      mode: "relative",
      anchor: `step:${parent.id}`,
      startOffset: "30m",
    });
  }
  return {
    id: entry?.id || identifier(program, "step"),
    existing: !!entry,
    form,
    original: copy(form),
    changed: false,
    errors: {},
  };
}
export function actionForm(source) {
  const mapping = editableEntityMapping(source);
  const action = mapping?.action || source?.action;
  let kind = "entities";
  if (source?.actions || action === "set_state") {
    kind = "custom";
  } else if (action === "scene.turn_on") {
    kind = "scene";
  } else if (
    source &&
    isCoverAction(source) &&
    actionTargets(source).every((entity) => entity.startsWith("cover."))
  ) {
    kind = "cover";
  } else if (
    source &&
    ["remote.turn_on", "remote.turn_off"].includes(action || "") &&
    actionTargets(source).every((entity) => entity.startsWith("remote.")) &&
    Object.keys(source.data || {}).every(
      (key) => key === "activity" && action === "remote.turn_on",
    ) &&
    (source.data?.activity === undefined ||
      typeof source.data.activity === "string")
  ) {
    kind = "remote";
  } else if (action?.includes(".")) {
    kind = "service";
  }
  return {
    kind,
    ...(mapping &&
      Object.keys(mapping.entitySettings).length > 0 && {
        entitySettings: mapping.entitySettings,
      }),
    ...(source?.stagger && { stagger: copy(source.stagger) }),
    ...(kind === "custom" &&
      source && {
        customActions: source.actions || [
          {
            action: source.action,
            entities: source.entities,
            ...(source.data && { data: source.data }),
            ...(source.stagger && { stagger: source.stagger }),
          },
        ],
        customAccepted: actionYaml(
          source.actions?.length === 1
            ? source.actions[0]
            : source.actions || {
                action: source.action,
                entities: source.entities,
                ...(source.data && { data: source.data }),
                ...(source.stagger && { stagger: source.stagger }),
              },
        ),
        customYaml: actionYaml(
          source.actions?.length === 1
            ? source.actions[0]
            : source.actions || {
                action: source.action,
                entities: source.entities,
                ...(source.data && { data: source.data }),
                ...(source.stagger && { stagger: source.stagger }),
              },
        ),
      }),
    service: action?.includes(".")
      ? action
      : `homeassistant.${action === "turn_off" ? "turn_off" : "turn_on"}`,
    data: JSON.stringify(source?.data || {}, null, 2),
    entities: actionTargets(source),
    action: action === "turn_off" ? "turn_off" : "turn_on",
    position: String(source?.data?.position ?? ""),
    tiltPosition: String(source?.data?.tilt_position ?? ""),
    activity: String(source?.data?.activity ?? ""),
  };
}
export function hasStepChanges(editor) {
  return JSON.stringify(editor.form) !== JSON.stringify(editor.original);
}
export function editorErrors(program, editor) {
  const { form, id } = editor,
    errors = {
      ...actionErrors(form),
      ...timingErrors(program, form.timing, id),
    };
  if (form.days.length === 0) {
    errors.days = "days_required_error";
  }
  return errors;
}
export function actionErrors(form) {
  const errors = {};
  if (form.stagger) {
    const error = staggerPeriodError(form.stagger);
    if (error) {
      errors.stagger = error;
    }
  }
  if (form.kind === "custom") {
    if (!form.customYaml?.trim()) {
      errors.customYaml = "custom_yaml_required_error";
    }
    return errors;
  }
  if (form.entities.length === 0) {
    errors.entities =
      form.kind === "scene"
        ? "scene_required_error"
        : "entities_required_error";
  }
  if (form.entities.some((e) => !/^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(e))) {
    errors.entities = "entity_ids_error";
  }
  if (
    form.kind === "scene" &&
    (form.entities.length !== 1 || !form.entities[0]?.startsWith("scene."))
  ) {
    errors.entities = "scene_single_error";
  }
  if (
    form.kind === "entities" &&
    form.entities.some((e) => !/^(light|switch)\./.test(e))
  ) {
    errors.entities = "light_switch_entities_error";
  }
  if (form.kind === "entities") {
    Object.assign(errors, entitySettingsErrors(form));
  }
  if (
    form.kind === "service" &&
    !/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(form.service)
  ) {
    errors.service = "service_error";
  }
  Object.assign(errors, remoteErrors(form));
  if (form.kind === "cover") {
    if (form.entities.some((entity) => !entity.startsWith("cover."))) {
      errors.entities = "cover_entities_error";
    }
    if (coverActions.every(([action]) => action !== form.service)) {
      errors.service = "cover_action_error";
    }
    const field = coverField(form.service);
    if (field) {
      const key = field === "position" ? "position" : "tiltPosition";
      const value = Number(form[key]);
      if (
        !form[key].trim() ||
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > 100
      ) {
        errors[key] = "cover_position_error";
      }
    }
  } else if (form.kind === "scene" || form.kind === "service") {
    try {
      const data = JSON.parse(form.data);
      if (!data || Array.isArray(data) || typeof data !== "object") {
        throw new TypeError("Expected service data to be a JSON object");
      }
    } catch {
      errors.data = "service_data_error";
    }
  }
  return errors;
}
export function timingErrors(program, time, id, randomId) {
  const errors = {};
  for (const key of ["latestAt", "onlyBefore"]) {
    const boundary = time[key];
    if (!boundary) {
      continue;
    }
    const boundaryErrors = timingErrors(program, {
      ...boundary,
      end: "",
      endOffset: "",
    });
    if (
      boundary.mode === "relative" &&
      solarEvents.every((event) => boundary.anchor !== `sun:${event}`)
    ) {
      boundaryErrors.anchor = "time_source_required_error";
    }
    for (const [field, error] of Object.entries(boundaryErrors)) {
      errors[`${key}.${field}`] = error;
    }
  }
  const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
  if (time.mode === "absolute") {
    if (!clockPattern.test(time.start)) {
      errors.start = "start_time_required_error";
    }
    if (time.end && !clockPattern.test(time.end)) {
      errors.end = "end_time_error";
    }
  } else if (time.mode === "relative") {
    Object.assign(errors, offsetErrors(time));
    if (time.anchor.startsWith("step:")) {
      const parent = stepEntries(program).find(
        (e) => e.id === time.anchor.slice(5),
      );
      if (
        !parent ||
        parentSteps(program, id).every((e) => e.id !== parent.id)
      ) {
        errors.anchor = "step_reference_error";
      }
    } else if (time.anchor.startsWith("random:")) {
      if (
        !randomId ||
        parentRandomEvents(program, randomId).every(
          (event) => event.id !== time.anchor.slice(7),
        )
      ) {
        errors.anchor = "random_reference_error";
      }
    } else if (
      !solarEvents.map((event) => `sun:${event}`).includes(time.anchor) &&
      !/^entity:[a-z_][a-z0-9_]*\.[a-z0-9_]+(?::(?:start_time|end_time))?$/.test(
        time.anchor,
      )
    ) {
      errors.anchor = "time_source_required_error";
    }
  } else {
    errors.mode = "timing_mode_error";
  }
  return errors;
}
export function formTiming(time) {
  const timing = baseFormTiming(time);
  for (const [key, field] of [
    ["latestAt", "latest_at"],
    ["onlyBefore", "only_before"],
  ]) {
    const boundary = time[key];
    if (boundary) {
      timing[field] =
        boundary.mode === "absolute"
          ? { absolute_time: { start: boundary.start } }
          : {
              relative_to: {
                sun: boundary.anchor.slice(4),
                start_offset: String(boundary.startOffset || "0s"),
              },
            };
    }
  }
  return timing;
}
function baseFormTiming(time) {
  if (time.mode === "duration") {
    return {
      duration: {
        min: time.minDuration || "",
        ...(time.maxDuration &&
          durationSeconds(time.maxDuration) !==
            durationSeconds(time.minDuration || "") && {
            max: time.maxDuration,
          }),
      },
    };
  }
  if (time.mode === "absolute") {
    return {
      absolute_time: { start: time.start, ...(time.end && { end: time.end }) },
    };
  }
  const offsets = {
    start_offset: String(
      time.startOffset === "0" ? "0s" : time.startOffset || "0s",
    ),
    ...(time.endOffset && {
      end_offset: String(time.endOffset === "0" ? "0s" : time.endOffset),
    }),
  };
  if (time.anchor.startsWith("random:")) {
    return { relative_to: { random: time.anchor.slice(7), ...offsets } };
  }
  if (time.anchor.startsWith("step:")) {
    return { relative_to: { step: time.anchor.slice(5), ...offsets } };
  }
  if (time.anchor.startsWith("entity:")) {
    const [, entity, attribute] = time.anchor.split(":", 3);
    return {
      relative_to: {
        entity,
        ...(attribute && { attribute: attribute }),
        ...offsets,
      },
    };
  }
  return { relative_to: { sun: time.anchor.slice(4), ...offsets } };
}
export function buildStep(program, editor) {
  const errors = editorErrors(program, editor);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }
  if (editor.existing && !program.steps?.[editor.id]) {
    throw new Error("step_changed_error");
  }
  const next = copy(program),
    { form } = editor;
  (next.steps ||= {})[editor.id] = {
    ...(form.name.trim() && { name: form.name.trim() }),
    ...(!form.enabled && { enabled: false }),
    days: [...form.days],
    timing: formTiming(form.timing),
    ...buildAction(form),
  };
  return next;
}
export function buildAction(form) {
  if (form.kind === "custom") {
    if (!form.customActions || form.customAccepted !== form.customYaml) {
      throw new Error("custom_yaml_validation_error");
    }
    return { actions: copy(form.customActions) };
  }
  if (
    form.kind === "entities" &&
    form.entities.some(
      (entity) => Object.keys(entitySettingsData(form, entity)).length > 0,
    )
  ) {
    return mappedControl(form);
  }
  let action = form.action;
  if (form.kind === "scene") {
    action = "scene.turn_on";
  } else if (["service", "cover", "remote"].includes(form.kind)) {
    action = form.service;
  }
  if (form.kind === "remote") {
    return {
      action,
      entities: sorted(form.entities),
      ...(action === "remote.turn_on" &&
        form.activity && { data: { activity: form.activity } }),
    };
  }
  if (form.kind === "cover") {
    const field = coverField(action);
    return {
      action,
      entities: sorted(form.entities),
      ...(field && {
        data: {
          [field]: Number(
            field === "position" ? form.position : form.tiltPosition,
          ),
        },
      }),
    };
  }
  return {
    action,
    entities: sorted(form.entities),
    ...([
      "turn_on",
      "turn_off",
      "light.turn_on",
      "light.turn_off",
      "switch.turn_on",
      "switch.turn_off",
    ].includes(action) &&
      form.stagger && { stagger: copy(form.stagger) }),
    ...(form.kind !== "entities" && { data: JSON.parse(form.data) }),
  };
}
export function dependentNames(program, id) {
  const paths = references(program, id);
  return [
    ...stepEntries(program)
      .filter((e) => paths.some((p) => p[0] === "steps" && p[1] === e.id))
      .map((e) => e.name),
    ...Object.entries(program.random || {})
      .filter(([key]) => paths.some((p) => p[0] === "random" && p[1] === key))
      .map(([key, event]) => event.name || key),
  ];
}
