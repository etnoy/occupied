// Generated from custom_components/occupied/frontend/src/lib/utils/util.ts by pnpm run build. Do not edit.
import { translator } from "../i18n/translations.js";
import { formatClock } from "./time-format.js";
import { days } from "../models/model.js";
export function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}
export function isValueChangedEvent(event) {
  return (
    "detail" in event &&
    typeof event.detail === "object" &&
    event.detail !== null &&
    "value" in event.detail
  );
}
export function required(value) {
  if (value == null) {
    throw new Error("Required editor element or value is missing");
  }
  return value;
}
export function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type })),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function entityName(catalog, id) {
  return catalog.entities.find((entity) => entity.entity_id === id)?.name || id;
}
function minutes(value) {
  if (value === "0") {
    return 0;
  }
  if (typeof value === "number") {
    return value / 60;
  }
  const text = value || "0s";
  if (
    !/^[+-]?(?:\d+(?:\.\d+)?h)?(?:\d+(?:\.\d+)?m)?(?:\d+(?:\.\d+)?s)?$/.test(
      text,
    ) ||
    ["", "+", "-"].includes(text)
  ) {
    return NaN;
  }
  const total = [...text.matchAll(/(\d+(?:\.\d+)?)([hms])/g)].reduce(
    (n, [, amount, unit]) =>
      n + Number(amount) * { h: 60, m: 1, s: 1 / 60 }[unit],
    0,
  );
  return text.startsWith("-") ? -total : total;
}
export function durationSeconds(value) {
  return !value || value === "0" ? NaN : minutes(value) * 60;
}
export function durationLabel(value, t = translator()) {
  let remaining = Math.round(Math.abs(value) * 1e6) / 1e6;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const mins = Math.floor(remaining / 60);
  const seconds = Math.round((remaining - mins * 60) * 1e6) / 1e6;
  return [
    [hours, "hour", "hours"],
    [mins, "minute", "minutes"],
    [seconds, "second", "seconds"],
  ]
    .filter(([amount]) => amount > 0)
    .map(
      ([amount, singular, plural]) =>
        `${amount} ${t(amount === 1 ? singular : plural)}`,
    )
    .join(" ");
}
export function timingForm(timing = {}) {
  const clock = timing.absolute_time,
    source = timing.relative_to;
  let anchor = "";
  if (source?.step) {
    anchor = `step:${source.step}`;
  } else if (source?.random) {
    anchor = `random:${source.random}`;
  } else if (source?.sun) {
    anchor = `sun:${source.sun}`;
  } else if (source?.entity) {
    const attribute = source.attribute ? `:${source.attribute}` : "";
    anchor = `entity:${source.entity}${attribute}`;
  }
  let mode = source ? "relative" : "absolute";
  if (timing.duration) {
    mode = "duration";
  }
  return {
    mode,
    start: clock?.start || "18:00",
    end: clock?.end || "",
    anchor,
    startOffset: source?.start_offset || "0s",
    endOffset: source?.end_offset || "",
    ...(timing.duration && {
      minDuration: timing.duration.min,
      maxDuration: timing.duration.max || timing.duration.min,
    }),
    ...(timing.latest_at && { latestAt: timingForm(timing.latest_at) }),
    ...(timing.only_before && { onlyBefore: timingForm(timing.only_before) }),
  };
}
export function offsetErrors(time) {
  const errors = {},
    low = minutes(time.startOffset);
  const formatError = "offset_format_error";
  if (!time.startOffset || !Number.isFinite(low)) {
    errors.startOffset = formatError;
  } else if (Math.abs(low) > 10_080) {
    errors.startOffset = "offset_range_error";
  }
  if (time.endOffset) {
    const high = minutes(time.endOffset);
    if (!Number.isFinite(high)) {
      errors.endOffset = formatError;
    } else if (Math.abs(high) > 10_080) {
      errors.endOffset = "offset_range_error";
    } else if (Number.isFinite(low) && high < low) {
      errors.endOffset = "offset_order_error";
    }
  }
  return errors;
}
function scheduleDaySuffix(selected, t) {
  if (!selected) {
    return "";
  }
  if (selected.length === 0) {
    return ` ${t("on_no_days")}`;
  }
  if (days.every((day) => selected.includes(day))) {
    return "";
  }
  if (
    selected.length === 5 &&
    days.slice(0, 5).every((day) => selected.includes(day))
  ) {
    return ` ${t("on_weekdays")}`;
  }
  if (
    selected.length === 2 &&
    days.slice(5).every((day) => selected.includes(day))
  ) {
    return ` ${t("on_weekends")}`;
  }
  const weekdayNames = {
    mon: "mondays",
    tue: "tuesdays",
    wed: "wednesdays",
    thu: "thursdays",
    fri: "fridays",
    sat: "saturdays",
    sun: "sundays",
  };
  const dayNames = selected.map((day) => t(weekdayNames[day] || day));
  const lastDay = dayNames.pop();
  const dayList =
    dayNames.length > 0
      ? `${dayNames.join(", ")}${dayNames.length > 1 ? "," : ""} ${t("and")} ${lastDay}`
      : lastDay;
  return ` ${t("on")} ${dayList}`;
}
export function timingSummary(
  entry,
  entries,
  t = translator(),
  sources = [],
  locale,
) {
  if (!entry.timing) {
    return `${t("repeated_activity_window")}${scheduleDaySuffix(entry.days, t)}`;
  }
  const timing = timingExplanation(
    timingForm(entry.timing),
    entries,
    t,
    sources,
    {
      includeHints: false,
      locale,
      days: entry.days,
    },
  );
  const staggerSeconds = (entry.actions ?? [entry]).reduce(
    (total, action) =>
      total +
      (action.stagger?.enabled
        ? durationSeconds(action.stagger.period ?? "2m")
        : 0),
    0,
  );
  return staggerSeconds > 0
    ? `${timing}. ${t("stagger_timing_summary").replace("{duration}", () => durationLabel(staggerSeconds, t))}`
    : timing;
}
export function timingExplanation(
  input,
  entries = [],
  t = translator(),
  sources = [],
  options = {},
) {
  const modified = input.latestAt || input.onlyBefore;
  let explanation = baseTimingExplanation(input, entries, t, sources, {
    ...options,
    ...(modified && { includeHints: false }),
  });
  for (const key of ["latestAt", "onlyBefore"]) {
    const boundary = input[key];
    if (!boundary) {
      continue;
    }
    let label = formatClock(boundary.start, options.locale);
    if (boundary.mode === "relative") {
      label =
        durationSeconds(String(boundary.startOffset)) === 0
          ? t(boundary.anchor.slice(4))
          : baseTimingExplanation(boundary, [], t, [], {
              includeHints: false,
            }).slice(t("runs").length + 1);
    }
    explanation += `. ${t(key === "latestAt" ? "latest_at_summary" : "only_before_summary").replace("{boundary}", () => label)}`;
  }
  if (modified && options.includeHints !== false) {
    explanation += `. ${t("timing_limits_sampling_hint")}`;
  }
  return explanation;
}
function baseTimingExplanation(
  input,
  entries = [],
  t = translator(),
  sources = [],
  { includeHints = true, subject = "runs", locale, days: selectedDays } = {},
) {
  const runs = `${t(subject)}${scheduleDaySuffix(selectedDays, t)}`;
  const time = {
    start: "",
    end: "",
    anchor: "",
    startOffset: "0s",
    endOffset: "",
    ...input,
  };
  if (time.mode === "duration") {
    const minimum = durationSeconds(time.minDuration || "");
    const maximum = durationSeconds(time.maxDuration || time.minDuration || "");
    if (
      !Number.isFinite(minimum) ||
      !Number.isFinite(maximum) ||
      minimum <= 0 ||
      maximum < minimum ||
      maximum > 604_800
    ) {
      return t("window_durations_prompt");
    }
    return t(
      minimum === maximum
        ? "window_duration_summary"
        : "window_duration_range_summary",
    )
      .replace("{duration}", () => durationLabel(minimum, t))
      .replace("{min}", () => durationLabel(minimum, t))
      .replace("{max}", () => durationLabel(maximum, t));
  }
  if (time.mode === "absolute") {
    const valid = (value) =>
      /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
    const display = (value) => formatClock(value, locale);
    const seconds = (value) =>
      value
        .split(":")
        .reduce(
          (sum, part, index) => sum + Number(part) * [3600, 60, 1][index],
          0,
        );
    if (!valid(time.start) || (time.end && !valid(time.end))) {
      return t("time_window_prompt");
    }
    const fixedTime = `${runs} ${t("at")} ${display(time.start)}`;
    if (!time.end) {
      return `${fixedTime}${includeHints ? `. ${t("time_window_randomness_hint")}` : ""}`;
    }
    if (seconds(time.end) === seconds(time.start)) {
      return `${fixedTime}${includeHints ? `. ${t("time_window_fixed_hint")}` : ""}`;
    }
    const nextDay =
      seconds(time.end) < seconds(time.start) ? ` ${t("the_next_day")}` : "";
    return `${runs} ${t("at_a_random_time_between")} ${display(time.start)} ${t("and")} ${display(time.end)}${nextDay}`;
  }
  if (Object.keys(offsetErrors(time)).length > 0) {
    return t(
      subject === "runs" ? "step_offsets_prompt" : "window_offsets_prompt",
    );
  }
  if (!time.anchor) {
    return t("choose_a_step_or_event");
  }
  const step = time.anchor.startsWith("step:");
  let name;
  if (time.anchor.startsWith("random:")) {
    name = `${t("the_end_of")} ${entries.find((entry) => entry.id === time.anchor)?.name || time.anchor.slice(7)}`;
  } else if (step) {
    name =
      entries.find((entry) => entry.id === time.anchor.slice(5))?.name ||
      time.anchor.slice(5);
  } else if (time.anchor.startsWith("sun:")) {
    name = t(time.anchor.slice(4));
  } else {
    name =
      sources.find((source) => source.value === time.anchor)?.name ||
      time.anchor
        .slice(7)
        .replace(
          /:(start_time|end_time)$/,
          (_, attribute) =>
            ` · ${t(attribute === "start_time" ? "start" : "end")}`,
        );
  }
  const low = minutes(time.startOffset),
    high = time.endOffset ? minutes(time.endOffset) : low;
  const duration = (offset) => durationLabel(Math.abs(offset) * 60, t);
  const offsetLabel = (offset) =>
    `${duration(offset)} ${t(offset < 0 ? "before" : "after")}`;
  if (low === high) {
    const fixedTime =
      low === 0
        ? `${runs} ${t("at_the_same_time_as")} ${name}`
        : `${runs} ${offsetLabel(low)} ${name}`;
    return `${fixedTime}${includeHints && !time.endOffset ? `. ${t("time_offset_randomness_hint")}` : ""}`;
  }
  if (low === 0 || high === 0) {
    return `${runs} ${t("at_a_random_time_during_the")} ${offsetLabel(low === 0 ? high : low)} ${name}`;
  }
  const firstBound =
    Math.sign(low) === Math.sign(high) ? duration(low) : offsetLabel(low);
  return `${runs} ${t("at_a_random_time_between")} ${firstBound} ${t("and")} ${offsetLabel(high)} ${name}`;
}
