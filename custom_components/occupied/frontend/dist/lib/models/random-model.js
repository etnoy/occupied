// Generated from custom_components/occupied/frontend/src/lib/models/random-model.ts by pnpm run build. Do not edit.
import { actionTargetSummary } from "../utils/custom-action.js";
import { copy, days, identifier } from "./model.js";
import {
  actionForm,
  actionErrors,
  buildAction,
  timingErrors,
  formTiming,
} from "./step-model.js";
import { timingForm, durationSeconds } from "../utils/util.js";
export function canShareEntities(on, off) {
  return (
    on.kind === off.kind && ["entities", "cover", "service"].includes(on.kind)
  );
}
export function countBounds(count) {
  return typeof count === "object"
    ? count
    : { min: count ?? 3, max: count ?? 3 };
}
export function countSummary(count) {
  const { min, max } = countBounds(count);
  return min === max ? String(min) : `${min}–${max}`;
}
export function randomEntries(program, catalog) {
  return Object.entries(program.random || {}).map(([id, event]) => ({
    ...event,
    id,
    path: ["random", id],
    days: [...(event.days || days)],
    name: event.name || actionTargetSummary(event.on, catalog),
  }));
}
export function randomEditor(program, entry) {
  const source = entry ? program.random?.[entry.id] : undefined;
  const on = actionForm(source?.on);
  const off = actionForm(source?.off || { action: "turn_off", entities: [] });
  const count = countBounds(source?.count);
  const form = {
    name: source?.name || "",
    enabled: source?.enabled !== false,
    days: [...(source?.days || days)],
    start: timingForm(source?.start),
    end: timingForm(source?.end || { absolute_time: { start: "23:00" } }),
    minDuration: source?.min_duration || "5m",
    maxDuration: source?.max_duration || "15m",
    minCount: String(count.min),
    maxCount: String(count.max),
    on,
    off,
    sameEntities:
      canShareEntities(on, off) &&
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
    ...prefixedErrors(
      timingErrors(program, form.start, undefined, editor.id),
      "start.",
    ),
    ...prefixedErrors(windowEndErrors(program, form.end), "end."),
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
    errors.minDuration = "duration_error";
  }
  if (!Number.isFinite(maximum) || maximum <= 0 || maximum > 604_800) {
    errors.maxDuration = "duration_error";
  } else if (maximum < minimum) {
    errors.maxDuration = "duration_order_error";
  }
  const minCount = Number(form.minCount),
    maxCount = Number(form.maxCount);
  for (const field of ["minCount", "maxCount"]) {
    const count = Number(form[field]);
    if (
      !form[field].trim() ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count > 1000
    ) {
      errors[field] = "random_count_error";
    }
  }
  if (!errors.minCount && !errors.maxCount && maxCount < minCount) {
    errors.maxCount = "random_count_order_error";
  }
  if (form.days.length === 0) {
    errors.days = "days_required_error";
  }
  if (
    maxCount > 0 &&
    form.end.mode === "duration" &&
    !errors["end.minDuration"] &&
    !errors["end.maxDuration"] &&
    minimum >
      durationSeconds(form.end.maxDuration || form.end.minDuration || "")
  ) {
    errors.minDuration = "duration_exceeds_window_error";
  }
  if (
    maxCount > 0 &&
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
      errors["end.start"] = "window_end_order_error";
    } else if (minimum > span) {
      errors.minDuration = "duration_exceeds_window_error";
    }
  }
  return errors;
}
export function windowEndErrors(program, time) {
  if (time.mode !== "duration") {
    return timingErrors(program, time);
  }
  const errors = {};
  const minimum = durationSeconds(time.minDuration || "");
  const maximum = durationSeconds(time.maxDuration || time.minDuration || "");
  if (!Number.isFinite(minimum) || minimum <= 0 || minimum > 604_800) {
    errors.minDuration = "window_duration_error";
  }
  if (!Number.isFinite(maximum) || maximum <= 0 || maximum > 604_800) {
    errors.maxDuration = "window_duration_error";
  } else if (maximum < minimum) {
    errors.maxDuration = "window_duration_order_error";
  }
  return errors;
}
export function buildRandom(program, editor) {
  const errors = randomErrors(program, editor);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }
  if (editor.existing && !program.random?.[editor.id]) {
    throw new Error("random_changed_error");
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
    count:
      Number(form.minCount) === Number(form.maxCount)
        ? Number(form.minCount)
        : { min: Number(form.minCount), max: Number(form.maxCount) },
    on: buildAction(form.on),
    off: buildAction(
      form.sameEntities
        ? { ...form.off, entities: form.on.entities }
        : form.off,
    ),
  };
  return next;
}
