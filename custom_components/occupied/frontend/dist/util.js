// Generated from util.ts by pnpm run build. Do not edit.
import { formatClock } from "./time-format.js";
import { days } from "./model.js";
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
export function timingForm(timing = {}) {
  const clock = timing.absolute_time,
    source = timing.relative_to;
  let anchor = "";
  if (source?.step) {
    anchor = `step:${source.step}`;
  } else if (source?.sun) {
    anchor = `sun:${source.sun}`;
  } else if (source?.entity) {
    const attribute = source.attribute ? `:${source.attribute}` : "";
    anchor = `entity:${source.entity}${attribute}`;
  }
  return {
    mode: source ? "relative" : "absolute",
    start: clock?.start || "18:00",
    end: clock?.end || "",
    anchor,
    startOffset: source?.start_offset || "0s",
    endOffset: source?.end_offset || "",
  };
}
export function offsetErrors(time) {
  const errors = {},
    low = minutes(time.startOffset);
  const formatError = "Use h, m or s, for example 30m, 1h, 1h30m or -10m.";
  if (!time.startOffset || !Number.isFinite(low)) {
    errors.startOffset = formatError;
  } else if (Math.abs(low) > 10_080) {
    errors.startOffset = "Offsets must be within seven days.";
  }
  if (time.endOffset) {
    const high = minutes(time.endOffset);
    if (!Number.isFinite(high)) {
      errors.endOffset = formatError;
    } else if (Math.abs(high) > 10_080) {
      errors.endOffset = "Offsets must be within seven days.";
    } else if (Number.isFinite(low) && high < low) {
      errors.endOffset = "The end offset must be at least the start offset.";
    }
  }
  return errors;
}
function scheduleDaySuffix(selected, t) {
  if (!selected) {
    return "";
  }
  if (selected.length === 0) {
    return ` ${t("on no days")}`;
  }
  if (days.every((day) => selected.includes(day))) {
    return "";
  }
  if (
    selected.length === 5 &&
    days.slice(0, 5).every((day) => selected.includes(day))
  ) {
    return ` ${t("on weekdays")}`;
  }
  if (
    selected.length === 2 &&
    days.slice(5).every((day) => selected.includes(day))
  ) {
    return ` ${t("on weekends")}`;
  }
  const weekdayNames = {
    mon: "Mondays",
    tue: "Tuesdays",
    wed: "Wednesdays",
    thu: "Thursdays",
    fri: "Fridays",
    sat: "Saturdays",
    sun: "Sundays",
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
  t = (v) => v,
  sources = [],
  locale,
) {
  if (!entry.timing) {
    return `${t("Repeated activity window")}${scheduleDaySuffix(entry.days, t)}`;
  }
  return timingExplanation(timingForm(entry.timing), entries, t, sources, {
    includeHints: false,
    locale,
    days: entry.days,
  });
}
export function timingExplanation(
  input,
  entries = [],
  t = (value) => value,
  sources = [],
  { includeHints = true, locale, days: selectedDays } = {},
) {
  const runs = `${t("Runs")}${scheduleDaySuffix(selectedDays, t)}`;
  const time = {
    start: "",
    end: "",
    anchor: "",
    startOffset: "0s",
    endOffset: "",
    ...input,
  };
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
      return t("Choose valid start and end times");
    }
    const fixedTime = `${runs} ${t("at")} ${display(time.start)}`;
    if (!time.end) {
      return `${fixedTime}${includeHints ? `. ${t("Add an end of window to introduce randomness")}` : ""}`;
    }
    if (seconds(time.end) === seconds(time.start)) {
      return `${fixedTime}${includeHints ? `. ${t("Start and end are the same, so the time is fixed")}` : ""}`;
    }
    const nextDay =
      seconds(time.end) < seconds(time.start) ? ` ${t("the next day")}` : "";
    return `${runs} ${t("at a random time between")} ${display(time.start)} ${t("and")} ${display(time.end)}${nextDay}`;
  }
  if (Object.keys(offsetErrors(time)).length > 0) {
    return t("Enter valid offsets to see when this step runs");
  }
  if (!time.anchor) {
    return t("Choose a step or event");
  }
  const step = time.anchor.startsWith("step:");
  let name;
  if (step) {
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
  const duration = (offset) => {
    let remaining = Math.round(Math.abs(offset) * 60 * 1e6) / 1e6;
    const hours = Math.floor(remaining / 3600);
    remaining -= hours * 3600;
    const mins = Math.floor(remaining / 60);
    const seconds = Math.round((remaining - mins * 60) * 1e6) / 1e6;
    return [
      [hours, "hour", "hours"],
      [mins, "minute", "minutes"],
      [seconds, "second", "seconds"],
    ]
      .filter(([amount]) => amount)
      .map(
        ([amount, singular, plural]) =>
          `${amount} ${t(amount === 1 ? singular : plural)}`,
      )
      .join(" ");
  };
  const offsetLabel = (offset) =>
    `${duration(offset)} ${t(offset < 0 ? "before" : "after")}`;
  if (low === high) {
    const fixedTime =
      low === 0
        ? `${runs} ${t("at the same time as")} ${name}`
        : `${runs} ${offsetLabel(low)} ${name}`;
    return `${fixedTime}${includeHints && !time.endOffset ? `. ${t("Add an end offset to introduce randomness")}` : ""}`;
  }
  const anchorStart = step ? `${t("the start of")} ${name}` : name;
  if (low === 0) {
    return `${runs} ${t("at a random time between")} ${anchorStart} ${t("and")} ${offsetLabel(high)} ${name}`;
  }
  if (high === 0) {
    return `${runs} ${t("at a random time between")} ${offsetLabel(low)} ${name} ${t("and")} ${anchorStart}`;
  }
  const firstBound =
    Math.sign(low) === Math.sign(high) ? duration(low) : offsetLabel(low);
  return `${runs} ${t("at a random time between")} ${firstBound} ${t("and")} ${offsetLabel(high)} ${name}`;
}
