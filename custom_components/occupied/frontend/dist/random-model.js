// Generated from random-model.ts by pnpm run build. Do not edit.
import { copy, days, identifier } from "./model.js";
import {
  actionForm,
  actionErrors,
  buildAction,
  timingErrors,
  formTiming,
} from "./step-model.js";
import { timingForm, entityName, durationSeconds } from "./util.js";
export function randomEntries(program, catalog, t = (text) => text) {
  return Object.entries(program.random || {}).map(([id, event]) => ({
    ...event,
    id,
    path: ["random", id],
    days: [...(event.days || days)],
    name:
      event.name ||
      `${catalog ? entityName(catalog, event.on.entities[0]) : event.on.entities[0]} · ${t("Random event")}`,
  }));
}
export function randomEditor(program, entry) {
  const source = entry ? program.random?.[entry.id] : undefined;
  const on = actionForm(source?.on);
  const off = actionForm(source?.off || { action: "turn_off", entities: [] });
  const form = {
    name: source?.name || "",
    enabled: source?.enabled !== false,
    days: [...(source?.days || days)],
    start: timingForm(source?.start),
    end: timingForm(source?.end || { absolute_time: { start: "23:00" } }),
    minDuration: source?.min_duration || "5m",
    maxDuration: source?.max_duration || "15m",
    count: String(source?.count ?? 3),
    on,
    off,
    sameEntities:
      on.kind === "entities" &&
      off.kind === "entities" &&
      JSON.stringify([...on.entities].sort()) ===
        JSON.stringify([...off.entities].sort()),
  };
  return {
    id: entry?.id || identifier(program, "random", "random"),
    existing: !!entry,
    form,
    original: copy(form),
    errors: {},
    startOptions: {},
    endOptions: {},
  };
}
export function hasRandomChanges(editor) {
  return JSON.stringify(editor.form) !== JSON.stringify(editor.original);
}
export function prefixedErrors(errors, prefix) {
  return Object.fromEntries(
    Object.entries(errors).map(([field, message]) => [
      `${prefix}${field}`,
      message,
    ]),
  );
}
export function randomErrors(program, editor) {
  const { form } = editor;
  const errors = {
    ...prefixedErrors(timingErrors(program, form.start), "start."),
    ...prefixedErrors(timingErrors(program, form.end), "end."),
    ...prefixedErrors(actionErrors(form.on), "on."),
    ...prefixedErrors(
      actionErrors(
        form.sameEntities
          ? { ...form.off, entities: form.on.entities }
          : form.off,
      ),
      "off.",
    ),
  };
  const minimum = durationSeconds(form.minDuration),
    maximum = durationSeconds(form.maxDuration);
  if (!Number.isFinite(minimum) || minimum <= 0 || minimum > 604_800) {
    errors.minDuration =
      "Use a positive duration within seven days, for example 5m or 1h.";
  }
  if (!Number.isFinite(maximum) || maximum <= 0 || maximum > 604_800) {
    errors.maxDuration =
      "Use a positive duration within seven days, for example 5m or 1h.";
  } else if (maximum < minimum) {
    errors.maxDuration =
      "Maximum duration must be at least the minimum duration.";
  }
  const count = Number(form.count);
  if (!Number.isSafeInteger(count) || count < 1 || count > 1000) {
    errors.count = "Choose a whole number from 1 to 1000.";
  }
  if (form.days.length === 0) {
    errors.days = "Choose at least one day.";
  }
  if (
    form.start.mode === "absolute" &&
    form.end.mode === "absolute" &&
    !form.start.end &&
    !form.end.end &&
    !errors["start.start"] &&
    !errors["end.start"]
  ) {
    const seconds = (clock) =>
      clock
        .split(":")
        .reduce((total, part, i) => total + Number(part) * [3600, 60, 1][i], 0);
    let span = seconds(form.end.start) - seconds(form.start.start);
    if (span < 0) {
      span += 86_400;
    }
    if (span === 0) {
      errors["end.start"] = "Window end must be after its start.";
    } else if (minimum > span) {
      errors.minDuration = "Minimum duration does not fit inside this window.";
    }
  }
  return errors;
}
export function buildRandom(program, editor) {
  const errors = randomErrors(program, editor);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }
  if (editor.existing && !program.random?.[editor.id]) {
    throw new Error(
      "This random event changed elsewhere. Cancel and reopen it before saving.",
    );
  }
  const next = copy(program),
    { form } = editor;
  (next.random ||= {})[editor.id] = {
    ...(form.name.trim() && { name: form.name.trim() }),
    ...(!form.enabled && { enabled: false }),
    days: [...form.days],
    start: formTiming(form.start),
    end: formTiming(form.end),
    min_duration: form.minDuration,
    max_duration: form.maxDuration,
    count: Number(form.count),
    on: buildAction(form.on),
    off: buildAction(
      form.sameEntities
        ? { ...form.off, entities: form.on.entities }
        : form.off,
    ),
  };
  return next;
}
