// Generated from step-model.ts by pnpm run build. Do not edit.
import { offsetErrors, timingForm, entityName } from "./util.js";
import { copy, days, identifier, parentSteps, references } from "./model.js";
const sorted = (values) => [...new Set(values)].sort();
const actionLabels = {
  turn_on: "Turn on",
  turn_off: "Turn off",
  "scene.turn_on": "Activate scene",
};
export function stepEntries(program, catalog, t = (value) => value) {
  return Object.entries(program.steps || {}).map(([id, step]) => ({
    ...step,
    id,
    path: ["steps", id],
    days: [...(step.days || days)],
    name:
      step.name ||
      `${catalog ? entityName(catalog, step.entities[0]) : step.entities[0]}${step.entities.length > 1 ? ` +${step.entities.length - 1}` : ""} · ${t(actionLabels[step.action] || step.action)}`,
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
  t = (value) => value,
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
        group: "Steps",
      })),
    ...(catalog.time_sources ||
      solarEvents.map((event) => ({
        value: `sun:${event}`,
        name: event,
        group: "Solar events",
      }))),
  ];
}
export function stepEditor(program, entry, parent) {
  const source = entry || parent;
  const action = source?.action;
  let kind = "entities";
  if (action === "scene.turn_on") {
    kind = "scene";
  } else if (action?.includes(".")) {
    kind = "service";
  }
  const form = {
    name: entry ? program.steps?.[entry.id]?.name || "" : "",
    enabled: entry?.enabled !== false,
    kind,
    service: source?.action || "homeassistant.turn_on",
    data: JSON.stringify(source?.data || {}, null, 2),
    entities: [...(source?.entities || [])],
    action: action === "turn_off" ? "turn_off" : "turn_on",
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
export function hasStepChanges(editor) {
  return JSON.stringify(editor.form) !== JSON.stringify(editor.original);
}
export function editorErrors(program, editor) {
  const { form, id } = editor,
    errors = {};
  if (form.entities.length === 0) {
    errors.entities =
      form.kind === "scene"
        ? "Select a Home Assistant scene."
        : "Select at least one entity.";
  }
  if (form.entities.some((e) => !/^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(e))) {
    errors.entities = "Choose valid Home Assistant entity IDs.";
  }
  if (
    form.kind === "scene" &&
    (form.entities.length !== 1 || !form.entities[0]?.startsWith("scene."))
  ) {
    errors.entities = "Select one Home Assistant scene.";
  }
  if (
    form.kind === "entities" &&
    form.entities.some((e) => !/^(light|switch)\./.test(e))
  ) {
    errors.entities = "Choose lights and switches, or select a service action.";
  }
  if (
    form.kind === "service" &&
    !/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(form.service)
  ) {
    errors.service = "Choose a service using domain.service.";
  }
  if (form.kind !== "entities") {
    try {
      const data = JSON.parse(form.data);
      if (!data || Array.isArray(data) || typeof data !== "object") {
        throw new TypeError("Expected service data to be a JSON object");
      }
    } catch {
      errors.data = "Service data must be a JSON object.";
    }
  }
  if (form.days.length === 0) {
    errors.days = "Choose at least one day.";
  }
  const time = form.timing;
  const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
  if (time.mode === "absolute") {
    if (!clockPattern.test(time.start)) {
      errors.start = "Choose a start time.";
    }
    if (time.end && !clockPattern.test(time.end)) {
      errors.end = "Choose a valid end time or leave it blank.";
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
        errors.anchor =
          "Choose another step without creating a circular relationship.";
      }
    } else if (
      !solarEvents.map((event) => `sun:${event}`).includes(time.anchor) &&
      !/^entity:[a-z_][a-z0-9_]*\.[a-z0-9_]+(?::(?:start_time|end_time))?$/.test(
        time.anchor,
      )
    ) {
      errors.anchor = "Choose a step or Home Assistant time source.";
    }
  } else {
    errors.mode = "Choose absolute time or relative to.";
  }
  return errors;
}
export function formTiming(time) {
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
    throw new Error(
      "This step changed elsewhere. Cancel and reopen it before saving.",
    );
  }
  const next = copy(program),
    { form } = editor;
  let action = form.action;
  if (form.kind === "scene") {
    action = "scene.turn_on";
  } else if (form.kind === "service") {
    action = form.service;
  }
  (next.steps ||= {})[editor.id] = {
    ...(form.name.trim() && { name: form.name.trim() }),
    ...(!form.enabled && { enabled: false }),
    days: [...form.days],
    timing: formTiming(form.timing),
    action,
    entities: sorted(form.entities),
    ...(form.kind !== "entities" && { data: JSON.parse(form.data) }),
  };
  return next;
}
export function dependentNames(program, id) {
  const paths = references(program, id);
  return stepEntries(program)
    .filter((e) => paths.some((p) => p[1] === e.id))
    .map((e) => e.name);
}
