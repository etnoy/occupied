// Generated from occupied-panel.ts by pnpm run build. Do not edit.
// custom_components/occupied/frontend/time-format.ts
function shiftScheduleDate(value, days2) {
  const date = /* @__PURE__ */ new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days2);
  return date.toISOString().slice(0, 10);
}
function calendarMidnight(value, zone) {
  const target = Date.parse(`${value}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(instant)
        .map(({ type, value: value2 }) => [type, value2]),
    );
    const local = Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
    );
    const correction = target - local;
    if (correction === 0) {
      return new Date(instant).toISOString();
    }
    instant += correction;
  }
  return new Date(instant).toISOString();
}
function formatScheduleDate(value, locale) {
  const weekday = new Intl.DateTimeFormat(locale?.language, {
    weekday: "long",
    timeZone: "UTC",
  }).format(/* @__PURE__ */ new Date(`${value}T12:00:00Z`));
  return `${weekday} ${value}`;
}
function formatPreviewDate(value, today, locale, t) {
  const valueTime = Date.parse(`${value}T12:00:00Z`);
  const todayTime = Date.parse(`${today}T12:00:00Z`);
  const daysFromToday = Math.round((valueTime - todayTime) / 864e5);
  const relativeLabels = {
    [-1]: "Yesterday",
    0: "Today",
    1: "Tomorrow",
  };
  const relativeLabel = relativeLabels[daysFromToday]
    ? t(relativeLabels[daysFromToday])
    : void 0;
  const dateLabel = formatScheduleDate(value, locale);
  return relativeLabel ? `${relativeLabel} \xB7 ${dateLabel}` : dateLabel;
}
function usesAmPm(locale) {
  if (!locale) {
    return false;
  }
  if (locale.time_format === "12") {
    return true;
  }
  if (locale.time_format === "24") {
    return false;
  }
  const language = locale.time_format === "language" ? locale.language : void 0;
  const hourCycle2 = new Intl.DateTimeFormat(language, {
    hour: "numeric",
  }).resolvedOptions().hourCycle;
  return hourCycle2 === "h11" || hourCycle2 === "h12";
}
function formatterLocale(locale) {
  return locale?.language;
}
function hourCycle(locale) {
  return usesAmPm(locale) ? "h12" : "h23";
}
function formatClock(value, locale) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    return value;
  }
  const [, hour, minute, second] = match;
  const date = new Date(
    Date.UTC(2020, 0, 1, Number(hour), Number(minute), Number(second || 0)),
  );
  return new Intl.DateTimeFormat(formatterLocale(locale), {
    hour: usesAmPm(locale) ? "numeric" : "2-digit",
    minute: "2-digit",
    ...(Number(second) && { second: "2-digit" }),
    hourCycle: hourCycle(locale),
    timeZone: "UTC",
  }).format(date);
}
function formatTimestamp(value, zone, locale) {
  return new Intl.DateTimeFormat(formatterLocale(locale), {
    dateStyle: "short",
    timeStyle: "medium",
    hourCycle: hourCycle(locale),
    timeZone: zone && zone !== "home_assistant" ? zone : void 0,
  }).format(new Date(value));
}

// custom_components/occupied/frontend/model.ts
var copy = (value) => structuredClone(value);
var days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
function set(object, path, value) {
  if (path.length === 0) {
    throw new Error("Cannot set an empty path");
  }
  let parent = object;
  for (const [i, key2] of path.slice(0, -1).entries()) {
    parent = parent[key2] ??= typeof path[i + 1] === "number" ? [] : {};
  }
  const last = path.at(-1);
  if (value === void 0) {
    delete parent[last];
  } else {
    parent[last] = value;
  }
}
function identifier(program, name, collection = "steps") {
  let base = name
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
  if (!/^[a-z]/.test(base)) {
    base = "item_" + base;
  }
  base ||= "item";
  const used = new Set(Object.keys(program[collection] || {}));
  let id = base,
    n = 2;
  while (used.has(id)) {
    id = `${base}_${n++}`;
  }
  return id;
}
function references(program, id) {
  const result = Object.entries(program.steps || {})
    .filter(([, step]) => step.timing.relative_to?.step === id)
    .map(([key2]) => ["steps", key2, "timing", "relative_to", "step"]);
  for (const [key2, event2] of Object.entries(program.random || {})) {
    for (const edge of ["start", "end"]) {
      if (event2[edge].relative_to?.step === id) {
        result.push(["random", key2, edge, "relative_to", "step"]);
      }
    }
  }
  return result;
}
function removeStep(program, path) {
  const id = String(path[1]);
  if (references(program, id).length > 0) {
    throw new Error(
      "Steps or random events depend on this step. Change their timing first.",
    );
  }
  delete program.steps?.[id];
}
function parentSteps(program, child2) {
  const blocked = /* @__PURE__ */ new Set([child2]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, step] of Object.entries(program.steps || {})) {
      if (
        !(
          step.timing.relative_to?.step &&
          blocked.has(step.timing.relative_to.step)
        ) ||
        blocked.has(id)
      ) {
        continue;
      }
      blocked.add(id);
      changed = true;
    }
  }
  return Object.entries(program.steps || {})
    .filter(([id]) => !blocked.has(id))
    .map(([id, step]) => ({ ...step, id, name: step.name || id }));
}
function parentRandomEvents(program, child2) {
  const blocked = /* @__PURE__ */ new Set([child2]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, event2] of Object.entries(program.random || {})) {
      const parent = event2.start.relative_to?.random;
      if (parent && blocked.has(parent) && !blocked.has(id)) {
        blocked.add(id);
        changed = true;
      }
    }
  }
  return Object.entries(program.random || {})
    .filter(([id]) => !blocked.has(id))
    .map(([id, event2]) => ({ ...event2, id }));
}
function randomReferences(program, id) {
  return Object.entries(program.random || {})
    .filter(([, event2]) => event2.start.relative_to?.random === id)
    .map(([key2]) => ["random", key2, "start", "relative_to", "random"]);
}

// custom_components/occupied/frontend/util.ts
function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }
  return String(error);
}
function isValueChangedEvent(event2) {
  return (
    "detail" in event2 &&
    typeof event2.detail === "object" &&
    event2.detail !== null &&
    "value" in event2.detail
  );
}
function required(value) {
  if (value == null) {
    throw new Error("Required editor element or value is missing");
  }
  return value;
}
function download(name, text2, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text2], { type })),
    link2 = document.createElement("a");
  link2.href = url;
  link2.download = name;
  link2.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
function entityName(catalog, id) {
  return catalog.entities.find((entity) => entity.entity_id === id)?.name || id;
}
function minutes(value) {
  if (value === "0") {
    return 0;
  }
  if (typeof value === "number") {
    return value / 60;
  }
  const text2 = value || "0s";
  if (
    !/^[+-]?(?:\d+(?:\.\d+)?h)?(?:\d+(?:\.\d+)?m)?(?:\d+(?:\.\d+)?s)?$/.test(
      text2,
    ) ||
    ["", "+", "-"].includes(text2)
  ) {
    return NaN;
  }
  const total = [...text2.matchAll(/(\d+(?:\.\d+)?)([hms])/g)].reduce(
    (n, [, amount, unit]) =>
      n + Number(amount) * { h: 60, m: 1, s: 1 / 60 }[unit],
    0,
  );
  return text2.startsWith("-") ? -total : total;
}
function durationSeconds(value) {
  return !value || value === "0" ? NaN : minutes(value) * 60;
}
function durationLabel(value, t = (text2) => text2) {
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
function timingForm(timing = {}) {
  const clock = timing.absolute_time,
    source2 = timing.relative_to;
  let anchor = "";
  if (source2?.step) {
    anchor = `step:${source2.step}`;
  } else if (source2?.random) {
    anchor = `random:${source2.random}`;
  } else if (source2?.sun) {
    anchor = `sun:${source2.sun}`;
  } else if (source2?.entity) {
    const attribute = source2.attribute ? `:${source2.attribute}` : "";
    anchor = `entity:${source2.entity}${attribute}`;
  }
  let mode = source2 ? "relative" : "absolute";
  if (timing.duration) {
    mode = "duration";
  }
  return {
    mode,
    start: clock?.start || "18:00",
    end: clock?.end || "",
    anchor,
    startOffset: source2?.start_offset || "0s",
    endOffset: source2?.end_offset || "",
    ...(timing.duration && {
      minDuration: timing.duration.min,
      maxDuration: timing.duration.max || timing.duration.min,
    }),
  };
}
function offsetErrors(time) {
  const errors = {},
    low = minutes(time.startOffset);
  const formatError = "Use h, m or s, for example 30m, 1h, 1h30m or -10m.";
  if (!time.startOffset || !Number.isFinite(low)) {
    errors.startOffset = formatError;
  } else if (Math.abs(low) > 10080) {
    errors.startOffset = "Offsets must be within seven days.";
  }
  if (time.endOffset) {
    const high = minutes(time.endOffset);
    if (!Number.isFinite(high)) {
      errors.endOffset = formatError;
    } else if (Math.abs(high) > 10080) {
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
function timingSummary(entry, entries, t = (v) => v, sources = [], locale) {
  if (!entry.timing) {
    return `${t("Repeated activity window")}${scheduleDaySuffix(entry.days, t)}`;
  }
  return timingExplanation(timingForm(entry.timing), entries, t, sources, {
    includeHints: false,
    locale,
    days: entry.days,
  });
}
function timingExplanation(
  input,
  entries = [],
  t = (value) => value,
  sources = [],
  { includeHints = true, subject = "Runs", locale, days: selectedDays } = {},
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
      maximum > 604800
    ) {
      return t("Choose valid window durations.");
    }
    return t(
      minimum === maximum
        ? "Window closes {duration} after it starts"
        : "Window closes between {min} and {max} after it starts",
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
          (sum, part, index2) => sum + Number(part) * [3600, 60, 1][index2],
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
    return t(
      subject === "Runs"
        ? "Enter valid offsets to see when this step runs"
        : "Enter valid offsets to see the window boundary",
    );
  }
  if (!time.anchor) {
    return t("Choose a step or event");
  }
  const step = time.anchor.startsWith("step:");
  let name;
  if (time.anchor.startsWith("random:")) {
    name = `${t("the end of")} ${entries.find((entry) => entry.id === time.anchor)?.name || time.anchor.slice(7)}`;
  } else if (step) {
    name =
      entries.find((entry) => entry.id === time.anchor.slice(5))?.name ||
      time.anchor.slice(5);
  } else if (time.anchor.startsWith("sun:")) {
    name = t(time.anchor.slice(4));
  } else {
    name =
      sources.find((source2) => source2.value === time.anchor)?.name ||
      time.anchor
        .slice(7)
        .replace(
          /:(start_time|end_time)$/,
          (_, attribute) =>
            ` \xB7 ${t(attribute === "start_time" ? "start" : "end")}`,
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

// custom_components/occupied/frontend/styles.ts
var styles = `
  p,
  li {
    overflow-wrap: anywhere;
  }
  :host {
    display: block;
    min-height: 100%;
    background: var(--primary-background-color, #f4f5f8);
    color: var(--primary-text-color, #202c37);
    font:
      15px/1.5 system-ui,
      sans-serif;
  }
  * {
    box-sizing: border-box;
  }
  main {
    max-width: 1200px;
    margin: auto;
    padding: 24px;
  }
  h1 {
    margin: 0;
    font-size: 28px;
  }
  h2 {
    font-size: 21px;
    margin: 0 0 12px;
  }
  h3 {
    font-size: 17px;
  }
  p {
    margin: 8px 0;
  }
  small,
  .hint {
    color: var(--secondary-text-color, #596773);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  nav,
  .row,
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  nav {
    margin: 18px 0;
  }
  nav button[aria-current="page"] {
    background: var(--primary-color, #167b94);
    color: white;
  }
  section {
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 12px;
    padding: 20px;
    margin: 16px 0;
    min-width: 0;
  }
  section section {
    border-radius: 8px;
  }
  details {
    padding: 12px 0;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
  }
  button,
  input,
  select,
  textarea {
    font: inherit;
    color: inherit;
  }
  button {
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #bdc9d2);
    padding: 8px 14px;
    border-radius: 8px;
    cursor: pointer;
    min-height: 42px;
  }
  button.primary {
    background: var(--primary-color, #167b94);
    color: white;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  summary:focus-visible,
  a:focus-visible,
  [tabindex]:focus-visible {
    outline: 3px solid var(--primary-color, #167b94);
    outline-offset: 2px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin: 12px 0;
    max-width: 700px;
  }
  label {
    font-weight: 500;
  }
  input:not([type="checkbox"]),
  select,
  textarea {
    border: 1px solid var(--divider-color, #bdc9d2);
    border-radius: 6px;
    background: var(--card-background-color, #fff);
    padding: 9px;
    min-width: 0;
    max-width: 100%;
  }
  .field input,
  .field select,
  .field textarea {
    width: 100%;
  }
  textarea {
    resize: vertical;
  }
  .field textarea {
    font:
      14px/1.5 ui-monospace,
      monospace;
  }
  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    vertical-align: middle;
  }
  fieldset {
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 8px;
    margin: 12px 0;
    min-width: 0;
  }
  .banner {
    padding: 12px 16px;
    border-radius: 8px;
    background: var(--secondary-background-color, #e3eef2);
    margin: 12px 0;
    overflow-wrap: anywhere;
  }
  .banner.unsaved {
    border: 1px solid var(--warning-color, #e69500);
    border-left-width: 4px;
    background: color-mix(
      in srgb,
      var(--warning-color, #e69500) 18%,
      var(--card-background-color, #fff)
    );
    color: var(--primary-text-color, #202c37);
    font-weight: 600;
  }
  .error,
  [aria-invalid="true"] {
    color: var(--error-color, #b3261e);
  }
  [aria-invalid="true"] {
    border-color: var(--error-color, #b3261e);
  }
  [hidden] {
    display: none !important;
  }
  .toolbar {
    position: sticky;
    top: 0;
    padding: 12px 0;
    background: var(--primary-background-color, #f4f5f8);
    z-index: 2;
  }
  .table-wrap {
    overflow: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    padding: 9px;
    text-align: left;
    border-bottom: 1px solid var(--divider-color, #d5dce3);
    max-width: 300px;
    overflow-wrap: anywhere;
  }
  th {
    white-space: nowrap;
  }
  @media (max-width: 600px) {
    main {
      padding: 14px;
    }
    section {
      padding: 14px;
    }
    nav {
      gap: 5px;
    }
    nav button {
      padding: 7px 10px;
    }
    .row input {
      width: 100%;
    }
  }

  /* Routine builder */
  main {
    max-width: 1120px;
    padding: 32px;
  }
  header {
    margin-bottom: 24px;
  }
  header h1 {
    font-size: 24px;
    letter-spacing: -0.7px;
  }
  header p {
    margin: 2px 0;
    font-size: 13px;
  }
  nav {
    border-bottom: 1px solid var(--divider-color, #d5dce3);
    gap: 24px;
    margin: 16px 0 32px;
  }
  nav button,
  nav button[aria-current="page"] {
    border: 0;
    border-radius: 0;
    border-bottom: 3px solid transparent;
    background: transparent;
    padding: 10px 0;
    color: var(--secondary-text-color, #596773);
  }
  nav button[aria-current="page"] {
    border-bottom-color: var(--primary-color, #167b94);
    color: var(--primary-color, #167b94);
    font-weight: 650;
  }
  .field-label-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
  }
  .field-label-row .text-button {
    min-height: 24px;
    padding: 0;
    border: 0;
    font-size: 13px;
  }
  .text-button {
    border-color: transparent;
    background: transparent;
    color: var(--primary-color, #167b94);
    padding-left: 4px;
    padding-right: 4px;
  }
  .page-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin: 24px 0;
  }
  .page-heading h2 {
    font-size: 30px;
    letter-spacing: -0.8px;
    margin: 0;
  }
  .page-heading .hint {
    max-width: 500px;
  }
  .step-empty {
    text-align: center;
    padding: 60px 32px;
    border-style: dashed;
  }
  .step-empty h2 {
    font-size: 25px;
    letter-spacing: -0.5px;
  }
  .step-empty p {
    max-width: 490px;
    margin: 12px auto 24px;
  }
  .empty-steps {
    font-size: 13px;
    color: var(--secondary-text-color, #596773);
  }
  .step-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0 0 20px;
    min-width: 0;
  }
  .step-card {
    width: calc(100% - var(--depth) * 14px);
    margin-left: calc(var(--depth) * 14px);
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 12px;
    background: var(--card-background-color, #fff);
    overflow: hidden;
  }
  .step-card.step-disabled {
    border-style: dashed;
  }
  .step-card.step-warning {
    border-color: var(--warning-color, #ffa600);
    background: color-mix(in srgb, var(--warning-color, #ffa600) 10%, var(--card-background-color, #fff));
  }
  .step-card.step-warning .step-row:not(:disabled):hover {
    background: color-mix(in srgb, var(--warning-color, #ffa600) 18%, var(--card-background-color, #fff));
  }
  .step-row-warning {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: var(--warning-color, #ffa600);
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .step-row-warning ha-icon {
    --mdc-icon-size: 20px;
    flex-shrink: 0;
  }
  .step-warning-message { display: block; }
  .step-card.step-disabled .step-row {
    color: var(--secondary-text-color, #596773);
  }
  .step-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr);
    align-items: center;
    gap: 14px;
    text-align: left;
    width: 100%;
    padding: 20px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
  }
  .step-row:disabled { opacity: 1; cursor: default; }
  .step-row.editing { grid-template-columns: minmax(0, 1fr); }
  .step-row:not(:disabled):hover { background: var(--secondary-background-color, #e3eef2); }
  .step-row[aria-expanded="true"] { border-bottom: 1px solid var(--divider-color, #d5dce3); }
  .step-card .step-editor { margin: 0; }
  .step-editor-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  .step-actions-menu {
    position: fixed;
    inset: auto;
    width: 240px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    overflow: auto;
    margin: 0;
    padding: 6px;
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 10px;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #202c37);
    box-shadow: 0 6px 24px #0003;
  }
  .step-actions-menu button {
    display: block;
    width: 100%;
    border: 0;
    background: transparent;
    text-align: left;
  }
  .step-actions-menu button:hover,
  .step-actions-menu button:focus-visible {
    background: var(--secondary-background-color, #e3eef2);
  }
  .step-actions-menu [role="separator"] {
    border-top: 1px solid var(--divider-color, #d5dce3);
    margin: 6px 8px;
  }
  .step-row-content {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  }
  .step-row-heading {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .step-status-badge {
    padding: 2px 8px;
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 999px;
    background: var(--secondary-background-color, #e3eef2);
    color: var(--secondary-text-color, #596773);
    font-size: 11px;
    font-weight: 500;
    line-height: 1.5;
    white-space: nowrap;
  }
  .step-row strong {
    font-size: 16px;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
  .step-row-content .hint {
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .step-row-time {
    text-align: right;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .step-delete-dialog,
  .step-advanced-dialog {
    width: 440px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    overflow: auto;
    padding: 24px;
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 12px;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #202c37);
    box-shadow: 0 6px 24px #0003;
  }
  .step-delete-dialog::backdrop,
  .step-advanced-dialog::backdrop {
    background: #0006;
  }
  .step-weekdays {
    padding: 12px;
  }
  .step-weekday-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }
  .step-weekday-presets button {
    padding: 6px 10px;
  }
  .step-weekday-presets button[aria-pressed="true"] {
    border-color: var(--primary-color, #167b94);
    background: var(--secondary-background-color, #e3eef2);
    color: var(--primary-color, #167b94);
  }
  .step-weekday-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .step-weekday-option {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 42px;
    cursor: pointer;
  }
  .step-weekday-option input {
    flex: 0 0 auto;
    accent-color: var(--primary-color, #167b94);
  }
  .step-exit-overlay {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: grid;
    place-items: center;
    padding: 16px;
    background: #0004;
  }
  .step-exit-dialog {
    position: relative;
    inset: auto;
    width: 440px;
    max-width: 100%;
    margin: 0;
    padding: 24px;
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 12px;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #202c37);
    box-shadow: 0 6px 24px #0003;
  }
  .step-exit-dialog h2 { margin-top: 0; }
  .step-delete-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 24px;
  }
  .danger {
    color: var(--error-color, #b3261e);
  }
  .icon-button {
    display: inline-grid;
    place-items: center;
    width: 42px;
    padding: 8px;
  }
  .icon-button svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
  .step-editor {
    max-width: none;
    margin: 0 auto 32px;
    padding: 32px;
  }
  .step-editor h3 {
    font-size: 23px;
    font-weight: 600;
    letter-spacing: -0.5px;
    margin: 28px 0 8px;
  }
  .entity-native-selector {
    display: block;
    width: 100%;
  }
  .builder-footer {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    border-top: 1px solid var(--divider-color, #d5dce3);
    padding-top: 22px;
    margin-top: 28px;
  }
  .builder-footer .step-editor-actions { margin-top: 0; }
  .builder-footer > button:first-child {
    margin-right: auto;
  }
  .step-editor details {
    padding: 8px 0;
  }
  .step-editor .field {
    margin: 18px 0;
  }
  .source-picker {
    position: relative;
  }
  .source-picker ha-generic-picker {
    display: block;
    width: 100%;
  }
  .step-editor .error {
    font-size: 13px;
  }
  .timing-options {
    border: 0;
    padding: 0;
    margin: 18px 0;
  }
  .timing-option-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .timing-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    min-height: 44px;
    border: 1px solid var(--divider-color, #bdc9d2);
    border-radius: 8px;
    cursor: pointer;
  }
  .timing-option:has(input:checked) {
    border-color: var(--primary-color, #167b94);
    background: var(--secondary-background-color, #e3eef2);
    color: var(--primary-color, #167b94);
  }
  .timing-options input[type="radio"] {
    width: 18px;
    height: 18px;
    padding: 0;
    margin: 0;
    flex: 0 0 auto;
    accent-color: var(--primary-color, #167b94);
  }

  .step-editor .step-name-editor .field {
    max-width: none;
    margin: 20px 0 28px;
  }
  .step-editor .step-name-editor label {
    font-weight: 600;
  }
  .step-editor .step-name-editor input {
    font-family: inherit;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.4;
    padding: 14px;
  }

  .step-editor .editor-sections {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px;
  }
  .step-editor .editor-sections > div {
    min-width: 0;
  }
  .step-editor h3 {
    margin: 16px 0 8px;
    font-size: 20px;
  }
  .step-editor h4 {
    margin: 14px 0 8px;
    font-size: 16px;
    font-weight: 600;
  }
  .step-editor .field {
    margin: 14px 0;
  }
  @media (max-width: 900px) {
    .step-editor .editor-sections {
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .step-editor .editor-sections > div + div {
      border-top: 1px solid var(--divider-color, #d5dce3);
      padding-top: 12px;
    }
  }
  #issues:empty {
    display: none;
  }
  #issues button {
    margin: 0 6px 8px 0;
    text-align: left;
  }
  @media (max-width: 600px) {
    main {
      padding: 18px 14px;
    }
    header {
      gap: 10px;
      margin-bottom: 8px;
    }
    nav {
      margin-bottom: 24px;
    }
    .page-heading {
      align-items: flex-start;
      flex-direction: column;
      gap: 12px;
    }
    .page-heading h2 {
      font-size: 27px;
    }
    .step-row {
      padding: 14px;
      gap: 10px;
      grid-template-columns: minmax(0, 1fr);
    }
    .step-row-time {
      text-align: left;
    }
    .step-editor {
      padding: 20px 16px;
    }
    .builder-footer {
      gap: 6px;
    }
    .builder-footer button {
      padding: 8px 12px;
    }
    .step-empty {
      padding: 36px 20px;
    }
    .empty-steps {
      line-height: 2;
    }
  }
`;

// custom_components/occupied/frontend/translations.ts
var sv = {
  "Live preview": "Livef\xF6rhandsvisning",
  "Controls real devices": "Styr riktiga enheter",
  "Scheduling stays paused until you choose Resume scheduling.":
    "Schemal\xE4ggningen f\xF6rblir pausad tills du v\xE4ljer \xC5teruppta schemal\xE4ggning.",
  "Normal scheduling pauses until you choose Resume scheduling. Each press runs one event immediately, even with management disabled or dry run selected.":
    "Schemal\xE4ggningen pausas tills du v\xE4ljer \xC5teruppta schemal\xE4ggning. Varje tryck k\xF6r en h\xE4ndelse direkt, \xE4ven n\xE4r styrningen \xE4r avst\xE4ngd eller torrk\xF6rning \xE4r vald.",
  "Starting prepares the session. Devices run only when you press Next event.":
    "Start f\xF6rbereder sessionen. Enheterna styrs f\xF6rst n\xE4r du trycker p\xE5 N\xE4sta h\xE4ndelse.",
  "Start live preview": "Starta livef\xF6rhandsvisning",
  "Ready to start": "Redo att starta",
  "Ready for next event": "Redo f\xF6r n\xE4sta h\xE4ndelse",
  "Next event": "N\xE4sta h\xE4ndelse",
  "Running\u2026": "K\xF6r\u2026",
  "Stopping\u2026": "Stoppar\u2026",
  Stopped: "Stoppad",
  Interrupted: "Avbruten",
  Stop: "Stoppa",
  "Day complete": "Dagen \xE4r klar",
  "Run again": "K\xF6r igen",
  "Resume scheduling": "\xC5teruppta schemal\xE4ggning",
  "Refresh Preview": "Uppdatera f\xF6rhandsvisning",
  "{done} of {total} events": "{done} av {total} h\xE4ndelser",
  "Simulated time": "Simulerad tid",
  "Last result": "Senaste resultat",
  Dispatched: "Utf\xF6rd",
  "Partial success": "Delvis utf\xF6rd",
  "Event failed or interrupted": "H\xE4ndelsen misslyckades eller avbr\xF6ts",
  "Recovering live preview\u2026": "H\xE4mtar livef\xF6rhandsvisning\u2026",
  "This session uses an earlier program revision. Its actions are frozen.":
    "Sessionen anv\xE4nder en tidigare programversion. Dess \xE5tg\xE4rder \xE4r frysta.",
  "Only the account that started this session can advance. You can stop it.":
    "Bara kontot som startade sessionen kan g\xE5 vidare. Du kan stoppa den.",
  "Live preview controls": "Kontroller f\xF6r livef\xF6rhandsvisning",
  Result: "Resultat",
  dispatched: "Utf\xF6rd",
  pending: "P\xE5g\xE5r",
  failed: "Misslyckad",
  unavailable: "Otillg\xE4nglig",
  entity_disabled: "Enhet avst\xE4ngd",
  service_missing: "Tj\xE4nsten saknas",
  uncertain: "Os\xE4kert resultat",
  cancelled: "Avbruten",
  Instance: "Instans",
  Unloaded: "Inte inl\xE4st",
  "Managed file": "Hanterad fil",
  "GUI storage": "Lagring i gr\xE4nssnittet",
  "Shared devices with": "Delade enheter med",
  "Actions and cleanup can interfere between instances.":
    "\xC5tg\xE4rder och avslut kan p\xE5verka varandra mellan instanser.",
  "This instance has unsaved changes. Discard them and switch?":
    "Den h\xE4r instansen har osparade \xE4ndringar. Kasta dem och byt?",
  "There are unsaved edits. Discard them and switch views?":
    "Det finns osparade \xE4ndringar. Vill du kasta dem och byta vy?",
  "This instance is unavailable. Check Settings \u2192 Devices & services, then retry.":
    "Den h\xE4r instansen \xE4r inte tillg\xE4nglig. Kontrollera Inst\xE4llningar \u2192 Enheter och tj\xE4nster och f\xF6rs\xF6k igen.",
  "Steps and time sources": "Steg och tidsk\xE4llor",
  "matching sources": "matchande tidsk\xE4llor",
  "No matching steps or time sources.":
    "Inga matchande steg eller tidsk\xE4llor.",
  Steps: "Steg",
  "Scheduled activity": "Schemalagd aktivitet",
  "Run actions at specific times, around sunrise or sunset, or relative to other steps. Choose which devices to control and what they should do.":
    "K\xF6r \xE5tg\xE4rder vid best\xE4mda tider, kring soluppg\xE5ng eller solnedg\xE5ng, eller i f\xF6rh\xE5llande till andra steg. V\xE4lj vilka enheter som ska styras och vad de ska g\xF6ra.",
  Random: "Slumpm\xE4ssigt",
  "Random activity": "Slumpm\xE4ssig aktivitet",
  "Random event": "Slumpm\xE4ssig h\xE4ndelse",
  "Random events": "Slumpm\xE4ssiga h\xE4ndelser",
  "Random event name": "H\xE4ndelsens namn",
  "Random event actions": "\xC5tg\xE4rder f\xF6r slumpm\xE4ssig h\xE4ndelse",
  "Apply these settings, then save the random event.":
    "Till\xE4mpa inst\xE4llningarna och spara sedan den slumpm\xE4ssiga h\xE4ndelsen.",
  "Create your first random event":
    "Skapa din f\xF6rsta slumpm\xE4ssiga h\xE4ndelse",
  "Create random event": "Skapa slumpm\xE4ssig h\xE4ndelse",
  "Save random event": "Spara slumpm\xE4ssig h\xE4ndelse",
  "Delete random event": "Ta bort slumpm\xE4ssig h\xE4ndelse",
  "Delete random event?": "Ta bort slumpm\xE4ssig h\xE4ndelse?",
  "This removes the random event and all its future occurrences.":
    "Detta tar bort den slumpm\xE4ssiga h\xE4ndelsen och alla framtida f\xF6rekomster.",
  "This random event has unsaved changes. Discard them and continue?":
    "H\xE4ndelsen har osparade \xE4ndringar. Kasta dem och forts\xE4tta?",
  "Run actions at random times within a window. Choose how often they run and how long each occurrence lasts.":
    "K\xF6r \xE5tg\xE4rder vid slumpm\xE4ssiga tider inom ett tidsf\xF6nster. V\xE4lj hur ofta de k\xF6rs och hur l\xE4nge varje tillf\xE4lle varar.",
  "Choose a window, a duration, and actions for the start and end of each occurrence.":
    "V\xE4lj ett tidsf\xF6nster, en varaktighet och \xE5tg\xE4rder f\xF6r b\xF6rjan och slutet av varje tillf\xE4lle.",
  "Window starts": "Tidsf\xF6nstret b\xF6rjar",
  "Window ends": "Tidsf\xF6nstret slutar",
  Duration: "Varaktighet",
  "End of": "Slutet p\xE5",
  "the end of": "slutet p\xE5",
  "Minimum window duration": "Minsta varaktighet f\xF6r tidsf\xF6nstret",
  "Maximum window duration": "H\xF6gsta varaktighet f\xF6r tidsf\xF6nstret",
  "Choose a positive window duration within seven days.":
    "V\xE4lj en positiv varaktighet f\xF6r tidsf\xF6nstret inom sju dagar.",
  "Maximum window duration must be at least the minimum.":
    "H\xF6gsta varaktighet f\xF6r tidsf\xF6nstret m\xE5ste vara minst den l\xE4gsta.",
  "Choose valid window durations.":
    "V\xE4lj giltiga varaktigheter f\xF6r tidsf\xF6nstret.",
  "Window closes {duration} after it starts":
    "Tidsf\xF6nstret st\xE4ngs {duration} efter att det b\xF6rjar",
  "Window closes between {min} and {max} after it starts":
    "Tidsf\xF6nstret st\xE4ngs mellan {min} och {max} efter att det b\xF6rjar",
  "Choose another random event without creating a circular relationship.":
    "V\xE4lj en annan slumpm\xE4ssig h\xE4ndelse utan att skapa ett cirkul\xE4rt beroende.",
  "This start follows the selected window's closing time.":
    "Starten f\xF6ljer det valda tidsf\xF6nstrets sluttid.",
  "Choose Absolute time or Duration to replace this saved relative window end.":
    "V\xE4lj Absolut tid eller Varaktighet f\xF6r att ers\xE4tta det sparade tidsf\xF6nstrets relativa slut.",
  "Other random events depend on this window. Change their starts before deleting.":
    "Andra slumpm\xE4ssiga h\xE4ndelser beror p\xE5 det h\xE4r tidsf\xF6nstret. \xC4ndra deras start innan du tar bort det.",
  "No events can run because the minimum duration is longer than the window.":
    "Inga h\xE4ndelser kan k\xF6ras eftersom minsta varaktighet \xE4r l\xE4ngre \xE4n tidsf\xF6nstret.",
  "Reduce the minimum duration or extend the window.":
    "Minska den kortaste varaktigheten eller f\xF6rl\xE4ng tidsf\xF6nstret.",
  "Duration limits take priority over the event count.":
    "Varaktighetsgr\xE4nserna har f\xF6retr\xE4de framf\xF6r antalet h\xE4ndelser.",
  "Window start": "Tidsf\xF6nstrets start",
  "Window end": "Tidsf\xF6nstrets slut",
  "Latest window start (optional)":
    "Senaste start f\xF6r tidsf\xF6nstret (valfritt)",
  "Latest window end (optional)":
    "Senaste slut f\xF6r tidsf\xF6nstret (valfritt)",
  "Randomize window start": "Slumpm\xE4ssig start f\xF6r tidsf\xF6nstret",
  "Randomize window end": "Slumpm\xE4ssigt slut f\xF6r tidsf\xF6nstret",
  "Frequency and duration": "Frekvens och varaktighet",
  "Minimum events per window": "Minsta antal h\xE4ndelser per tidsf\xF6nster",
  "Maximum events per window":
    "H\xF6gsta antal h\xE4ndelser per tidsf\xF6nster",
  "Add maximum events": "L\xE4gg till h\xF6gsta antal h\xE4ndelser",
  "Remove maximum events": "Ta bort h\xF6gsta antal h\xE4ndelser",
  "Maximum events per window must be at least the minimum.":
    "H\xF6gsta antal h\xE4ndelser per tidsf\xF6nster m\xE5ste vara minst det l\xE4gsta antalet.",
  "This random event is disabled.":
    "Den h\xE4r slumpm\xE4ssiga h\xE4ndelsen \xE4r inaktiverad.",
  "Choose valid event counts to describe how often events run.":
    "V\xE4lj giltiga antal h\xE4ndelser f\xF6r att beskriva hur ofta de k\xF6rs.",
  "Choose a whole number from 0 to 1000.":
    "V\xE4lj ett heltal fr\xE5n 0 till 1000.",
  "No events run because the event count is zero.":
    "Inga h\xE4ndelser k\xF6rs eftersom antalet h\xE4ndelser \xE4r noll.",
  "Dependent random events also skip this window.":
    "Beroende slumpm\xE4ssiga h\xE4ndelser hoppar ocks\xE5 \xF6ver det h\xE4r tidsf\xF6nstret.",
  "A window may have no events; dependent random events skip that window.":
    "Ett tidsf\xF6nster kan sakna h\xE4ndelser; beroende slumpm\xE4ssiga h\xE4ndelser hoppar \xF6ver det tidsf\xF6nstret.",
  "Between {min} and {max} events start at random times during each window.":
    "Mellan {min} och {max} h\xE4ndelser b\xF6rjar vid slumpm\xE4ssiga tider inom varje tidsf\xF6nster.",
  "One event starts at a random time during each window.":
    "En h\xE4ndelse b\xF6rjar vid en slumpm\xE4ssig tid inom varje tidsf\xF6nster.",
  "{count} events start at random times during each window.":
    "{count} h\xE4ndelser b\xF6rjar vid slumpm\xE4ssiga tider inom varje tidsf\xF6nster.",
  "Choose valid durations to describe how long each event lasts.":
    "V\xE4lj giltiga varaktigheter f\xF6r att beskriva hur l\xE4nge varje h\xE4ndelse varar.",
  "Choose durations that fit inside the window.":
    "V\xE4lj varaktigheter som ryms inom tidsf\xF6nstret.",
  "Each event lasts {duration}.": "Varje h\xE4ndelse varar {duration}.",
  "Each event lasts between {min} and {max}.":
    "Varje h\xE4ndelse varar mellan {min} och {max}.",
  "activate {entities}": "aktivera {entities}",
  "run {service} for {entities}": "k\xF6r {service} f\xF6r {entities}",
  "turn on {entities}": "sl\xE5 p\xE5 {entities}",
  "turn off {entities}": "sl\xE5 av {entities}",
  "open {entities}": "\xF6ppna {entities}",
  "close {entities}": "st\xE4ng {entities}",
  "stop {entities}": "stoppa {entities}",
  "set the position of {entities} to {position}%":
    "st\xE4ll in positionen f\xF6r {entities} till {position}%",
  "open the tilt of {entities}": "\xF6ppna lamellerna f\xF6r {entities}",
  "close the tilt of {entities}": "st\xE4ng lamellerna f\xF6r {entities}",
  "stop the tilt of {entities}": "stoppa lamellerna f\xF6r {entities}",
  "set the tilt of {entities} to {position}%":
    "st\xE4ll in lamellerna f\xF6r {entities} till {position}%",
  "When each event starts, {action}.":
    "N\xE4r varje h\xE4ndelse b\xF6rjar, {action}.",
  "When each event ends, {action}.":
    "N\xE4r varje h\xE4ndelse slutar, {action}.",
  "The event finishes before the window closes.":
    "H\xE4ndelsen avslutas innan tidsf\xF6nstret st\xE4ngs.",
  "Events may overlap, but all finish before the window closes.":
    "H\xE4ndelser kan \xF6verlappa, men alla avslutas innan tidsf\xF6nstret st\xE4ngs.",
  "times per window": "g\xE5nger per tidsf\xF6nster",
  "Minimum duration": "Minsta varaktighet",
  "Maximum duration": "L\xE4ngsta varaktighet",
  "Use durations like 5m, 30s, or 1h.":
    "Ange varaktigheter som 5m, 30s eller 1h.",
  "When event starts": "N\xE4r h\xE4ndelsen b\xF6rjar",
  "When event ends": "N\xE4r h\xE4ndelsen slutar",
  "Choose which days this random event should run.":
    "V\xE4lj vilka dagar den slumpm\xE4ssiga h\xE4ndelsen ska k\xF6ras.",
  "At the start": "Vid b\xF6rjan",
  "At the end": "Vid slutet",
  "Start action": "Start\xE5tg\xE4rd",
  "End action": "Slut\xE5tg\xE4rd",
  "Start entities": "Entiteter vid b\xF6rjan",
  "End entities": "Entiteter vid slutet",
  "Use the same entities": "Anv\xE4nd samma entiteter",
  "Random start": "Slumpm\xE4ssig start",
  "Random end": "Slumpm\xE4ssigt slut",
  "Solar events": "Solh\xE4ndelser",
  "Home Assistant times": "Home Assistant-tider",
  Calendars: "Kalendrar",
  "Unavailable sources": "Otillg\xE4ngliga tidsk\xE4llor",
  "Search steps or time sources": "S\xF6k efter steg eller tidsk\xE4llor",
  start: "start",
  end: "slut",
  dawn: "gryning",
  dusk: "skymning",
  noon: "solmiddag",
  midnight: "solmidnatt",
  Dawn: "Gryning",
  Dusk: "Skymning",
  "Solar noon": "Solmiddag",
  "Solar midnight": "Solmidnatt",
  "Uses the time currently reported by Home Assistant. Time-only helpers repeat daily; dated sources run only on their reported date.":
    "Anv\xE4nder tiden som Home Assistant rapporterar. Hj\xE4lpare med enbart tid upprepas dagligen; daterade tidsk\xE4llor k\xF6rs bara p\xE5 det rapporterade datumet.",
  Preview: "F\xF6rhandsvisning",
  "Step type": "Typ av steg",
  "Activate Home Assistant scene": "Aktivera Home Assistant-scen",
  "Entity service action": "Tj\xE4nsteanrop f\xF6r entiteter",
  "Turn on lights/switches": "Sl\xE5 p\xE5 lampor/brytare",
  "Turn off lights/switches": "Sl\xE5 av lampor/brytare",
  "Control covers": "Styr gardiner och persienner",
  "Cover action": "\xC5tg\xE4rd f\xF6r gardin eller persienn",
  "Open cover": "\xD6ppna gardin eller persienn",
  "Close cover": "St\xE4ng gardin eller persienn",
  "Stop cover": "Stoppa gardin eller persienn",
  "Set cover position": "St\xE4ll in position",
  "Open tilt": "\xD6ppna lameller",
  "Close tilt": "St\xE4ng lameller",
  "Stop tilt": "Stoppa lameller",
  "Set tilt position": "St\xE4ll in lamellernas position",
  "Position (%)": "Position (%)",
  "Tilt position (%)": "Lamellernas position (%)",
  "Choose cover entities.": "V\xE4lj gardin- eller persiennentiteter.",
  "Choose a cover action.":
    "V\xE4lj en \xE5tg\xE4rd f\xF6r gardin eller persienn.",
  "Choose a whole number from 0 to 100.":
    "V\xE4lj ett heltal fr\xE5n 0 till 100.",
  "0% is closed; 100% is open. Device support determines which cover actions are available.":
    "0% \xE4r st\xE4ngt; 100% \xE4r \xF6ppet. Enhetens st\xF6d avg\xF6r vilka \xE5tg\xE4rder som \xE4r tillg\xE4ngliga.",
  "Covers run only at scheduled times. Enabling late skips past cover actions.":
    "Gardiner och persienner styrs bara vid schemalagda tider. Vid sen aktivering hoppas tidigare \xE5tg\xE4rder \xF6ver.",
  Settings: "Inst\xE4llningar",
  "Create step": "Skapa steg",
  "Create your first step": "Skapa ditt f\xF6rsta steg",
  "Unsaved changes": "Osparade \xE4ndringar",
  "This step has unsaved changes. Discard them and continue?":
    "Steget har osparade \xE4ndringar. Kasta dem och forts\xE4tta?",
  "Keep editing": "Forts\xE4tt redigera",
  "Discard changes": "Kasta \xE4ndringar",
  "Edit step": "Redigera steg",
  "Add related step": "L\xE4gg till relaterat steg",
  "Step actions": "Steg\xE5tg\xE4rder",
  "Advanced settings": "Avancerade inst\xE4llningar",
  "Choose which days this step should run.":
    "V\xE4lj vilka dagar steget ska k\xF6ras.",
  "Run on": "K\xF6r p\xE5",
  "Apply these settings, then save the step.":
    "Till\xE4mpa inst\xE4llningarna och spara sedan steget.",
  Apply: "Till\xE4mpa",
  Monday: "M\xE5ndag",
  Tuesday: "Tisdag",
  Wednesday: "Onsdag",
  Thursday: "Torsdag",
  Friday: "Fredag",
  Saturday: "L\xF6rdag",
  Sunday: "S\xF6ndag",
  "Choose at least one day.": "V\xE4lj minst en dag.",
  Enabled: "Aktiverat",
  Disabled: "Inaktiverat",
  "Save step": "Spara steg",
  "Save changes": "Spara \xE4ndringar",
  "Step name": "Stegets namn",
  "Optional title": "Valfri titel",
  "Event details": "H\xE4ndelsedetaljer",
  "Loading schedule\u2026": "Laddar schema\u2026",
  "Schedule day": "Schemadag",
  "Previous day": "F\xF6reg\xE5ende dag",
  "Next day": "N\xE4sta dag",
  Today: "Idag",
  Yesterday: "Ig\xE5r",
  Tomorrow: "Imorgon",
  "No steps are scheduled for this date.":
    "Inga steg \xE4r schemalagda detta datum.",
  "Planned device states": "Planerade enhetstillst\xE5nd",
  "Loading graph\u2026": "Laddar diagram\u2026",
  On: "P\xE5",
  Unknown: "Ok\xE4nt",
  Open: "\xD6ppet",
  Closed: "St\xE4ngt",
  "Position {position}%": "Position {position}%",
  "Tilt {position}%": "Lameller {position}%",
  "Cover strips show planned position and tilt targets. Travel time and positions after stop actions are unknown.":
    "Gardiner och persienner visar planerade m\xE5l f\xF6r position och lameller. F\xF6rflyttningstid och position efter stopp \xE4r ok\xE4nda.",
  "No light, switch, or cover actions on this date. Other actions are listed in Event details.":
    "Inga \xE5tg\xE4rder f\xF6r lampor, brytare, gardiner eller persienner detta datum. \xD6vriga \xE5tg\xE4rder visas i H\xE4ndelsedetaljer.",
  "No light or switch actions on this date. Other actions are listed in Event details.":
    "Inga \xE5tg\xE4rder f\xF6r lampor eller brytare detta datum. \xD6vriga \xE5tg\xE4rder visas i H\xE4ndelsedetaljer.",
  "The Home Assistant graph could not load. Planned actions are available in Event details.":
    "Home Assistant-diagrammet kunde inte laddas. Planerade \xE5tg\xE4rder finns i H\xE4ndelsedetaljer.",
  "Back to steps": "Tillbaka till steg",
  Continue: "Forts\xE4tt",
  Cancel: "Avbryt",
  Back: "Tillbaka",
  Action: "\xC5tg\xE4rd",
  Timing: "Tidpunkt",
  "Absolute time": "Absolut tid",
  "Relative to": "Relativt till",
  "Start time window": "Tidsintervallets start",
  at: "kl.",
  "at a random time between": "vid en slumpm\xE4ssig tid mellan",
  and: "och",
  "the next day": "n\xE4sta dag",
  Runs: "K\xF6rs",
  step: "steg",
  hour: "timme",
  hours: "timmar",
  minute: "minut",
  minutes: "minuter",
  second: "sekund",
  seconds: "sekunder",
  "at the same time as": "samtidigt som",
  "the start of": "starten av",
  "Add an end of window to introduce randomness":
    "L\xE4gg till ett slut p\xE5 tidsintervallet f\xF6r att variera tiden",
  "Add an end offset to introduce randomness":
    "L\xE4gg till en slutf\xF6rskjutning f\xF6r att variera tiden",
  "Start and end are the same, so the time is fixed":
    "Start och slut \xE4r samma, s\xE5 tiden \xE4r fast",
  "End of window (optional)": "Slut p\xE5 tidsintervall (valfritt)",
  "Add end of window": "L\xE4gg till slut p\xE5 tidsintervall",
  "Start offset": "Startf\xF6rskjutning",
  "End offset (optional)": "Slutf\xF6rskjutning (valfritt)",
  "Add end offset": "L\xE4gg till slutf\xF6rskjutning",
  "Remove end offset": "Ta bort slutf\xF6rskjutning",
  "Choose a step or event": "V\xE4lj ett steg eller en h\xE4ndelse",
  "Enter valid offsets to see the window boundary":
    "Ange giltiga f\xF6rskjutningar f\xF6r att se tidsf\xF6nstrets gr\xE4ns",
  "Turn on": "Sl\xE5 p\xE5",
  "Turn off": "Sl\xE5 av",
  "Every day": "Varje dag",
  "every day": "varje dag",
  "on weekdays": "p\xE5 vardagar",
  "on weekends": "p\xE5 helger",
  "on no days": "inga dagar",
  on: "p\xE5",
  Mondays: "m\xE5ndagar",
  Tuesdays: "tisdagar",
  Wednesdays: "onsdagar",
  Thursdays: "torsdagar",
  Fridays: "fredagar",
  Saturdays: "l\xF6rdagar",
  Sundays: "s\xF6ndagar",
  Weekends: "Helger",
  before: "f\xF6re",
  after: "efter",
  Sunrise: "Soluppg\xE5ng",
  Sunset: "Solnedg\xE5ng",
  sunrise: "soluppg\xE5ng",
  sunset: "solnedg\xE5ng",
  "Search entities or rooms": "S\xF6k entiteter eller rum",
  selected: "valda",
  Controller: "Styrenhet",
  Managing: "Styr",
  Waiting: "V\xE4ntar",
  Paused: "Pausad",
  "Discard edits": "\xC5terst\xE4ll \xE4ndringar",
  "Reload saved program": "L\xE4s in sparat program",
  "Unsaved edits": "Osparade \xE4ndringar",
  "Loading controller\u2026": "L\xE4ser in styrenhet\u2026",
  Enable: "Aktivera",
  Disable: "Inaktivera",
  Entities: "Entiteter",
  Targets: "M\xE5l",
  Delete: "Radera",
  "Delete step?": "Radera steg?",
  "Delete step": "Radera steg",
  "Used by": "Anv\xE4nds av",
  "Change those relationships before deleting.":
    "\xC4ndra dessa relationer innan du raderar steget.",
  "This step will be removed when you save changes.":
    "Steget tas bort n\xE4r du sparar \xE4ndringarna.",
  Weekdays: "Veckodagar",
  Previous: "F\xF6reg\xE5ende",
  Next: "N\xE4sta",
  Date: "Datum",
  Days: "Dagar",
  Seed: "Slumpfr\xF6",
  Refresh: "Uppdatera",
  "Run preview": "F\xF6rhandsvisa",
  "Export YAML": "Exportera YAML",
  changes: "\xE4ndringar",
  "Edit the YAML and save to validate and apply your changes. Invalid code is kept in the editor.":
    "Redigera YAML och spara f\xF6r att validera och till\xE4mpa dina \xE4ndringar. Ogiltig kod beh\xE5lls i redigeraren.",
  Download: "Ladda ner",
  None: "Inga",
  mon: "m\xE5n",
  tue: "tis",
  wed: "ons",
  thu: "tor",
  fri: "fre",
  sat: "l\xF6r",
  sun: "s\xF6n",
};
function translator(language) {
  return (key2) => (language?.startsWith("sv") ? sv[key2] : void 0) || key2;
}

// node_modules/.pnpm/esm-env@1.2.2/node_modules/esm-env/dev-fallback.js
var node_env = globalThis.process?.env?.NODE_ENV;
var dev_fallback_default =
  node_env && !node_env.toLowerCase().startsWith("prod");

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/shared/utils.js
var is_array = Array.isArray;
var index_of = Array.prototype.indexOf;
var includes = Array.prototype.includes;
var array_from = Array.from;
var object_keys = Object.keys;
var define_property = Object.defineProperty;
var get_descriptor = Object.getOwnPropertyDescriptor;
var get_descriptors = Object.getOwnPropertyDescriptors;
var object_prototype = Object.prototype;
var array_prototype = Array.prototype;
var get_prototype_of = Object.getPrototypeOf;
var is_extensible = Object.isExtensible;
function is_function(thing) {
  return typeof thing === "function";
}
var noop = () => {};
function run_all(arr) {
  for (var i = 0; i < arr.length; i++) {
    arr[i]();
  }
}
function deferred() {
  var resolve;
  var reject;
  var promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function to_array(value, n) {
  if (Array.isArray(value)) {
    return value;
  }
  if (n === void 0 || !(Symbol.iterator in value)) {
    return Array.from(value);
  }
  const array = [];
  for (const element2 of value) {
    array.push(element2);
    if (array.length === n) break;
  }
  return array;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/constants.js
var DERIVED = 1 << 1;
var EFFECT = 1 << 2;
var RENDER_EFFECT = 1 << 3;
var MANAGED_EFFECT = 1 << 24;
var BLOCK_EFFECT = 1 << 4;
var BRANCH_EFFECT = 1 << 5;
var ROOT_EFFECT = 1 << 6;
var BOUNDARY_EFFECT = 1 << 7;
var PAUSED = 1 << 8;
var CONNECTED = 1 << 9;
var CLEAN = 1 << 10;
var DIRTY = 1 << 11;
var MAYBE_DIRTY = 1 << 12;
var INERT = 1 << 13;
var DESTROYED = 1 << 14;
var REACTION_RAN = 1 << 15;
var DESTROYING = 1 << 25;
var EFFECT_TRANSPARENT = 1 << 16;
var EAGER_EFFECT = 1 << 17;
var HEAD_EFFECT = 1 << 18;
var EFFECT_PRESERVED = 1 << 19;
var USER_EFFECT = 1 << 20;
var EFFECT_OFFSCREEN = 1 << 25;
var REACTION_IS_UPDATING = 1 << 21;
var ASYNC = 1 << 22;
var ERROR_VALUE = 1 << 23;
var STATE_SYMBOL = /* @__PURE__ */ Symbol("$state");
var COMPONENT_SYMBOL = /* @__PURE__ */ Symbol("component");
var LEGACY_PROPS = /* @__PURE__ */ Symbol("legacy props");
var LOADING_ATTR_SYMBOL = /* @__PURE__ */ Symbol("");
var PROXY_PATH_SYMBOL = /* @__PURE__ */ Symbol("proxy path");
var ATTRIBUTES_CACHE = /* @__PURE__ */ Symbol("attributes");
var CLASS_CACHE = /* @__PURE__ */ Symbol("class");
var STYLE_CACHE = /* @__PURE__ */ Symbol("style");
var TEXT_CACHE = /* @__PURE__ */ Symbol("text");
var FORM_RESET_HANDLER = /* @__PURE__ */ Symbol("form reset");
var HMR_ANCHOR = /* @__PURE__ */ Symbol("hmr anchor");
var STALE_REACTION = new (class StaleReactionError extends Error {
  name = "StaleReactionError";
  message =
    "The reaction that called `getAbortSignal()` was re-run or destroyed";
})();
var IS_XHTML =
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  !!globalThis.document?.contentType &&
  /* @__PURE__ */ globalThis.document.contentType.includes("xml");
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/constants.js
var EACH_ITEM_REACTIVE = 1;
var EACH_INDEX_REACTIVE = 1 << 1;
var EACH_IS_CONTROLLED = 1 << 2;
var EACH_IS_ANIMATED = 1 << 3;
var EACH_ITEM_IMMUTABLE = 1 << 4;
var PROPS_IS_IMMUTABLE = 1;
var PROPS_IS_RUNES = 1 << 1;
var PROPS_IS_UPDATED = 1 << 2;
var PROPS_IS_BINDABLE = 1 << 3;
var PROPS_IS_LAZY_INITIAL = 1 << 4;
var TRANSITION_OUT = 1 << 1;
var TRANSITION_GLOBAL = 1 << 2;
var TEMPLATE_FRAGMENT = 1;
var TEMPLATE_USE_IMPORT_NODE = 1 << 1;
var TEMPLATE_USE_SVG = 1 << 2;
var TEMPLATE_USE_MATHML = 1 << 3;
var HYDRATION_START = "[";
var HYDRATION_START_ELSE = "[!";
var HYDRATION_START_FAILED = "[?";
var HYDRATION_END = "]";
var HYDRATION_ERROR = {};
var ELEMENT_PRESERVE_ATTRIBUTE_CASE = 1 << 1;
var ELEMENT_IS_INPUT = 1 << 2;
var UNINITIALIZED = /* @__PURE__ */ Symbol("uninitialized");
var FILENAME = /* @__PURE__ */ Symbol("filename");
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/warnings.js
var bold = "font-weight: bold";
var normal = "font-weight: normal";
function await_reactivity_loss(name) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] await_reactivity_loss
%cDetected reactivity loss when reading \`${name}\`. This happens when state is read in an async function after an earlier \`await\`
https://svelte.dev/e/await_reactivity_loss`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/await_reactivity_loss`);
  }
}
function await_waterfall(name, location2) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] await_waterfall
%cAn async derived, \`${name}\` (${location2}) was not read immediately after it resolved. This often indicates an unnecessary waterfall, which can slow down your app
https://svelte.dev/e/await_waterfall`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/await_waterfall`);
  }
}
function derived_inert() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] derived_inert
%cReading a derived belonging to a now-destroyed effect may result in stale values
https://svelte.dev/e/derived_inert`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/derived_inert`);
  }
}
function hydration_attribute_changed(attribute, html2, value) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] hydration_attribute_changed
%cThe \`${attribute}\` attribute on \`${html2}\` changed its value between server and client renders. The client value, \`${value}\`, will be ignored in favour of the server value
https://svelte.dev/e/hydration_attribute_changed`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/hydration_attribute_changed`);
  }
}
function hydration_mismatch(location2) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] hydration_mismatch
%c${location2 ? `Hydration failed because the initial UI does not match what was rendered on the server. The error occurred near ${location2}` : "Hydration failed because the initial UI does not match what was rendered on the server"}
https://svelte.dev/e/hydration_mismatch`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/hydration_mismatch`);
  }
}
function lifecycle_double_unmount() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] lifecycle_double_unmount
%cTried to unmount a component that was not mounted
https://svelte.dev/e/lifecycle_double_unmount`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/lifecycle_double_unmount`);
  }
}
function select_multiple_invalid_value() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] select_multiple_invalid_value
%cThe \`value\` property of a \`<select multiple>\` element should be an array, but it received a non-array value. The selection will be kept as is.
https://svelte.dev/e/select_multiple_invalid_value`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/select_multiple_invalid_value`);
  }
}
function state_proxy_equality_mismatch(operator) {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] state_proxy_equality_mismatch
%cReactive \`$state(...)\` proxies and the values they proxy have different identities. Because of this, comparisons with \`${operator}\` will produce unexpected results
https://svelte.dev/e/state_proxy_equality_mismatch`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/state_proxy_equality_mismatch`);
  }
}
function svelte_boundary_reset_noop() {
  if (dev_fallback_default) {
    console.warn(
      `%c[svelte] svelte_boundary_reset_noop
%cA \`<svelte:boundary>\` \`reset\` function only resets the boundary the first time it is called
https://svelte.dev/e/svelte_boundary_reset_noop`,
      bold,
      normal,
    );
  } else {
    console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/hydration.js
var hydrating = false;
function set_hydrating(value) {
  hydrating = value;
}
var hydrate_node;
function set_hydrate_node(node) {
  if (node === null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return (hydrate_node = node);
}
function hydrate_next() {
  return set_hydrate_node(get_next_sibling(hydrate_node));
}
function reset(node) {
  if (!hydrating) return;
  if (get_next_sibling(hydrate_node) !== null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  hydrate_node = node;
}
function next(count = 1) {
  if (hydrating) {
    var i = count;
    var node = hydrate_node;
    while (i--) {
      node = /** @type {TemplateNode} */ get_next_sibling(node);
    }
    hydrate_node = node;
  }
}
function skip_nodes(remove = true) {
  var depth = 0;
  var node = hydrate_node;
  while (true) {
    if (node.nodeType === COMMENT_NODE) {
      var data =
        /** @type {Comment} */
        node.data;
      if (data === HYDRATION_END) {
        if (depth === 0) return node;
        depth -= 1;
      } else if (
        data === HYDRATION_START ||
        data === HYDRATION_START_ELSE || // "[1", "[2", etc. for if blocks
        (data[0] === "[" && !isNaN(Number(data.slice(1))))
      ) {
        depth += 1;
      }
    }
    var next2 =
      /** @type {TemplateNode} */
      get_next_sibling(node);
    if (remove) node.remove();
    node = next2;
  }
}
function read_hydration_instruction(node) {
  if (!node || node.nodeType !== COMMENT_NODE) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return (
    /** @type {Comment} */
    node.data
  );
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/equality.js
function equals(value) {
  return value === this.v;
}
function safe_not_equal(a, b) {
  return a != a
    ? b == b
    : a !== b ||
        (a !== null && typeof a === "object") ||
        typeof a === "function";
}
function safe_equals(value) {
  return !safe_not_equal(value, this.v);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/shared/errors.js
function invariant_violation(message) {
  if (dev_fallback_default) {
    const error = new Error(`invariant_violation
An invariant violation occurred, meaning Svelte's internal assumptions were flawed. This is a bug in Svelte, not your app \u2014 please open an issue at https://github.com/sveltejs/svelte, citing the following message: "${message}"
https://svelte.dev/e/invariant_violation`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/invariant_violation`);
  }
}
function lifecycle_outside_component(name) {
  if (dev_fallback_default) {
    const error = new Error(`lifecycle_outside_component
\`${name}(...)\` can only be used during component initialisation
https://svelte.dev/e/lifecycle_outside_component`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/lifecycle_outside_component`);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/errors.js
function async_derived_orphan() {
  if (dev_fallback_default) {
    const error = new Error(`async_derived_orphan
Cannot create a \`$derived(...)\` with an \`await\` expression outside of an effect tree
https://svelte.dev/e/async_derived_orphan`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/async_derived_orphan`);
  }
}
function derived_references_self() {
  if (dev_fallback_default) {
    const error = new Error(`derived_references_self
A derived value cannot reference itself recursively
https://svelte.dev/e/derived_references_self`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/derived_references_self`);
  }
}
function each_key_duplicate(a, b, value) {
  if (dev_fallback_default) {
    const error = new Error(`each_key_duplicate
${value ? `Keyed each block has duplicate key \`${value}\` at indexes ${a} and ${b}` : `Keyed each block has duplicate key at indexes ${a} and ${b}`}
https://svelte.dev/e/each_key_duplicate`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/each_key_duplicate`);
  }
}
function each_key_volatile(index2, a, b) {
  if (dev_fallback_default) {
    const error = new Error(`each_key_volatile
Keyed each block has key that is not idempotent \u2014 the key for item at index ${index2} was \`${a}\` but is now \`${b}\`. Keys must be the same each time for a given item
https://svelte.dev/e/each_key_volatile`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/each_key_volatile`);
  }
}
function effect_in_teardown(rune) {
  if (dev_fallback_default) {
    const error = new Error(`effect_in_teardown
\`${rune}\` cannot be used inside an effect cleanup function
https://svelte.dev/e/effect_in_teardown`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_in_teardown`);
  }
}
function effect_in_unowned_derived() {
  if (dev_fallback_default) {
    const error = new Error(`effect_in_unowned_derived
Effect cannot be created inside a \`$derived\` value that was not itself created inside an effect
https://svelte.dev/e/effect_in_unowned_derived`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_in_unowned_derived`);
  }
}
function effect_orphan(rune) {
  if (dev_fallback_default) {
    const error = new Error(`effect_orphan
\`${rune}\` can only be used inside an effect (e.g. during component initialisation)
https://svelte.dev/e/effect_orphan`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_orphan`);
  }
}
function effect_update_depth_exceeded() {
  if (dev_fallback_default) {
    const error = new Error(`effect_update_depth_exceeded
Maximum update depth exceeded. This typically indicates that an effect reads and writes the same piece of state
https://svelte.dev/e/effect_update_depth_exceeded`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
  }
}
function hydration_failed() {
  if (dev_fallback_default) {
    const error = new Error(`hydration_failed
Failed to hydrate the application
https://svelte.dev/e/hydration_failed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/hydration_failed`);
  }
}
function invalid_snippet() {
  if (dev_fallback_default) {
    const error = new Error(`invalid_snippet
Could not \`{@render}\` snippet due to the expression being \`null\` or \`undefined\`. Consider using optional chaining \`{@render snippet?.()}\`
https://svelte.dev/e/invalid_snippet`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/invalid_snippet`);
  }
}
function props_invalid_value(key2) {
  if (dev_fallback_default) {
    const error = new Error(`props_invalid_value
Cannot do \`bind:${key2}={undefined}\` when \`${key2}\` has a fallback value
https://svelte.dev/e/props_invalid_value`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/props_invalid_value`);
  }
}
function rune_outside_svelte(rune) {
  if (dev_fallback_default) {
    const error = new Error(`rune_outside_svelte
The \`${rune}\` rune is only available inside \`.svelte\` and \`.svelte.js/ts\` files
https://svelte.dev/e/rune_outside_svelte`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/rune_outside_svelte`);
  }
}
function state_descriptors_fixed() {
  if (dev_fallback_default) {
    const error = new Error(`state_descriptors_fixed
Property descriptors defined on \`$state\` objects must contain \`value\` and always be \`enumerable\`, \`configurable\` and \`writable\`.
https://svelte.dev/e/state_descriptors_fixed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
  }
}
function state_prototype_fixed() {
  if (dev_fallback_default) {
    const error = new Error(`state_prototype_fixed
Cannot set prototype of \`$state\` object
https://svelte.dev/e/state_prototype_fixed`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
  }
}
function state_unsafe_mutation() {
  if (dev_fallback_default) {
    const error = new Error(`state_unsafe_mutation
Updating state inside \`$derived(...)\`, \`$inspect(...)\` or a template expression is forbidden. If the value should not be reactive, declare it without \`$state\`
https://svelte.dev/e/state_unsafe_mutation`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
  }
}
function svelte_boundary_reset_onerror() {
  if (dev_fallback_default) {
    const error = new Error(`svelte_boundary_reset_onerror
A \`<svelte:boundary>\` \`reset\` function cannot be called while an error is still being handled
https://svelte.dev/e/svelte_boundary_reset_onerror`);
    error.name = "Svelte error";
    throw error;
  } else {
    throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/flags/index.js
var async_mode_flag = false;
var legacy_mode_flag = false;
var tracing_mode_flag = false;

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dev/tracing.js
var tracing_expressions = null;
function tag(source2, label) {
  source2.label = label;
  tag_proxy(source2.v, label);
  return source2;
}
function tag_proxy(value, label) {
  value?.[PROXY_PATH_SYMBOL]?.(label);
  return value;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/shared/dev.js
function get_error(label) {
  const error = new Error();
  const stack2 = get_stack();
  if (stack2.length === 0) {
    return null;
  }
  stack2.unshift("\n");
  define_property(error, "stack", {
    value: stack2.join("\n"),
  });
  define_property(error, "name", {
    value: label,
  });
  return (
    /** @type {Error & { stack: string }} */
    error
  );
}
function get_stack() {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = Infinity;
  const stack2 = new Error().stack;
  Error.stackTraceLimit = limit;
  if (!stack2) return [];
  const lines = stack2.split("\n");
  const new_lines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const posixified = line.replaceAll("\\", "/");
    if (line.trim() === "Error") {
      continue;
    }
    if (line.includes("validate_each_keys")) {
      return [];
    }
    if (
      posixified.includes("svelte/src/internal") ||
      posixified.includes("node_modules/.vite")
    ) {
      continue;
    }
    new_lines.push(line);
  }
  return new_lines;
}
function invariant(condition, message) {
  if (!dev_fallback_default) {
    throw new Error("invariant(...) was not guarded by if (DEV)");
  }
  if (!condition) invariant_violation(message);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/context.js
var component_context = null;
function set_component_context(context) {
  component_context = context;
}
var dev_stack = null;
function set_dev_stack(stack2) {
  dev_stack = stack2;
}
var dev_current_component_function = null;
function set_dev_current_component_function(fn) {
  dev_current_component_function = fn;
}
function push(props, runes = false, fn) {
  component_context = {
    p: component_context,
    i: false,
    c: null,
    e: null,
    s: props,
    x: null,
    r:
      /** @type {Effect} */
      active_effect,
    l: legacy_mode_flag && !runes ? { s: null, u: null, $: [] } : null,
  };
  if (dev_fallback_default) {
    component_context.function = fn;
    dev_current_component_function = fn;
  }
}
function pop(component2) {
  var context =
    /** @type {ComponentContext} */
    component_context;
  var effects = context.e;
  if (effects !== null) {
    context.e = null;
    for (var fn of effects) {
      create_user_effect(fn);
    }
  }
  if (component2 !== void 0) {
    context.x = component2;
  }
  context.i = true;
  component_context = context.p;
  if (dev_fallback_default) {
    dev_current_component_function = component_context?.function ?? null;
  }
  return mark_as_component(component2);
}
function mark_as_component(component2 = {}) {
  define_property(component2, COMPONENT_SYMBOL, { value: true });
  return component2;
}
function is_runes() {
  return (
    !legacy_mode_flag ||
    (component_context !== null && component_context.l === null)
  );
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/task.js
var micro_tasks = [];
function run_micro_tasks() {
  var tasks = micro_tasks;
  micro_tasks = [];
  run_all(tasks);
}
function queue_micro_task(fn) {
  if (micro_tasks.length === 0 && !is_flushing_sync) {
    var tasks = micro_tasks;
    queueMicrotask(() => {
      if (tasks === micro_tasks) run_micro_tasks();
    });
  }
  micro_tasks.push(fn);
}
function flush_tasks() {
  while (micro_tasks.length > 0) {
    run_micro_tasks();
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/status.js
var STATUS_MASK = ~(DIRTY | MAYBE_DIRTY | CLEAN);
function set_signal_status(signal, status) {
  signal.f = (signal.f & STATUS_MASK) | status;
}
function update_derived_status(derived3) {
  if ((derived3.f & CONNECTED) !== 0 || derived3.deps === null) {
    set_signal_status(derived3, CLEAN);
  } else {
    set_signal_status(derived3, MAYBE_DIRTY);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/utils.js
function defer_effect(effect2, dirty_effects, maybe_dirty_effects) {
  if ((effect2.f & DIRTY) !== 0) {
    dirty_effects.add(effect2);
  } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
    maybe_dirty_effects.add(effect2);
  }
  set_signal_status(effect2, CLEAN);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/misc.js
function remove_textarea_child(dom) {
  if (hydrating && get_first_child(dom) !== null) {
    clear_text_content(dom);
  }
}
var listening_to_form_reset = false;
function add_form_reset_listener() {
  if (!listening_to_form_reset) {
    listening_to_form_reset = true;
    document.addEventListener(
      "reset",
      (evt) => {
        Promise.resolve().then(() => {
          if (!evt.defaultPrevented) {
            /**@type {HTMLFormElement} */
            for (const e of evt.target.elements) {
              e[FORM_RESET_HANDLER]?.();
            }
          }
        });
      },
      // In the capture phase to guarantee we get noticed of it (no possibility of stopPropagation)
      { capture: true },
    );
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/bindings/shared.js
function without_reactive_context(fn) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    return fn();
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/async.js
function flatten(blockers, sync, async2, fn) {
  const d = is_runes() ? derived : derived_safe_equal;
  var pending2 = blockers.filter((b) => !b.settled);
  var deriveds = sync.map(d);
  if (dev_fallback_default) {
    deriveds.forEach((d2, i) => {
      d2.label = sync[i]
        .toString()
        .replace("() => ", "")
        .replaceAll("$.eager(() => ", "$state.eager(")
        .replace(/\$\.get\((.+?)\)/g, (_, id) => id);
    });
  }
  if (async2.length === 0 && pending2.length === 0) {
    fn(deriveds);
    return;
  }
  var parent =
    /** @type {Effect} */
    active_effect;
  var restore = capture();
  var blocker_promise =
    pending2.length === 1
      ? pending2[0].promise
      : pending2.length > 1
        ? Promise.all(pending2.map((b) => b.promise))
        : null;
  function finish(async3) {
    if ((parent.f & DESTROYED) !== 0) {
      return;
    }
    restore();
    try {
      fn([...deriveds, ...async3]);
    } catch (error) {
      invoke_error_boundary(error, parent);
    }
    unset_context();
  }
  var decrement_pending = increment_pending();
  if (async2.length === 0) {
    blocker_promise.then(() => finish([])).finally(decrement_pending);
    return;
  }
  function run3() {
    Promise.all(async2.map((expression) => async_derived(expression)))
      .then(finish)
      .catch((error) => invoke_error_boundary(error, parent))
      .finally(decrement_pending);
  }
  if (blocker_promise) {
    blocker_promise.then(() => {
      if ((parent.f & DESTROYED) !== 0) {
        decrement_pending();
        return;
      }
      restore();
      run3();
      unset_context();
    });
  } else {
    run3();
  }
}
function capture() {
  var previous_effect =
    /** @type {Effect} */
    active_effect;
  var previous_reaction = active_reaction;
  var previous_component_context = component_context;
  var previous_batch2 =
    /** @type {Batch} */
    current_batch;
  if (dev_fallback_default) {
    var previous_dev_stack = dev_stack;
  }
  return function restore(activate_batch = true) {
    set_active_effect(previous_effect);
    set_active_reaction(previous_reaction);
    set_component_context(previous_component_context);
    if (activate_batch && (previous_effect.f & DESTROYED) === 0) {
      previous_batch2?.activate();
      previous_batch2?.apply();
    }
    if (dev_fallback_default) {
      set_reactivity_loss_tracker(null);
      set_dev_stack(previous_dev_stack);
    }
  };
}
var restored = false;
function unset_context(deactivate_batch = true) {
  restored = false;
  set_active_effect(null);
  set_active_reaction(null);
  set_component_context(null);
  if (deactivate_batch) current_batch?.deactivate();
  if (dev_fallback_default) {
    set_reactivity_loss_tracker(null);
    set_dev_stack(null);
  }
}
function increment_pending() {
  var effect2 =
    /** @type {Effect} */
    active_effect;
  var boundary2 = effect2.b;
  var batch =
    /** @type {Batch} */
    current_batch;
  var blocking = !!boundary2?.is_rendered();
  boundary2?.update_pending_count(1, batch);
  batch.increment(blocking, effect2);
  return () => {
    boundary2?.update_pending_count(-1, batch);
    batch.decrement(blocking, effect2);
  };
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/deriveds.js
var reactivity_loss_tracker = null;
function set_reactivity_loss_tracker(v) {
  reactivity_loss_tracker = v;
}
var recent_async_deriveds = /* @__PURE__ */ new Set();
// @__NO_SIDE_EFFECTS__
function derived(fn) {
  var flags2 = DERIVED | DIRTY;
  if (active_effect !== null) {
    active_effect.f |= EFFECT_PRESERVED;
  }
  const signal = {
    ctx: component_context,
    deps: null,
    effects: null,
    equals,
    f: flags2,
    fn,
    reactions: null,
    rv: 0,
    v:
      /** @type {V} */
      UNINITIALIZED,
    wv: 0,
    parent: active_effect,
    ac: null,
  };
  if (dev_fallback_default && tracing_mode_flag) {
    signal.created = get_error("created at");
  }
  return signal;
}
var OBSOLETE = /* @__PURE__ */ Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function async_derived(fn, label, location2) {
  let parent =
    /** @type {Effect | null} */
    active_effect;
  if (parent === null) {
    async_derived_orphan();
  }
  var promise =
    /** @type {Promise<V>} */
    /** @type {unknown} */
    void 0;
  var signal = source(
    /** @type {V} */
    UNINITIALIZED,
  );
  if (dev_fallback_default) signal.label = label ?? fn.toString();
  var should_suspend = !active_reaction;
  var deferreds = /* @__PURE__ */ new Set();
  async_effect(() => {
    var effect2 =
      /** @type {Effect} */
      active_effect;
    if (dev_fallback_default) {
      reactivity_loss_tracker = {
        effect: effect2,
        effect_deps: /* @__PURE__ */ new Set(),
        warned: false,
      };
    }
    var d = deferred();
    promise = d.promise;
    try {
      Promise.resolve(fn())
        .then(d.resolve, (e) => {
          if (e !== STALE_REACTION) d.reject(e);
        })
        .finally(unset_context);
    } catch (error) {
      d.reject(error);
      unset_context();
    }
    if (dev_fallback_default) {
      if (reactivity_loss_tracker) {
        if (effect2.deps !== null) {
          for (let i = 0; i < skipped_deps; i += 1) {
            reactivity_loss_tracker.effect_deps.add(effect2.deps[i]);
          }
        }
        if (new_deps !== null) {
          for (let i = 0; i < new_deps.length; i += 1) {
            reactivity_loss_tracker.effect_deps.add(new_deps[i]);
          }
        }
      }
      reactivity_loss_tracker = null;
    }
    var batch =
      /** @type {Batch} */
      current_batch;
    if (should_suspend) {
      if ((effect2.f & REACTION_RAN) !== 0) {
        var decrement_pending = increment_pending();
      }
      if (
        // boundary can be null if the async derived is inside an $effect.root not connected to the component render tree
        parent.b?.is_rendered()
      ) {
        batch.async_deriveds.get(effect2)?.reject(OBSOLETE);
      } else {
        for (const d2 of deferreds.values()) {
          d2.reject(OBSOLETE);
        }
      }
      deferreds.add(d);
      batch.async_deriveds.set(effect2, d);
    }
    const handler = (value, error = void 0) => {
      if (dev_fallback_default) {
        reactivity_loss_tracker = null;
      }
      decrement_pending?.();
      deferreds.delete(d);
      if (error === OBSOLETE) return;
      batch.activate();
      if (error) {
        signal.f |= ERROR_VALUE;
        internal_set(signal, error);
      } else {
        if ((signal.f & ERROR_VALUE) !== 0) {
          signal.f ^= ERROR_VALUE;
        }
        if (
          dev_fallback_default &&
          location2 !== void 0 &&
          !signal.equals(value)
        ) {
          recent_async_deriveds.add(signal);
          setTimeout(() => {
            if (
              recent_async_deriveds.has(signal) &&
              (effect2.f & DESTROYED) === 0
            ) {
              await_waterfall(
                /** @type {string} */
                signal.label,
                location2,
              );
              recent_async_deriveds.delete(signal);
            }
          });
        }
        internal_set(signal, value);
      }
      batch.deactivate();
    };
    d.promise.then(handler, (e) => handler(null, e || "unknown"));
  });
  teardown(() => {
    for (const d of deferreds) {
      d.reject(OBSOLETE);
    }
  });
  if (dev_fallback_default) {
    signal.f |= ASYNC;
  }
  return new Promise((fulfil) => {
    function next2(p) {
      function go() {
        if (p === promise) {
          fulfil(signal);
        } else {
          next2(promise);
        }
      }
      p.then(go, go);
    }
    next2(promise);
  });
}
// @__NO_SIDE_EFFECTS__
function user_derived(fn) {
  const d = /* @__PURE__ */ derived(fn);
  if (!async_mode_flag) push_reaction_value(d);
  return d;
}
// @__NO_SIDE_EFFECTS__
function derived_safe_equal(fn) {
  const signal = /* @__PURE__ */ derived(fn);
  signal.equals = safe_equals;
  return signal;
}
function destroy_derived_effects(derived3) {
  var effects = derived3.effects;
  if (effects !== null) {
    derived3.effects = null;
    for (var i = 0; i < effects.length; i += 1) {
      destroy_effect(
        /** @type {Effect} */
        effects[i],
      );
    }
  }
}
var stack = [];
function execute_derived(derived3) {
  var value;
  var prev_active_effect = active_effect;
  var parent = derived3.parent;
  if (
    !is_destroying_effect &&
    parent !== null &&
    derived3.v !== UNINITIALIZED && // if it was never evaluated before, it's guaranteed to fail downstream, so we try to execute instead
    (parent.f & (DESTROYED | INERT)) !== 0
  ) {
    derived_inert();
    return derived3.v;
  }
  set_active_effect(parent);
  if (dev_fallback_default) {
    let prev_eager_effects = eager_effects;
    set_eager_effects(/* @__PURE__ */ new Set());
    try {
      if (includes.call(stack, derived3)) {
        derived_references_self();
      }
      stack.push(derived3);
      destroy_derived_effects(derived3);
      value = update_reaction(derived3);
    } finally {
      set_active_effect(prev_active_effect);
      set_eager_effects(prev_eager_effects);
      stack.pop();
    }
  } else {
    try {
      destroy_derived_effects(derived3);
      value = update_reaction(derived3);
    } finally {
      set_active_effect(prev_active_effect);
    }
  }
  return value;
}
function update_derived(derived3) {
  var value = execute_derived(derived3);
  if (!derived3.equals(value)) {
    derived3.wv = increment_write_version();
    if (!current_batch?.is_fork || derived3.deps === null) {
      if (current_batch !== null) {
        current_batch.capture(derived3, value, true);
        previous_batch?.capture(derived3, value, true);
      } else {
        derived3.v = value;
      }
      if (derived3.deps === null) {
        set_signal_status(derived3, CLEAN);
        return;
      }
    }
  }
  if (is_destroying_effect) {
    return;
  }
  if (batch_values !== null) {
    if (effect_tracking() || current_batch?.is_fork) {
      batch_values.set(derived3, value);
    }
  } else {
    update_derived_status(derived3);
  }
}
function freeze_derived_effects(derived3) {
  if (derived3.effects === null) return;
  for (const e of derived3.effects) {
    if (e.teardown || e.ac) {
      e.teardown?.();
      if (e.ac !== null) {
        without_reactive_context(() => {
          e.ac.abort(STALE_REACTION);
          e.ac = null;
        });
      }
      if (e.fn !== null) e.teardown = noop;
      remove_reactions(e, 0);
      destroy_effect_children(e);
    }
  }
}
function unfreeze_derived_effects(derived3) {
  if (derived3.effects === null) return;
  for (const e of derived3.effects) {
    if (e.teardown && e.fn !== null) {
      update_effect(e);
    }
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/batch.js
var first_batch = null;
var last_batch = null;
var current_batch = null;
var previous_batch = null;
var batch_values = null;
var last_scheduled_effect = null;
var is_flushing_sync = false;
var is_processing = false;
var collected_effects = null;
var legacy_updates = null;
var flush_count = 0;
var source_stacks = /* @__PURE__ */ new Set();
var uid = 1;
var Batch = class _Batch {
  id = uid++;
  /** True as soon as `#process` was called */
  #started = false;
  linked = true;
  /** @type {Batch | null} */
  #prev = null;
  /** @type {Batch | null} */
  #next = null;
  /** @type {Map<Effect, ReturnType<typeof deferred<any>>>} */
  async_deriveds = /* @__PURE__ */ new Map();
  /**
   * The current values of any signals that are updated in this batch.
   * Tuple format: [value, is_derived] (note: is_derived is false for deriveds, too, if they were overridden via assignment)
   * They keys of this map are identical to `this.#previous`
   * @type {Map<Value, [any, boolean]>}
   */
  current = /* @__PURE__ */ new Map();
  /**
   * The values of any signals (sources and deriveds) that are updated in this batch _before_ those updates took place.
   * They keys of this map are identical to `this.#current`
   * @type {Map<Value, any>}
   */
  previous = /* @__PURE__ */ new Map();
  /**
   * When the batch is committed (and the DOM is updated), we need to remove old branches
   * and append new ones by calling the functions added inside (if/each/key/etc) blocks
   * @type {Set<(batch: Batch) => void>}
   */
  #commit_callbacks = /* @__PURE__ */ new Set();
  /**
   * If a fork is discarded, we need to destroy any effects that are no longer needed
   * @type {Set<(batch: Batch) => void>}
   */
  #discard_callbacks = /* @__PURE__ */ new Set();
  /**
   * The number of async effects that are currently in flight
   */
  #pending = 0;
  /**
   * Async effects that are currently in flight, _not_ inside a pending boundary
   * @type {Map<Effect, number>}
   */
  #blocking_pending = /* @__PURE__ */ new Map();
  /**
   * A deferred that resolves when the batch is committed, used with `settled()`
   * TODO replace with Promise.withResolvers once supported widely enough
   * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
   */
  #deferred = null;
  /**
   * Effects that were scheduled in this batch but not yet 'resolved' into the
   * root effects that need to be flushed. Resolving — the upwards traversal that
   * marks the path to each effect on the shared effect tree (see #resolve) — is
   * deferred until the batch is processed, so that the markers are created and
   * consumed within a single traversal. Scheduling into other batches (which can
   * happen concurrently, e.g. while a batch is committed) can therefore never
   * observe (and be confused by) this batch's markers.
   * May contain duplicates — deduplication happens during resolving
   * @type {Effect[]}
   */
  #scheduled = [];
  /**
   * Effects created while this batch was active.
   * @type {Effect[]}
   */
  #new_effects = [];
  /**
   * Deferred effects (which run after async work has completed) that are DIRTY
   * @type {Set<Effect>}
   */
  #dirty_effects = /* @__PURE__ */ new Set();
  /**
   * Deferred effects that are MAYBE_DIRTY
   * @type {Set<Effect>}
   */
  #maybe_dirty_effects = /* @__PURE__ */ new Set();
  /**
   * A map of branches that still exist, but will be destroyed when this batch
   * is committed — we skip over these during `process`.
   * The value contains child effects that were dirty/maybe_dirty before being reset,
   * so they can be rescheduled if the branch survives.
   * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
   */
  #skipped_branches = /* @__PURE__ */ new Map();
  /**
   * Inverse of #skipped_branches which we need to tell prior batches to unskip them when committing
   * @type {Set<Effect>}
   */
  #unskipped_branches = /* @__PURE__ */ new Set();
  is_fork = false;
  #decrement_queued = false;
  constructor() {
    if (last_batch === null) {
      first_batch = last_batch = this;
    } else {
      last_batch.#next = this;
      this.#prev = last_batch;
    }
    last_batch = this;
  }
  #is_deferred() {
    if (this.is_fork) return true;
    for (const effect2 of this.#blocking_pending.keys()) {
      var e = effect2;
      var skipped = false;
      while (e.parent !== null) {
        if (this.#skipped_branches.has(e)) {
          skipped = true;
          break;
        }
        e = e.parent;
      }
      if (!skipped) {
        return true;
      }
    }
    return false;
  }
  /**
   * Add an effect to the #skipped_branches map and reset its children
   * @param {Effect} effect
   */
  skip_effect(effect2) {
    if (!this.#skipped_branches.has(effect2)) {
      this.#skipped_branches.set(effect2, { d: [], m: [] });
    }
    this.#unskipped_branches.delete(effect2);
  }
  /**
   * Remove an effect from the #skipped_branches map and reschedule
   * any tracked dirty/maybe_dirty child effects
   * @param {Effect} effect
   * @param {(e: Effect) => void} callback
   */
  unskip_effect(effect2, callback = (e) => this.schedule(e)) {
    var tracked = this.#skipped_branches.get(effect2);
    if (tracked) {
      this.#skipped_branches.delete(effect2);
      for (var e of tracked.d) {
        set_signal_status(e, DIRTY);
        callback(e);
      }
      for (e of tracked.m) {
        set_signal_status(e, MAYBE_DIRTY);
        callback(e);
      }
    }
    this.#unskipped_branches.add(effect2);
  }
  /**
   * Convert the effects that were scheduled in this batch into the root effects
   * that need to be traversed, marking the path to each effect (by clearing the
   * `CLEAN` flag on ancestor branches) so that the traversal can find them.
   * This happens right before traversal rather than at scheduling time, so that
   * the markers left on the (shared) effect tree are created and consumed within
   * a single traversal — scheduling into other batches can never observe them
   * @returns {Effect[]}
   */
  #resolve() {
    var roots = [];
    for (const effect2 of this.#scheduled) {
      if (
        (effect2.f & DESTROYED) !== 0 ||
        (effect2.f & (DIRTY | MAYBE_DIRTY)) === 0
      )
        continue;
      var e = effect2;
      var covered = false;
      while (e.parent !== null) {
        e = e.parent;
        var flags2 = e.f;
        if ((flags2 & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
          if ((flags2 & CLEAN) === 0) {
            covered = true;
            break;
          }
          e.f ^= CLEAN;
        }
      }
      if (!covered) {
        roots.push(e);
      }
    }
    this.#scheduled = [];
    return roots;
  }
  #process() {
    this.#started = true;
    if (dev_fallback_default) {
      for (const value of this.current.keys()) {
        source_stacks.add(value);
      }
    }
    for (const e of this.#dirty_effects) {
      this.#maybe_dirty_effects.delete(e);
      set_signal_status(e, DIRTY);
      this.schedule(e);
    }
    for (const e of this.#maybe_dirty_effects) {
      set_signal_status(e, MAYBE_DIRTY);
      this.schedule(e);
    }
    this.apply();
    var effects = (collected_effects = []);
    var render_effects = [];
    var updates = (legacy_updates = []);
    while (this.#scheduled.length > 0) {
      if (flush_count++ > 1e3) {
        this.#unlink();
        infinite_loop_guard();
      }
      for (const root24 of this.#resolve()) {
        try {
          this.#traverse(root24, effects, render_effects);
        } catch (e) {
          reset_all(root24);
          if (!this.#is_deferred()) this.discard();
          throw e;
        }
      }
    }
    current_batch = null;
    if (updates.length > 0) {
      var batch = _Batch.ensure();
      for (const e of updates) {
        batch.schedule(e);
      }
    }
    collected_effects = null;
    legacy_updates = null;
    if (this.#is_deferred()) {
      this.#defer_effects(render_effects);
      this.#defer_effects(effects);
      for (const [e, t] of this.#skipped_branches) {
        reset_branch(e, t);
      }
      if (updates.length > 0) {
        /** @type {unknown} */
        current_batch.#process();
      }
      return;
    }
    const earlier_batch = this.#find_earlier_batch();
    if (earlier_batch) {
      this.#defer_effects(render_effects);
      this.#defer_effects(effects);
      earlier_batch.#merge(this);
      return;
    }
    this.#dirty_effects.clear();
    this.#maybe_dirty_effects.clear();
    for (const fn of this.#commit_callbacks) fn(this);
    this.#commit_callbacks.clear();
    previous_batch = this;
    flush_queued_effects(render_effects);
    flush_queued_effects(effects);
    previous_batch = null;
    this.#deferred?.resolve();
    var next_batch =
      /** @type {Batch | null} */
      /** @type {unknown} */
      current_batch;
    if (
      this.#pending === 0 &&
      (this.#scheduled.length === 0 || next_batch !== null)
    ) {
      this.#unlink();
      if (async_mode_flag) {
        this.#commit();
        current_batch = next_batch;
      }
    }
    if (this.#scheduled.length > 0) {
      if (next_batch !== null) {
        for (const e of this.#scheduled) {
          next_batch.#scheduled.push(e);
        }
        this.#scheduled = [];
      } else {
        next_batch = this;
      }
    }
    if (next_batch !== null) {
      old_values.clear();
      next_batch.#process();
    }
  }
  /**
   * Traverse the effect tree, executing effects or stashing
   * them for later execution as appropriate
   * @param {Effect} root
   * @param {Effect[]} effects
   * @param {Effect[]} render_effects
   */
  #traverse(root24, effects, render_effects) {
    root24.f ^= CLEAN;
    var effect2 = root24.first;
    while (effect2 !== null) {
      var flags2 = effect2.f;
      var is_branch = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
      var is_skippable_branch = is_branch && (flags2 & CLEAN) !== 0;
      var skip =
        is_skippable_branch ||
        (flags2 & INERT) !== 0 ||
        this.#skipped_branches.has(effect2);
      if (!skip && effect2.fn !== null) {
        if (is_branch) {
          effect2.f ^= CLEAN;
        } else if ((flags2 & EFFECT) !== 0) {
          effects.push(effect2);
        } else if (
          async_mode_flag &&
          (flags2 & (RENDER_EFFECT | MANAGED_EFFECT)) !== 0
        ) {
          render_effects.push(effect2);
        } else if (is_dirty(effect2)) {
          if ((flags2 & BLOCK_EFFECT) !== 0)
            this.#maybe_dirty_effects.add(effect2);
          update_effect(effect2);
        }
        var child2 = effect2.first;
        if (child2 !== null) {
          effect2 = child2;
          continue;
        }
      }
      while (effect2 !== null) {
        var next2 = effect2.next;
        if (next2 !== null) {
          effect2 = next2;
          break;
        }
        effect2 = effect2.parent;
      }
    }
  }
  #find_earlier_batch() {
    var batch = this.#prev;
    while (batch !== null) {
      if (!batch.is_fork) {
        for (const [value, [, is_derived]] of this.current) {
          if (batch.current.has(value) && !is_derived) {
            return batch;
          }
        }
      }
      batch = batch.#prev;
    }
    return null;
  }
  /**
   * @param {Batch} batch
   */
  #merge(batch) {
    for (const [source2, value] of batch.current) {
      if (!this.previous.has(source2) && batch.previous.has(source2)) {
        this.previous.set(source2, batch.previous.get(source2));
      }
      this.current.set(source2, value);
    }
    for (const [effect2, deferred2] of batch.async_deriveds) {
      const d = this.async_deriveds.get(effect2);
      if (d) deferred2.promise.then(d.resolve).catch(d.reject);
    }
    batch.async_deriveds.clear();
    this.transfer_effects(batch.#dirty_effects, batch.#maybe_dirty_effects);
    const mark = (value) => {
      var reactions = value.reactions;
      if (reactions === null) return;
      if (
        (value.f & DERIVED) !== 0 &&
        (value.f & (DIRTY | MAYBE_DIRTY)) === 0
      ) {
        return;
      }
      for (const reaction of reactions) {
        var flags2 = reaction.f;
        if ((flags2 & DERIVED) !== 0) {
          mark(
            /** @type {Derived} */
            reaction,
          );
        } else {
          var effect2 =
            /** @type {Effect} */
            reaction;
          if (
            flags2 & (ASYNC | BLOCK_EFFECT) &&
            !this.async_deriveds.has(effect2)
          ) {
            this.#maybe_dirty_effects.delete(effect2);
            set_signal_status(effect2, DIRTY);
            this.schedule(effect2);
          }
        }
      }
    };
    for (const source2 of this.current.keys()) {
      mark(source2);
    }
    this.oncommit(() => batch.discard());
    batch.#unlink();
    current_batch = this;
    this.#process();
  }
  /**
   * @param {Effect[]} effects
   */
  #defer_effects(effects) {
    for (var i = 0; i < effects.length; i += 1) {
      defer_effect(effects[i], this.#dirty_effects, this.#maybe_dirty_effects);
    }
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Value} source
   * @param {any} value
   * @param {boolean} [is_derived]
   */
  capture(source2, value, is_derived = false) {
    if (source2.v !== UNINITIALIZED && !this.previous.has(source2)) {
      this.previous.set(source2, source2.v);
    }
    if ((source2.f & ERROR_VALUE) === 0) {
      this.current.set(source2, [value, is_derived]);
      batch_values?.set(source2, value);
    }
    if (!this.is_fork) {
      source2.v = value;
    }
  }
  activate() {
    current_batch = this;
  }
  deactivate() {
    current_batch = null;
    batch_values = null;
  }
  flush() {
    try {
      if (dev_fallback_default) {
        source_stacks.clear();
      }
      is_processing = true;
      current_batch = this;
      this.#process();
    } finally {
      flush_count = 0;
      last_scheduled_effect = null;
      collected_effects = null;
      legacy_updates = null;
      is_processing = false;
      current_batch = null;
      batch_values = null;
      old_values.clear();
      if (dev_fallback_default) {
        for (const source2 of source_stacks) {
          source2.updated = null;
        }
      }
    }
  }
  discard() {
    for (const fn of this.#discard_callbacks) fn(this);
    this.#discard_callbacks.clear();
    for (const deferred2 of this.async_deriveds.values()) {
      deferred2.reject(OBSOLETE);
    }
    this.#unlink();
    this.#deferred?.resolve();
  }
  /**
   * @param {Effect} effect
   */
  register_created_effect(effect2) {
    this.#new_effects.push(effect2);
  }
  #commit() {
    for (let batch = first_batch; batch !== null; batch = batch.#next) {
      var is_earlier = batch.id < this.id;
      var sources = [];
      for (const [source3, [value, is_derived]] of this.current) {
        if (batch.current.has(source3)) {
          var batch_value =
            /** @type {[any, boolean]} */
            batch.current.get(source3)[0];
          if (is_earlier && value !== batch_value) {
            batch.current.set(source3, [value, is_derived]);
          } else {
            continue;
          }
        }
        sources.push(source3);
      }
      if (is_earlier) {
        for (const [effect2, deferred2] of this.async_deriveds) {
          const d = batch.async_deriveds.get(effect2);
          if (d) deferred2.promise.then(d.resolve).catch(d.reject);
        }
      }
      var current = [...batch.current.keys()].filter(
        (source3) =>
          !(/** @type {[any, boolean]} */ batch.current.get(source3)[1]),
      );
      if (!batch.#started || current.length === 0) continue;
      var others = current.filter((source3) => !this.current.has(source3));
      if (others.length === 0) {
        if (is_earlier) {
          batch.discard();
        }
      } else if (sources.length > 0) {
        if (dev_fallback_default && !batch.#decrement_queued) {
          invariant(
            batch.#scheduled.length === 0,
            "Batch has scheduled effects",
          );
        }
        if (is_earlier) {
          for (const unskipped of this.#unskipped_branches) {
            batch.unskip_effect(unskipped, (e) => {
              if ((e.f & (BLOCK_EFFECT | ASYNC)) !== 0) {
                batch.schedule(e);
              } else {
                batch.#defer_effects([e]);
              }
            });
          }
        }
        batch.activate();
        var marked = /* @__PURE__ */ new Set();
        var checked = /* @__PURE__ */ new Map();
        for (var source2 of sources) {
          mark_effects(source2, others, marked, checked);
        }
        checked = /* @__PURE__ */ new Map();
        var current_unequal = [...batch.current]
          .filter(([c, v1]) => {
            const v2 = this.current.get(c);
            if (!v2) return true;
            return v2[0] !== v1[0] || v2[1] !== v1[1];
          })
          .map(([c]) => c);
        if (current_unequal.length > 0) {
          for (const effect2 of this.#new_effects) {
            if (
              (effect2.f & (DESTROYED | INERT | EAGER_EFFECT)) === 0 &&
              depends_on(effect2, current_unequal, checked)
            ) {
              if ((effect2.f & (ASYNC | BLOCK_EFFECT)) !== 0) {
                set_signal_status(effect2, DIRTY);
                batch.schedule(effect2);
              } else {
                batch.#dirty_effects.add(effect2);
              }
            }
          }
        }
        if (batch.#scheduled.length > 0 && !batch.#decrement_queued) {
          batch.apply();
          for (var root24 of batch.#resolve()) {
            batch.#traverse(root24, [], []);
          }
        }
        batch.deactivate();
      }
    }
  }
  /**
   * @param {boolean} blocking
   * @param {Effect} effect
   */
  increment(blocking, effect2) {
    this.#pending += 1;
    if (blocking) {
      let blocking_pending_count = this.#blocking_pending.get(effect2) ?? 0;
      this.#blocking_pending.set(effect2, blocking_pending_count + 1);
    }
  }
  /**
   * @param {boolean} blocking
   * @param {Effect} effect
   */
  decrement(blocking, effect2) {
    this.#pending -= 1;
    if (blocking) {
      let blocking_pending_count = this.#blocking_pending.get(effect2) ?? 0;
      if (blocking_pending_count === 1) {
        this.#blocking_pending.delete(effect2);
      } else {
        this.#blocking_pending.set(effect2, blocking_pending_count - 1);
      }
    }
    if (this.#decrement_queued) return;
    this.#decrement_queued = true;
    queue_micro_task(() => {
      this.#decrement_queued = false;
      if (this.linked) {
        this.flush();
      }
    });
  }
  /**
   * @param {Set<Effect>} dirty_effects
   * @param {Set<Effect>} maybe_dirty_effects
   */
  transfer_effects(dirty_effects, maybe_dirty_effects) {
    for (const e of dirty_effects) {
      this.#dirty_effects.add(e);
    }
    for (const e of maybe_dirty_effects) {
      this.#maybe_dirty_effects.add(e);
    }
    dirty_effects.clear();
    maybe_dirty_effects.clear();
  }
  /** @param {(batch: Batch) => void} fn */
  oncommit(fn) {
    this.#commit_callbacks.add(fn);
  }
  /** @param {(batch: Batch) => void} fn */
  ondiscard(fn) {
    this.#discard_callbacks.add(fn);
  }
  settled() {
    return (this.#deferred ??= deferred()).promise;
  }
  static ensure() {
    if (current_batch === null) {
      const batch = (current_batch = new _Batch());
      if (!is_processing && !is_flushing_sync) {
        queue_micro_task(() => {
          if (!batch.#started) {
            batch.flush();
          }
        });
      }
    }
    return current_batch;
  }
  apply() {
    if (
      !async_mode_flag ||
      (!this.is_fork && this.#prev === null && this.#next === null)
    ) {
      batch_values = null;
      return;
    }
    batch_values = /* @__PURE__ */ new Map();
    for (const [source2, [value]] of this.current) {
      batch_values.set(source2, value);
    }
    for (let batch = first_batch; batch !== null; batch = batch.#next) {
      if (batch === this || batch.is_fork) continue;
      var intersects = false;
      if (batch.id < this.id) {
        for (const [source2, [, is_derived]] of batch.current) {
          if (is_derived) continue;
          if (this.current.has(source2)) {
            intersects = true;
            break;
          }
        }
      }
      if (!intersects) {
        for (const [source2, previous] of batch.previous) {
          if (!batch_values.has(source2)) {
            batch_values.set(source2, previous);
          }
        }
      }
    }
  }
  /**
   *
   * @param {Effect} effect
   */
  schedule(effect2) {
    last_scheduled_effect = effect2;
    if (
      effect2.b?.is_pending &&
      (effect2.f & (EFFECT | RENDER_EFFECT | MANAGED_EFFECT)) !== 0 &&
      (effect2.f & REACTION_RAN) === 0
    ) {
      effect2.b.defer_effect(effect2);
      return;
    }
    this.#scheduled.push(effect2);
  }
  #unlink() {
    if (!this.linked) return;
    var prev = this.#prev;
    var next2 = this.#next;
    if (prev === null) {
      first_batch = next2;
    } else {
      prev.#next = next2;
    }
    if (next2 === null) {
      last_batch = prev;
    } else {
      next2.#prev = prev;
    }
    this.linked = false;
  }
};
function flushSync(fn) {
  var was_flushing_sync = is_flushing_sync;
  var prev_previous_batch = previous_batch;
  previous_batch = null;
  is_flushing_sync = true;
  try {
    var result;
    if (fn) {
      flushSync();
      result = fn();
    }
    while (true) {
      flush_tasks();
      if (current_batch === null) {
        return (
          /** @type {T} */
          result
        );
      }
      current_batch.flush();
    }
  } finally {
    is_flushing_sync = was_flushing_sync;
    previous_batch = prev_previous_batch;
  }
}
function infinite_loop_guard() {
  if (dev_fallback_default) {
    var updates = /* @__PURE__ */ new Map();
    /** @type {Batch} */
    for (const source2 of current_batch.current.keys()) {
      for (const [stack2, update2] of source2.updated ?? []) {
        var entry = updates.get(stack2);
        if (!entry) {
          entry = { error: update2.error, count: 0 };
          updates.set(stack2, entry);
        }
        entry.count += update2.count;
      }
    }
    for (const update2 of updates.values()) {
      if (update2.error) {
        console.error(update2.error);
      }
    }
  }
  try {
    effect_update_depth_exceeded();
  } catch (error) {
    if (dev_fallback_default) {
      define_property(error, "stack", { value: "" });
    }
    invoke_error_boundary(error, last_scheduled_effect);
  }
}
var eager_block_effects = null;
function flush_queued_effects(effects) {
  var length = effects.length;
  if (length === 0) return;
  var i = 0;
  while (i < length) {
    var effect2 = effects[i++];
    if ((effect2.f & (DESTROYED | INERT)) === 0 && is_dirty(effect2)) {
      eager_block_effects = /* @__PURE__ */ new Set();
      update_effect(effect2);
      if (
        effect2.deps === null &&
        effect2.first === null &&
        effect2.nodes === null &&
        effect2.teardown === null &&
        effect2.ac === null
      ) {
        unlink_effect(effect2);
      }
      if (eager_block_effects?.size > 0) {
        old_values.clear();
        for (const e of eager_block_effects) {
          if ((e.f & (DESTROYED | INERT)) !== 0) continue;
          const ordered_effects = [e];
          let ancestor = e.parent;
          while (ancestor !== null) {
            if (eager_block_effects.has(ancestor)) {
              eager_block_effects.delete(ancestor);
              ordered_effects.push(ancestor);
            }
            ancestor = ancestor.parent;
          }
          for (let j = ordered_effects.length - 1; j >= 0; j--) {
            const e2 = ordered_effects[j];
            if ((e2.f & (DESTROYED | INERT)) !== 0) continue;
            update_effect(e2);
          }
        }
        eager_block_effects.clear();
      }
    }
  }
  eager_block_effects = null;
}
function mark_effects(value, sources, marked, checked) {
  if (marked.has(value)) return;
  marked.add(value);
  if (value.reactions !== null) {
    for (const reaction of value.reactions) {
      const flags2 = reaction.f;
      if ((flags2 & DERIVED) !== 0) {
        mark_effects(
          /** @type {Derived} */
          reaction,
          sources,
          marked,
          checked,
        );
      } else if (
        (flags2 & (ASYNC | BLOCK_EFFECT)) !== 0 &&
        (flags2 & DIRTY) === 0 &&
        depends_on(reaction, sources, checked)
      ) {
        set_signal_status(reaction, DIRTY);
        schedule_effect(
          /** @type {Effect} */
          reaction,
        );
      }
    }
  }
}
function depends_on(reaction, sources, checked) {
  const depends = checked.get(reaction);
  if (depends !== void 0) return depends;
  if (reaction.deps !== null) {
    for (const dep of reaction.deps) {
      if (includes.call(sources, dep)) {
        return true;
      }
      if (
        (dep.f & DERIVED) !== 0 &&
        depends_on(
          /** @type {Derived} */
          dep,
          sources,
          checked,
        )
      ) {
        checked.set(
          /** @type {Derived} */
          dep,
          true,
        );
        return true;
      }
    }
  }
  checked.set(reaction, false);
  return false;
}
function schedule_effect(effect2) {
  current_batch.schedule(effect2);
}
function reset_branch(effect2, tracked) {
  if ((effect2.f & BRANCH_EFFECT) !== 0 && (effect2.f & CLEAN) !== 0) {
    return;
  }
  if ((effect2.f & DIRTY) !== 0) {
    tracked.d.push(effect2);
  } else if ((effect2.f & MAYBE_DIRTY) !== 0) {
    tracked.m.push(effect2);
  }
  set_signal_status(effect2, CLEAN);
  var e = effect2.first;
  while (e !== null) {
    reset_branch(e, tracked);
    e = e.next;
  }
}
function reset_all(effect2) {
  set_signal_status(effect2, CLEAN);
  var e = effect2.first;
  while (e !== null) {
    reset_all(e);
    e = e.next;
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/sources.js
var eager_effects = /* @__PURE__ */ new Set();
var old_values = /* @__PURE__ */ new Map();
function set_eager_effects(v) {
  eager_effects = v;
}
var eager_effects_deferred = false;
function set_eager_effects_deferred() {
  eager_effects_deferred = true;
}
function source(v, stack2) {
  var signal = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v,
    reactions: null,
    equals,
    rv: 0,
    wv: 0,
  };
  if (dev_fallback_default && tracing_mode_flag) {
    signal.created = stack2 ?? get_error("created at");
    signal.updated = null;
    signal.set_during_effect = false;
    signal.trace = null;
  }
  return signal;
}
// @__NO_SIDE_EFFECTS__
function state(v, stack2) {
  const s = source(v, stack2);
  push_reaction_value(s);
  return s;
}
// @__NO_SIDE_EFFECTS__
function mutable_source(initial_value, immutable = false, trackable = true) {
  const s = source(initial_value);
  if (!immutable) {
    s.equals = safe_equals;
  }
  if (
    legacy_mode_flag &&
    trackable &&
    component_context !== null &&
    component_context.l !== null
  ) {
    (component_context.l.s ??= []).push(s);
  }
  return s;
}
function set2(source2, value, should_proxy = false) {
  if (
    active_reaction !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
    // to ensure we error if state is set inside an inspect effect
    (!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) &&
    is_runes() &&
    (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !==
      0 &&
    (current_sources === null || !current_sources.has(source2))
  ) {
    state_unsafe_mutation();
  }
  let new_value = should_proxy ? proxy(value) : value;
  if (dev_fallback_default) {
    tag_proxy(
      new_value,
      /** @type {string} */
      source2.label,
    );
  }
  return internal_set(source2, new_value, legacy_updates);
}
var seen = null;
var count_deps = 0;
function internal_set(source2, value, updated_during_traversal = null) {
  if (!source2.equals(value)) {
    if (is_destroying_effect) {
      old_values.set(source2, value);
    } else if (!old_values.has(source2)) {
      old_values.set(source2, source2.v);
    }
    var batch = Batch.ensure();
    batch.capture(source2, value);
    if (dev_fallback_default) {
      if (tracing_mode_flag || active_effect !== null) {
        source2.updated ??= /* @__PURE__ */ new Map();
        const count = (source2.updated.get("")?.count ?? 0) + 1;
        source2.updated.set("", {
          error:
            /** @type {any} */
            null,
          count,
        });
        if (tracing_mode_flag || count > 5) {
          const error = get_error("updated at");
          if (error !== null) {
            let entry = source2.updated.get(error.stack);
            if (!entry) {
              entry = { error, count: 0 };
              source2.updated.set(error.stack, entry);
            }
            entry.count++;
          }
        }
      }
      if (active_effect !== null) {
        source2.set_during_effect = true;
      }
    }
    if ((source2.f & DERIVED) !== 0) {
      const derived3 =
        /** @type {Derived} */
        source2;
      if ((source2.f & DIRTY) !== 0) {
        execute_derived(derived3);
      }
      if (batch_values === null) {
        update_derived_status(derived3);
      }
    }
    source2.wv = increment_write_version();
    seen = null;
    count_deps = 0;
    mark_reactions(source2, DIRTY, updated_during_traversal);
    seen = null;
    if (
      is_runes() &&
      active_effect !== null &&
      (active_effect.f & CLEAN) !== 0 &&
      (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0
    ) {
      if (untracked_writes === null) {
        set_untracked_writes([source2]);
      } else {
        untracked_writes.push(source2);
      }
    }
    if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
      flush_eager_effects();
    }
  }
  return value;
}
function flush_eager_effects() {
  eager_effects_deferred = false;
  for (const effect2 of eager_effects) {
    if ((effect2.f & CLEAN) !== 0) {
      set_signal_status(effect2, MAYBE_DIRTY);
    }
    let dirty;
    try {
      dirty = is_dirty(effect2);
    } catch {
      dirty = true;
    }
    if (dirty) {
      update_effect(effect2);
    }
  }
  eager_effects.clear();
}
function increment(source2) {
  set2(source2, source2.v + 1);
}
function mark_reactions(signal, status, updated_during_traversal) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  var runes = is_runes();
  var length = reactions.length;
  count_deps += length;
  if (count_deps > 1e5 && seen === null) seen = /* @__PURE__ */ new Set();
  if (seen !== null) {
    if (seen.has(signal)) return;
    seen.add(signal);
  }
  for (var i = 0; i < length; i++) {
    var reaction = reactions[i];
    var flags2 = reaction.f;
    if (!runes && reaction === active_effect) continue;
    var not_dirty = (flags2 & DIRTY) === 0;
    if (not_dirty) {
      set_signal_status(reaction, status);
    }
    if ((flags2 & EAGER_EFFECT) !== 0) {
      eager_effects.add(
        /** @type {Effect} */
        reaction,
      );
    } else if ((flags2 & DERIVED) !== 0) {
      var derived3 =
        /** @type {Derived} */
        reaction;
      batch_values?.delete(derived3);
      mark_reactions(derived3, MAYBE_DIRTY, updated_during_traversal);
    } else if (not_dirty) {
      var effect2 =
        /** @type {Effect} */
        reaction;
      if ((flags2 & BLOCK_EFFECT) !== 0 && eager_block_effects !== null) {
        eager_block_effects.add(effect2);
      }
      if (updated_during_traversal !== null) {
        updated_during_traversal.push(effect2);
      } else {
        schedule_effect(effect2);
      }
    }
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/proxy.js
var regex_is_valid_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function proxy(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    STATE_SYMBOL in value ||
    COMPONENT_SYMBOL in value
  ) {
    return value;
  }
  const prototype = get_prototype_of(value);
  if (prototype !== object_prototype && prototype !== array_prototype) {
    return value;
  }
  var sources = /* @__PURE__ */ new Map();
  var is_proxied_array = is_array(value);
  var version = state(0);
  var stack2 =
    dev_fallback_default && tracing_mode_flag ? get_error("created at") : null;
  var parent_version = update_version;
  var with_parent = (fn) => {
    if (update_version === parent_version) {
      return fn();
    }
    var reaction = active_reaction;
    var version2 = update_version;
    set_active_reaction(null);
    set_update_version(parent_version);
    var result = fn();
    set_active_reaction(reaction);
    set_update_version(version2);
    return result;
  };
  if (is_proxied_array) {
    sources.set(
      "length",
      state(
        /** @type {any[]} */
        value.length,
        stack2,
      ),
    );
    if (dev_fallback_default) {
      value =
        /** @type {any} */
        inspectable_array(
          /** @type {any[]} */
          value,
        );
    }
  }
  var path = "";
  let updating = false;
  function update_path(new_path) {
    if (updating) return;
    updating = true;
    path = new_path;
    tag(version, `${path} version`);
    for (const [prop2, source2] of sources) {
      tag(source2, get_label(path, prop2));
    }
    updating = false;
  }
  return new Proxy(
    /** @type {any} */
    value,
    {
      defineProperty(_, prop2, descriptor) {
        if (
          !("value" in descriptor) ||
          descriptor.configurable === false ||
          descriptor.enumerable === false ||
          descriptor.writable === false
        ) {
          state_descriptors_fixed();
        }
        var s = sources.get(prop2);
        if (s === void 0) {
          with_parent(() => {
            var s2 = state(descriptor.value, stack2);
            sources.set(prop2, s2);
            if (dev_fallback_default && typeof prop2 === "string") {
              tag(s2, get_label(path, prop2));
            }
            return s2;
          });
        } else {
          set2(s, descriptor.value, true);
        }
        return true;
      },
      deleteProperty(target, prop2) {
        var s = sources.get(prop2);
        if (s === void 0) {
          if (prop2 in target) {
            const s2 = with_parent(() => state(UNINITIALIZED, stack2));
            sources.set(prop2, s2);
            increment(version);
            if (dev_fallback_default) {
              tag(s2, get_label(path, prop2));
            }
          }
        } else {
          set2(s, UNINITIALIZED);
          increment(version);
        }
        return true;
      },
      get(target, prop2, receiver) {
        if (prop2 === STATE_SYMBOL) {
          return value;
        }
        if (dev_fallback_default && prop2 === PROXY_PATH_SYMBOL) {
          return update_path;
        }
        var s = sources.get(prop2);
        var exists = prop2 in target;
        if (
          s === void 0 &&
          (!exists || get_descriptor(target, prop2)?.writable)
        ) {
          s = with_parent(() => {
            var p = proxy(exists ? target[prop2] : UNINITIALIZED);
            var s2 = state(p, stack2);
            if (dev_fallback_default) {
              tag(s2, get_label(path, prop2));
            }
            return s2;
          });
          sources.set(prop2, s);
        }
        if (s !== void 0) {
          var v = get(s);
          return v === UNINITIALIZED ? void 0 : v;
        }
        return Reflect.get(target, prop2, receiver);
      },
      getOwnPropertyDescriptor(target, prop2) {
        this.has?.(target, prop2);
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
        var s = sources.get(prop2);
        if (s !== void 0) {
          var value2 = get(s);
          if (value2 === UNINITIALIZED) {
            return void 0;
          }
          if (descriptor && "value" in descriptor) {
            descriptor.value = value2;
          } else {
            return {
              enumerable: true,
              configurable: true,
              value: value2,
              writable: true,
            };
          }
        }
        return descriptor;
      },
      has(target, prop2) {
        if (prop2 === STATE_SYMBOL) {
          return true;
        }
        var s = sources.get(prop2);
        var has =
          (s !== void 0 && s.v !== UNINITIALIZED) || Reflect.has(target, prop2);
        if (
          s !== void 0 ||
          (active_effect !== null &&
            (!has || get_descriptor(target, prop2)?.writable))
        ) {
          if (s === void 0) {
            s = with_parent(() => {
              var p = has ? proxy(target[prop2]) : UNINITIALIZED;
              var s2 = state(p, stack2);
              if (dev_fallback_default) {
                tag(s2, get_label(path, prop2));
              }
              return s2;
            });
            sources.set(prop2, s);
          }
          var value2 = get(s);
          if (value2 === UNINITIALIZED) {
            return false;
          }
        }
        return has;
      },
      set(target, prop2, value2, receiver) {
        var s = sources.get(prop2);
        var has = prop2 in target;
        if (is_proxied_array && prop2 === "length") {
          for (var i = value2; i < /** @type {Source<number>} */ s.v; i += 1) {
            var other_s = sources.get(i + "");
            if (other_s !== void 0) {
              set2(other_s, UNINITIALIZED);
            } else if (i in target) {
              other_s = with_parent(() => state(UNINITIALIZED, stack2));
              sources.set(i + "", other_s);
              if (dev_fallback_default) {
                tag(other_s, get_label(path, i));
              }
            }
          }
        }
        if (s === void 0) {
          if (!has || get_descriptor(target, prop2)?.writable) {
            s = with_parent(() => state(void 0, stack2));
            if (dev_fallback_default) {
              tag(s, get_label(path, prop2));
            }
            set2(s, proxy(value2));
            sources.set(prop2, s);
          }
        } else {
          has = s.v !== UNINITIALIZED;
          var p = with_parent(() => proxy(value2));
          set2(s, p);
        }
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop2);
        if (descriptor?.set) {
          descriptor.set.call(receiver, value2);
        }
        if (!has) {
          if (is_proxied_array && typeof prop2 === "string") {
            var ls =
              /** @type {Source<number>} */
              sources.get("length");
            var n = Number(prop2);
            if (Number.isInteger(n) && n >= ls.v) {
              set2(ls, n + 1);
            }
          }
          increment(version);
        }
        return true;
      },
      ownKeys(target) {
        get(version);
        var own_keys = Reflect.ownKeys(target).filter((key3) => {
          var source3 = sources.get(key3);
          return source3 === void 0 || source3.v !== UNINITIALIZED;
        });
        for (var [key2, source2] of sources) {
          if (source2.v !== UNINITIALIZED && !(key2 in target)) {
            own_keys.push(key2);
          }
        }
        return own_keys;
      },
      setPrototypeOf() {
        state_prototype_fixed();
      },
    },
  );
}
function get_label(path, prop2) {
  if (typeof prop2 === "symbol")
    return `${path}[Symbol(${prop2.description ?? ""})]`;
  if (regex_is_valid_identifier.test(prop2)) return `${path}.${prop2}`;
  return /^\d+$/.test(prop2) ? `${path}[${prop2}]` : `${path}['${prop2}']`;
}
function get_proxied_value(value) {
  try {
    if (value !== null && typeof value === "object" && STATE_SYMBOL in value) {
      return value[STATE_SYMBOL];
    }
  } catch {}
  return value;
}
function is(a, b) {
  return Object.is(get_proxied_value(a), get_proxied_value(b));
}
var ARRAY_MUTATING_METHODS = /* @__PURE__ */ new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift",
]);
function inspectable_array(array) {
  return new Proxy(array, {
    get(target, prop2, receiver) {
      var value = Reflect.get(target, prop2, receiver);
      if (
        !ARRAY_MUTATING_METHODS.has(
          /** @type {string} */
          prop2,
        )
      ) {
        return value;
      }
      return function (...args) {
        set_eager_effects_deferred();
        var result = value.apply(this, args);
        flush_eager_effects();
        return result;
      };
    },
  });
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dev/equality.js
function init_array_prototype_warnings() {
  const array_prototype2 = Array.prototype;
  const cleanup = Array.__svelte_cleanup;
  if (cleanup) {
    cleanup();
  }
  const { indexOf, lastIndexOf, includes: includes2 } = array_prototype2;
  array_prototype2.indexOf = function (item, from_index) {
    const index2 = indexOf.call(this, item, from_index);
    if (index2 === -1) {
      for (let i = from_index ?? 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.indexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.lastIndexOf = function (item, from_index) {
    const index2 = lastIndexOf.call(this, item, from_index ?? this.length - 1);
    if (index2 === -1) {
      for (let i = 0; i <= (from_index ?? this.length - 1); i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.lastIndexOf(...)");
          break;
        }
      }
    }
    return index2;
  };
  array_prototype2.includes = function (item, from_index) {
    const has = includes2.call(this, item, from_index);
    if (!has) {
      for (let i = 0; i < this.length; i += 1) {
        if (get_proxied_value(this[i]) === item) {
          state_proxy_equality_mismatch("array.includes(...)");
          break;
        }
      }
    }
    return has;
  };
  Array.__svelte_cleanup = () => {
    array_prototype2.indexOf = indexOf;
    array_prototype2.lastIndexOf = lastIndexOf;
    array_prototype2.includes = includes2;
  };
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/operations.js
var $window;
var $document;
var is_firefox;
var first_child_getter;
var next_sibling_getter;
function init_operations() {
  if ($window !== void 0) {
    return;
  }
  $window = window;
  $document = document;
  is_firefox = /Firefox/.test(navigator.userAgent);
  var element_prototype = Element.prototype;
  var node_prototype = Node.prototype;
  var text_prototype = Text.prototype;
  first_child_getter = get_descriptor(node_prototype, "firstChild").get;
  next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
  if (is_extensible(element_prototype)) {
    element_prototype[CLASS_CACHE] = void 0;
    element_prototype[ATTRIBUTES_CACHE] = null;
    element_prototype[STYLE_CACHE] = void 0;
    element_prototype.__e = void 0;
  }
  if (is_extensible(text_prototype)) {
    text_prototype[TEXT_CACHE] = void 0;
  }
  if (dev_fallback_default) {
    element_prototype.__svelte_meta = null;
    init_array_prototype_warnings();
  }
}
function create_text(value = "") {
  return document.createTextNode(value);
}
// @__NO_SIDE_EFFECTS__
function get_first_child(node) {
  return (
    /** @type {TemplateNode | null} */
    first_child_getter.call(node)
  );
}
// @__NO_SIDE_EFFECTS__
function get_next_sibling(node) {
  return (
    /** @type {TemplateNode | null} */
    next_sibling_getter.call(node)
  );
}
function child(node, is_text) {
  if (!hydrating) {
    return /* @__PURE__ */ get_first_child(node);
  }
  var child2 = /* @__PURE__ */ get_first_child(hydrate_node);
  if (child2 === null) {
    child2 = hydrate_node.appendChild(create_text());
  } else if (is_text && child2.nodeType !== TEXT_NODE) {
    var text2 = create_text();
    child2?.before(text2);
    set_hydrate_node(text2);
    return text2;
  }
  if (is_text) {
    merge_text_nodes(
      /** @type {Text} */
      child2,
    );
  }
  set_hydrate_node(child2);
  return child2;
}
function first_child(node, is_text = false) {
  if (!hydrating) {
    var first = /* @__PURE__ */ get_first_child(node);
    if (first instanceof Comment && first.data === "")
      return /* @__PURE__ */ get_next_sibling(first);
    return first;
  }
  if (is_text) {
    if (hydrate_node?.nodeType !== TEXT_NODE) {
      var text2 = create_text();
      hydrate_node?.before(text2);
      set_hydrate_node(text2);
      return text2;
    }
    merge_text_nodes(
      /** @type {Text} */
      hydrate_node,
    );
  }
  return hydrate_node;
}
function only_child(node, is_text = false) {
  if (!hydrating) {
    return /* @__PURE__ */ get_first_child(node);
  }
  var first = child(node, is_text);
  reset(node);
  return first;
}
function sibling(node, count = 1, is_text = false) {
  let next_sibling = hydrating ? hydrate_node : node;
  var last_sibling;
  while (count--) {
    last_sibling = next_sibling;
    next_sibling =
      /** @type {TemplateNode} */
      /* @__PURE__ */ get_next_sibling(next_sibling);
  }
  if (!hydrating) {
    return next_sibling;
  }
  if (is_text) {
    if (next_sibling?.nodeType !== TEXT_NODE) {
      var text2 = create_text();
      if (next_sibling === null) {
        last_sibling?.after(text2);
      } else {
        next_sibling.before(text2);
      }
      set_hydrate_node(text2);
      return text2;
    }
    merge_text_nodes(
      /** @type {Text} */
      next_sibling,
    );
  }
  set_hydrate_node(next_sibling);
  return next_sibling;
}
function clear_text_content(node) {
  node.textContent = "";
}
function should_defer_append() {
  if (!async_mode_flag) return false;
  if (eager_block_effects !== null) return false;
  var flags2 =
    /** @type {Effect} */
    active_effect.f;
  return (flags2 & REACTION_RAN) !== 0;
}
function create_element(tag2, namespace, is2) {
  if (namespace == null || namespace === NAMESPACE_HTML) {
    return (
      /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
      is2
        ? document.createElement(tag2, { is: is2 })
        : document.createElement(tag2)
    );
  }
  return (
    /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
    is2
      ? document.createElementNS(namespace, tag2, { is: is2 })
      : document.createElementNS(namespace, tag2)
  );
}
function merge_text_nodes(text2) {
  if (
    /** @type {string} */
    text2.nodeValue.length < 65536
  ) {
    return;
  }
  let next2 = text2.nextSibling;
  while (next2 !== null && next2.nodeType === TEXT_NODE) {
    next2.remove();
    text2.nodeValue += /** @type {string} */ next2.nodeValue;
    next2 = text2.nextSibling;
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/error-handling.js
var adjustments = /* @__PURE__ */ new WeakMap();
function handle_error(error) {
  var effect2 = active_effect;
  if (effect2 === null) {
    active_reaction.f |= ERROR_VALUE;
    return error;
  }
  if (
    dev_fallback_default &&
    error instanceof Error &&
    !adjustments.has(error)
  ) {
    adjustments.set(error, get_adjustments(error, effect2));
  }
  if ((effect2.f & REACTION_RAN) === 0 && (effect2.f & EFFECT) === 0) {
    if (dev_fallback_default && !effect2.parent && error instanceof Error) {
      apply_adjustments(error);
    }
    throw error;
  }
  invoke_error_boundary(error, effect2);
}
function invoke_error_boundary(error, effect2) {
  if (error === HYDRATION_ERROR) {
    throw error;
  }
  if (effect2 !== null && (effect2.f & DESTROYED) !== 0) {
    return;
  }
  while (effect2 !== null) {
    if (
      (effect2.f & BOUNDARY_EFFECT) !== 0 &&
      (effect2.f & (DESTROYED | DESTROYING)) === 0
    ) {
      if ((effect2.f & REACTION_RAN) === 0) {
        throw error;
      }
      try {
        effect2.b.error(error);
        return;
      } catch (e) {
        error = e;
      }
    }
    effect2 = effect2.parent;
  }
  if (dev_fallback_default && error instanceof Error) {
    apply_adjustments(error);
  }
  throw error;
}
function get_adjustments(error, effect2) {
  const message_descriptor = get_descriptor(error, "message");
  if (message_descriptor && !message_descriptor.configurable) return;
  var indent = is_firefox ? "  " : "	";
  var component_stack = `
${indent}in ${effect2.fn?.name || "<unknown>"}`;
  var context = effect2.ctx;
  while (context !== null) {
    component_stack += `
${indent}in ${context.function?.[FILENAME].split("/").pop()}`;
    context = context.p;
  }
  return {
    message:
      error.message +
      `
${component_stack}
`,
    stack: error.stack
      ?.split("\n")
      .filter((line) => !line.includes("svelte/src/internal"))
      .join("\n"),
  };
}
function apply_adjustments(error) {
  const adjusted = adjustments.get(error);
  if (adjusted) {
    define_property(error, "message", {
      value: adjusted.message,
    });
    define_property(error, "stack", {
      value: adjusted.stack,
    });
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/effects.js
function validate_effect(rune) {
  if (active_effect === null) {
    if (active_reaction === null) {
      effect_orphan(rune);
    }
    effect_in_unowned_derived();
  }
  if (is_destroying_effect) {
    effect_in_teardown(rune);
  }
}
function push_effect(effect2, parent_effect) {
  var parent_last = parent_effect.last;
  if (parent_last === null) {
    parent_effect.last = parent_effect.first = effect2;
  } else {
    parent_last.next = effect2;
    effect2.prev = parent_last;
    parent_effect.last = effect2;
  }
}
function create_effect(type, fn) {
  var parent = active_effect;
  if (dev_fallback_default) {
    while (parent !== null && (parent.f & EAGER_EFFECT) !== 0) {
      parent = parent.parent;
    }
  }
  if (parent !== null && (parent.f & INERT) !== 0) {
    type |= INERT;
  }
  var effect2 = {
    ctx: component_context,
    deps: null,
    nodes: null,
    f: type | DIRTY | CONNECTED,
    first: null,
    fn,
    last: null,
    next: null,
    parent,
    b: parent && parent.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null,
  };
  if (dev_fallback_default) {
    effect2.component_function = dev_current_component_function;
  }
  current_batch?.register_created_effect(effect2);
  var e = effect2;
  if ((type & EFFECT) !== 0) {
    if (collected_effects !== null) {
      collected_effects.push(effect2);
    } else {
      Batch.ensure().schedule(effect2);
    }
  } else if (fn !== null) {
    try {
      update_effect(effect2);
    } catch (e2) {
      destroy_effect(effect2);
      throw e2;
    }
    if (
      e.deps === null &&
      e.teardown === null &&
      e.nodes === null &&
      e.first === e.last && // either `null`, or a singular child
      (e.f & EFFECT_PRESERVED) === 0
    ) {
      e = e.first;
      if (
        (type & BLOCK_EFFECT) !== 0 &&
        (type & EFFECT_TRANSPARENT) !== 0 &&
        e !== null
      ) {
        e.f |= EFFECT_TRANSPARENT;
      }
    }
  }
  if (e !== null) {
    e.parent = parent;
    if (parent !== null) {
      push_effect(e, parent);
    }
    if (
      active_reaction !== null &&
      (active_reaction.f & DERIVED) !== 0 &&
      (type & ROOT_EFFECT) === 0
    ) {
      var derived3 =
        /** @type {Derived} */
        active_reaction;
      (derived3.effects ??= []).push(e);
    }
  }
  return effect2;
}
function effect_tracking() {
  return active_reaction !== null && !untracking;
}
function teardown(fn) {
  const effect2 = create_effect(RENDER_EFFECT, null);
  set_signal_status(effect2, CLEAN);
  effect2.teardown = fn;
  return effect2;
}
function user_effect(fn) {
  validate_effect("$effect");
  if (dev_fallback_default) {
    define_property(fn, "name", {
      value: "$effect",
    });
  }
  var flags2 =
    /** @type {Effect} */
    active_effect.f;
  var defer =
    !active_reaction &&
    (flags2 & BRANCH_EFFECT) !== 0 &&
    component_context !== null &&
    !component_context.i;
  if (defer) {
    var context =
      /** @type {ComponentContext} */
      component_context;
    (context.e ??= []).push(fn);
  } else {
    return create_user_effect(fn);
  }
}
function create_user_effect(fn) {
  return create_effect(EFFECT | USER_EFFECT, fn);
}
function effect_root(fn) {
  Batch.ensure();
  const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);
  return () => {
    destroy_effect(effect2);
  };
}
function component_root(fn) {
  Batch.ensure();
  const effect2 = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn);
  return (options = {}) => {
    return new Promise((fulfil) => {
      if (options.outro) {
        pause_effect(effect2, () => {
          destroy_effect(effect2);
          fulfil(void 0);
        });
      } else {
        destroy_effect(effect2);
        fulfil(void 0);
      }
    });
  };
}
function effect(fn) {
  return create_effect(EFFECT, fn);
}
function async_effect(fn) {
  return create_effect(ASYNC | EFFECT_PRESERVED, fn);
}
function render_effect(fn, flags2 = 0) {
  return create_effect(RENDER_EFFECT | flags2, fn);
}
function template_effect(fn, sync = [], async2 = [], blockers = []) {
  flatten(blockers, sync, async2, (values) => {
    create_effect(RENDER_EFFECT, () => {
      fn(...values.map(get));
    });
  });
}
function block(fn, flags2 = 0) {
  var effect2 = create_effect(BLOCK_EFFECT | flags2, fn);
  if (dev_fallback_default) {
    effect2.dev_stack = dev_stack;
  }
  return effect2;
}
function branch(fn) {
  return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn);
}
function execute_effect_teardown(effect2) {
  var teardown2 = effect2.teardown;
  if (teardown2 !== null) {
    const previously_destroying_effect = is_destroying_effect;
    const previous_reaction = active_reaction;
    set_is_destroying_effect(true);
    set_active_reaction(null);
    try {
      teardown2.call(null);
    } catch (error) {
      invoke_error_boundary(error, effect2.parent);
    } finally {
      set_is_destroying_effect(previously_destroying_effect);
      set_active_reaction(previous_reaction);
    }
  }
}
function destroy_effect_children(signal, remove_dom = false) {
  var effect2 = signal.first;
  signal.first = signal.last = null;
  while (effect2 !== null) {
    const controller = effect2.ac;
    if (controller !== null) {
      without_reactive_context(() => {
        controller.abort(STALE_REACTION);
      });
    }
    var next2 = effect2.next;
    if ((effect2.f & ROOT_EFFECT) !== 0) {
      effect2.parent = null;
    } else {
      destroy_effect(effect2, remove_dom);
    }
    effect2 = next2;
  }
}
function destroy_block_effect_children(signal) {
  var effect2 = signal.first;
  while (effect2 !== null) {
    var next2 = effect2.next;
    if ((effect2.f & BRANCH_EFFECT) === 0) {
      destroy_effect(effect2);
    }
    effect2 = next2;
  }
}
function destroy_effect(effect2, remove_dom = true) {
  var removed = false;
  if (
    (remove_dom || (effect2.f & HEAD_EFFECT) !== 0) &&
    effect2.nodes !== null &&
    effect2.nodes.end !== null
  ) {
    remove_effect_dom(
      effect2.nodes.start,
      /** @type {TemplateNode} */
      effect2.nodes.end,
    );
    removed = true;
  }
  effect2.f |= DESTROYING;
  destroy_effect_children(effect2, remove_dom && !removed);
  remove_reactions(effect2, 0);
  var transitions = effect2.nodes && effect2.nodes.t;
  if (transitions !== null) {
    for (const transition2 of transitions) {
      transition2.stop();
    }
  }
  execute_effect_teardown(effect2);
  effect2.f ^= DESTROYING;
  effect2.f |= DESTROYED;
  var parent = effect2.parent;
  if (parent !== null && parent.first !== null) {
    unlink_effect(effect2);
  }
  if (dev_fallback_default) {
    effect2.component_function = null;
  }
  effect2.next =
    effect2.prev =
    effect2.teardown =
    effect2.ctx =
    effect2.deps =
    effect2.fn =
    effect2.nodes =
    effect2.ac =
    effect2.b =
      null;
}
function remove_effect_dom(node, end) {
  while (node !== null) {
    var next2 = node === end ? null : get_next_sibling(node);
    node.remove();
    node = next2;
  }
}
function unlink_effect(effect2) {
  var parent = effect2.parent;
  var prev = effect2.prev;
  var next2 = effect2.next;
  if (prev !== null) prev.next = next2;
  if (next2 !== null) next2.prev = prev;
  if (parent !== null) {
    if (parent.first === effect2) parent.first = next2;
    if (parent.last === effect2) parent.last = prev;
  }
}
function pause_effect(effect2, callback, destroy = true) {
  var transitions = [];
  effect2.f |= PAUSED;
  pause_children(effect2, transitions, true);
  var fn = () => {
    if (destroy) destroy_effect(effect2);
    if (callback) callback();
  };
  var remaining = transitions.length;
  if (remaining > 0) {
    var check = () => --remaining || fn();
    for (var transition2 of transitions) {
      transition2.out(check);
    }
  } else {
    fn();
  }
}
function pause_children(effect2, transitions, local) {
  if ((effect2.f & INERT) !== 0) return;
  effect2.f ^= INERT;
  var t = effect2.nodes && effect2.nodes.t;
  if (t !== null) {
    for (const transition2 of t) {
      if (transition2.is_global || local) {
        transitions.push(transition2);
      }
    }
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    if ((child2.f & ROOT_EFFECT) === 0) {
      var transparent =
        (child2.f & EFFECT_TRANSPARENT) !== 0 || // If this is a branch effect without a block effect parent,
        // it means the parent block effect was pruned. In that case,
        // transparency information was transferred to the branch effect.
        ((child2.f & BRANCH_EFFECT) !== 0 && (effect2.f & BLOCK_EFFECT) !== 0);
      pause_children(child2, transitions, transparent ? local : false);
    }
    child2 = sibling2;
  }
}
function resume_effect(effect2) {
  effect2.f &= ~PAUSED;
  resume_children(effect2, true);
}
function resume_children(effect2, local) {
  if ((effect2.f & PAUSED) !== 0) return;
  if ((effect2.f & INERT) === 0) return;
  effect2.f ^= INERT;
  if ((effect2.f & CLEAN) === 0) {
    set_signal_status(effect2, DIRTY);
    Batch.ensure().schedule(effect2);
  }
  var child2 = effect2.first;
  while (child2 !== null) {
    var sibling2 = child2.next;
    var transparent =
      (child2.f & EFFECT_TRANSPARENT) !== 0 || (child2.f & BRANCH_EFFECT) !== 0;
    resume_children(child2, transparent ? local : false);
    child2 = sibling2;
  }
  var t = effect2.nodes && effect2.nodes.t;
  if (t !== null) {
    for (const transition2 of t) {
      if (transition2.is_global || local) {
        transition2.in();
      }
    }
  }
}
function move_effect(effect2, fragment) {
  if (!effect2.nodes) return;
  var node = effect2.nodes.start;
  var end = effect2.nodes.end;
  while (node !== null) {
    var next2 = node === end ? null : get_next_sibling(node);
    fragment.append(node);
    node = next2;
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/legacy.js
var captured_signals = null;

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/runtime.js
var is_destroying_effect = false;
function set_is_destroying_effect(value) {
  is_destroying_effect = value;
}
var active_reaction = null;
var untracking = false;
function set_active_reaction(reaction) {
  active_reaction = reaction;
}
var active_effect = null;
function set_active_effect(effect2) {
  active_effect = effect2;
}
var current_sources = null;
function push_reaction_value(value) {
  if (
    active_reaction !== null &&
    ((!async_mode_flag && (active_reaction.f & REACTION_IS_UPDATING) !== 0) ||
      (active_reaction.f & DERIVED) !== 0)
  ) {
    (current_sources ??= /* @__PURE__ */ new Set()).add(value);
  }
}
var new_deps = null;
var skipped_deps = 0;
var untracked_writes = null;
function set_untracked_writes(value) {
  untracked_writes = value;
}
var write_version = 1;
var read_version = 0;
var update_version = read_version;
function set_update_version(value) {
  update_version = value;
}
function increment_write_version() {
  return ++write_version;
}
function is_dirty(reaction) {
  var flags2 = reaction.f;
  if ((flags2 & DIRTY) !== 0) {
    return true;
  }
  if ((flags2 & MAYBE_DIRTY) !== 0) {
    var dependencies =
      /** @type {Value[]} */
      reaction.deps;
    var length = dependencies.length;
    for (var i = 0; i < length; i++) {
      var dependency = dependencies[i];
      if (
        is_dirty(
          /** @type {Derived} */
          dependency,
        )
      ) {
        update_derived(
          /** @type {Derived} */
          dependency,
        );
      }
      if (dependency.wv > reaction.wv) {
        return true;
      }
    }
    if (
      (flags2 & CONNECTED) !== 0 && // During time traveling we don't want to reset the status so that
      // traversal of the graph in the other batches still happens
      batch_values === null
    ) {
      set_signal_status(reaction, CLEAN);
    }
  }
  return false;
}
function schedule_possible_effect_self_invalidation(
  signal,
  effect2,
  root24 = true,
) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  if (
    !async_mode_flag &&
    current_sources !== null &&
    current_sources.has(signal)
  ) {
    return;
  }
  for (var i = 0; i < reactions.length; i++) {
    var reaction = reactions[i];
    if ((reaction.f & DERIVED) !== 0) {
      schedule_possible_effect_self_invalidation(
        /** @type {Derived} */
        reaction,
        effect2,
        false,
      );
    } else if (effect2 === reaction) {
      if (root24) {
        set_signal_status(reaction, DIRTY);
      } else if ((reaction.f & CLEAN) !== 0) {
        set_signal_status(reaction, MAYBE_DIRTY);
      }
      schedule_effect(
        /** @type {Effect} */
        reaction,
      );
    }
  }
}
function update_reaction(reaction) {
  var previous_deps = new_deps;
  var previous_skipped_deps = skipped_deps;
  var previous_untracked_writes = untracked_writes;
  var previous_reaction = active_reaction;
  var previous_sources = current_sources;
  var previous_component_context = component_context;
  var previous_untracking = untracking;
  var previous_update_version = update_version;
  var flags2 = reaction.f;
  new_deps = /** @type {null | Value[]} */ null;
  skipped_deps = 0;
  untracked_writes = null;
  active_reaction =
    (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
  current_sources = null;
  set_component_context(reaction.ctx);
  untracking = false;
  update_version = ++read_version;
  if (reaction.ac !== null) {
    without_reactive_context(() => {
      reaction.ac.abort(STALE_REACTION);
    });
    reaction.ac = null;
  }
  try {
    reaction.f |= REACTION_IS_UPDATING;
    var fn =
      /** @type {Function} */
      reaction.fn;
    var result = fn();
    reaction.f |= REACTION_RAN;
    var deps = update_dependencies(reaction);
    if (
      is_runes() &&
      untracked_writes !== null &&
      !untracking &&
      deps !== null &&
      (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0
    ) {
      for (
        var i = 0;
        i < /** @type {Source[]} */ untracked_writes.length;
        i++
      ) {
        schedule_possible_effect_self_invalidation(
          untracked_writes[i],
          /** @type {Effect} */
          reaction,
        );
      }
    }
    if (previous_reaction !== null && previous_reaction !== reaction) {
      read_version++;
      if (previous_reaction.deps !== null) {
        for (let i2 = 0; i2 < previous_skipped_deps; i2 += 1) {
          previous_reaction.deps[i2].rv = read_version;
        }
      }
      if (previous_deps !== null) {
        for (const dep of previous_deps) {
          dep.rv = read_version;
        }
      }
      if (untracked_writes !== null) {
        if (previous_untracked_writes === null) {
          previous_untracked_writes = untracked_writes;
        } else {
          previous_untracked_writes.push(
            .../** @type {Source[]} */
            untracked_writes,
          );
        }
      }
    }
    if ((reaction.f & ERROR_VALUE) !== 0) {
      reaction.f ^= ERROR_VALUE;
    }
    return result;
  } catch (error) {
    update_dependencies(reaction);
    return handle_error(error);
  } finally {
    reaction.f ^= REACTION_IS_UPDATING;
    new_deps = previous_deps;
    skipped_deps = previous_skipped_deps;
    untracked_writes = previous_untracked_writes;
    active_reaction = previous_reaction;
    current_sources = previous_sources;
    set_component_context(previous_component_context);
    untracking = previous_untracking;
    update_version = previous_update_version;
  }
}
function update_dependencies(reaction) {
  var deps = reaction.deps;
  var is_fork = current_batch?.is_fork;
  if (new_deps !== null) {
    var i;
    if (!is_fork) {
      remove_reactions(reaction, skipped_deps);
    }
    if (deps !== null && skipped_deps > 0) {
      deps.length = skipped_deps + new_deps.length;
      for (i = 0; i < new_deps.length; i++) {
        deps[skipped_deps + i] = new_deps[i];
      }
    } else {
      reaction.deps = deps = new_deps;
    }
    if (effect_tracking() && (reaction.f & CONNECTED) !== 0) {
      for (i = skipped_deps; i < deps.length; i++) {
        (deps[i].reactions ??= []).push(reaction);
      }
    }
  } else if (!is_fork && deps !== null && skipped_deps < deps.length) {
    remove_reactions(reaction, skipped_deps);
    deps.length = skipped_deps;
  }
  return deps;
}
function remove_reaction(signal, dependency) {
  let reactions = dependency.reactions;
  if (reactions !== null) {
    var index2 = index_of.call(reactions, signal);
    if (index2 !== -1) {
      var new_length = reactions.length - 1;
      if (new_length === 0) {
        reactions = dependency.reactions = null;
      } else {
        reactions[index2] = reactions[new_length];
        reactions.pop();
      }
    }
  }
  if (
    reactions === null &&
    (dependency.f & DERIVED) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
    // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
    // allows us to skip the expensive work of disconnecting and immediately reconnecting it
    (new_deps === null || !includes.call(new_deps, dependency))
  ) {
    var derived3 =
      /** @type {Derived} */
      dependency;
    if ((derived3.f & CONNECTED) !== 0) {
      derived3.f ^= CONNECTED;
    }
    if (derived3.v !== UNINITIALIZED) {
      update_derived_status(derived3);
    }
    if (derived3.ac !== null) {
      without_reactive_context(() => {
        derived3.ac.abort(STALE_REACTION);
        derived3.ac = null;
        set_signal_status(derived3, DIRTY);
      });
    }
    freeze_derived_effects(derived3);
    remove_reactions(derived3, 0);
  }
}
function remove_reactions(signal, start_index) {
  var dependencies = signal.deps;
  if (dependencies === null) return;
  for (var i = start_index; i < dependencies.length; i++) {
    remove_reaction(signal, dependencies[i]);
  }
}
function update_effect(effect2) {
  var flags2 = effect2.f;
  if ((flags2 & DESTROYED) !== 0) {
    return;
  }
  set_signal_status(effect2, CLEAN);
  var previous_effect = active_effect;
  active_effect = effect2;
  if (dev_fallback_default) {
    var previous_component_fn = dev_current_component_function;
    set_dev_current_component_function(effect2.component_function);
    var previous_stack =
      /** @type {any} */
      dev_stack;
    set_dev_stack(effect2.dev_stack ?? dev_stack);
  }
  try {
    if ((flags2 & (BLOCK_EFFECT | MANAGED_EFFECT)) !== 0) {
      destroy_block_effect_children(effect2);
    } else {
      destroy_effect_children(effect2);
    }
    execute_effect_teardown(effect2);
    var teardown2 = update_reaction(effect2);
    effect2.teardown = typeof teardown2 === "function" ? teardown2 : null;
    effect2.wv = write_version;
    if (
      dev_fallback_default &&
      tracing_mode_flag &&
      (effect2.f & DIRTY) !== 0 &&
      effect2.deps !== null
    ) {
      for (var dep of effect2.deps) {
        if (dep.set_during_effect) {
          dep.wv = increment_write_version();
          dep.set_during_effect = false;
        }
      }
    }
  } finally {
    active_effect = previous_effect;
    if (dev_fallback_default) {
      set_dev_current_component_function(previous_component_fn);
      set_dev_stack(previous_stack);
    }
  }
}
function get(signal) {
  var flags2 = signal.f;
  var is_derived = (flags2 & DERIVED) !== 0;
  captured_signals?.add(signal);
  if (active_reaction !== null && !untracking) {
    var destroyed =
      active_effect !== null && (active_effect.f & DESTROYED) !== 0;
    if (
      !destroyed &&
      (current_sources === null || !current_sources.has(signal))
    ) {
      var deps = active_reaction.deps;
      if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
        if (signal.rv < read_version) {
          signal.rv = read_version;
          if (
            new_deps === null &&
            deps !== null &&
            deps[skipped_deps] === signal
          ) {
            skipped_deps++;
          } else if (new_deps === null) {
            new_deps = [signal];
          } else {
            new_deps.push(signal);
          }
        }
      } else {
        active_reaction.deps ??= [];
        if (!includes.call(active_reaction.deps, signal)) {
          active_reaction.deps.push(signal);
        }
        var reactions = signal.reactions;
        if (reactions === null) {
          signal.reactions = [active_reaction];
        } else if (!includes.call(reactions, active_reaction)) {
          reactions.push(active_reaction);
        }
      }
    }
  }
  if (dev_fallback_default) {
    if (
      !untracking &&
      reactivity_loss_tracker && // By checking that current/previous batch are null we filter out false positives.
      // reactivity_loss_tracker is only reset after a microtask, so if a flush happens
      // before that, we get warnings for things we shouldn't warn on.
      current_batch === null &&
      previous_batch === null &&
      !reactivity_loss_tracker.warned &&
      (reactivity_loss_tracker.effect.f & REACTION_IS_UPDATING) === 0 &&
      !reactivity_loss_tracker.effect_deps.has(signal)
    ) {
      reactivity_loss_tracker.warned = true;
      await_reactivity_loss(
        /** @type {string} */
        signal.label,
      );
      var trace2 = get_error("traced at");
      if (trace2) console.warn(trace2);
    }
    recent_async_deriveds.delete(signal);
    if (
      tracing_mode_flag &&
      !untracking &&
      tracing_expressions !== null &&
      active_reaction !== null &&
      tracing_expressions.reaction === active_reaction
    ) {
      if (signal.trace) {
        signal.trace();
      } else {
        trace2 = get_error("traced at");
        if (trace2) {
          var entry = tracing_expressions.entries.get(signal);
          if (entry === void 0) {
            entry = { traces: [] };
            tracing_expressions.entries.set(signal, entry);
          }
          var last = entry.traces[entry.traces.length - 1];
          if (trace2.stack !== last?.stack) {
            entry.traces.push(trace2);
          }
        }
      }
    }
  }
  if (is_destroying_effect && old_values.has(signal)) {
    return old_values.get(signal);
  }
  if (is_derived) {
    var derived3 =
      /** @type {Derived} */
      signal;
    if (is_destroying_effect) {
      var value = derived3.v;
      if (
        ((derived3.f & CLEAN) === 0 && derived3.reactions !== null) ||
        depends_on_old_values(derived3)
      ) {
        value = execute_derived(derived3);
      }
      old_values.set(derived3, value);
      return value;
    }
    var should_connect =
      (derived3.f & CONNECTED) === 0 &&
      !untracking &&
      active_reaction !== null &&
      (active_reaction.f & CONNECTED) !== 0;
    var is_new = (derived3.f & REACTION_RAN) === 0;
    if (is_dirty(derived3)) {
      if (should_connect) {
        derived3.f |= CONNECTED;
      }
      update_derived(derived3);
    }
    if (should_connect && !is_new) {
      unfreeze_derived_effects(derived3);
      reconnect(derived3);
    }
  }
  if (batch_values?.has(signal)) {
    return batch_values.get(signal);
  }
  if ((signal.f & ERROR_VALUE) !== 0) {
    throw signal.v;
  }
  return signal.v;
}
function reconnect(derived3) {
  derived3.f |= CONNECTED;
  if (derived3.deps === null) return;
  for (const dep of derived3.deps) {
    var reactions = dep.reactions;
    if (reactions === null) {
      dep.reactions = [derived3];
    } else if (!includes.call(reactions, derived3)) {
      reactions.push(derived3);
    }
    if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
      unfreeze_derived_effects(
        /** @type {Derived} */
        dep,
      );
      reconnect(
        /** @type {Derived} */
        dep,
      );
    }
  }
}
function depends_on_old_values(derived3) {
  if (derived3.v === UNINITIALIZED) return true;
  if (derived3.deps === null) return false;
  for (const dep of derived3.deps) {
    if (old_values.has(dep)) {
      return true;
    }
    if (
      (dep.f & DERIVED) !== 0 &&
      depends_on_old_values(
        /** @type {Derived} */
        dep,
      )
    ) {
      return true;
    }
  }
  return false;
}
function untrack(fn) {
  var previous_untracking = untracking;
  try {
    untracking = true;
    return fn();
  } finally {
    untracking = previous_untracking;
  }
}
function deep_read_state(value) {
  if (typeof value !== "object" || !value || value instanceof EventTarget) {
    return;
  }
  if (STATE_SYMBOL in value) {
    deep_read(value);
  } else if (!Array.isArray(value)) {
    for (let key2 in value) {
      const prop2 = value[key2];
      if (typeof prop2 === "object" && prop2 && STATE_SYMBOL in prop2) {
        deep_read(prop2);
      }
    }
  }
}
function deep_read(value, visited = /* @__PURE__ */ new Set()) {
  if (
    typeof value === "object" &&
    value !== null && // We don't want to traverse DOM elements
    !(value instanceof EventTarget) &&
    !visited.has(value)
  ) {
    visited.add(value);
    if (value instanceof Date) {
      value.getTime();
    }
    for (let key2 in value) {
      try {
        deep_read(value[key2], visited);
      } catch (e) {}
    }
    const proto = get_prototype_of(value);
    if (
      proto !== Object.prototype &&
      proto !== Array.prototype &&
      proto !== Map.prototype &&
      proto !== Set.prototype &&
      proto !== Date.prototype
    ) {
      const descriptors = get_descriptors(proto);
      for (let key2 in descriptors) {
        const get3 = descriptors[key2].get;
        if (get3) {
          try {
            get3.call(value);
          } catch (e) {}
        }
      }
    }
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/utils.js
var DOM_BOOLEAN_ATTRIBUTES = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected",
  "webkitdirectory",
  "defer",
  "disablepictureinpicture",
  "disableremoteplayback",
];
var DOM_PROPERTIES = [
  ...DOM_BOOLEAN_ATTRIBUTES,
  "formNoValidate",
  "isMap",
  "noModule",
  "playsInline",
  "readOnly",
  "value",
  "volume",
  "defaultValue",
  "defaultChecked",
  "srcObject",
  "noValidate",
  "allowFullscreen",
  "disablePictureInPicture",
  "disableRemotePlayback",
];
var PASSIVE_EVENTS = ["touchstart", "touchmove"];
function is_passive_event(name) {
  return PASSIVE_EVENTS.includes(name);
}
var STATE_CREATION_RUNES =
  /** @type {const} */
  ["$state", "$state.raw", "$derived", "$derived.by"];
var RUNES =
  /** @type {const} */
  [
    ...STATE_CREATION_RUNES,
    "$state.eager",
    "$state.snapshot",
    "$props",
    "$props.id",
    "$bindable",
    "$effect",
    "$effect.pre",
    "$effect.tracking",
    "$effect.root",
    "$effect.pending",
    "$inspect",
    "$inspect().with",
    "$inspect.trace",
    "$host",
  ];

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dev/css.js
var all_styles = /* @__PURE__ */ new Map();
function register_style(hash2, style) {
  var styles2 = all_styles.get(hash2);
  if (!styles2) {
    styles2 = /* @__PURE__ */ new Set();
    all_styles.set(hash2, styles2);
  }
  styles2.add(style);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/events.js
var event_symbol = /* @__PURE__ */ Symbol("events");
var all_registered_events = /* @__PURE__ */ new Set();
var root_event_handles = /* @__PURE__ */ new Set();
function create_event(event_name, dom, handler, options = {}) {
  function target_handler(event2) {
    if (!options.capture) {
      handle_event_propagation.call(dom, event2);
    }
    if (!event2.cancelBubble) {
      return without_reactive_context(() => {
        return handler?.call(this, event2);
      });
    }
  }
  if (
    event_name.startsWith("pointer") ||
    event_name.startsWith("touch") ||
    event_name === "wheel"
  ) {
    target_handler.__removed = false;
    queue_micro_task(() => {
      if (!target_handler.__removed) {
        dom.addEventListener(event_name, target_handler, options);
      }
    });
  } else {
    dom.addEventListener(event_name, target_handler, options);
  }
  return target_handler;
}
function event(event_name, dom, handler, capture2, passive2) {
  var options = { capture: capture2, passive: passive2 };
  var target_handler = create_event(event_name, dom, handler, options);
  if (
    dom === document.body || // @ts-ignore
    dom === window || // @ts-ignore
    dom === document || // Firefox has quirky behavior, it can happen that we still get "canplay" events when the element is already removed
    dom instanceof HTMLMediaElement
  ) {
    teardown(() => {
      target_handler.__removed = true;
      dom.removeEventListener(event_name, target_handler, options);
    });
  }
}
function delegated(event_name, element2, handler) {
  (element2[event_symbol] ??= {})[event_name] = handler;
}
function delegate(events) {
  for (var i = 0; i < events.length; i++) {
    all_registered_events.add(events[i]);
  }
  for (var fn of root_event_handles) {
    fn(events);
  }
}
var last_propagated_event = null;
var last_propagated_event_clear_scheduled = false;
function handle_event_propagation(event2) {
  var handler_element = this;
  var owner_document =
    /** @type {Node} */
    handler_element.ownerDocument;
  var event_name = event2.type;
  var path = event2.composedPath?.() || [];
  var current_target =
    /** @type {null | Element} */
    path[0] || event2.target;
  last_propagated_event = event2;
  if (!last_propagated_event_clear_scheduled) {
    last_propagated_event_clear_scheduled = true;
    setTimeout(() => {
      last_propagated_event_clear_scheduled = false;
      last_propagated_event = null;
    });
  }
  var path_idx = 0;
  var handled_at = last_propagated_event === event2 && event2[event_symbol];
  if (handled_at) {
    var at_idx = path.indexOf(handled_at);
    if (
      at_idx !== -1 &&
      (handler_element === document ||
        handler_element === /** @type {any} */ window)
    ) {
      event2[event_symbol] = handler_element;
      return;
    }
    var handler_idx = path.indexOf(handler_element);
    if (handler_idx === -1) {
      return;
    }
    if (at_idx <= handler_idx) {
      path_idx = at_idx;
    }
  }
  current_target = /** @type {Element} */ path[path_idx] || event2.target;
  if (current_target === handler_element) return;
  define_property(event2, "currentTarget", {
    configurable: true,
    get() {
      return current_target || owner_document;
    },
  });
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    var throw_error;
    var other_errors = [];
    while (current_target !== null) {
      if (current_target === handler_element) break;
      try {
        var delegated2 = current_target[event_symbol]?.[event_name];
        if (
          delegated2 != null &&
          (!(/** @type {any} */ current_target.disabled) || // DOM could've been updated already by the time this is reached, so we check this as well
            // -> the target could not have been disabled because it emits the event in the first place
            event2.target === current_target)
        ) {
          delegated2.call(current_target, event2);
        }
      } catch (error) {
        if (throw_error) {
          other_errors.push(error);
        } else {
          throw_error = error;
        }
      }
      if (event2.cancelBubble) break;
      path_idx++;
      current_target =
        path_idx < path.length
          ? /** @type {Element} */
            path[path_idx]
          : null;
    }
    if (throw_error) {
      for (let error of other_errors) {
        queueMicrotask(() => {
          throw error;
        });
      }
      throw throw_error;
    }
  } finally {
    event2[event_symbol] = handler_element;
    delete event2.currentTarget;
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/reconciler.js
var policy =
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  globalThis?.window?.trustedTypes &&
  /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy(
    "svelte-trusted-html",
    {
      /** @param {string} html */
      createHTML: (html2) => {
        return html2;
      },
    },
  );
function create_trusted_html(html2) {
  return (
    /** @type {string} */
    policy?.createHTML(html2) ?? html2
  );
}
function create_fragment_from_html(html2) {
  var elem = create_element("template");
  elem.innerHTML = create_trusted_html(html2.replaceAll("<!>", "<!---->"));
  return elem.content;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/template.js
function assign_nodes(start, end) {
  var effect2 =
    /** @type {Effect} */
    active_effect;
  if (effect2.nodes === null) {
    effect2.nodes = { start, end, a: null, t: null };
  }
}
// @__NO_SIDE_EFFECTS__
function from_html(content, flags2) {
  var is_fragment = (flags2 & TEMPLATE_FRAGMENT) !== 0;
  var use_import_node = (flags2 & TEMPLATE_USE_IMPORT_NODE) !== 0;
  var node;
  var has_start = !content.startsWith("<!>");
  return () => {
    if (hydrating) {
      assign_nodes(hydrate_node, null);
      return hydrate_node;
    }
    if (node === void 0) {
      node = create_fragment_from_html(has_start ? content : "<!>" + content);
      if (!is_fragment)
        node = /** @type {TemplateNode} */ get_first_child(node);
    }
    var clone =
      /** @type {TemplateNode} */
      use_import_node || is_firefox
        ? document.importNode(node, true)
        : node.cloneNode(true);
    if (is_fragment) {
      var start =
        /** @type {TemplateNode} */
        get_first_child(clone);
      var end =
        /** @type {TemplateNode} */
        clone.lastChild;
      assign_nodes(start, end);
    } else {
      assign_nodes(clone, clone);
    }
    return clone;
  };
}
function text(value = "") {
  if (!hydrating) {
    var t = create_text(value + "");
    assign_nodes(t, t);
    return t;
  }
  var node = hydrate_node;
  if (node.nodeType !== TEXT_NODE) {
    node.before((node = create_text()));
    set_hydrate_node(node);
  } else {
    merge_text_nodes(
      /** @type {Text} */
      node,
    );
  }
  assign_nodes(node, node);
  return node;
}
function comment() {
  if (hydrating) {
    assign_nodes(hydrate_node, null);
    return hydrate_node;
  }
  var frag = document.createDocumentFragment();
  var start = document.createComment("");
  var anchor = create_text();
  frag.append(start, anchor);
  assign_nodes(start, anchor);
  return frag;
}
function append(anchor, dom) {
  if (hydrating) {
    var effect2 =
      /** @type {Effect & { nodes: EffectNodes }} */
      active_effect;
    if ((effect2.f & REACTION_RAN) === 0 || effect2.nodes.end === null) {
      effect2.nodes.end = hydrate_node;
    }
    hydrate_next();
    return;
  }
  if (anchor === null) {
    return;
  }
  anchor.before(
    /** @type {Node} */
    dom,
  );
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/reactivity/create-subscriber.js
function createSubscriber(start) {
  let subscribers = 0;
  let version = source(0);
  let stop;
  if (dev_fallback_default) {
    tag(version, "createSubscriber version");
  }
  return () => {
    if (effect_tracking()) {
      get(version);
      render_effect(() => {
        if (subscribers === 0) {
          stop = untrack(() => start(() => increment(version)));
        }
        subscribers += 1;
        return () => {
          queue_micro_task(() => {
            subscribers -= 1;
            if (subscribers === 0) {
              stop?.();
              stop = void 0;
              increment(version);
            }
          });
        };
      });
    }
  };
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/boundary.js
var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED;
function boundary(node, props, children, transform_error) {
  new Boundary(node, props, children, transform_error);
}
var Boundary = class {
  /** @type {Boundary | null} */
  parent;
  is_pending = false;
  /**
   * API-level transformError transform function. Transforms errors before they reach the `failed` snippet.
   * Inherited from parent boundary, or defaults to identity.
   * @type {(error: unknown) => unknown}
   */
  transform_error;
  /** @type {TemplateNode} */
  #anchor;
  /** @type {TemplateNode | null} */
  #hydrate_open = hydrating ? hydrate_node : null;
  /** @type {BoundaryProps} */
  #props;
  /** @type {((anchor: Node) => void)} */
  #children;
  /** @type {Effect} */
  #effect;
  /** @type {Effect | null} */
  #main_effect = null;
  /** @type {Effect | null} */
  #pending_effect = null;
  /** @type {Effect | null} */
  #failed_effect = null;
  /** @type {DocumentFragment | null} */
  #offscreen_fragment = null;
  #local_pending_count = 0;
  #pending_count = 0;
  #pending_count_update_queued = false;
  /** @type {Set<Effect>} */
  #dirty_effects = /* @__PURE__ */ new Set();
  /** @type {Set<Effect>} */
  #maybe_dirty_effects = /* @__PURE__ */ new Set();
  /**
   * A source containing the number of pending async deriveds/expressions.
   * Only created if `$effect.pending()` is used inside the boundary,
   * otherwise updating the source results in needless `Batch.ensure()`
   * calls followed by no-op flushes
   * @type {Source<number> | null}
   */
  #effect_pending = null;
  #effect_pending_subscriber = createSubscriber(() => {
    this.#effect_pending = source(this.#local_pending_count);
    if (dev_fallback_default) {
      tag(this.#effect_pending, "$effect.pending()");
    }
    return () => {
      this.#effect_pending = null;
    };
  });
  /**
   * @param {TemplateNode} node
   * @param {BoundaryProps} props
   * @param {((anchor: Node) => void)} children
   * @param {((error: unknown) => unknown) | undefined} [transform_error]
   */
  constructor(node, props, children, transform_error) {
    this.#anchor = node;
    this.#props = props;
    this.#children = (anchor) => {
      var effect2 =
        /** @type {Effect} */
        active_effect;
      effect2.b = this;
      effect2.f |= BOUNDARY_EFFECT;
      children(anchor);
    };
    this.parent = /** @type {Effect} */ active_effect.b;
    this.transform_error =
      transform_error ?? this.parent?.transform_error ?? ((e) => e);
    this.#effect = block(() => {
      if (hydrating) {
        const comment_data = read_hydration_instruction(
          /** @type {TemplateNode} */
          this.#hydrate_open,
        );
        hydrate_next();
        const server_rendered_pending = comment_data === HYDRATION_START_ELSE;
        const server_rendered_failed = comment_data.startsWith(
          HYDRATION_START_FAILED,
        );
        if (server_rendered_failed) {
          const serialized_error = JSON.parse(
            comment_data.slice(HYDRATION_START_FAILED.length),
          );
          this.#hydrate_failed_content(serialized_error);
        } else if (server_rendered_pending) {
          this.#hydrate_pending_content();
        } else {
          this.#hydrate_resolved_content();
        }
      } else {
        this.#render();
      }
    }, flags);
    if (hydrating) {
      this.#anchor = hydrate_node;
    }
  }
  #hydrate_resolved_content() {
    try {
      this.#main_effect = branch(() => this.#children(this.#anchor));
    } catch (error) {
      this.error(error);
    }
  }
  /**
   * @param {unknown} error The deserialized error from the server's hydration comment
   */
  #hydrate_failed_content(error) {
    const failed = this.#props.failed;
    const { reset: reset2, invoke_onerror } = this.#create_reset(error);
    queue_micro_task(invoke_onerror);
    if (!failed) return;
    this.#failed_effect = branch(() => {
      failed(
        this.#anchor,
        () => error,
        () => reset2,
      );
    });
  }
  /**
   * Creates the `reset` function for a failed boundary, along with a function
   * that invokes `onerror` with it (if provided)
   * @param {unknown} error
   * @returns {{ reset: () => void, invoke_onerror: () => void }}
   */
  #create_reset(error) {
    var did_reset = false;
    var calling_on_error = false;
    const reset2 = () => {
      if (this.#is_destroyed()) return;
      if (did_reset) {
        svelte_boundary_reset_noop();
        return;
      }
      did_reset = true;
      if (calling_on_error) {
        svelte_boundary_reset_onerror();
      }
      if (this.#failed_effect !== null) {
        pause_effect(this.#failed_effect, () => {
          this.#failed_effect = null;
        });
      }
      this.#run(() => {
        this.#render();
      });
    };
    const invoke_onerror = () => {
      if (this.#is_destroyed()) return;
      try {
        calling_on_error = true;
        this.#props.onerror?.(error, reset2);
        calling_on_error = false;
      } catch (err) {
        invoke_error_boundary(err, this.#effect && this.#effect.parent);
      }
    };
    return { reset: reset2, invoke_onerror };
  }
  #is_destroyed() {
    return (this.#effect.f & (DESTROYED | DESTROYING)) !== 0;
  }
  #hydrate_pending_content() {
    const pending2 = this.#props.pending;
    if (!pending2) return;
    this.is_pending = true;
    this.#pending_effect = branch(() => pending2(this.#anchor));
    queue_micro_task(() => {
      if (this.#is_destroyed()) return;
      var fragment = (this.#offscreen_fragment =
        document.createDocumentFragment());
      var anchor = create_text();
      var handled = false;
      fragment.append(anchor);
      this.#main_effect = this.#run(() => {
        try {
          return branch(() => this.#children(anchor));
        } catch (error) {
          try {
            this.error(error);
            handled = true;
          } catch (error2) {
            invoke_error_boundary(error2, this.#effect.parent);
          }
          return null;
        }
      });
      if (this.#main_effect === null) {
        this.#offscreen_fragment = null;
        if (handled)
          this.#resolve(
            /** @type {Batch} */
            current_batch,
          );
        return;
      }
      if (this.#pending_count === 0) {
        this.#anchor.before(fragment);
        this.#offscreen_fragment = null;
        pause_effect(
          /** @type {Effect} */
          this.#pending_effect,
          () => {
            this.#pending_effect = null;
          },
        );
        this.#resolve(
          /** @type {Batch} */
          current_batch,
        );
      }
    });
  }
  #render() {
    try {
      this.is_pending = this.has_pending_snippet();
      this.#pending_count = 0;
      this.#local_pending_count = 0;
      this.#main_effect = branch(() => {
        this.#children(this.#anchor);
      });
      if (this.#pending_count > 0) {
        var fragment = (this.#offscreen_fragment =
          document.createDocumentFragment());
        move_effect(this.#main_effect, fragment);
        const pending2 =
          /** @type {(anchor: Node) => void} */
          this.#props.pending;
        this.#pending_effect = branch(() => pending2(this.#anchor));
      } else {
        this.#resolve(
          /** @type {Batch} */
          current_batch,
        );
      }
    } catch (error) {
      this.error(error);
    }
  }
  /**
   * @param {Batch} batch
   */
  #resolve(batch) {
    this.is_pending = false;
    batch.transfer_effects(this.#dirty_effects, this.#maybe_dirty_effects);
  }
  /**
   * Defer an effect inside a pending boundary until the boundary resolves
   * @param {Effect} effect
   */
  defer_effect(effect2) {
    defer_effect(effect2, this.#dirty_effects, this.#maybe_dirty_effects);
  }
  /**
   * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
   * @returns {boolean}
   */
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!this.#props.pending;
  }
  /**
   * @template T
   * @param {() => T} fn
   */
  #run(fn) {
    var previous_effect = active_effect;
    var previous_reaction = active_reaction;
    var previous_ctx = component_context;
    set_active_effect(this.#effect);
    set_active_reaction(this.#effect);
    set_component_context(this.#effect.ctx);
    try {
      Batch.ensure();
      return fn();
    } finally {
      set_active_effect(previous_effect);
      set_active_reaction(previous_reaction);
      set_component_context(previous_ctx);
    }
  }
  /**
   * Updates the pending count associated with the currently visible pending snippet,
   * if any, such that we can replace the snippet with content once work is done
   * @param {1 | -1} d
   * @param {Batch} batch
   */
  #update_pending_count(d, batch) {
    if (!this.has_pending_snippet()) {
      if (this.parent) {
        this.parent.#update_pending_count(d, batch);
      }
      return;
    }
    this.#pending_count += d;
    if (this.#pending_count === 0) {
      this.#resolve(batch);
      if (this.#pending_effect) {
        pause_effect(this.#pending_effect, () => {
          this.#pending_effect = null;
        });
      }
      if (this.#offscreen_fragment) {
        this.#anchor.before(this.#offscreen_fragment);
        this.#offscreen_fragment = null;
      }
    }
  }
  /**
   * Update the source that powers `$effect.pending()` inside this boundary,
   * and controls when the current `pending` snippet (if any) is removed.
   * Do not call from inside the class
   * @param {1 | -1} d
   * @param {Batch} batch
   */
  update_pending_count(d, batch) {
    this.#update_pending_count(d, batch);
    this.#local_pending_count += d;
    if (!this.#effect_pending || this.#pending_count_update_queued) return;
    this.#pending_count_update_queued = true;
    queue_micro_task(() => {
      this.#pending_count_update_queued = false;
      if (this.#effect_pending) {
        internal_set(this.#effect_pending, this.#local_pending_count);
      }
    });
  }
  get_effect_pending() {
    this.#effect_pending_subscriber();
    return get(
      /** @type {Source<number>} */
      this.#effect_pending,
    );
  }
  /** @param {unknown} error */
  error(error) {
    if (error === HYDRATION_ERROR) {
      throw error;
    }
    if (!this.#props.onerror && !this.#props.failed) {
      throw error;
    }
    if (current_batch?.is_fork) {
      if (this.#main_effect) current_batch.skip_effect(this.#main_effect);
      if (this.#pending_effect) current_batch.skip_effect(this.#pending_effect);
      if (this.#failed_effect) current_batch.skip_effect(this.#failed_effect);
      current_batch.oncommit(() => {
        if (!this.#is_destroyed()) this.#handle_error(error);
      });
    } else {
      this.#handle_error(error);
    }
  }
  /**
   * @param {unknown} error
   */
  #handle_error(error) {
    if (this.#main_effect) {
      destroy_effect(this.#main_effect);
      this.#main_effect = null;
    }
    if (this.#pending_effect) {
      destroy_effect(this.#pending_effect);
      this.#pending_effect = null;
    }
    if (this.#failed_effect) {
      destroy_effect(this.#failed_effect);
      this.#failed_effect = null;
    }
    if (hydrating) {
      set_hydrate_node(
        /** @type {TemplateNode} */
        this.#hydrate_open,
      );
      next();
      set_hydrate_node(skip_nodes());
    }
    let failed = this.#props.failed;
    const handle_error_result = (transformed_error) => {
      if (this.#is_destroyed()) return;
      const { reset: reset2, invoke_onerror } =
        this.#create_reset(transformed_error);
      invoke_onerror();
      if (failed && !this.#is_destroyed()) {
        this.#failed_effect = this.#run(() => {
          try {
            return branch(() => {
              var effect2 =
                /** @type {Effect} */
                active_effect;
              effect2.b = this;
              effect2.f |= BOUNDARY_EFFECT;
              failed(
                this.#anchor,
                () => transformed_error,
                () => reset2,
              );
            });
          } catch (error2) {
            invoke_error_boundary(
              error2,
              /** @type {Effect} */
              this.#effect.parent,
            );
            return null;
          }
        });
      }
    };
    queue_micro_task(() => {
      if (this.#is_destroyed()) return;
      var result;
      try {
        result = this.transform_error(error);
      } catch (e) {
        invoke_error_boundary(e, this.#effect && this.#effect.parent);
        return;
      }
      if (
        result !== null &&
        typeof result === "object" &&
        typeof (/** @type {any} */ result.then) === "function"
      ) {
        result.then(
          handle_error_result,
          /** @param {unknown} e */
          (e) => invoke_error_boundary(e, this.#effect && this.#effect.parent),
        );
      } else {
        handle_error_result(result);
      }
    });
  }
};

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/render.js
var should_intro = true;
function set_text(text2, value) {
  var str = value == null ? "" : typeof value === "object" ? `${value}` : value;
  if (str !== /** @type {any} */ (text2[TEXT_CACHE] ??= text2.nodeValue)) {
    text2[TEXT_CACHE] = str;
    text2.nodeValue = `${str}`;
  }
}
function mount(component2, options) {
  return _mount(component2, options);
}
function hydrate(component2, options) {
  init_operations();
  options.intro = options.intro ?? false;
  const target = options.target;
  const was_hydrating = hydrating;
  const previous_hydrate_node = hydrate_node;
  try {
    var anchor = get_first_child(target);
    while (
      anchor &&
      (anchor.nodeType !== COMMENT_NODE ||
        /** @type {Comment} */
        anchor.data !== HYDRATION_START)
    ) {
      anchor = get_next_sibling(anchor);
    }
    if (!anchor) {
      throw HYDRATION_ERROR;
    }
    set_hydrating(true);
    set_hydrate_node(
      /** @type {Comment} */
      anchor,
    );
    const instance = _mount(component2, { ...options, anchor });
    set_hydrating(false);
    return (
      /**  @type {Exports} */
      instance
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message
        .split("\n")
        .some((line) => line.startsWith("https://svelte.dev/e/"))
    ) {
      throw error;
    }
    if (error !== HYDRATION_ERROR) {
      console.warn("Failed to hydrate: ", error);
    }
    if (options.recover === false) {
      hydration_failed();
    }
    init_operations();
    clear_text_content(target);
    set_hydrating(false);
    return mount(component2, options);
  } finally {
    set_hydrating(was_hydrating);
    set_hydrate_node(previous_hydrate_node);
  }
}
var listeners = /* @__PURE__ */ new Map();
function _mount(
  Component,
  { target, anchor, props = {}, events, context, intro = true, transformError },
) {
  init_operations();
  var component2 = void 0;
  var unmount2 = component_root(() => {
    var anchor_node = anchor ?? target.appendChild(create_text());
    boundary(
      /** @type {TemplateNode} */
      anchor_node,
      {
        pending: () => {},
      },
      (anchor_node2) => {
        push({});
        var ctx =
          /** @type {ComponentContext} */
          component_context;
        if (context) ctx.c = context;
        if (events) {
          props.$$events = events;
        }
        if (hydrating) {
          assign_nodes(
            /** @type {TemplateNode} */
            anchor_node2,
            null,
          );
        }
        should_intro = intro;
        component2 = Component(anchor_node2, props) || mark_as_component();
        should_intro = true;
        if (hydrating) {
          active_effect.nodes.end = hydrate_node;
          if (
            hydrate_node === null ||
            hydrate_node.nodeType !== COMMENT_NODE ||
            /** @type {Comment} */
            hydrate_node.data !== HYDRATION_END
          ) {
            hydration_mismatch();
            throw HYDRATION_ERROR;
          }
        }
        pop();
      },
      transformError,
    );
    var registered_events = /* @__PURE__ */ new Set();
    var event_handle = (events2) => {
      for (var i = 0; i < events2.length; i++) {
        var event_name = events2[i];
        if (registered_events.has(event_name)) continue;
        registered_events.add(event_name);
        var passive2 = is_passive_event(event_name);
        for (const node of [target, document]) {
          var counts = listeners.get(node);
          if (counts === void 0) {
            counts = /* @__PURE__ */ new Map();
            listeners.set(node, counts);
          }
          var count = counts.get(event_name);
          if (count === void 0) {
            node.addEventListener(event_name, handle_event_propagation, {
              passive: passive2,
            });
            counts.set(event_name, 1);
          } else {
            counts.set(event_name, count + 1);
          }
        }
      }
    };
    event_handle(array_from(all_registered_events));
    root_event_handles.add(event_handle);
    return () => {
      for (var event_name of registered_events) {
        for (const node of [target, document]) {
          var counts =
            /** @type {Map<string, number>} */
            listeners.get(node);
          var count =
            /** @type {number} */
            counts.get(event_name);
          if (--count == 0) {
            node.removeEventListener(event_name, handle_event_propagation);
            counts.delete(event_name);
            if (counts.size === 0) {
              listeners.delete(node);
            }
          } else {
            counts.set(event_name, count);
          }
        }
      }
      root_event_handles.delete(event_handle);
      if (anchor_node !== anchor) {
        anchor_node.parentNode?.removeChild(anchor_node);
      }
    };
  });
  mounted_components.set(component2, unmount2);
  return component2;
}
var mounted_components = /* @__PURE__ */ new WeakMap();
function unmount(component2, options) {
  const fn = mounted_components.get(component2);
  if (fn) {
    mounted_components.delete(component2);
    return fn(options);
  }
  if (dev_fallback_default) {
    lifecycle_double_unmount();
  }
  return Promise.resolve();
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/branches.js
var BranchManager = class {
  /** @type {TemplateNode} */
  anchor;
  /** @type {Map<Batch, Key>} */
  #batches = /* @__PURE__ */ new Map();
  /**
   * Map of keys to effects that are currently rendered in the DOM.
   * These effects are visible and actively part of the document tree.
   * Example:
   * ```
   * {#if condition}
   * 	foo
   * {:else}
   * 	bar
   * {/if}
   * ```
   * Can result in the entries `true->Effect` and `false->Effect`
   * @type {Map<Key, Effect>}
   */
  #onscreen = /* @__PURE__ */ new Map();
  /**
   * Similar to #onscreen with respect to the keys, but contains branches that are not yet
   * in the DOM, because their insertion is deferred.
   * @type {Map<Key, Branch>}
   */
  #offscreen = /* @__PURE__ */ new Map();
  /**
   * Keys of effects that are currently outroing
   * @type {Set<Key>}
   */
  #outroing = /* @__PURE__ */ new Set();
  /**
   * Whether to pause (i.e. outro) on change, or destroy immediately.
   * This is necessary for `<svelte:element>`
   */
  #transition = true;
  /**
   * @param {TemplateNode} anchor
   * @param {boolean} transition
   */
  constructor(anchor, transition2 = true) {
    this.anchor = anchor;
    this.#transition = transition2;
  }
  /**
   * @param {Batch} batch
   */
  #commit = (batch) => {
    if (!this.#batches.has(batch)) return;
    var key2 =
      /** @type {Key} */
      this.#batches.get(batch);
    var onscreen = this.#onscreen.get(key2);
    if (onscreen) {
      resume_effect(onscreen);
      this.#outroing.delete(key2);
    } else {
      var offscreen = this.#offscreen.get(key2);
      if (offscreen) {
        resume_effect(offscreen.effect);
        this.#onscreen.set(key2, offscreen.effect);
        this.#offscreen.delete(key2);
        if (dev_fallback_default) {
          offscreen.fragment.lastChild[HMR_ANCHOR] = this.anchor;
        }
        offscreen.fragment.lastChild.remove();
        this.anchor.before(offscreen.fragment);
        onscreen = offscreen.effect;
      }
    }
    for (const [b, k] of this.#batches) {
      this.#batches.delete(b);
      if (b === batch) {
        break;
      }
      const offscreen2 = this.#offscreen.get(k);
      if (offscreen2) {
        destroy_effect(offscreen2.effect);
        this.#offscreen.delete(k);
      }
    }
    for (const [k, effect2] of this.#onscreen) {
      if (k === key2 || this.#outroing.has(k)) continue;
      const on_destroy = () => {
        const keys = Array.from(this.#batches.values());
        if (keys.includes(k)) {
          var fragment = document.createDocumentFragment();
          move_effect(effect2, fragment);
          fragment.append(create_text());
          this.#offscreen.set(k, { effect: effect2, fragment });
        } else {
          destroy_effect(effect2);
        }
        this.#outroing.delete(k);
        this.#onscreen.delete(k);
      };
      if (this.#transition || !onscreen) {
        this.#outroing.add(k);
        pause_effect(effect2, on_destroy, false);
      } else {
        on_destroy();
      }
    }
  };
  /**
   * @param {Batch} batch
   */
  #discard = (batch) => {
    this.#batches.delete(batch);
    const keys = Array.from(this.#batches.values());
    for (const [k, branch2] of this.#offscreen) {
      if (!keys.includes(k)) {
        destroy_effect(branch2.effect);
        this.#offscreen.delete(k);
      }
    }
  };
  /**
   *
   * @param {any} key
   * @param {null | ((target: TemplateNode) => void)} fn
   */
  ensure(key2, fn) {
    var batch =
      /** @type {Batch} */
      current_batch;
    var defer = should_defer_append();
    if (fn && !this.#onscreen.has(key2) && !this.#offscreen.has(key2)) {
      if (defer) {
        var fragment = document.createDocumentFragment();
        var target = create_text();
        fragment.append(target);
        this.#offscreen.set(key2, {
          effect: branch(() => fn(target)),
          fragment,
        });
      } else {
        this.#onscreen.set(
          key2,
          branch(() => fn(this.anchor)),
        );
      }
    }
    this.#batches.set(batch, key2);
    if (defer) {
      for (const [k, effect2] of this.#onscreen) {
        if (k === key2) {
          batch.unskip_effect(effect2);
        } else {
          batch.skip_effect(effect2);
        }
      }
      for (const [k, branch2] of this.#offscreen) {
        if (k === key2) {
          batch.unskip_effect(branch2.effect);
        } else {
          batch.skip_effect(branch2.effect);
        }
      }
      batch.oncommit(this.#commit);
      batch.ondiscard(this.#discard);
    } else {
      if (hydrating) {
        this.anchor = hydrate_node;
      }
      this.#commit(batch);
    }
  }
};

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/if.js
function if_block(node, fn, elseif = false) {
  var marker;
  if (hydrating) {
    marker = hydrate_node;
    hydrate_next();
  }
  var branches = new BranchManager(node);
  var flags2 = elseif ? EFFECT_TRANSPARENT : 0;
  function update_branch(key2, fn2) {
    if (hydrating) {
      var data = read_hydration_instruction(
        /** @type {TemplateNode} */
        marker,
      );
      if (key2 !== parseInt(data.substring(1))) {
        var anchor = skip_nodes();
        set_hydrate_node(anchor);
        branches.anchor = anchor;
        set_hydrating(false);
        branches.ensure(key2, fn2);
        set_hydrating(true);
        return;
      }
    }
    branches.ensure(key2, fn2);
  }
  block(() => {
    var has_branch = false;
    fn((fn2, key2 = 0) => {
      has_branch = true;
      update_branch(key2, fn2);
    });
    if (!has_branch) {
      update_branch(-1, null);
    }
  }, flags2);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/key.js
var NAN = /* @__PURE__ */ Symbol("NaN");
function key(node, get_key, render_fn) {
  if (hydrating) {
    hydrate_next();
  }
  var branches = new BranchManager(node);
  var legacy = !is_runes();
  block(() => {
    var key2 = get_key();
    if (key2 !== key2) {
      key2 = /** @type {any} */ NAN;
    }
    if (legacy && key2 !== null && typeof key2 === "object") {
      key2 = /** @type {V} */ {};
    }
    branches.ensure(key2, render_fn);
  });
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/each.js
function index(_, i) {
  return i;
}
function pause_effects(state2, to_destroy, controlled_anchor) {
  var transitions = [];
  var length = to_destroy.length;
  var group;
  var remaining = to_destroy.length;
  for (var i = 0; i < length; i++) {
    let effect2 = to_destroy[i];
    pause_effect(
      effect2,
      () => {
        if (group) {
          group.pending.delete(effect2);
          group.done.add(effect2);
          if (group.pending.size === 0) {
            var groups =
              /** @type {Set<EachOutroGroup>} */
              state2.outrogroups;
            destroy_effects(state2, array_from(group.done));
            groups.delete(group);
            if (groups.size === 0) {
              state2.outrogroups = null;
            }
          }
        } else {
          remaining -= 1;
        }
      },
      false,
    );
  }
  if (remaining === 0) {
    var fast_path =
      transitions.length === 0 &&
      controlled_anchor !== null &&
      state2.pending.size === 0;
    if (fast_path) {
      var anchor =
        /** @type {Element} */
        controlled_anchor;
      var parent_node =
        /** @type {Element} */
        anchor.parentNode;
      clear_text_content(parent_node);
      parent_node.append(anchor);
      state2.items.clear();
    }
    destroy_effects(state2, to_destroy, !fast_path);
  } else {
    group = {
      pending: new Set(to_destroy),
      done: /* @__PURE__ */ new Set(),
    };
    (state2.outrogroups ??= /* @__PURE__ */ new Set()).add(group);
  }
}
function destroy_effects(state2, to_destroy, remove_dom = true) {
  var preserved_effects;
  if (state2.pending.size > 0) {
    preserved_effects = /* @__PURE__ */ new Set();
    for (const keys of state2.pending.values()) {
      for (const key2 of keys) {
        preserved_effects.add(
          /** @type {EachItem} */
          state2.items.get(key2).e,
        );
      }
    }
  }
  for (var i = 0; i < to_destroy.length; i++) {
    var e = to_destroy[i];
    if (preserved_effects?.has(e)) {
      e.f |= EFFECT_OFFSCREEN;
      const fragment = document.createDocumentFragment();
      move_effect(e, fragment);
    } else {
      destroy_effect(to_destroy[i], remove_dom);
    }
  }
}
var offscreen_anchor;
function each(
  node,
  flags2,
  get_collection,
  get_key,
  render_fn,
  fallback_fn = null,
) {
  var anchor = node;
  var items = /* @__PURE__ */ new Map();
  var is_controlled = (flags2 & EACH_IS_CONTROLLED) !== 0;
  if (is_controlled) {
    var parent_node =
      /** @type {Element} */
      node;
    anchor = hydrating
      ? set_hydrate_node(get_first_child(parent_node))
      : parent_node.appendChild(create_text());
  }
  if (hydrating) {
    hydrate_next();
  }
  var fallback2 = null;
  var each_array = derived_safe_equal(() => {
    var collection = get_collection();
    return (
      /** @type {V[]} */
      is_array(collection)
        ? collection
        : collection == null
          ? []
          : array_from(collection)
    );
  });
  if (dev_fallback_default) {
    tag(each_array, "{#each ...}");
  }
  var pending2 = /* @__PURE__ */ new Map();
  var first_run = true;
  function commit(batch) {
    if ((state2.effect.f & DESTROYED) !== 0) {
      return;
    }
    state2.pending.delete(batch);
    var array = get(each_array);
    state2.fallback = fallback2;
    reconcile(state2, array, anchor, flags2, get_key);
    if (fallback2 !== null) {
      if (array.length === 0) {
        if ((fallback2.f & EFFECT_OFFSCREEN) === 0) {
          resume_effect(fallback2);
        } else {
          fallback2.f ^= EFFECT_OFFSCREEN;
          move(fallback2, null, anchor);
        }
      } else {
        pause_effect(fallback2, () => {
          fallback2 = null;
        });
      }
    }
  }
  function discard(batch) {
    state2.pending.delete(batch);
  }
  var effect2 = block(() => {
    var array =
      /** @type {V[]} */
      get(each_array);
    var length = array.length;
    let mismatch = false;
    if (hydrating) {
      var is_else = read_hydration_instruction(anchor) === HYDRATION_START_ELSE;
      if (is_else !== (length === 0)) {
        anchor = skip_nodes();
        set_hydrate_node(anchor);
        set_hydrating(false);
        mismatch = true;
      }
    }
    var keys = /* @__PURE__ */ new Set();
    var batch =
      /** @type {Batch} */
      current_batch;
    var defer = should_defer_append();
    for (var index2 = 0; index2 < length; index2 += 1) {
      if (
        hydrating &&
        hydrate_node.nodeType === COMMENT_NODE &&
        /** @type {Comment} */
        hydrate_node.data === HYDRATION_END
      ) {
        anchor = /** @type {Comment} */ hydrate_node;
        mismatch = true;
        set_hydrating(false);
      }
      var value = array[index2];
      var key2 = get_key(value, index2);
      if (dev_fallback_default) {
        var key_again = get_key(value, index2);
        if (key2 !== key_again) {
          each_key_volatile(String(index2), String(key2), String(key_again));
        }
      }
      var item = first_run ? null : items.get(key2);
      if (item) {
        if (item.v) internal_set(item.v, value);
        if (item.i) internal_set(item.i, index2);
        if (defer) {
          batch.unskip_effect(item.e);
        }
      } else {
        item = create_item(
          items,
          first_run ? anchor : (offscreen_anchor ??= create_text()),
          value,
          key2,
          index2,
          render_fn,
          flags2,
          get_collection,
        );
        if (!first_run) {
          item.e.f |= EFFECT_OFFSCREEN;
        }
        items.set(key2, item);
      }
      keys.add(key2);
    }
    if (length === 0 && fallback_fn && !fallback2) {
      if (first_run) {
        fallback2 = branch(() => fallback_fn(anchor));
      } else {
        fallback2 = branch(() =>
          fallback_fn((offscreen_anchor ??= create_text())),
        );
        fallback2.f |= EFFECT_OFFSCREEN;
      }
    }
    if (length > keys.size) {
      if (dev_fallback_default) {
        validate_each_keys(array, get_key);
      } else {
        each_key_duplicate("", "", "");
      }
    }
    if (hydrating && length > 0) {
      set_hydrate_node(skip_nodes());
    }
    if (!first_run) {
      pending2.set(batch, keys);
      if (defer) {
        for (const [key3, item2] of items) {
          if (!keys.has(key3)) {
            batch.skip_effect(item2.e);
          }
        }
        batch.oncommit(commit);
        batch.ondiscard(discard);
      } else {
        commit(batch);
      }
    }
    if (mismatch) {
      set_hydrating(true);
    }
    get(each_array);
  });
  var state2 = {
    effect: effect2,
    flags: flags2,
    items,
    pending: pending2,
    outrogroups: null,
    fallback: fallback2,
  };
  first_run = false;
  if (hydrating) {
    anchor = hydrate_node;
  }
}
function skip_to_branch(effect2) {
  while (effect2 !== null && (effect2.f & BRANCH_EFFECT) === 0) {
    effect2 = effect2.next;
  }
  return effect2;
}
function reconcile(state2, array, anchor, flags2, get_key) {
  var is_animated = (flags2 & EACH_IS_ANIMATED) !== 0;
  var length = array.length;
  var items = state2.items;
  var current = skip_to_branch(state2.effect.first);
  var seen2;
  var prev = null;
  var to_animate;
  var matched = [];
  var stashed = [];
  var value;
  var key2;
  var effect2;
  var i;
  if (is_animated) {
    for (i = 0; i < length; i += 1) {
      value = array[i];
      key2 = get_key(value, i);
      effect2 = /** @type {EachItem} */ items.get(key2).e;
      if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
        effect2.nodes?.a?.measure();
        (to_animate ??= /* @__PURE__ */ new Set()).add(effect2);
      }
    }
  }
  for (i = 0; i < length; i += 1) {
    value = array[i];
    key2 = get_key(value, i);
    effect2 = /** @type {EachItem} */ items.get(key2).e;
    if (state2.outrogroups !== null) {
      for (const group of state2.outrogroups) {
        group.pending.delete(effect2);
        group.done.delete(effect2);
      }
    }
    if ((effect2.f & INERT) !== 0) {
      resume_effect(effect2);
      if (is_animated) {
        effect2.nodes?.a?.unfix();
        (to_animate ??= /* @__PURE__ */ new Set()).delete(effect2);
      }
    }
    if ((effect2.f & EFFECT_OFFSCREEN) !== 0) {
      effect2.f ^= EFFECT_OFFSCREEN;
      if (effect2 === current) {
        move(effect2, null, anchor);
      } else {
        var next2 = prev ? prev.next : current;
        if (effect2 === state2.effect.last) {
          state2.effect.last = effect2.prev;
        }
        if (effect2.prev) effect2.prev.next = effect2.next;
        if (effect2.next) effect2.next.prev = effect2.prev;
        link(state2, prev, effect2);
        link(state2, effect2, next2);
        move(effect2, next2, anchor);
        prev = effect2;
        matched = [];
        stashed = [];
        current = skip_to_branch(prev.next);
        continue;
      }
    }
    if (effect2 !== current) {
      if (seen2 !== void 0 && seen2.has(effect2)) {
        if (matched.length < stashed.length) {
          var start = stashed[0];
          var j;
          prev = start.prev;
          var a = matched[0];
          var b = matched[matched.length - 1];
          for (j = 0; j < matched.length; j += 1) {
            move(matched[j], start, anchor);
          }
          for (j = 0; j < stashed.length; j += 1) {
            seen2.delete(stashed[j]);
          }
          link(state2, a.prev, b.next);
          link(state2, prev, a);
          link(state2, b, start);
          current = start;
          prev = b;
          i -= 1;
          matched = [];
          stashed = [];
        } else {
          seen2.delete(effect2);
          move(effect2, current, anchor);
          link(state2, effect2.prev, effect2.next);
          link(
            state2,
            effect2,
            prev === null ? state2.effect.first : prev.next,
          );
          link(state2, prev, effect2);
          prev = effect2;
        }
        continue;
      }
      matched = [];
      stashed = [];
      while (current !== null && current !== effect2) {
        (seen2 ??= /* @__PURE__ */ new Set()).add(current);
        stashed.push(current);
        current = skip_to_branch(current.next);
      }
      if (current === null) {
        continue;
      }
    }
    if ((effect2.f & EFFECT_OFFSCREEN) === 0) {
      matched.push(effect2);
    }
    prev = effect2;
    current = skip_to_branch(effect2.next);
  }
  if (state2.outrogroups !== null) {
    for (const group of state2.outrogroups) {
      if (group.pending.size === 0) {
        destroy_effects(state2, array_from(group.done));
        state2.outrogroups?.delete(group);
      }
    }
    if (state2.outrogroups.size === 0) {
      state2.outrogroups = null;
    }
  }
  if (current !== null || seen2 !== void 0) {
    var to_destroy = [];
    if (seen2 !== void 0) {
      for (effect2 of seen2) {
        if ((effect2.f & INERT) === 0) {
          to_destroy.push(effect2);
        }
      }
    }
    while (current !== null) {
      if ((current.f & INERT) === 0 && current !== state2.fallback) {
        to_destroy.push(current);
      }
      current = skip_to_branch(current.next);
    }
    var destroy_length = to_destroy.length;
    if (destroy_length > 0) {
      var controlled_anchor =
        (flags2 & EACH_IS_CONTROLLED) !== 0 && length === 0 ? anchor : null;
      if (is_animated) {
        for (i = 0; i < destroy_length; i += 1) {
          to_destroy[i].nodes?.a?.measure();
        }
        for (i = 0; i < destroy_length; i += 1) {
          to_destroy[i].nodes?.a?.fix();
        }
      }
      pause_effects(state2, to_destroy, controlled_anchor);
    }
  }
  if (is_animated) {
    queue_micro_task(() => {
      if (to_animate === void 0) return;
      for (effect2 of to_animate) {
        effect2.nodes?.a?.apply();
      }
    });
  }
}
function create_item(
  items,
  anchor,
  value,
  key2,
  index2,
  render_fn,
  flags2,
  get_collection,
) {
  var v =
    (flags2 & EACH_ITEM_REACTIVE) !== 0
      ? (flags2 & EACH_ITEM_IMMUTABLE) === 0
        ? mutable_source(value, false, false)
        : source(value)
      : null;
  var i = (flags2 & EACH_INDEX_REACTIVE) !== 0 ? source(index2) : null;
  if (dev_fallback_default && v) {
    v.trace = () => {
      get_collection()[i?.v ?? index2];
    };
  }
  return {
    v,
    i,
    e: branch(() => {
      render_fn(anchor, v ?? value, i ?? index2, get_collection);
      return () => {
        items.delete(key2);
      };
    }),
  };
}
function move(effect2, next2, anchor) {
  if (!effect2.nodes) return;
  var node = effect2.nodes.start;
  var end = effect2.nodes.end;
  var dest =
    next2 && (next2.f & EFFECT_OFFSCREEN) === 0
      ? /** @type {EffectNodes} */
        next2.nodes.start
      : anchor;
  while (node !== null) {
    var next_node =
      /** @type {TemplateNode} */
      get_next_sibling(node);
    dest.before(node);
    if (node === end) {
      return;
    }
    node = next_node;
  }
}
function link(state2, prev, next2) {
  if (prev === null) {
    state2.effect.first = next2;
  } else {
    prev.next = next2;
  }
  if (next2 === null) {
    state2.effect.last = prev;
  } else {
    next2.prev = prev;
  }
}
function validate_each_keys(array, key_fn) {
  const keys = /* @__PURE__ */ new Map();
  const length = array.length;
  for (let i = 0; i < length; i++) {
    const key2 = key_fn(array[i], i);
    if (keys.has(key2)) {
      const a = String(keys.get(key2));
      const b = String(i);
      let k = String(key2);
      if (k.startsWith("[object ")) k = null;
      each_key_duplicate(a, b, k);
    }
    keys.set(key2, i);
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/blocks/snippet.js
function snippet(node, get_snippet, ...args) {
  var branches = new BranchManager(node);
  block(() => {
    const snippet2 = get_snippet() ?? null;
    if (dev_fallback_default && snippet2 == null) {
      invalid_snippet();
    }
    branches.ensure(
      snippet2,
      snippet2 && ((anchor) => snippet2(anchor, ...args)),
    );
  }, EFFECT_TRANSPARENT);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/css.js
function append_styles(anchor, css) {
  effect(() => {
    anchor = active_effect?.parent?.nodes?.start ?? anchor;
    var root24 = anchor.getRootNode();
    var target =
      /** @type {ShadowRoot} */
      root24.host
        ? /** @type {ShadowRoot} */
          root24
        : /** @type {Document} */
          (root24.head ?? /** @type {Document} */ root24.ownerDocument.head);
    if (!target.querySelector("#" + css.hash)) {
      const style = create_element("style");
      style.id = css.hash;
      style.textContent = css.code;
      target.appendChild(style);
      if (dev_fallback_default) {
        register_style(css.hash, style);
      }
    }
  });
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/actions.js
function action(dom, action2, get_value) {
  effect(() => {
    var payload = untrack(() => action2(dom, get_value?.()) || {});
    if (get_value && payload?.update) {
      var inited = false;
      var prev =
        /** @type {any} */
        {};
      render_effect(() => {
        var value = get_value();
        deep_read_state(value);
        if (inited && safe_not_equal(prev, value)) {
          prev = value;
          payload.update(value);
        }
      });
      inited = true;
    }
    if (payload?.destroy) {
      return () =>
        /** @type {Function} */
        payload.destroy();
    }
  });
}

// node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t,
    f,
    n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e)
    if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++)
        e[t] && (f = r(e[t])) && (n && (n += " "), (n += f));
    } else for (f in e) e[f] && (n && (n += " "), (n += f));
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++)
    (e = arguments[f]) && (t = r(e)) && (n && (n += " "), (n += t));
  return n;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/shared/attributes.js
function clsx2(value) {
  if (typeof value === "object") {
    return clsx(value);
  } else {
    return value ?? "";
  }
}
var whitespace = [..." 	\n\r\f\xA0\v\uFEFF"];
function to_class(value, hash2, directives) {
  var classname = value == null ? "" : "" + value;
  if (hash2) {
    classname = classname ? classname + " " + hash2 : hash2;
  }
  if (directives) {
    for (var key2 of Object.keys(directives)) {
      if (directives[key2]) {
        classname = classname ? classname + " " + key2 : key2;
      } else if (classname.length) {
        var len = key2.length;
        var a = 0;
        while ((a = classname.indexOf(key2, a)) >= 0) {
          var b = a + len;
          if (
            (a === 0 || whitespace.includes(classname[a - 1])) &&
            (b === classname.length || whitespace.includes(classname[b]))
          ) {
            classname =
              (a === 0 ? "" : classname.substring(0, a)) +
              classname.substring(b + 1);
          } else {
            a = b;
          }
        }
      }
    }
  }
  return classname === "" ? null : classname;
}
function append_styles2(styles2, important = false) {
  var separator = important ? " !important;" : ";";
  var css = "";
  for (var key2 of Object.keys(styles2)) {
    var value = styles2[key2];
    if (value != null && value !== "") {
      css += " " + key2 + ": " + value + separator;
    }
  }
  return css;
}
function to_css_name(name) {
  if (name[0] !== "-" || name[1] !== "-") {
    return name.toLowerCase();
  }
  return name;
}
function to_style(value, styles2) {
  if (styles2) {
    var new_style = "";
    var normal_styles;
    var important_styles;
    if (Array.isArray(styles2)) {
      normal_styles = styles2[0];
      important_styles = styles2[1];
    } else {
      normal_styles = styles2;
    }
    if (value) {
      value = String(value)
        .replaceAll(/\/\*.*?\*\//g, "")
        .trim();
      var in_str = false;
      var in_apo = 0;
      var in_comment = false;
      var reserved_names = [];
      if (normal_styles) {
        reserved_names.push(...Object.keys(normal_styles).map(to_css_name));
      }
      if (important_styles) {
        reserved_names.push(...Object.keys(important_styles).map(to_css_name));
      }
      var start_index = 0;
      var name_index = -1;
      const len = value.length;
      for (var i = 0; i < len; i++) {
        var c = value[i];
        if (in_comment) {
          if (c === "/" && value[i - 1] === "*") {
            in_comment = false;
          }
        } else if (in_str) {
          if (in_str === c) {
            in_str = false;
          }
        } else if (c === "/" && value[i + 1] === "*") {
          in_comment = true;
        } else if (c === '"' || c === "'") {
          in_str = c;
        } else if (c === "(") {
          in_apo++;
        } else if (c === ")") {
          in_apo--;
        }
        if (!in_comment && in_str === false && in_apo === 0) {
          if (c === ":" && name_index === -1) {
            name_index = i;
          } else if (c === ";" || i === len - 1) {
            if (name_index !== -1) {
              var name = to_css_name(
                value.substring(start_index, name_index).trim(),
              );
              if (!reserved_names.includes(name)) {
                if (c !== ";") {
                  i++;
                }
                var property = value.substring(start_index, i).trim();
                new_style += " " + property + ";";
              }
            }
            start_index = i + 1;
            name_index = -1;
          }
        }
      }
    }
    if (normal_styles) {
      new_style += append_styles2(normal_styles);
    }
    if (important_styles) {
      new_style += append_styles2(important_styles, true);
    }
    new_style = new_style.trim();
    return new_style === "" ? null : new_style;
  }
  return value == null ? null : String(value);
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/class.js
function set_class(dom, is_html, value, hash2, prev_classes, next_classes) {
  var prev =
    /** @type {any} */
    dom[CLASS_CACHE];
  if (hydrating || prev !== value || prev === void 0) {
    var next_class_name = to_class(value, hash2, next_classes);
    if (!hydrating || next_class_name !== dom.getAttribute("class")) {
      if (next_class_name == null) {
        dom.removeAttribute("class");
      } else if (is_html) {
        dom.className = next_class_name;
      } else {
        dom.setAttribute("class", next_class_name);
      }
    }
    dom[CLASS_CACHE] = value;
  } else if (next_classes && prev_classes !== next_classes) {
    for (var key2 in next_classes) {
      var is_present = !!next_classes[key2];
      if (prev_classes == null || is_present !== !!prev_classes[key2]) {
        dom.classList.toggle(key2, is_present);
      }
    }
  }
  return next_classes;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/style.js
function update_styles(dom, prev = {}, next2, priority) {
  for (var key2 in next2) {
    var value = next2[key2];
    if (prev[key2] !== value) {
      if (next2[key2] == null) {
        dom.style.removeProperty(key2);
      } else {
        dom.style.setProperty(key2, value, priority);
      }
    }
  }
}
function set_style(dom, value, prev_styles, next_styles) {
  var prev =
    /** @type {any} */
    dom[STYLE_CACHE];
  if (hydrating || prev !== value) {
    var next_style_attr = to_style(value, next_styles);
    if (!hydrating || next_style_attr !== dom.getAttribute("style")) {
      if (next_style_attr == null) {
        dom.removeAttribute("style");
      } else {
        dom.style.cssText = next_style_attr;
      }
    }
    dom[STYLE_CACHE] = value;
  } else if (next_styles) {
    if (Array.isArray(next_styles)) {
      update_styles(dom, prev_styles?.[0], next_styles[0]);
      update_styles(dom, prev_styles?.[1], next_styles[1], "important");
    } else {
      update_styles(dom, prev_styles, next_styles);
    }
  }
  return next_styles;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/bindings/select.js
function set_selected(option, selected) {
  if (selected) {
    if (!option.hasAttribute("selected")) option.setAttribute("selected", "");
  } else {
    option.removeAttribute("selected");
  }
}
function apply_default_select_value(select, preserve) {
  var value = select.__defaultValue;
  var multiple = select.multiple;
  var values = multiple ? (value ?? []) : null;
  if (multiple && !is_array(values)) return;
  var index2 = select.selectedIndex;
  var selected = preserve && multiple ? new Set(select.selectedOptions) : null;
  for (var option of select.options) {
    var option_value = get_option_value(option);
    set_selected(
      option,
      multiple
        ? /** @type {any[]} */
          values.includes(option_value)
        : is(option_value, value),
    );
  }
  if (!preserve) return;
  if (selected !== null) {
    for (option of select.options) {
      var was_selected = selected.has(option);
      if (option.selected !== was_selected) option.selected = was_selected;
    }
  } else if (select.selectedIndex !== index2) {
    select.selectedIndex = index2;
  }
}
function select_option(select, value, mounting = false) {
  if (select.multiple) {
    if (value == void 0) {
      return;
    }
    if (!is_array(value)) {
      return select_multiple_invalid_value();
    }
    for (var option of select.options) {
      option.selected = value.includes(get_option_value(option));
    }
    return;
  }
  for (option of select.options) {
    var option_value = get_option_value(option);
    if (is(option_value, value)) {
      option.selected = true;
      return;
    }
  }
  if (!mounting || value !== void 0) {
    select.selectedIndex = -1;
  }
}
function init_select(select) {
  var observer = new MutationObserver((entries) => {
    if (entries.every(is_selectedcontent_mutation)) return;
    if ("__defaultValue" in select) {
      apply_default_select_value(select, false);
    }
    if ("__value" in select) {
      select_option(select, select.__value);
    }
  });
  observer.observe(select, {
    // Listen to option element changes
    childList: true,
    subtree: true,
    // because of <optgroup>
    // Listen to option element value attribute changes
    // (doesn't get notified of select value changes,
    // because that property is not reflected as an attribute)
    attributes: true,
    attributeFilter: ["value"],
  });
  teardown(() => {
    observer.disconnect();
  });
}
function get_option_value(option) {
  if ("__value" in option) {
    return option.__value;
  } else {
    return option.value;
  }
}
function is_selectedcontent_mutation(entry) {
  if (
    /** @type {Element} */
    entry.target.closest("selectedcontent") !== null
  ) {
    return true;
  }
  if (entry.type === "childList") {
    var nodes = [...entry.addedNodes, ...entry.removedNodes];
    return (
      nodes.length > 0 &&
      nodes.every((node) => node.nodeName === "SELECTEDCONTENT")
    );
  }
  return false;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/attributes.js
var IS_CUSTOM_ELEMENT = /* @__PURE__ */ Symbol("is custom element");
var IS_HTML = /* @__PURE__ */ Symbol("is html");
var LINK_TAG = IS_XHTML ? "link" : "LINK";
var PROGRESS_TAG = IS_XHTML ? "progress" : "PROGRESS";
function remove_input_defaults(input) {
  if (!hydrating) return;
  var already_removed = false;
  var remove_defaults = () => {
    if (already_removed) return;
    already_removed = true;
    if (input.hasAttribute("value")) {
      var value = input.value;
      set_attribute2(input, "value", null);
      input.value = value;
    }
    if (input.hasAttribute("checked")) {
      var checked = input.checked;
      set_attribute2(input, "checked", null);
      input.checked = checked;
    }
  };
  input[FORM_RESET_HANDLER] = remove_defaults;
  queue_micro_task(remove_defaults);
  add_form_reset_listener();
}
function set_value(element2, value) {
  var attributes = get_attributes(element2);
  if (
    attributes.value ===
      (attributes.value = value ?? void 0) || // treat null and undefined the same for the initial value // @ts-expect-error
    // `progress` elements always need their value set when it's `0`
    (element2.value === value &&
      (value !== 0 || element2.nodeName !== PROGRESS_TAG))
  ) {
    return;
  }
  element2.value = value ?? "";
}
function set_checked(element2, checked) {
  var attributes = get_attributes(element2);
  if (
    attributes.checked ===
    (attributes.checked = checked ?? void 0) // treat null and undefined the same for the initial value
  ) {
    return;
  }
  element2.checked = checked;
}
function set_attribute2(element2, attribute, value, skip_warning) {
  var attributes = get_attributes(element2);
  if (hydrating) {
    attributes[attribute] = element2.getAttribute(attribute);
    if (
      attribute === "src" ||
      attribute === "srcset" ||
      (attribute === "href" && element2.nodeName === LINK_TAG)
    ) {
      if (!skip_warning) {
        check_src_in_dev_hydration(element2, attribute, value ?? "");
      }
      return;
    }
  }
  if (attributes[attribute] === (attributes[attribute] = value)) return;
  if (attribute === "loading") {
    element2[LOADING_ATTR_SYMBOL] = value;
  }
  if (value == null) {
    element2.removeAttribute(attribute);
  } else if (
    typeof value !== "string" &&
    get_setters(element2).has(attribute)
  ) {
    element2[attribute] = value;
  } else {
    element2.setAttribute(attribute, value);
  }
}
function set_custom_element_data(node, prop2, value) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  let was_hydrating = hydrating;
  if (hydrating) {
    set_hydrating(false);
  }
  set_active_reaction(null);
  set_active_effect(null);
  try {
    if (
      // `style` should use `set_attribute` rather than the setter
      prop2 !== "style" && // Don't compute setters for custom elements while they aren't registered yet,
      // because during their upgrade/instantiation they might add more setters.
      // Instead, fall back to a simple "an object, then set as property" heuristic.
      (setters_cache.has(node.getAttribute("is") || node.nodeName) || // customElements may not be available in browser extension contexts
      !customElements ||
      customElements.get(node.getAttribute("is") || node.nodeName.toLowerCase())
        ? get_setters(node).has(prop2)
        : value && typeof value === "object")
    ) {
      node[prop2] = value;
    } else {
      set_attribute2(node, prop2, value == null ? value : String(value));
    }
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
    if (was_hydrating) {
      set_hydrating(true);
    }
  }
}
function get_attributes(element2) {
  return (
    /** @type {Record<string | symbol, unknown>} **/
    /** @type {any} */
    (element2[ATTRIBUTES_CACHE] ??= {
      [IS_CUSTOM_ELEMENT]: element2.nodeName.includes("-"),
      [IS_HTML]: element2.namespaceURI === NAMESPACE_HTML,
    })
  );
}
var setters_cache = /* @__PURE__ */ new Map();
function get_setters(element2) {
  var cache_key = element2.getAttribute("is") || element2.nodeName;
  var setters = setters_cache.get(cache_key);
  if (setters) return setters;
  setters_cache.set(cache_key, (setters = /* @__PURE__ */ new Set()));
  var descriptors;
  var proto = element2;
  var element_proto = Element.prototype;
  while (element_proto !== proto) {
    descriptors = get_descriptors(proto);
    for (var key2 in descriptors) {
      if (
        descriptors[key2].set && // better safe than sorry, we don't want spread attributes to mess with HTML content
        key2 !== "innerHTML" &&
        key2 !== "textContent" &&
        key2 !== "innerText"
      ) {
        setters.add(key2);
      }
    }
    proto = get_prototype_of(proto);
  }
  return setters;
}
function check_src_in_dev_hydration(element2, attribute, value) {
  if (!dev_fallback_default) return;
  if (attribute === "srcset" && srcset_url_equal(element2, value)) return;
  if (src_url_equal(element2.getAttribute(attribute) ?? "", value)) return;
  hydration_attribute_changed(
    attribute,
    element2.outerHTML.replace(element2.innerHTML, element2.innerHTML && "..."),
    String(value),
  );
}
function src_url_equal(element_src, url) {
  if (element_src === url) return true;
  return (
    new URL(element_src, document.baseURI).href ===
    new URL(url, document.baseURI).href
  );
}
function split_srcset(srcset) {
  return srcset.split(",").map((src) => src.trim().split(" ").filter(Boolean));
}
function srcset_url_equal(element2, srcset) {
  var element_urls = split_srcset(element2.srcset);
  var urls = split_srcset(srcset);
  return (
    urls.length === element_urls.length &&
    urls.every(
      ([url, width], i) =>
        width === element_urls[i][1] && // We need to test both ways because Vite will create an a full URL with
        // `new URL(asset, import.meta.url).href` for the client when `base: './'`, and the
        // relative URLs inside srcset are not automatically resolved to absolute URLs by
        // browsers (in contrast to img.src). This means both SSR and DOM code could
        // contain relative or absolute URLs.
        (src_url_equal(element_urls[i][0], url) ||
          src_url_equal(url, element_urls[i][0])),
    )
  );
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/bindings/this.js
function is_bound_this(bound_value, element_or_component) {
  return (
    bound_value === element_or_component ||
    bound_value?.[STATE_SYMBOL] === element_or_component
  );
}
function bind_this(
  element_or_component = mark_as_component(),
  update2,
  get_value,
  get_parts,
) {
  var component_effect =
    /** @type {ComponentContext} */
    component_context.r;
  var parent =
    /** @type {Effect} */
    active_effect;
  effect(() => {
    var old_parts;
    var parts;
    render_effect(() => {
      old_parts = parts;
      parts = get_parts?.() || [];
      untrack(() => {
        if (!is_bound_this(get_value(...parts), element_or_component)) {
          update2(element_or_component, ...parts);
          if (
            old_parts &&
            is_bound_this(get_value(...old_parts), element_or_component)
          ) {
            update2(null, ...old_parts);
          }
        }
      });
    });
    return () => {
      let p = parent;
      while (
        p !== component_effect &&
        p.parent !== null &&
        p.parent.f & DESTROYING
      ) {
        p = p.parent;
      }
      const teardown2 = () => {
        if (parts && is_bound_this(get_value(...parts), element_or_component)) {
          update2(null, ...parts);
        }
      };
      const original_teardown = p.teardown;
      p.teardown = () => {
        teardown2();
        original_teardown?.();
      };
    };
  });
  return element_or_component;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/store/utils.js
function subscribe_to_store(store, run3, invalidate) {
  if (store == null) {
    run3(void 0);
    if (invalidate) invalidate(void 0);
    return noop;
  }
  const unsub = untrack(() =>
    store.subscribe(
      run3,
      // @ts-expect-error
      invalidate,
    ),
  );
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/store/shared/index.js
var subscriber_queue = [];
function writable(value, start = noop) {
  let stop = null;
  const subscribers = /* @__PURE__ */ new Set();
  function set3(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update2(fn) {
    set3(
      fn(
        /** @type {T} */
        value,
      ),
    );
  }
  function subscribe(run3, invalidate = noop) {
    const subscriber = [run3, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set3, update2) || noop;
    }
    run3(
      /** @type {T} */
      value,
    );
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set: set3, update: update2, subscribe };
}
function get2(store) {
  let value;
  subscribe_to_store(store, (_) => (value = _))();
  return value;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/store.js
var is_store_binding = false;
var IS_UNMOUNTED = /* @__PURE__ */ Symbol("unmounted");
function store_get(store, store_name, stores) {
  const entry = (stores[store_name] ??= {
    store: null,
    source: mutable_source(void 0),
    unsubscribe: noop,
  });
  if (dev_fallback_default) {
    entry.source.label = store_name;
  }
  if (entry.store !== store && !(IS_UNMOUNTED in stores)) {
    entry.unsubscribe();
    entry.store = store ?? null;
    if (store == null) {
      entry.source.v = void 0;
      entry.unsubscribe = noop;
    } else {
      var is_synchronous_callback = true;
      entry.unsubscribe = subscribe_to_store(store, (v) => {
        if (is_synchronous_callback) {
          entry.source.v = v;
        } else {
          set2(entry.source, v);
        }
      });
      is_synchronous_callback = false;
    }
  }
  if (store && IS_UNMOUNTED in stores) {
    return get2(store);
  }
  return get(entry.source);
}
function setup_stores() {
  const stores = {};
  function cleanup() {
    teardown(() => {
      for (var store_name in stores) {
        const ref = stores[store_name];
        ref.unsubscribe();
      }
      define_property(stores, IS_UNMOUNTED, {
        enumerable: false,
        value: true,
      });
    });
  }
  return [stores, cleanup];
}
function capture_store_binding(fn) {
  var previous_is_store_binding = is_store_binding;
  try {
    is_store_binding = false;
    return [fn(), is_store_binding];
  } finally {
    is_store_binding = previous_is_store_binding;
  }
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/reactivity/props.js
var spread_props_handler = {
  get(target, key2) {
    let i = target.props.length;
    while (i--) {
      let p = target.props[i];
      if (is_function(p)) p = p();
      if (typeof p === "object" && p !== null && key2 in p) return p[key2];
    }
  },
  set(target, key2, value) {
    let i = target.props.length;
    while (i--) {
      let p = target.props[i];
      if (is_function(p)) p = p();
      const desc = get_descriptor(p, key2);
      if (desc && desc.set) {
        desc.set(value);
        return true;
      }
    }
    return false;
  },
  getOwnPropertyDescriptor(target, key2) {
    let i = target.props.length;
    while (i--) {
      let p = target.props[i];
      if (is_function(p)) p = p();
      if (typeof p === "object" && p !== null && key2 in p) {
        const descriptor = get_descriptor(p, key2);
        if (descriptor && !descriptor.configurable) {
          descriptor.configurable = true;
        }
        return descriptor;
      }
    }
  },
  has(target, key2) {
    if (key2 === STATE_SYMBOL || key2 === LEGACY_PROPS) return false;
    for (let p of target.props) {
      if (is_function(p)) p = p();
      if (p != null && key2 in p) return true;
    }
    return false;
  },
  ownKeys(target) {
    const keys = [];
    for (let p of target.props) {
      if (is_function(p)) p = p();
      if (!p) continue;
      for (const key2 in p) {
        if (!keys.includes(key2)) keys.push(key2);
      }
      for (const key2 of Object.getOwnPropertySymbols(p)) {
        if (!keys.includes(key2)) keys.push(key2);
      }
    }
    return keys;
  },
};
function spread_props(...props) {
  return new Proxy({ props }, spread_props_handler);
}
function prop(props, key2, flags2, fallback2) {
  var runes = !legacy_mode_flag || (flags2 & PROPS_IS_RUNES) !== 0;
  var bindable = (flags2 & PROPS_IS_BINDABLE) !== 0;
  var lazy = (flags2 & PROPS_IS_LAZY_INITIAL) !== 0;
  var fallback_value =
    /** @type {V} */
    fallback2;
  var fallback_dirty = true;
  var fallback_signal =
    /** @type {Derived<V> | undefined} */
    void 0;
  var get_fallback = () => {
    if (lazy && runes) {
      fallback_signal ??= derived(
        /** @type {() => V} */
        fallback2,
      );
      return get(fallback_signal);
    }
    if (fallback_dirty) {
      fallback_dirty = false;
      fallback_value = lazy
        ? untrack(
            /** @type {() => V} */
            fallback2,
          )
        : /** @type {V} */
          fallback2;
    }
    return fallback_value;
  };
  let setter;
  if (bindable) {
    var is_entry_props = STATE_SYMBOL in props || LEGACY_PROPS in props;
    setter =
      get_descriptor(props, key2)?.set ??
      (is_entry_props && key2 in props ? (v) => (props[key2] = v) : void 0);
  }
  var initial_value;
  var is_store_sub = false;
  if (bindable) {
    [initial_value, is_store_sub] = capture_store_binding(
      () =>
        /** @type {V} */
        props[key2],
    );
  } else {
    initial_value = /** @type {V} */ props[key2];
  }
  if (initial_value === void 0 && fallback2 !== void 0) {
    initial_value = get_fallback();
    if (setter) {
      if (runes) props_invalid_value(key2);
      setter(initial_value);
    }
  }
  var getter;
  if (runes) {
    getter = () => {
      var value =
        /** @type {V} */
        props[key2];
      if (value === void 0) return get_fallback();
      fallback_dirty = true;
      return value;
    };
  } else {
    getter = () => {
      var value =
        /** @type {V} */
        props[key2];
      if (value !== void 0) {
        fallback_value = /** @type {V} */ void 0;
      }
      return value === void 0 ? fallback_value : value;
    };
  }
  if (runes && (flags2 & PROPS_IS_UPDATED) === 0) {
    return getter;
  }
  if (setter) {
    var legacy_parent = props.$$legacy;
    return (
      /** @type {() => V} */
      (
        function (value, mutation) {
          if (arguments.length > 0) {
            if (!runes || !mutation || legacy_parent || is_store_sub) {
              setter(mutation ? getter() : value);
            }
            return value;
          }
          return getter();
        }
      )
    );
  }
  var overridden = false;
  var d = ((flags2 & PROPS_IS_IMMUTABLE) !== 0 ? derived : derived_safe_equal)(
    () => {
      overridden = false;
      return getter();
    },
  );
  if (dev_fallback_default) {
    d.label = key2;
  }
  if (bindable) get(d);
  var parent_effect =
    /** @type {Effect} */
    active_effect;
  return (
    /** @type {() => V} */
    (
      function (value, mutation) {
        if (arguments.length > 0) {
          const new_value = mutation
            ? get(d)
            : runes && bindable
              ? proxy(value)
              : value;
          set2(d, new_value);
          overridden = true;
          if (fallback_value !== void 0) {
            fallback_value = new_value;
          }
          return value;
        }
        if (
          (is_destroying_effect && overridden) ||
          (parent_effect.f & DESTROYED) !== 0
        ) {
          return d.v;
        }
        return get(d);
      }
    )
  );
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/legacy/legacy-client.js
function createClassComponent(options) {
  return new Svelte4Component(options);
}
var Svelte4Component = class {
  /** @type {any} */
  #events;
  /** @type {Record<string, any>} */
  #instance;
  /**
   * @param {ComponentConstructorOptions & {
   *  component: any;
   * }} options
   */
  constructor(options) {
    var sources = /* @__PURE__ */ new Map();
    var add_source = (key2, value) => {
      var s = mutable_source(value, false, false);
      sources.set(key2, s);
      return s;
    };
    const props = new Proxy(
      { ...(options.props || {}), $$events: {} },
      {
        get(target, prop2) {
          return get(
            sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)),
          );
        },
        has(target, prop2) {
          if (prop2 === LEGACY_PROPS) return true;
          get(
            sources.get(prop2) ?? add_source(prop2, Reflect.get(target, prop2)),
          );
          return Reflect.has(target, prop2);
        },
        set(target, prop2, value) {
          set2(sources.get(prop2) ?? add_source(prop2, value), value);
          return Reflect.set(target, prop2, value);
        },
      },
    );
    this.#instance = (options.hydrate ? hydrate : mount)(options.component, {
      target: options.target,
      anchor: options.anchor,
      props,
      context: options.context,
      intro: options.intro ?? false,
      recover: options.recover,
      transformError: options.transformError,
    });
    if (
      !async_mode_flag &&
      (!options?.props?.$$host || options.sync === false)
    ) {
      flushSync();
    }
    this.#events = props.$$events;
    for (const key2 of Object.keys(this.#instance)) {
      if (key2 === "$set" || key2 === "$destroy" || key2 === "$on") continue;
      define_property(this, key2, {
        get() {
          return this.#instance[key2];
        },
        /** @param {any} value */
        set(value) {
          this.#instance[key2] = value;
        },
        enumerable: true,
      });
    }
    this.#instance.$set =
      /** @param {Record<string, any>} next */
      (next2) => {
        Object.assign(props, next2);
      };
    this.#instance.$destroy = () => {
      unmount(this.#instance);
    };
  }
  /** @param {Record<string, any>} props */
  $set(props) {
    this.#instance.$set(props);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => any} callback
   * @returns {any}
   */
  $on(event2, callback) {
    this.#events[event2] = this.#events[event2] || [];
    const cb = (...args) => callback.call(this, ...args);
    this.#events[event2].push(cb);
    return () => {
      this.#events[event2] = this.#events[event2].filter(
        /** @param {any} fn */
        (fn) => fn !== cb,
      );
    };
  }
  $destroy() {
    this.#instance.$destroy();
  }
};

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/client/dom/elements/custom-element.js
var SvelteElement;
if (typeof HTMLElement === "function") {
  SvelteElement = class extends HTMLElement {
    /** The Svelte component constructor */
    $$ctor;
    /** Slots */
    $$s;
    /** @type {any} The Svelte component instance */
    $$c;
    /** Whether or not the custom element is connected */
    $$cn = false;
    /** @type {Record<string, any>} Component props data */
    $$d = {};
    /** `true` if currently in the process of reflecting component props back to attributes */
    $$r = false;
    /** @type {Record<string, CustomElementPropDefinition>} Props definition (name, reflected, type etc) */
    $$p_d = {};
    /** @type {Record<string, EventListenerOrEventListenerObject[]>} Event listeners */
    $$l = {};
    /** @type {Map<EventListenerOrEventListenerObject, Function>} Event listener unsubscribe functions */
    $$l_u = /* @__PURE__ */ new Map();
    /** @type {any} The managed render effect for reflecting attributes */
    $$me;
    /** @type {ShadowRoot | null} The ShadowRoot of the custom element */
    $$shadowRoot = null;
    /**
     * @param {*} $$componentCtor
     * @param {*} $$slots
     * @param {ShadowRootInit | undefined} shadow_root_init
     */
    constructor($$componentCtor, $$slots, shadow_root_init) {
      super();
      this.$$ctor = $$componentCtor;
      this.$$s = $$slots;
      if (shadow_root_init) {
        this.$$shadowRoot = this.attachShadow(shadow_root_init);
      }
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    addEventListener(type, listener, options) {
      this.$$l[type] = this.$$l[type] || [];
      this.$$l[type].push(listener);
      if (this.$$c) {
        const unsub = this.$$c.$on(type, listener);
        this.$$l_u.set(listener, unsub);
      }
      super.addEventListener(type, listener, options);
    }
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean | AddEventListenerOptions} [options]
     */
    removeEventListener(type, listener, options) {
      super.removeEventListener(type, listener, options);
      if (this.$$c) {
        const unsub = this.$$l_u.get(listener);
        if (unsub) {
          unsub();
          this.$$l_u.delete(listener);
        }
      }
    }
    async connectedCallback() {
      this.$$cn = true;
      if (!this.$$c) {
        let create_slot = function (name) {
          return (anchor) => {
            const slot2 = create_element("slot");
            if (name !== "default") slot2.name = name;
            append(anchor, slot2);
          };
        };
        await Promise.resolve();
        if (!this.$$cn || this.$$c) {
          return;
        }
        const $$slots = {};
        const existing_slots = get_custom_elements_slots(this);
        for (const name of this.$$s) {
          if (name in existing_slots) {
            if (name === "default" && !this.$$d.children) {
              this.$$d.children = create_slot(name);
              $$slots.default = true;
            } else {
              $$slots[name] = create_slot(name);
            }
          }
        }
        for (const attribute of this.attributes) {
          const name = this.$$g_p(attribute.name);
          if (!(name in this.$$d)) {
            this.$$d[name] = get_custom_element_value(
              name,
              attribute.value,
              this.$$p_d,
              "toProp",
            );
          }
        }
        for (const key2 in this.$$p_d) {
          if (!(key2 in this.$$d) && this[key2] !== void 0) {
            this.$$d[key2] = this[key2];
            delete this[key2];
          }
        }
        this.$$c = createClassComponent({
          component: this.$$ctor,
          target: this.$$shadowRoot || this,
          props: {
            ...this.$$d,
            $$slots,
            $$host: this,
          },
        });
        this.$$me = effect_root(() => {
          render_effect(() => {
            this.$$r = true;
            for (const key2 of object_keys(this.$$c)) {
              if (!this.$$p_d[key2]?.reflect) continue;
              this.$$d[key2] = this.$$c[key2];
              const attribute_value = get_custom_element_value(
                key2,
                this.$$d[key2],
                this.$$p_d,
                "toAttribute",
              );
              if (attribute_value == null) {
                this.removeAttribute(this.$$p_d[key2].attribute || key2);
              } else {
                this.setAttribute(
                  this.$$p_d[key2].attribute || key2,
                  attribute_value,
                );
              }
            }
            this.$$r = false;
          });
        });
        for (const type in this.$$l) {
          for (const listener of this.$$l[type]) {
            const unsub = this.$$c.$on(type, listener);
            this.$$l_u.set(listener, unsub);
          }
        }
        this.$$l = {};
      }
    }
    // We don't need this when working within Svelte code, but for compatibility of people using this outside of Svelte
    // and setting attributes through setAttribute etc, this is helpful
    /**
     * @param {string} attr
     * @param {string} _oldValue
     * @param {string} newValue
     */
    attributeChangedCallback(attr2, _oldValue, newValue) {
      if (this.$$r) return;
      attr2 = this.$$g_p(attr2);
      this.$$d[attr2] = get_custom_element_value(
        attr2,
        newValue,
        this.$$p_d,
        "toProp",
      );
      this.$$c?.$set({ [attr2]: this.$$d[attr2] });
    }
    disconnectedCallback() {
      this.$$cn = false;
      Promise.resolve().then(() => {
        if (!this.$$cn && this.$$c) {
          this.$$c.$destroy();
          this.$$me();
          this.$$c = void 0;
        }
      });
    }
    /**
     * @param {string} attribute_name
     */
    $$g_p(attribute_name) {
      return (
        object_keys(this.$$p_d).find(
          (key2) =>
            this.$$p_d[key2].attribute === attribute_name ||
            (!this.$$p_d[key2].attribute &&
              key2.toLowerCase() === attribute_name),
        ) || attribute_name
      );
    }
  };
}
function get_custom_element_value(prop2, value, props_definition, transform) {
  const type = props_definition[prop2]?.type;
  value =
    type === "Boolean" && typeof value !== "boolean" ? value != null : value;
  if (!transform || !props_definition[prop2]) {
    return value;
  } else if (transform === "toAttribute") {
    switch (type) {
      case "Object":
      case "Array":
        return value == null ? null : JSON.stringify(value);
      case "Boolean":
        return value ? "" : null;
      case "Number":
        return value == null ? null : value;
      default:
        return value;
    }
  } else {
    switch (type) {
      case "Object":
      case "Array":
        return value && JSON.parse(value);
      case "Boolean":
        return value;
      // conversion already handled above
      case "Number":
        return value != null ? +value : value;
      default:
        return value;
    }
  }
}
function get_custom_elements_slots(element2) {
  const result = {};
  element2.childNodes.forEach((node) => {
    result[
      /** @type {Element} node */
      node.slot || "default"
    ] = true;
  });
  return result;
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/index-client.js
if (dev_fallback_default) {
  let throw_rune_error = function (rune) {
    if (!(rune in globalThis)) {
      let value;
      Object.defineProperty(globalThis, rune, {
        configurable: true,
        // eslint-disable-next-line getter-return
        get: () => {
          if (value !== void 0) {
            return value;
          }
          rune_outside_svelte(rune);
        },
        set: (v) => {
          value = v;
        },
      });
    }
  };
  throw_rune_error("$state");
  throw_rune_error("$effect");
  throw_rune_error("$derived");
  throw_rune_error("$inspect");
  throw_rune_error("$props");
  throw_rune_error("$bindable");
}
function onMount(fn) {
  if (component_context === null) {
    lifecycle_outside_component("onMount");
  }
  if (legacy_mode_flag && component_context.l !== null) {
    init_update_callbacks(component_context).m.push(fn);
  } else {
    user_effect(() => {
      const cleanup = untrack(fn);
      if (typeof cleanup === "function")
        return (
          /** @type {() => void} */
          cleanup
        );
    });
  }
}
function init_update_callbacks(context) {
  var l =
    /** @type {ComponentContextLegacy} */
    context.l;
  return (l.u ??= { a: [], b: [], m: [] });
}

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/version.js
var PUBLIC_VERSION = "5";

// node_modules/.pnpm/svelte@5.57.2_@typescript-eslint+types@8.68.0/node_modules/svelte/src/internal/disclose-version.js
if (typeof window !== "undefined") {
  ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add(
    PUBLIC_VERSION,
  );
}

// custom_components/occupied/frontend/cover.ts
var coverActions = [
  ["cover.open_cover", "Open cover"],
  ["cover.close_cover", "Close cover"],
  ["cover.stop_cover", "Stop cover"],
  ["cover.set_cover_position", "Set cover position"],
  ["cover.open_cover_tilt", "Open tilt"],
  ["cover.close_cover_tilt", "Close tilt"],
  ["cover.stop_cover_tilt", "Stop tilt"],
  ["cover.set_cover_tilt_position", "Set tilt position"],
];
function coverField(action2) {
  if (action2 === "cover.set_cover_position") {
    return "position";
  }
  if (action2 === "cover.set_cover_tilt_position") {
    return "tilt_position";
  }
  return;
}
function isCoverAction(action2) {
  const field = coverField(action2.action);
  return (
    coverActions.some(([service]) => service === action2.action) &&
    Object.keys(action2.data || {}).every((key2) => key2 === field) &&
    (!field || validCoverPosition(action2.data?.[field]))
  );
}
function validCoverPosition(value) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 100
  );
}
function coverTarget(action2, previous = {}) {
  if (!isCoverAction(action2)) {
    return {};
  }
  const next2 = { ...previous };
  const tilt =
    action2.action.endsWith("_tilt") ||
    action2.action === "cover.set_cover_tilt_position";
  const field = tilt ? "tilt_position" : "position";
  if (action2.action.includes(".stop_")) {
    delete next2[field];
  } else if (action2.action.includes(".open_")) {
    next2[field] = 100;
  } else if (action2.action.includes(".close_")) {
    next2[field] = 0;
  } else {
    const value = action2.data?.[field];
    if (validCoverPosition(value)) {
      next2[field] = value;
    } else {
      delete next2[field];
    }
  }
  return next2;
}

// custom_components/occupied/frontend/step-model.ts
var sorted = (values) => [...new Set(values)].sort();
var actionLabels = {
  turn_on: "Turn on",
  turn_off: "Turn off",
  "scene.turn_on": "Activate scene",
  ...Object.fromEntries(coverActions),
};
function stepEntries(program, catalog, t = (value) => value) {
  return Object.entries(program.steps || {}).map(([id, step]) => ({
    ...step,
    id,
    path: ["steps", id],
    days: [...(step.days || days)],
    name:
      step.name ||
      `${catalog ? entityName(catalog, step.entities[0]) : step.entities[0]}${step.entities.length > 1 ? ` +${step.entities.length - 1}` : ""} \xB7 ${t(actionLabels[step.action] || step.action)}`,
  }));
}
var solarEvents = ["sunrise", "sunset", "dawn", "dusk", "noon", "midnight"];
function timeSourceChoices(
  program,
  id,
  catalog = {},
  t = (value) => value,
  randomId,
) {
  const allowed = new Set(parentSteps(program, id).map((step) => step.id));
  return [
    ...stepEntries(
      program,
      catalog.entities ? { entities: catalog.entities } : void 0,
      t,
    )
      .filter((step) => allowed.has(step.id))
      .map((step) => ({
        value: `step:${step.id}`,
        name: step.name,
        group: "Steps",
      })),
    ...(randomId
      ? parentRandomEvents(program, randomId).map((event2) => ({
          value: `random:${event2.id}`,
          name: `${t("End of")} ${event2.name || (catalog.entities ? entityName({ entities: catalog.entities }, event2.on.entities[0]) : event2.on.entities[0])}`,
          group: "Random events",
        }))
      : []),
    ...(catalog.time_sources ||
      solarEvents.map((event2) => ({
        value: `sun:${event2}`,
        name: event2,
        group: "Solar events",
      }))),
  ];
}
function stepEditor(program, entry, parent) {
  const source2 = entry || parent;
  const form = {
    ...actionForm(source2),
    name: entry ? program.steps?.[entry.id]?.name || "" : "",
    enabled: entry?.enabled !== false,
    days: [...(source2?.days || days)],
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
function actionForm(source2) {
  const action2 = source2?.action;
  let kind = "entities";
  if (action2 === "scene.turn_on") {
    kind = "scene";
  } else if (
    source2 &&
    isCoverAction(source2) &&
    source2.entities.every((entity) => entity.startsWith("cover."))
  ) {
    kind = "cover";
  } else if (action2?.includes(".")) {
    kind = "service";
  }
  return {
    kind,
    service: source2?.action || "homeassistant.turn_on",
    data: JSON.stringify(source2?.data || {}, null, 2),
    entities: [...(source2?.entities || [])],
    action: action2 === "turn_off" ? "turn_off" : "turn_on",
    position: String(source2?.data?.position ?? ""),
    tiltPosition: String(source2?.data?.tilt_position ?? ""),
  };
}
function hasStepChanges(editor) {
  return JSON.stringify(editor.form) !== JSON.stringify(editor.original);
}
function editorErrors(program, editor) {
  const { form, id } = editor,
    errors = {
      ...actionErrors(form),
      ...timingErrors(program, form.timing, id),
    };
  if (form.days.length === 0) {
    errors.days = "Choose at least one day.";
  }
  return errors;
}
function actionErrors(form) {
  const errors = {};
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
  if (form.kind === "cover") {
    if (form.entities.some((entity) => !entity.startsWith("cover."))) {
      errors.entities = "Choose cover entities.";
    }
    if (coverActions.every(([action2]) => action2 !== form.service)) {
      errors.service = "Choose a cover action.";
    }
    const field = coverField(form.service);
    if (field) {
      const key2 = field === "position" ? "position" : "tiltPosition";
      const value = Number(form[key2]);
      if (
        !form[key2].trim() ||
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > 100
      ) {
        errors[key2] = "Choose a whole number from 0 to 100.";
      }
    }
  } else if (form.kind === "scene" || form.kind === "service") {
    try {
      const data = JSON.parse(form.data);
      if (!data || Array.isArray(data) || typeof data !== "object") {
        throw new TypeError("Expected service data to be a JSON object");
      }
    } catch {
      errors.data = "Service data must be a JSON object.";
    }
  }
  return errors;
}
function timingErrors(program, time, id, randomId) {
  const errors = {};
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
    } else if (time.anchor.startsWith("random:")) {
      if (
        !randomId ||
        parentRandomEvents(program, randomId).every(
          (event2) => event2.id !== time.anchor.slice(7),
        )
      ) {
        errors.anchor =
          "Choose another random event without creating a circular relationship.";
      }
    } else if (
      !solarEvents.map((event2) => `sun:${event2}`).includes(time.anchor) &&
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
function formTiming(time) {
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
        ...(attribute && { attribute }),
        ...offsets,
      },
    };
  }
  return { relative_to: { sun: time.anchor.slice(4), ...offsets } };
}
function buildStep(program, editor) {
  const errors = editorErrors(program, editor);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }
  if (editor.existing && !program.steps?.[editor.id]) {
    throw new Error(
      "This step changed elsewhere. Cancel and reopen it before saving.",
    );
  }
  const next2 = copy(program),
    { form } = editor;
  (next2.steps ||= {})[editor.id] = {
    ...(form.name.trim() && { name: form.name.trim() }),
    ...(!form.enabled && { enabled: false }),
    days: [...form.days],
    timing: formTiming(form.timing),
    ...buildAction(form),
  };
  return next2;
}
function buildAction(form) {
  let action2 = form.action;
  if (form.kind === "scene") {
    action2 = "scene.turn_on";
  } else if (form.kind === "service" || form.kind === "cover") {
    action2 = form.service;
  }
  if (form.kind === "cover") {
    const field = coverField(action2);
    return {
      action: action2,
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
    action: action2,
    entities: sorted(form.entities),
    ...(form.kind !== "entities" && { data: JSON.parse(form.data) }),
  };
}
function dependentNames(program, id) {
  const paths = references(program, id);
  return [
    ...stepEntries(program)
      .filter((e) => paths.some((p) => p[0] === "steps" && p[1] === e.id))
      .map((e) => e.name),
    ...Object.entries(program.random || {})
      .filter(([key2]) => paths.some((p) => p[0] === "random" && p[1] === key2))
      .map(([key2, event2]) => event2.name || key2),
  ];
}

// custom_components/occupied/frontend/step-issues.ts
function warningStepId(issue, entries) {
  if (issue.severity !== "warning") {
    return;
  }
  return entries.find((entry) =>
    issue.model_path
      ? entry.path.every((key2, index2) => issue.model_path?.[index2] === key2)
      : issue.path === `$.steps.${entry.id}` ||
        issue.path?.startsWith(`$.steps.${entry.id}.`),
  )?.id;
}

// custom_components/occupied/frontend/step-editor-controller.ts
function focusEditor(panel, key2) {
  const target = key2
    ? panel.shadowRoot.querySelector(
        `[data-builder-field="${CSS.escape(key2)}"]`,
      )
    : panel.shadowRoot.querySelector('.step-editor [aria-invalid="true"]') ||
      panel.shadowRoot.querySelector(
        '.step-editor [data-builder-field="days"][aria-describedby]',
      ) ||
      panel.shadowRoot.querySelector(
        '.step-editor [data-builder-field="name"]',
      );
  target?.focus();
}
function createStepEditorContext(panel) {
  const editor = panel.stepEditor,
    form = editor.form,
    time = form.timing,
    t = panel.t,
    editing = editor.existing;
  const refresh = (key2) => {
    panel.flush();
    focusEditor(panel, key2);
  };
  const changed = (key2) => {
    editor.changed = true;
    panel.version++;
    panel.validatedVersion = -1;
    delete editor.errors[key2];
    if (key2 === "days") {
      const { anchor } = editorErrors(panel.draft, editor);
      if (anchor) {
        editor.errors.anchor = anchor;
      } else {
        delete editor.errors.anchor;
      }
    }
    if (["startOffset", "endOffset"].includes(key2)) {
      const errors = offsetErrors(time);
      for (const offset of ["startOffset", "endOffset"]) {
        if (errors[offset]) {
          editor.errors[offset] = errors[offset];
        } else {
          delete editor.errors[offset];
        }
      }
    }
    panel.flush();
  };
  const submit = async () => {
    editor.errors = editorErrors(panel.draft, editor);
    if (Object.keys(editor.errors).length > 0) {
      return refresh();
    }
    try {
      const candidate = buildStep(panel.draft, editor);
      editor.candidatePath = required(
        stepEntries(candidate).find((entry) => entry.id === editor.id),
      ).path;
      if (panel.document?.source === "file") {
        panel.change([], candidate);
        panel.selectedStep = editor.id;
        panel.stepEditor = null;
        panel.renderView();
      } else {
        await panel.save(candidate);
      }
    } catch (error) {
      panel.fail(error);
    }
  };
  const cancel = () => {
    panel.requestStepExit(() => {
      panel.shadowRoot.getElementById(`step-card-${editor.id}`)?.focus();
    });
  };
  return {
    panel,
    // New facades notify Svelte of in-place form and validation changes.
    editor: new Proxy(editor, {}),
    form: new Proxy(form, {}),
    time: new Proxy(time, {}),
    t,
    editing,
    stepId: editor.id,
    refresh,
    changed,
    submit,
    cancel,
  };
}

// custom_components/occupied/frontend/steps.ts
function startStep(panel, entry, parent) {
  if (panel.stepEditor) {
    panel.requestStepExit(() => startStep(panel, entry, parent));
    return;
  }
  showStep(panel, entry, parent);
}
function showStep(panel, entry, parent) {
  panel.stepEditor = stepEditor(panel.draft, entry, parent);
  panel.tab = "steps";
  panel.error = "";
  panel.issues = [];
  panel.renderView();
  focusEditor(panel);
  if (entry) {
    scrollStepEditorIntoView(panel, entry.id);
  }
}
function scrollStepEditorIntoView(panel, id) {
  panel.shadowRoot
    .getElementById(`step-editor-${id}`)
    ?.querySelector(".step-editor")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function openStep(panel, entry) {
  if (panel.busy) {
    return;
  }
  if (panel.stepEditor?.id === entry.id) {
    panel.requestStepExit(() => {
      panel.selectedStep = null;
      panel.shadowRoot.getElementById(`step-card-${entry.id}`)?.focus();
    });
    return;
  }
  if (panel.stepEditor) {
    panel.requestStepExit(() => openStep(panel, entry));
    return;
  }
  showEntry(panel, entry);
}
function showEntry(panel, entry) {
  showStep(panel, entry);
}
function actionSummary(entry, t) {
  if (entry.action === "scene.turn_on") {
    return t("Activate scene");
  }
  if (entry.action === "turn_on" || entry.action === "turn_off") {
    return t(entry.action === "turn_off" ? "Turn off" : "Turn on");
  }
  return entry.action;
}
function stepTree(entries) {
  const seen2 = /* @__PURE__ */ new Set(),
    ordered = [];
  const append2 = (entry, depth) => {
    if (seen2.has(entry.id)) {
      return;
    }
    seen2.add(entry.id);
    ordered.push({ entry, depth });
    for (const child2 of entries) {
      if (child2.timing.relative_to?.step === entry.id) {
        append2(child2, depth + 1);
      }
    }
  };
  const isRoot = (step) =>
    !step.timing.relative_to?.step ||
    entries.every((parent) => parent.id !== step.timing.relative_to?.step);
  for (const step of entries) {
    if (isRoot(step)) {
      append2(step, 0);
    }
  }
  for (const step of entries) {
    append2(step, 0);
  }
  return ordered;
}

// custom_components/occupied/frontend/dom.ts
function properties(node, values) {
  const apply2 = (next2) => {
    for (const [key2, value] of Object.entries(next2)) {
      if (node[key2] !== value) {
        node[key2] = value;
      }
    }
  };
  apply2(values);
  return { update: apply2 };
}
function reference(node, callback) {
  callback(node);
  return {
    update(next2) {
      next2(node);
    },
  };
}
function validity(node, message) {
  node.setCustomValidity(message);
  return {
    update(next2) {
      node.setCustomValidity(next2);
    },
  };
}

// custom_components/occupied/frontend/DeleteStepDialog.svelte
var root = from_html(`<li> </li>`);
var root_1 = from_html(`<p> </p> <ul></ul> <p class="hint"> </p>`, 1);
var root_2 = from_html(`<p class="hint"> </p>`);
var root_3 = from_html(
  `<dialog class="step-delete-dialog" aria-labelledby="step-delete-title" aria-describedby="step-delete-description"><h2 id="step-delete-title"> </h2> <div id="step-delete-description"><p> </p> <!></div> <div class="step-delete-actions"><button type="button"> </button> <button type="button" class="danger"> </button></div></dialog>`,
);
function DeleteStepDialog($$anchor, $$props) {
  push($$props, true);
  let panel = prop($$props, "panel", 7);
  let t = user_derived(() => panel().t);
  let dependents = user_derived(() =>
    dependentNames(panel().draft, $$props.entry.id),
  );
  let dialog;
  onMount(() => {
    dialog.showModal();
    dialog.querySelector("button")?.focus();
  });
  var dialog_1 = root_3();
  var h2 = child(dialog_1);
  var text2 = only_child(h2, true);
  var div = sibling(h2, 2);
  var p = child(div);
  var text_1 = only_child(p, true);
  var node_1 = sibling(p, 2);
  {
    var consequent = ($$anchor2) => {
      var fragment = root_1();
      var p_1 = first_child(fragment);
      var text_2 = only_child(p_1);
      var ul = sibling(p_1, 2);
      each(
        ul,
        21,
        () => get(dependents),
        index,
        ($$anchor3, name) => {
          var li = root();
          var text_3 = only_child(li, true);
          template_effect(() => set_text(text_3, get(name)));
          append($$anchor3, li);
        },
      );
      reset(ul);
      var p_2 = sibling(ul, 2);
      var text_4 = only_child(p_2, true);
      template_effect(
        ($0, $1) => {
          set_text(text_2, `${$0 ?? ""}:`);
          set_text(text_4, $1);
        },
        [
          () => get(t)("Used by"),
          () => get(t)("Change those relationships before deleting."),
        ],
      );
      append($$anchor2, fragment);
    };
    var alternate = ($$anchor2) => {
      var p_3 = root_2();
      var text_5 = only_child(p_3, true);
      template_effect(
        ($0) => set_text(text_5, $0),
        [() => get(t)("This step will be removed when you save changes.")],
      );
      append($$anchor2, p_3);
    };
    if_block(node_1, ($$render) => {
      if (get(dependents).length) $$render(consequent);
      else $$render(alternate, -1);
    });
  }
  reset(div);
  var div_1 = sibling(div, 2);
  var button = child(div_1);
  var text_6 = only_child(button, true);
  var button_1 = sibling(button, 2);
  var text_7 = only_child(button_1, true);
  reset(div_1);
  reset(dialog_1);
  action(
    dialog_1,
    ($$node, $$action_arg) => reference?.($$node, $$action_arg),
    () => (node) => {
      if (node) dialog = node;
    },
  );
  template_effect(
    ($0, $1, $2) => {
      set_text(text2, $0);
      set_text(text_1, $$props.entry.name);
      set_text(text_6, $1);
      button_1.disabled = get(dependents).length > 0;
      set_text(text_7, $2);
    },
    [
      () => get(t)("Delete step?"),
      () => get(t)("Cancel"),
      () => get(t)("Delete step"),
    ],
  );
  event("close", dialog_1, function (...$$args) {
    $$props.onClose?.apply(this, $$args);
  });
  delegated("click", button, () => dialog.close());
  delegated("click", button_1, () =>
    panel().attempt(() => {
      const current = stepEntries(
        panel().draft,
        panel().catalog,
        panel().t,
      ).find((step) => step.id === $$props.entry.id);
      if (!current) return dialog.close();
      const next2 = copy(panel().draft);
      removeStep(next2, current.path);
      dialog.close();
      panel().selectedStep = null;
      panel().stepEditor = null;
      panel().change([], next2, true);
    }),
  );
  append($$anchor, dialog_1);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/AdvancedStepSettings.svelte
var root2 = from_html(`<button type="button"> </button>`);
var root_12 = from_html(
  `<label class="step-weekday-option"><input type="checkbox"/> <span> </span></label>`,
);
var root_22 = from_html(
  `<p id="step-weekdays-error" class="error" role="alert"> </p>`,
);
var root_32 = from_html(
  `<dialog class="step-advanced-dialog" aria-labelledby="step-advanced-title" aria-describedby="step-weekdays-description"><h2 id="step-advanced-title"> </h2> <p id="step-weekdays-description" class="hint"> </p> <fieldset class="step-weekdays"><legend> </legend> <div class="step-weekday-presets"></div> <div class="step-weekday-options"></div></fieldset> <!> <p class="hint"> </p> <div class="step-delete-actions"><button type="button"> </button> <button type="button" class="primary"> </button></div></dialog>`,
);
function AdvancedStepSettings($$anchor, $$props) {
  push($$props, true);
  let editor = user_derived(() => $$props.context.editor),
    form = user_derived(() => $$props.context.form),
    t = user_derived(() => $$props.context.t),
    changed = user_derived(() => $$props.context.changed);
  let selectedDays = state(proxy([]));
  let dialog;
  const presets = [
    ["Every day", days],
    ["Weekdays", days.slice(0, 5)],
    ["Weekends", days.slice(5)],
  ];
  const weekdayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  let dayError = user_derived(() => {
    const errors = editorErrors($$props.panel.draft, {
      ...get(editor),
      form: { ...get(form), days: get(selectedDays) },
    });
    return (
      errors.days ||
      (get(form).timing.anchor.startsWith("step:") &&
      get(form).timing.mode === "relative"
        ? errors.anchor
        : void 0)
    );
  });
  onMount(() => {
    set2(selectedDays, [...get(form).days], true);
    dialog.showModal();
    dialog.querySelector("input")?.focus();
  });
  function apply2() {
    if (get(dayError) || $$props.panel.busy) return;
    get(form).days = [...get(selectedDays)];
    get(changed)("days");
    dialog.close();
  }
  var dialog_1 = root_32();
  var h2 = child(dialog_1);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  var fieldset = sibling(p, 2);
  var legend = child(fieldset);
  var text_2 = only_child(legend, true);
  var div = sibling(legend, 2);
  each(
    div,
    21,
    () => presets,
    index,
    ($$anchor2, $$item) => {
      var $$array = user_derived(() => to_array(get($$item), 2));
      let label = () => get($$array)[0];
      let selection = () => get($$array)[1];
      var button = root2();
      var text_3 = only_child(button, true);
      template_effect(
        ($0, $1) => {
          set_attribute2(button, "aria-pressed", $0);
          set_text(text_3, $1);
        },
        [
          () =>
            get(selectedDays).length === selection().length &&
            selection().every((day) => get(selectedDays).includes(day)),
          () => get(t)(label()),
        ],
      );
      delegated("click", button, () =>
        set2(selectedDays, [...selection()], true),
      );
      append($$anchor2, button);
    },
  );
  reset(div);
  var div_1 = sibling(div, 2);
  each(
    div_1,
    21,
    () => days,
    index,
    ($$anchor2, day, index2) => {
      var label_1 = root_12();
      var input = child(label_1);
      remove_input_defaults(input);
      var span = sibling(input, 2);
      var text_4 = only_child(span, true);
      reset(label_1);
      template_effect(
        ($0, $1) => {
          set_value(input, get(day));
          set_checked(input, $0);
          set_text(text_4, $1);
        },
        [
          () => get(selectedDays).includes(get(day)),
          () => get(t)(weekdayNames[index2]),
        ],
      );
      delegated("change", input, (event2) => {
        set2(
          selectedDays,
          days.filter((candidate) =>
            candidate === get(day)
              ? event2.currentTarget.checked
              : get(selectedDays).includes(candidate),
          ),
          true,
        );
      });
      append($$anchor2, label_1);
    },
  );
  reset(div_1);
  reset(fieldset);
  var node = sibling(fieldset, 2);
  {
    var consequent = ($$anchor2) => {
      var p_1 = root_22();
      var text_5 = only_child(p_1, true);
      template_effect(
        ($0) => set_text(text_5, $0),
        [() => get(t)(get(dayError))],
      );
      append($$anchor2, p_1);
    };
    if_block(node, ($$render) => {
      if (get(dayError)) $$render(consequent);
    });
  }
  var p_2 = sibling(node, 2);
  var text_6 = only_child(p_2, true);
  var div_2 = sibling(p_2, 2);
  var button_1 = child(div_2);
  var text_7 = only_child(button_1, true);
  var button_2 = sibling(button_1, 2);
  var text_8 = only_child(button_2, true);
  reset(div_2);
  reset(dialog_1);
  bind_this(
    dialog_1,
    ($$value) => (dialog = $$value),
    () => dialog,
  );
  template_effect(
    ($0, $1, $2, $3, $4, $5) => {
      set_text(text2, $0);
      set_text(text_1, $1);
      set_attribute2(
        fieldset,
        "aria-describedby",
        get(dayError) ? "step-weekdays-error" : void 0,
      );
      fieldset.disabled = $$props.panel.busy;
      set_text(text_2, $2);
      set_text(text_6, $3);
      set_text(text_7, $4);
      button_2.disabled = $$props.panel.busy || !!get(dayError);
      set_text(text_8, $5);
    },
    [
      () => get(t)("Advanced settings"),
      () => get(t)("Choose which days this step should run."),
      () => get(t)("Run on"),
      () => get(t)("Apply these settings, then save the step."),
      () => get(t)("Cancel"),
      () => get(t)("Apply"),
    ],
  );
  event("close", dialog_1, function (...$$args) {
    $$props.onClose?.apply(this, $$args);
  });
  delegated("click", button_1, () => dialog.close());
  delegated("click", button_2, apply2);
  append($$anchor, dialog_1);
  pop();
}
delegate(["click", "change"]);

// custom_components/occupied/frontend/StepActions.svelte
var root3 = from_html(
  `<button type="button" role="menuitem" tabindex="-1"> </button>`,
);
var root_13 = from_html(
  `<div role="separator"></div> <button type="button" role="menuitem" tabindex="-1" class="danger"> </button>`,
  1,
);
var root_23 = from_html(
  `<div class="step-editor-actions"><button type="button" aria-haspopup="menu" data-builder-field="days"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"></path></svg></button> <div class="step-actions-menu" popover="auto" role="menu" tabindex="-1"><!> <!> <!> <!></div></div> <!> <!>`,
  1,
);
function StepActions($$anchor, $$props) {
  push($$props, true);
  let context = prop($$props, "context", 7);
  let menuOpen = state(false);
  let deleteOpen = state(false);
  let advancedOpen = state(false);
  let trigger;
  let menu;
  let menuId = user_derived(
    () => `step-actions-${$$props.entry?.id || context()?.editor.id}`,
  );
  function closeDialog() {
    flushSync(() => {
      set2(deleteOpen, false);
      set2(advancedOpen, false);
    });
    if (trigger.isConnected) trigger.focus();
  }
  function closeMenu(restoreFocus = true) {
    menu.hidePopover();
    set2(menuOpen, false);
    if (restoreFocus) trigger.focus();
  }
  function positionMenu() {
    if (!menu.matches(":popover-open")) return;
    const anchor = trigger.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const above = anchor.top - bounds.height - 8;
    const top = above >= 16 ? above : anchor.bottom + 8;
    menu.style.left = `${Math.max(16, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 16))}px`;
    menu.style.top = `${Math.max(16, Math.min(top, window.innerHeight - bounds.height - 16))}px`;
  }
  function openMenu(last = false) {
    menu.showPopover();
    set2(menuOpen, true);
    positionMenu();
    const items = menu.querySelectorAll("button:not(:disabled)");
    (last ? items[items.length - 1] : items[0])?.focus({ preventScroll: true });
  }
  function menuKeydown(event2) {
    const items = [...menu.querySelectorAll("button:not(:disabled)")];
    const index2 = items.indexOf($$props.panel.shadowRoot.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event2.key)) {
      event2.preventDefault();
      const next2 =
        event2.key === "Home"
          ? 0
          : event2.key === "End"
            ? items.length - 1
            : (index2 + (event2.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[next2]?.focus();
    } else if (event2.key === "Escape") {
      event2.preventDefault();
      closeMenu();
    } else if (event2.key === "Tab") {
      closeMenu();
    }
  }
  var fragment = root_23();
  event("resize", $window, positionMenu);
  event("scroll", $window, positionMenu);
  var div = first_child(fragment);
  var button = child(div);
  let classes;
  bind_this(
    button,
    ($$value) => (trigger = $$value),
    () => trigger,
  );
  var div_1 = sibling(button, 2);
  var node = child(div_1);
  {
    var consequent = ($$anchor2) => {
      var button_1 = root3();
      var text2 = only_child(button_1, true);
      template_effect(
        ($0) => {
          button_1.disabled = $$props.panel.busy;
          set_text(text2, $0);
        },
        [() => $$props.panel.t(context().form.enabled ? "Disable" : "Enable")],
      );
      delegated("click", button_1, () => {
        closeMenu();
        if (!context()) return;
        context().form.enabled = !context().form.enabled;
        context().changed("enabled");
      });
      append($$anchor2, button_1);
    };
    if_block(node, ($$render) => {
      if (context()) $$render(consequent);
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var button_2 = root3();
      var text_1 = only_child(button_2, true);
      template_effect(
        ($0) => {
          button_2.disabled = $$props.panel.busy;
          set_text(text_1, $0);
        },
        [() => $$props.panel.t("Add related step")],
      );
      delegated("click", button_2, () => {
        closeMenu();
        if ($$props.entry) startStep($$props.panel, null, $$props.entry);
      });
      append($$anchor2, button_2);
    };
    if_block(node_1, ($$render) => {
      if ($$props.entry) $$render(consequent_1);
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    var consequent_2 = ($$anchor2) => {
      var button_3 = root3();
      var text_2 = only_child(button_3, true);
      template_effect(
        ($0) => {
          button_3.disabled = $$props.panel.busy;
          set_text(text_2, $0);
        },
        [() => $$props.panel.t("Advanced settings")],
      );
      delegated("click", button_3, () => {
        closeMenu(false);
        flushSync(() => set2(advancedOpen, true));
      });
      append($$anchor2, button_3);
    };
    if_block(node_2, ($$render) => {
      if (context()) $$render(consequent_2);
    });
  }
  var node_3 = sibling(node_2, 2);
  {
    var consequent_3 = ($$anchor2) => {
      var fragment_1 = root_13();
      var button_4 = sibling(first_child(fragment_1), 2);
      var text_3 = only_child(button_4, true);
      template_effect(
        ($0) => {
          button_4.disabled = $$props.panel.busy;
          set_text(text_3, $0);
        },
        [() => $$props.panel.t("Delete step")],
      );
      delegated("click", button_4, () => {
        closeMenu(false);
        flushSync(() => set2(deleteOpen, true));
      });
      append($$anchor2, fragment_1);
    };
    if_block(node_3, ($$render) => {
      if ($$props.entry) $$render(consequent_3);
    });
  }
  reset(div_1);
  bind_this(
    div_1,
    ($$value) => (menu = $$value),
    () => menu,
  );
  reset(div);
  var node_4 = sibling(div, 2);
  {
    var consequent_4 = ($$anchor2) => {
      DeleteStepDialog($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get entry() {
          return $$props.entry;
        },
        onClose: closeDialog,
      });
    };
    if_block(node_4, ($$render) => {
      if (get(deleteOpen) && $$props.entry) $$render(consequent_4);
    });
  }
  var node_5 = sibling(node_4, 2);
  {
    var consequent_5 = ($$anchor2) => {
      AdvancedStepSettings($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return context();
        },
        onClose: closeDialog,
      });
    };
    if_block(node_5, ($$render) => {
      if (get(advancedOpen) && context()) $$render(consequent_5);
    });
  }
  template_effect(
    ($0, $1, $2) => {
      classes = set_class(button, 1, "icon-button", null, classes, {
        error: !!context()?.editor.errors.days,
      });
      set_attribute2(button, "aria-label", $0);
      set_attribute2(button, "title", $1);
      set_attribute2(button, "aria-expanded", get(menuOpen));
      set_attribute2(button, "aria-controls", get(menuId));
      set_attribute2(
        button,
        "aria-describedby",
        context()?.editor.errors.days ? "step-error-days" : void 0,
      );
      button.disabled = $$props.panel.busy;
      set_attribute2(div_1, "id", get(menuId));
      set_attribute2(div_1, "aria-label", $2);
    },
    [
      () => $$props.panel.t("Step actions"),
      () => $$props.panel.t("Step actions"),
      () => $$props.panel.t("Step actions"),
    ],
  );
  delegated("click", button, () => (get(menuOpen) ? closeMenu() : openMenu()));
  delegated("keydown", button, (event2) => {
    if (event2.key === "ArrowDown" || event2.key === "ArrowUp") {
      event2.preventDefault();
      openMenu(event2.key === "ArrowUp");
    }
  });
  event("toggle", div_1, (event2) =>
    set2(menuOpen, event2.newState === "open"),
  );
  delegated("keydown", div_1, menuKeydown);
  append($$anchor, fragment);
  pop();
}
delegate(["click", "keydown"]);

// custom_components/occupied/frontend/FieldError.svelte
var root4 = from_html(`<p class="error" role="alert"> </p>`);
function FieldError($$anchor, $$props) {
  push($$props, true);
  let fieldPrefix = prop($$props, "fieldPrefix", 3, "");
  var fragment = comment();
  var node = first_child(fragment);
  {
    var consequent = ($$anchor2) => {
      var p = root4();
      var text2 = only_child(p, true);
      template_effect(() => {
        set_attribute2(p, "id", `step-error-${fieldPrefix()}${$$props.key}`);
        set_attribute2(
          p,
          "data-builder-error",
          `${fieldPrefix()}${$$props.key}`,
        );
        set_text(text2, $$props.errors[$$props.key]);
      });
      append($$anchor2, p);
    };
    if_block(node, ($$render) => {
      if ($$props.errors[$$props.key]) $$render(consequent);
    });
  }
  append($$anchor, fragment);
  pop();
}

// custom_components/occupied/frontend/EditorField.svelte
var root5 = from_html(`<div><label> </label> <!></div>`);
var root_14 = from_html(`<ha-selector></ha-selector>`, 2);
var root_24 = from_html(`<option> </option>`);
var root_33 = from_html(`<select></select>`);
var root_4 = from_html(`<textarea></textarea>`);
var root_5 = from_html(`<input/>`);
var root_6 = from_html(`<div class="field"><!> <!> <!></div>`);
function EditorField($$anchor, $$props) {
  push($$props, true);
  let options = prop($$props, "options", 19, () => ({}));
  let editor = user_derived(() => $$props.context.editor),
    t = user_derived(() => $$props.context.t),
    changed = user_derived(() => $$props.context.changed);
  let fieldPrefix = user_derived(() => $$props.context.fieldPrefix || "");
  let field = user_derived(() => `${get(fieldPrefix)}${$$props.key}`);
  let id = user_derived(() => `step-${get(field)}`);
  let invalid = user_derived(() =>
    get(editor).errors[$$props.key] ? true : void 0,
  );
  let described = user_derived(() =>
    get(editor).errors[$$props.key] ? `step-error-${get(field)}` : void 0,
  );
  let nativeTime = user_derived(() => options().type === "time");
  function input(event2) {
    const control = event2.currentTarget;
    if (get(nativeTime)) {
      if (!isValueChangedEvent(event2)) return;
      control.value = event2.detail.value || "";
    }
    $$props.update(String(control.value ?? ""));
    get(changed)($$props.key);
    if (options().render) focusEditor($$props.panel, get(field));
  }
  var div = root_6();
  var node = child(div);
  {
    var consequent = ($$anchor2) => {
      var div_1 = root5();
      var label_1 = child(div_1);
      var text2 = only_child(label_1, true);
      var node_1 = sibling(label_1, 2);
      snippet(node_1, () => $$props.trailing ?? noop);
      reset(div_1);
      template_effect(
        ($0) => {
          set_class(div_1, 1, clsx2($$props.trailing ? "field-label-row" : ""));
          set_attribute2(label_1, "for", get(id));
          set_text(text2, $0);
        },
        [() => get(t)($$props.label)],
      );
      append($$anchor2, div_1);
    };
    if_block(node, ($$render) => {
      if (!get(nativeTime) && !options().hideLabel) $$render(consequent);
    });
  }
  var node_2 = sibling(node, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var ha_selector = root_14();
      template_effect(() =>
        set_custom_element_data(ha_selector, "id", get(id)),
      );
      template_effect(() =>
        set_custom_element_data(ha_selector, "data-builder-field", get(field)),
      );
      template_effect(
        ($0) => set_custom_element_data(ha_selector, "aria-label", $0),
        [() => get(t)($$props.label)],
      );
      template_effect(() =>
        set_custom_element_data(ha_selector, "aria-invalid", get(invalid)),
      );
      template_effect(() =>
        set_custom_element_data(
          ha_selector,
          "aria-describedby",
          get(described),
        ),
      );
      set_custom_element_data(ha_selector, "tabindex", "0");
      action(
        ha_selector,
        ($$node, $$action_arg) => properties?.($$node, $$action_arg),
        () => ({
          hass: $$props.panel._hass,
          selector: { time: {} },
          label: get(t)($$props.label),
          required: !options().optional,
          value: $$props.value || void 0,
        }),
      );
      event("value-changed", ha_selector, input);
      append($$anchor2, ha_selector);
    };
    var consequent_2 = ($$anchor2) => {
      var select = root_33();
      each(
        select,
        21,
        () => options().choices,
        index,
        ($$anchor3, $$item) => {
          var $$array = user_derived(() => to_array(get($$item), 2));
          let v = () => get($$array)[0];
          let name = () => get($$array)[1];
          var option = root_24();
          var text_1 = only_child(option, true);
          var option_value = {};
          template_effect(
            ($0) => {
              set_text(text_1, $0);
              if (option_value !== (option_value = v())) {
                option.value = (option.__value = option_value) ?? "";
              }
            },
            [() => get(t)(name())],
          );
          append($$anchor3, option);
        },
      );
      reset(select);
      var select_value;
      init_select(select);
      template_effect(
        ($0, $1) => {
          set_attribute2(select, "id", get(id));
          set_attribute2(select, "data-builder-field", get(field));
          set_attribute2(select, "aria-label", $0);
          set_attribute2(select, "aria-invalid", get(invalid));
          set_attribute2(select, "aria-describedby", get(described));
          if (select_value !== (select_value = $1)) {
            ((select.value = (select.__value = select_value) ?? ""),
              select_option(select, select_value));
          }
        },
        [
          () => (options().hideLabel ? get(t)($$props.label) : void 0),
          () => String($$props.value),
        ],
      );
      delegated("change", select, input);
      append($$anchor2, select);
    };
    var consequent_3 = ($$anchor2) => {
      var textarea = root_4();
      remove_textarea_child(textarea);
      template_effect(
        ($0, $1) => {
          set_attribute2(textarea, "id", get(id));
          set_attribute2(textarea, "data-builder-field", get(field));
          set_attribute2(textarea, "aria-label", $0);
          set_attribute2(textarea, "aria-invalid", get(invalid));
          set_attribute2(textarea, "aria-describedby", get(described));
          set_value(textarea, $1);
        },
        [
          () => (options().hideLabel ? get(t)($$props.label) : void 0),
          () => String($$props.value),
        ],
      );
      delegated("input", textarea, input);
      append($$anchor2, textarea);
    };
    var alternate = ($$anchor2) => {
      var input_1 = root_5();
      remove_input_defaults(input_1);
      action(
        input_1,
        ($$node, $$action_arg) => validity?.($$node, $$action_arg),
        () =>
          ["startOffset", "endOffset"].includes($$props.key)
            ? get(editor).errors[$$props.key] || ""
            : "",
      );
      template_effect(
        ($0, $1) => {
          set_attribute2(input_1, "id", get(id));
          set_attribute2(input_1, "data-builder-field", get(field));
          set_attribute2(input_1, "type", options().type || "text");
          set_attribute2(input_1, "aria-label", $0);
          set_attribute2(input_1, "aria-invalid", get(invalid));
          set_attribute2(input_1, "aria-describedby", get(described));
          set_attribute2(input_1, "min", options().min);
          set_attribute2(input_1, "max", options().max);
          set_attribute2(input_1, "step", options().step);
          set_attribute2(input_1, "placeholder", options().placeholder);
          set_value(input_1, $1);
        },
        [
          () => (options().hideLabel ? get(t)($$props.label) : void 0),
          () => String($$props.value),
        ],
      );
      delegated("input", input_1, input);
      append($$anchor2, input_1);
    };
    if_block(node_2, ($$render) => {
      if (get(nativeTime)) $$render(consequent_1);
      else if (options().choices) $$render(consequent_2, 1);
      else if (options().multiline) $$render(consequent_3, 2);
      else $$render(alternate, -1);
    });
  }
  var node_3 = sibling(node_2, 2);
  {
    let $0 = user_derived(() => ({ ...get(editor).errors }));
    FieldError(node_3, {
      get key() {
        return $$props.key;
      },
      get fieldPrefix() {
        return get(fieldPrefix);
      },
      get errors() {
        return get($0);
      },
    });
  }
  reset(div);
  append($$anchor, div);
  pop();
}
delegate(["change", "input"]);

// custom_components/occupied/frontend/random-model.ts
function countBounds(count) {
  return typeof count === "object"
    ? count
    : { min: count ?? 3, max: count ?? 3 };
}
function countSummary(count) {
  const { min, max } = countBounds(count);
  return min === max ? String(min) : `${min}\u2013${max}`;
}
function randomEntries(program, catalog) {
  return Object.entries(program.random || {}).map(([id, event2]) => ({
    ...event2,
    id,
    path: ["random", id],
    days: [...(event2.days || days)],
    name:
      event2.name ||
      `${catalog ? entityName(catalog, event2.on.entities[0]) : event2.on.entities[0]}${event2.on.entities.length > 1 ? ` +${event2.on.entities.length - 1}` : ""}`,
  }));
}
function randomEditor(program, entry) {
  const source2 = entry ? program.random?.[entry.id] : void 0;
  const on2 = actionForm(source2?.on);
  const off = actionForm(source2?.off || { action: "turn_off", entities: [] });
  const count = countBounds(source2?.count);
  const form = {
    name: source2?.name || "",
    enabled: source2?.enabled !== false,
    days: [...(source2?.days || days)],
    start: timingForm(source2?.start),
    end: timingForm(source2?.end || { absolute_time: { start: "23:00" } }),
    minDuration: source2?.min_duration || "5m",
    maxDuration: source2?.max_duration || "15m",
    minCount: String(count.min),
    maxCount: String(count.max),
    on: on2,
    off,
    sameEntities:
      ["entities", "cover"].includes(on2.kind) &&
      on2.kind === off.kind &&
      JSON.stringify([...on2.entities].sort()) ===
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
function hasRandomChanges(editor) {
  return JSON.stringify(editor.form) !== JSON.stringify(editor.original);
}
function prefixedErrors(errors, prefix) {
  return Object.fromEntries(
    Object.entries(errors).map(([field, message]) => [
      `${prefix}${field}`,
      message,
    ]),
  );
}
function randomErrors(program, editor) {
  const { form } = editor;
  const errors = {
    ...prefixedErrors(
      timingErrors(program, form.start, void 0, editor.id),
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
  if (!Number.isFinite(minimum) || minimum <= 0 || minimum > 604800) {
    errors.minDuration =
      "Use a positive duration within seven days, for example 5m or 1h.";
  }
  if (!Number.isFinite(maximum) || maximum <= 0 || maximum > 604800) {
    errors.maxDuration =
      "Use a positive duration within seven days, for example 5m or 1h.";
  } else if (maximum < minimum) {
    errors.maxDuration =
      "Maximum duration must be at least the minimum duration.";
  }
  const minCount = Number(form.minCount),
    maxCount = Number(form.maxCount);
  for (const field of ["minCount", "maxCount"]) {
    const count = Number(form[field]);
    if (
      !form[field].trim() ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count > 1e3
    ) {
      errors[field] = "Choose a whole number from 0 to 1000.";
    }
  }
  if (!errors.minCount && !errors.maxCount && maxCount < minCount) {
    errors.maxCount = "Maximum events per window must be at least the minimum.";
  }
  if (form.days.length === 0) {
    errors.days = "Choose at least one day.";
  }
  if (
    maxCount > 0 &&
    form.end.mode === "duration" &&
    !errors["end.minDuration"] &&
    !errors["end.maxDuration"] &&
    minimum >
      durationSeconds(form.end.maxDuration || form.end.minDuration || "")
  ) {
    errors.minDuration = "Minimum duration does not fit inside this window.";
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
      span += 86400;
    }
    if (span === 0) {
      errors["end.start"] = "Window end must be after its start.";
    } else if (minimum > span) {
      errors.minDuration = "Minimum duration does not fit inside this window.";
    }
  }
  return errors;
}
function windowEndErrors(program, time) {
  if (time.mode !== "duration") {
    return timingErrors(program, time);
  }
  const errors = {};
  const minimum = durationSeconds(time.minDuration || "");
  const maximum = durationSeconds(time.maxDuration || time.minDuration || "");
  if (!Number.isFinite(minimum) || minimum <= 0 || minimum > 604800) {
    errors.minDuration = "Choose a positive window duration within seven days.";
  }
  if (!Number.isFinite(maximum) || maximum <= 0 || maximum > 604800) {
    errors.maxDuration = "Choose a positive window duration within seven days.";
  } else if (maximum < minimum) {
    errors.maxDuration =
      "Maximum window duration must be at least the minimum.";
  }
  return errors;
}
function buildRandom(program, editor) {
  const errors = randomErrors(program, editor);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }
  if (editor.existing && !program.random?.[editor.id]) {
    throw new Error(
      "This random event changed elsewhere. Cancel and reopen it before saving.",
    );
  }
  const next2 = copy(program),
    { form } = editor;
  (next2.random ||= {})[editor.id] = {
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
  return next2;
}

// custom_components/occupied/frontend/SourcePicker.svelte
var root6 = from_html(
  `<div class="field source-picker"><ha-generic-picker></ha-generic-picker> <!></div>`,
  2,
);
function SourcePicker($$anchor, $$props) {
  push($$props, true);
  let error = prop($$props, "error", 3, ""),
    fieldPrefix = prop($$props, "fieldPrefix", 3, "");
  let items = user_derived(() => {
    const items2 = [];
    let group;
    for (const choice of $$props.choices) {
      if (group !== choice.group) {
        group = choice.group;
        items2.push($$props.t(group));
      }
      items2.push({
        id: choice.value,
        primary: $$props.t(choice.name),
        secondary: choice.entity_id,
        group: $$props.t(choice.group),
      });
    }
    return items2;
  });
  function valueRenderer(id) {
    const headline = document.createElement("span");
    headline.slot = "headline";
    headline.textContent = $$props.t(
      $$props.choices.find((choice) => choice.value === id)?.name || id,
    );
    return headline;
  }
  function select(event2) {
    if (!isValueChangedEvent(event2)) return;
    const next2 =
      typeof event2.detail.value === "string" ? event2.detail.value : "";
    if (next2 && !$$props.choices.some((choice) => choice.value === next2))
      return;
    const control = event2.currentTarget;
    control.value = next2 || void 0;
    $$props.onChange(next2);
  }
  var div = root6();
  var ha_generic_picker = child(div);
  template_effect(() =>
    set_custom_element_data(
      ha_generic_picker,
      "id",
      `step-${fieldPrefix()}anchor`,
    ),
  );
  template_effect(() =>
    set_custom_element_data(
      ha_generic_picker,
      "data-builder-field",
      `${fieldPrefix()}anchor`,
    ),
  );
  template_effect(
    ($0) => set_custom_element_data(ha_generic_picker, "aria-label", $0),
    [() => $$props.t("Relative to")],
  );
  template_effect(() =>
    set_custom_element_data(
      ha_generic_picker,
      "aria-invalid",
      error() ? "true" : void 0,
    ),
  );
  template_effect(() =>
    set_custom_element_data(
      ha_generic_picker,
      "aria-describedby",
      error() ? `step-error-${fieldPrefix()}anchor` : void 0,
    ),
  );
  set_custom_element_data(ha_generic_picker, "tabindex", "0");
  action(
    ha_generic_picker,
    ($$node, $$action_arg) => properties?.($$node, $$action_arg),
    () => ({
      hass: $$props.hass,
      value: $$props.value || void 0,
      label: $$props.t("Relative to"),
      searchLabel: $$props.t("Search steps or time sources"),
      placeholder: $$props.t("Choose a step or event"),
      notFoundLabel: $$props.t("No matching steps or time sources."),
      getItems: () => get(items),
      searchKeys: ["primary", "secondary", "id", "group"],
      valueRenderer,
      allowCustomValue: false,
      noSort: true,
      required: true,
      invalid: !!error(),
      errorMessage: error(),
    }),
  );
  var node = sibling(ha_generic_picker, 2);
  {
    let $0 = user_derived(() => ({ anchor: error() }));
    FieldError(node, {
      key: "anchor",
      get fieldPrefix() {
        return fieldPrefix();
      },
      get errors() {
        return get($0);
      },
    });
  }
  reset(div);
  event("value-changed", ha_generic_picker, select);
  append($$anchor, div);
  pop();
}

// custom_components/occupied/frontend/TimingEditor.svelte
var root7 = from_html(
  `<label class="timing-option"><input type="radio"/><span> </span></label>`,
);
var root_15 = from_html(`<button type="button" class="text-button"> </button>`);
var root_25 = from_html(`<!> <!>`, 1);
var root_34 = from_html(`<p class="hint"> </p>`);
var root_42 = from_html(`<!> <!> <!> <!> <!>`, 1);
var root_52 = from_html(
  `<p class="hint" data-timing-explanation="" aria-live="polite"> </p>`,
);
var root_62 = from_html(
  `<div data-editor-section="time"><h3> </h3> <fieldset class="timing-options"><div class="timing-option-row"></div> <!></fieldset> <!> <!> <!></div>`,
);
function TimingEditor($$anchor, $$props) {
  push($$props, true);
  let heading = prop($$props, "heading", 3, "Timing"),
    clockLabel = prop($$props, "clockLabel", 3, "Start time window"),
    windowEndLabel = prop(
      $$props,
      "windowEndLabel",
      3,
      "End of window (optional)",
    ),
    addWindowEndLabel = prop(
      $$props,
      "addWindowEndLabel",
      3,
      "Add end of window",
    ),
    showExplanation = prop($$props, "showExplanation", 3, true),
    explanationSubject = prop($$props, "explanationSubject", 3, "Runs"),
    modes = prop($$props, "modes", 19, () => [
      ["absolute", "Absolute time"],
      ["relative", "Relative to"],
    ]);
  let editor = user_derived(() => $$props.context.editor),
    form = user_derived(() => $$props.context.form),
    time = user_derived(() => $$props.context.time),
    t = user_derived(() => $$props.context.t),
    refresh = user_derived(() => $$props.context.refresh),
    changed = user_derived(() => $$props.context.changed);
  let fieldPrefix = user_derived(() => $$props.context.fieldPrefix || "");
  let choices = user_derived(() => {
    $$props.context;
    let choices2 = timeSourceChoices(
      $$props.panel.draft,
      $$props.context.stepId,
      $$props.panel.catalog,
      get(t),
      $$props.context.randomId,
    );
    if (
      get(time).anchor &&
      !choices2.some((choice) => choice.value === get(time).anchor)
    )
      choices2 = [
        ...choices2,
        {
          value: get(time).anchor,
          name: get(time).anchor,
          group: "Unavailable sources",
        },
      ];
    return choices2;
  });
  var div = root_62();
  var h3 = child(div);
  var text2 = only_child(h3, true);
  var fieldset = sibling(h3, 2);
  var div_1 = child(fieldset);
  each(div_1, 21, modes, index, ($$anchor2, $$item) => {
    var $$array = user_derived(() => to_array(get($$item), 2));
    let value = () => get($$array)[0];
    let label = () => get($$array)[1];
    var label_1 = root7();
    var input = child(label_1);
    remove_input_defaults(input);
    var span = sibling(input);
    var text_1 = only_child(span, true);
    reset(label_1);
    template_effect(
      ($0) => {
        set_attribute2(input, "name", `step-${get(fieldPrefix)}timing-mode`);
        set_value(input, value());
        set_attribute2(input, "data-builder-field", `${get(fieldPrefix)}mode`);
        set_checked(input, get(time).mode === value());
        set_text(text_1, $0);
      },
      [() => get(t)(label())],
    );
    delegated("change", input, (event2) => {
      if (!event2.currentTarget.checked) return;
      get(time).mode = value();
      if (value() === "relative" && !get(time).anchor)
        get(time).anchor = "sun:sunrise";
      if (value() === "duration") {
        get(time).minDuration ||= "1h";
        get(time).maxDuration ||= get(time).minDuration;
      }
      get(changed)("mode");
      $$props.panel.shadowRoot
        .querySelector(`[data-builder-field="${get(fieldPrefix)}mode"]:checked`)
        ?.focus();
    });
    append($$anchor2, label_1);
  });
  reset(div_1);
  var node = sibling(div_1, 2);
  {
    let $0 = user_derived(() => ({ ...get(editor).errors }));
    FieldError(node, {
      key: "mode",
      get fieldPrefix() {
        return get(fieldPrefix);
      },
      get errors() {
        return get($0);
      },
    });
  }
  reset(fieldset);
  var node_1 = sibling(fieldset, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var fragment = root_25();
      var node_2 = first_child(fragment);
      EditorField(node_2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "start",
        get label() {
          return clockLabel();
        },
        get value() {
          return get(time).start;
        },
        update: (value) => (get(time).start = value),
        options: { type: "time", step: 1 },
      });
      var node_3 = sibling(node_2, 2);
      {
        var consequent = ($$anchor3) => {
          EditorField($$anchor3, {
            get panel() {
              return $$props.panel;
            },
            get context() {
              return $$props.context;
            },
            key: "end",
            get label() {
              return windowEndLabel();
            },
            get value() {
              return get(time).end;
            },
            update: (value) => {
              get(time).end = value;
              if (!value) get(editor).showEndTime = false;
            },
            options: { type: "time", step: 1, optional: true },
          });
        };
        var alternate = ($$anchor3) => {
          var button = root_15();
          var text_2 = only_child(button, true);
          template_effect(
            ($0) => set_text(text_2, $0),
            [() => get(t)(addWindowEndLabel())],
          );
          delegated("click", button, () => {
            get(time).end = get(time).start;
            get(editor).showEndTime = true;
            get(changed)("end");
            get(refresh)("end");
          });
          append($$anchor3, button);
        };
        if_block(node_3, ($$render) => {
          if (
            get(time).end ||
            get(editor).showEndTime ||
            get(editor).errors.end
          )
            $$render(consequent);
          else $$render(alternate, -1);
        });
      }
      append($$anchor2, fragment);
    };
    var consequent_2 = ($$anchor2) => {
      var fragment_2 = root_25();
      var node_4 = first_child(fragment_2);
      {
        let $0 = user_derived(() => get(time).minDuration || "");
        EditorField(node_4, {
          get panel() {
            return $$props.panel;
          },
          get context() {
            return $$props.context;
          },
          key: "minDuration",
          label: "Minimum window duration",
          get value() {
            return get($0);
          },
          update: (value) => (get(time).minDuration = value),
          options: { placeholder: "1h" },
        });
      }
      var node_5 = sibling(node_4, 2);
      {
        let $0 = user_derived(() => get(time).maxDuration || "");
        EditorField(node_5, {
          get panel() {
            return $$props.panel;
          },
          get context() {
            return $$props.context;
          },
          key: "maxDuration",
          label: "Maximum window duration",
          get value() {
            return get($0);
          },
          update: (value) => (get(time).maxDuration = value),
          options: { placeholder: "2h", optional: true },
        });
      }
      append($$anchor2, fragment_2);
    };
    var consequent_6 = ($$anchor2) => {
      var fragment_3 = root_42();
      var node_6 = first_child(fragment_3);
      SourcePicker(
        node_6,
        spread_props(() => ({
          hass: $$props.panel._hass,
          choices: get(choices),
          value: get(time).anchor,
          t: get(t),
          error: get(editor).errors.anchor,
          fieldPrefix: get(fieldPrefix),
          onChange: (value) => {
            get(time).anchor = value;
            if (!get(editor).existing && value.startsWith("step:")) {
              const parent = stepEntries(
                $$props.panel.draft,
                $$props.panel.catalog,
                $$props.panel.t,
              ).find((step) => step.id === value.slice(5));
              if (parent) get(form).days = [...parent.days];
            }
            if (!get(editor).existing && value.startsWith("random:")) {
              const parent = randomEntries($$props.panel.draft).find(
                (entry) => entry.id === value.slice(7),
              );
              if (parent) get(form).days = [...parent.days];
            }
            get(changed)("anchor");
            const picker = $$props.panel.shadowRoot.querySelector(
              `[data-builder-field="${get(fieldPrefix)}anchor"]`,
            );
            if (picker && $$props.panel.shadowRoot.activeElement !== picker) {
              picker.focus();
            }
          },
        })),
      );
      var node_7 = sibling(node_6, 2);
      {
        var consequent_3 = ($$anchor3) => {
          var p = root_34();
          var text_3 = only_child(p, true);
          template_effect(
            ($0) => set_text(text_3, $0),
            [
              () =>
                get(t)(
                  "This start follows the selected window's closing time.",
                ),
            ],
          );
          append($$anchor3, p);
        };
        var d = user_derived(() => get(time).anchor.startsWith("random:"));
        if_block(node_7, ($$render) => {
          if (get(d)) $$render(consequent_3);
        });
      }
      var node_8 = sibling(node_7, 2);
      {
        var consequent_4 = ($$anchor3) => {
          var p_1 = root_34();
          var text_4 = only_child(p_1, true);
          template_effect(
            ($0) => set_text(text_4, $0),
            [
              () =>
                get(t)(
                  "Uses the time currently reported by Home Assistant. Time-only helpers repeat daily; dated sources run only on their reported date.",
                ),
            ],
          );
          append($$anchor3, p_1);
        };
        var d_1 = user_derived(() => get(time).anchor.startsWith("entity:"));
        if_block(node_8, ($$render) => {
          if (get(d_1)) $$render(consequent_4);
        });
      }
      var node_9 = sibling(node_8, 2);
      EditorField(node_9, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "startOffset",
        label: "Start offset",
        get value() {
          return get(time).startOffset;
        },
        update: (value) => (get(time).startOffset = value),
        options: { placeholder: "30m or 1h" },
      });
      var node_10 = sibling(node_9, 2);
      {
        var consequent_5 = ($$anchor3) => {
          {
            const trailing = ($$anchor4) => {
              var button_1 = root_15();
              var text_5 = only_child(button_1, true);
              template_effect(
                ($0) => set_text(text_5, $0),
                [() => get(t)("Remove end offset")],
              );
              delegated("click", button_1, () => {
                get(time).endOffset = "";
                get(editor).showEndOffset = false;
                get(changed)("endOffset");
                get(refresh)("startOffset");
              });
              append($$anchor4, button_1);
            };
            EditorField($$anchor3, {
              get panel() {
                return $$props.panel;
              },
              get context() {
                return $$props.context;
              },
              key: "endOffset",
              label: "End offset (optional)",
              get value() {
                return get(time).endOffset;
              },
              update: (value) => (get(time).endOffset = value),
              options: {},
              trailing,
              $$slots: { trailing: true },
            });
          }
        };
        var alternate_1 = ($$anchor3) => {
          var button_2 = root_15();
          var text_6 = only_child(button_2, true);
          template_effect(
            ($0) => set_text(text_6, $0),
            [() => get(t)("Add end offset")],
          );
          delegated("click", button_2, () => {
            get(editor).showEndOffset = true;
            get(refresh)("endOffset");
          });
          append($$anchor3, button_2);
        };
        if_block(node_10, ($$render) => {
          if (
            get(time).endOffset ||
            get(editor).showEndOffset ||
            get(editor).errors.endOffset
          )
            $$render(consequent_5);
          else $$render(alternate_1, -1);
        });
      }
      append($$anchor2, fragment_3);
    };
    var d_2 = user_derived(() => modes().some(([mode]) => mode === "relative"));
    var alternate_2 = ($$anchor2) => {
      var p_2 = root_34();
      var text_7 = only_child(p_2, true);
      template_effect(
        ($0) => set_text(text_7, $0),
        [
          () =>
            get(t)(
              "Choose Absolute time or Duration to replace this saved relative window end.",
            ),
        ],
      );
      append($$anchor2, p_2);
    };
    if_block(node_1, ($$render) => {
      if (get(time).mode === "absolute") $$render(consequent_1);
      else if (get(time).mode === "duration") $$render(consequent_2, 1);
      else if (get(d_2)) $$render(consequent_6, 2);
      else $$render(alternate_2, -1);
    });
  }
  var node_11 = sibling(node_1, 2);
  {
    var consequent_7 = ($$anchor2) => {
      var p_3 = root_52();
      var text_8 = only_child(p_3, true);
      template_effect(
        ($0) => set_text(text_8, $0),
        [
          () =>
            timingExplanation(
              get(time),
              [
                ...stepEntries(
                  $$props.panel.draft,
                  $$props.panel.catalog,
                  $$props.panel.t,
                ),
                ...randomEntries(
                  $$props.panel.draft,
                  $$props.panel.catalog,
                ).map((entry) => ({
                  id: `random:${entry.id}`,
                  name: entry.name,
                })),
              ],
              get(t),
              $$props.panel.catalog.time_sources,
              {
                locale: $$props.panel._hass.locale,
                days: get(form).days,
                subject: explanationSubject(),
                includeHints: explanationSubject() === "Runs",
              },
            ),
        ],
      );
      append($$anchor2, p_3);
    };
    if_block(node_11, ($$render) => {
      if (showExplanation()) $$render(consequent_7);
    });
  }
  var node_12 = sibling(node_11, 2);
  {
    var consequent_8 = ($$anchor2) => {
      var p_4 = root_34();
      var text_9 = only_child(p_4, true);
      template_effect(
        ($0) => set_text(text_9, $0),
        [
          () =>
            get(t)(
              "This program is managed by a file. Add changes to your draft, then export them from Settings.",
            ),
        ],
      );
      append($$anchor2, p_4);
    };
    if_block(node_12, ($$render) => {
      if ($$props.panel.document?.source === "file") $$render(consequent_8);
    });
  }
  reset(div);
  template_effect(
    ($0) => {
      set_attribute2(h3, "id", `step-${get(fieldPrefix)}timing-heading`);
      set_text(text2, $0);
      set_attribute2(
        fieldset,
        "aria-labelledby",
        `step-${get(fieldPrefix)}timing-heading`,
      );
    },
    [() => get(t)(heading())],
  );
  append($$anchor, div);
  pop();
}
delegate(["change", "click"]);

// custom_components/occupied/frontend/EntitiesEditor.svelte
var root8 = from_html(`<p class="hint"> </p>`);
var root_16 = from_html(
  `<div data-editor-section="entities"><h4> </h4> <ha-selector></ha-selector> <!> <!></div>`,
  2,
);
function EntitiesEditor($$anchor, $$props) {
  push($$props, true);
  let label = prop($$props, "label", 3, "Entities");
  let editor = user_derived(() => $$props.context.editor),
    form = user_derived(() => $$props.context.form),
    t = user_derived(() => $$props.context.t),
    changed = user_derived(() => $$props.context.changed);
  let fieldPrefix = user_derived(() => $$props.context.fieldPrefix || "");
  var div = root_16();
  var h4 = child(div);
  var text2 = only_child(h4, true);
  var ha_selector = sibling(h4, 2);
  set_class(ha_selector, 1, "entity-native-selector");
  template_effect(() =>
    set_custom_element_data(
      ha_selector,
      "data-builder-field",
      `${get(fieldPrefix)}entities`,
    ),
  );
  template_effect(
    ($0) => set_custom_element_data(ha_selector, "aria-label", $0),
    [() => get(t)(label())],
  );
  template_effect(() =>
    set_custom_element_data(
      ha_selector,
      "aria-invalid",
      get(editor).errors.entities ? "true" : void 0,
    ),
  );
  template_effect(() =>
    set_custom_element_data(
      ha_selector,
      "aria-describedby",
      get(editor).errors.entities
        ? `step-error-${get(fieldPrefix)}entities`
        : void 0,
    ),
  );
  action(
    ha_selector,
    ($$node, $$action_arg) => properties?.($$node, $$action_arg),
    () => ({
      hass: $$props.panel._hass,
      selector: {
        entity: {
          multiple: get(form).kind !== "scene",
          ...(get(form).kind === "service"
            ? {}
            : {
                filter: {
                  domain:
                    get(form).kind === "scene"
                      ? ["scene"]
                      : get(form).kind === "cover"
                        ? ["cover"]
                        : ["light", "switch"],
                },
              }),
        },
      },
      value:
        get(form).kind === "scene"
          ? get(form).entities[0] || ""
          : get(form).entities,
      required: true,
      narrow: $$props.panel.hasAttribute("narrow"),
    }),
  );
  var node = sibling(ha_selector, 2);
  {
    let $0 = user_derived(() => ({ ...get(editor).errors }));
    FieldError(node, {
      key: "entities",
      get fieldPrefix() {
        return get(fieldPrefix);
      },
      get errors() {
        return get($0);
      },
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent = ($$anchor2) => {
      var p = root8();
      var text_1 = only_child(p, true);
      template_effect(
        ($0) => set_text(text_1, $0),
        [
          () =>
            get(t)(
              "This selection includes a custom entity. Select lights or switches for this step.",
            ),
        ],
      );
      append($$anchor2, p);
    };
    var d = user_derived(
      () =>
        get(form).kind === "entities" &&
        get(form).entities.some((id) => !/^(light|switch)\./.test(id)),
    );
    if_block(node_1, ($$render) => {
      if (get(d)) $$render(consequent);
    });
  }
  reset(div);
  template_effect(($0) => set_text(text2, $0), [() => get(t)(label())]);
  event("value-changed", ha_selector, (event2) => {
    if (!isValueChangedEvent(event2)) return;
    event2.currentTarget.value = event2.detail.value;
    get(form).entities = Array.isArray(event2.detail.value)
      ? event2.detail.value
      : event2.detail.value
        ? [event2.detail.value]
        : [];
    get(changed)("entities");
  });
  append($$anchor, div);
  pop();
}

// custom_components/occupied/frontend/ActionEditor.svelte
var root9 = from_html(`<!> <!> <p class="hint"> </p> <p class="hint"> </p>`, 1);
var root_17 = from_html(
  `<div data-editor-section="action"><h3> </h3> <!> <!> <!> <!> <!></div>`,
);
function ActionEditor($$anchor, $$props) {
  push($$props, true);
  let heading = prop($$props, "heading", 3, "Action"),
    kindLabel = prop($$props, "kindLabel", 3, "Step type"),
    entityLabel = prop($$props, "entityLabel", 3, "Entities"),
    hideEntities = prop($$props, "hideEntities", 3, false);
  let form = user_derived(() => $$props.context.form),
    t = user_derived(() => $$props.context.t);
  var div = root_17();
  var h3 = child(div);
  var text2 = only_child(h3, true);
  var node = sibling(h3, 2);
  {
    let $0 = user_derived(() =>
      get(form).kind === "entities" ? get(form).action : get(form).kind,
    );
    EditorField(node, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return $$props.context;
      },
      key: "kind",
      get label() {
        return kindLabel();
      },
      get value() {
        return get($0);
      },
      update: (value) => {
        const kind =
          value === "turn_on" || value === "turn_off" ? "entities" : value;
        if (get(form).kind !== kind) get(form).entities = [];
        get(form).kind = kind;
        if (kind === "entities") get(form).action = value;
        if (
          kind === "cover" &&
          !coverActions.some(([action2]) => action2 === get(form).service)
        ) {
          get(form).service = "cover.open_cover";
        }
      },
      options: {
        hideLabel: true,
        choices: [
          ["turn_on", "Turn on lights/switches"],
          ["turn_off", "Turn off lights/switches"],
          ["cover", "Control covers"],
          ["service", "Entity service action"],
          ["scene", "Activate Home Assistant scene"],
        ],
        render: true,
      },
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent = ($$anchor2) => {
      EntitiesEditor($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        get label() {
          return entityLabel();
        },
      });
    };
    if_block(node_1, ($$render) => {
      if (!hideEntities()) $$render(consequent);
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    var consequent_1 = ($$anchor2) => {
      EditorField($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "service",
        label: "Service (domain.service)",
        get value() {
          return get(form).service;
        },
        update: (value) => (get(form).service = value),
      });
    };
    if_block(node_2, ($$render) => {
      if (get(form).kind === "service") $$render(consequent_1);
    });
  }
  var node_3 = sibling(node_2, 2);
  {
    var consequent_4 = ($$anchor2) => {
      var fragment_2 = root9();
      var node_4 = first_child(fragment_2);
      {
        let $0 = user_derived(() => ({ choices: coverActions, render: true }));
        EditorField(node_4, {
          get panel() {
            return $$props.panel;
          },
          get context() {
            return $$props.context;
          },
          key: "service",
          label: "Cover action",
          get value() {
            return get(form).service;
          },
          update: (value) => (get(form).service = value),
          get options() {
            return get($0);
          },
        });
      }
      var node_5 = sibling(node_4, 2);
      {
        var consequent_2 = ($$anchor3) => {
          EditorField($$anchor3, {
            get panel() {
              return $$props.panel;
            },
            get context() {
              return $$props.context;
            },
            key: "position",
            label: "Position (%)",
            get value() {
              return get(form).position;
            },
            update: (value) => (get(form).position = value),
            options: { type: "number", min: 0, max: 100, step: 1 },
          });
        };
        var consequent_3 = ($$anchor3) => {
          EditorField($$anchor3, {
            get panel() {
              return $$props.panel;
            },
            get context() {
              return $$props.context;
            },
            key: "tiltPosition",
            label: "Tilt position (%)",
            get value() {
              return get(form).tiltPosition;
            },
            update: (value) => (get(form).tiltPosition = value),
            options: { type: "number", min: 0, max: 100, step: 1 },
          });
        };
        if_block(node_5, ($$render) => {
          if (get(form).service === "cover.set_cover_position")
            $$render(consequent_2);
          else if (get(form).service === "cover.set_cover_tilt_position")
            $$render(consequent_3, 1);
        });
      }
      var p = sibling(node_5, 2);
      var text_1 = only_child(p, true);
      var p_1 = sibling(p, 2);
      var text_2 = only_child(p_1, true);
      template_effect(
        ($0, $1) => {
          set_text(text_1, $0);
          set_text(text_2, $1);
        },
        [
          () =>
            get(t)(
              "0% is closed; 100% is open. Device support determines which cover actions are available.",
            ),
          () =>
            get(t)(
              "Covers run only at scheduled times. Enabling late skips past cover actions.",
            ),
        ],
      );
      append($$anchor2, fragment_2);
    };
    if_block(node_3, ($$render) => {
      if (get(form).kind === "cover") $$render(consequent_4);
    });
  }
  var node_6 = sibling(node_3, 2);
  {
    var consequent_5 = ($$anchor2) => {
      EditorField($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return $$props.context;
        },
        key: "data",
        label: "Service data (JSON)",
        get value() {
          return get(form).data;
        },
        update: (value) => (get(form).data = value),
        options: { multiline: true },
      });
    };
    if_block(node_6, ($$render) => {
      if (get(form).kind === "scene" || get(form).kind === "service")
        $$render(consequent_5);
    });
  }
  reset(div);
  template_effect(($0) => set_text(text2, $0), [() => get(t)(heading())]);
  append($$anchor, div);
  pop();
}

// custom_components/occupied/frontend/StepEditor.svelte
var root10 = from_html(
  `<section class="step-editor"><div class="step-name-editor"><!></div> <div class="editor-sections"><!> <!></div> <!> <div class="builder-footer"><button type="button"> </button> <!> <button type="button" class="primary" data-step-submit=""> </button></div></section>`,
);
function StepEditor($$anchor, $$props) {
  push($$props, true);
  let context = user_derived(() => {
    $$props.revision;
    return createStepEditorContext($$props.panel);
  });
  let editor = user_derived(() => get(context).editor),
    form = user_derived(() => get(context).form),
    t = user_derived(() => get(context).t),
    editing = user_derived(() => get(context).editing),
    submit = user_derived(() => get(context).submit),
    cancel = user_derived(() => get(context).cancel);
  var section = root10();
  var div = child(section);
  var node = child(div);
  {
    let $0 = user_derived(() => ({
      hideLabel: true,
      placeholder: get(editing) ? void 0 : get(t)("Optional title"),
    }));
    EditorField(node, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get(context);
      },
      key: "name",
      label: "Step name",
      get value() {
        return get(form).name;
      },
      update: (value) => (get(form).name = value),
      get options() {
        return get($0);
      },
    });
  }
  reset(div);
  var div_1 = sibling(div, 2);
  var node_1 = child(div_1);
  TimingEditor(node_1, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
  });
  var node_2 = sibling(node_1, 2);
  ActionEditor(node_2, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
  });
  reset(div_1);
  var node_3 = sibling(div_1, 2);
  {
    let $0 = user_derived(() => ({ ...get(editor).errors }));
    FieldError(node_3, {
      key: "days",
      get errors() {
        return get($0);
      },
    });
  }
  var div_2 = sibling(node_3, 2);
  var button = child(div_2);
  var text2 = only_child(button, true);
  var node_4 = sibling(button, 2);
  {
    var consequent_1 = ($$anchor2) => {
      const entry = user_derived(() =>
        stepEntries(
          $$props.panel.draft,
          $$props.panel.catalog,
          $$props.panel.t,
        ).find((item) => item.id === get(editor).id),
      );
      var fragment = comment();
      var node_5 = first_child(fragment);
      {
        var consequent = ($$anchor3) => {
          StepActions($$anchor3, {
            get panel() {
              return $$props.panel;
            },
            get entry() {
              return get(entry);
            },
            get context() {
              return get(context);
            },
          });
        };
        if_block(node_5, ($$render) => {
          if (get(entry)) $$render(consequent);
        });
      }
      append($$anchor2, fragment);
    };
    var alternate = ($$anchor2) => {
      StepActions($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return get(context);
        },
      });
    };
    if_block(node_4, ($$render) => {
      if (get(editing)) $$render(consequent_1);
      else $$render(alternate, -1);
    });
  }
  var button_1 = sibling(node_4, 2);
  var text_1 = only_child(button_1, true);
  reset(div_2);
  reset(section);
  template_effect(
    ($0, $1) => {
      button.disabled = $$props.panel.busy;
      set_text(text2, $0);
      button_1.disabled = $$props.panel.busy || $$props.panel.stale;
      set_text(text_1, $1);
    },
    [
      () => get(t)("Cancel"),
      () =>
        get(t)(
          $$props.panel.document?.source === "file"
            ? "Add to draft"
            : "Save step",
        ),
    ],
  );
  delegated("click", button, function (...$$args) {
    get(cancel)?.apply(this, $$args);
  });
  delegated("click", button_1, function (...$$args) {
    get(submit)?.apply(this, $$args);
  });
  append($$anchor, section);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/StepsView.svelte
var root11 = from_html(
  `<section class="step-empty"><h2> </h2> <p class="hint"> </p> <button type="button" class="primary" data-create-step=""> </button></section>`,
);
var root_18 = from_html(`<span class="step-status-badge"> </span>`);
var root_26 = from_html(`<span class="step-warning-message"> </span>`);
var root_35 = from_html(
  `<span class="step-row-warning"><ha-icon></ha-icon> <span></span></span>`,
  2,
);
var root_43 = from_html(`<span class="step-row-time"> </span>`);
var root_53 = from_html(`<div><!></div>`);
var root_63 = from_html(
  `<div><button type="button"><span class="step-row-content"><span class="step-row-heading"><strong> </strong> <!></span> <span class="hint"> </span></span> <!></button> <!></div>`,
);
var root_7 = from_html(
  `<div class="step-layout"><div class="step-list"></div></div> <button type="button" class="primary" data-create-step=""> </button>`,
  1,
);
function StepsView($$anchor, $$props) {
  push($$props, true);
  let data = user_derived(() => {
    $$props.revision;
    const entries2 = stepEntries(
      $$props.panel.draft,
      $$props.panel.catalog,
      $$props.panel.t,
    );
    return {
      t: $$props.panel.t,
      entries: entries2,
      issues: $$props.panel
        .visibleIssues()
        .map((issue) => ({ issue, stepId: warningStepId(issue, entries2) })),
    };
  });
  let t = user_derived(() => get(data).t),
    entries = user_derived(() => get(data).entries),
    issues = user_derived(() => get(data).issues);
  var fragment = comment();
  var node = first_child(fragment);
  {
    var consequent = ($$anchor2) => {
      var section = root11();
      var h2 = child(section);
      var text2 = only_child(h2, true);
      var p = sibling(h2, 2);
      var text_1 = only_child(p, true);
      var button = sibling(p, 2);
      var text_2 = only_child(button, true);
      reset(section);
      template_effect(
        ($0, $1, $2) => {
          set_text(text2, $0);
          set_text(text_1, $1);
          button.disabled = $$props.panel.busy;
          set_text(text_2, $2);
        },
        [
          () => get(t)("Scheduled activity"),
          () =>
            get(t)(
              "Run actions at specific times, around sunrise or sunset, or relative to other steps. Choose which devices to control and what they should do.",
            ),
          () => get(t)("Create your first step"),
        ],
      );
      delegated("click", button, () => startStep($$props.panel));
      append($$anchor2, section);
    };
    var alternate = ($$anchor2) => {
      var fragment_1 = root_7();
      var div = first_child(fragment_1);
      var div_1 = child(div);
      each(
        div_1,
        21,
        () => stepTree(get(entries)),
        ({ entry, depth }) => entry.id,
        ($$anchor3, $$item) => {
          let entry = () => get($$item).entry;
          let depth = () => get($$item).depth;
          const warnings = user_derived(() =>
            get(issues)
              .filter(({ stepId }) => stepId === entry().id)
              .map(({ issue }) => issue),
          );
          const editing = user_derived(
            () =>
              $$props.panel.stepEditor?.existing &&
              $$props.panel.stepEditor.id === entry().id,
          );
          const stepDisabled = user_derived(() =>
            get(editing)
              ? $$props.panel.stepEditor?.form.enabled === false
              : entry().enabled === false,
          );
          const expanded = user_derived(
            () =>
              get(editing) ||
              (!$$props.panel.stepEditor &&
                $$props.panel.selectedStep === entry().id),
          );
          var div_2 = root_63();
          let classes;
          var button_1 = child(div_2);
          let classes_1;
          var span = child(button_1);
          var span_1 = child(span);
          var strong = child(span_1);
          var text_3 = only_child(strong, true);
          var node_1 = sibling(strong, 2);
          {
            var consequent_1 = ($$anchor4) => {
              var span_2 = root_18();
              var text_4 = only_child(span_2, true);
              template_effect(
                ($0) => set_text(text_4, $0),
                [() => get(t)("Disabled")],
              );
              append($$anchor4, span_2);
            };
            if_block(node_1, ($$render) => {
              if (get(stepDisabled)) $$render(consequent_1);
            });
          }
          reset(span_1);
          var span_3 = sibling(span_1, 2);
          var text_5 = only_child(span_3);
          reset(span);
          var node_2 = sibling(span, 2);
          {
            var consequent_2 = ($$anchor4) => {
              var span_4 = root_35();
              var ha_icon = child(span_4);
              set_custom_element_data(ha_icon, "icon", "mdi:alert-outline");
              set_custom_element_data(ha_icon, "aria-hidden", "true");
              var span_5 = sibling(ha_icon, 2);
              each(
                span_5,
                21,
                () => get(warnings),
                index,
                ($$anchor5, warning) => {
                  var span_6 = root_26();
                  var text_6 = only_child(span_6, true);
                  template_effect(() => set_text(text_6, get(warning).message));
                  append($$anchor5, span_6);
                },
              );
              reset(span_5);
              reset(span_4);
              template_effect(() =>
                set_attribute2(span_4, "id", `step-warning-${entry().id}`),
              );
              append($$anchor4, span_4);
            };
            var consequent_3 = ($$anchor4) => {
              var span_7 = root_43();
              var text_7 = only_child(span_7, true);
              template_effect(
                ($0) => set_text(text_7, $0),
                [
                  () =>
                    timingSummary(
                      entry(),
                      get(entries),
                      get(t),
                      $$props.panel.catalog.time_sources,
                      $$props.panel._hass.locale,
                    ),
                ],
              );
              append($$anchor4, span_7);
            };
            if_block(node_2, ($$render) => {
              if (get(warnings).length) $$render(consequent_2);
              else if (!get(editing)) $$render(consequent_3, 1);
            });
          }
          reset(button_1);
          var node_3 = sibling(button_1, 2);
          {
            var consequent_5 = ($$anchor4) => {
              var div_3 = root_53();
              var node_4 = child(div_3);
              {
                var consequent_4 = ($$anchor5) => {
                  StepEditor($$anchor5, {
                    get panel() {
                      return $$props.panel;
                    },
                    get revision() {
                      return $$props.revision;
                    },
                  });
                };
                if_block(node_4, ($$render) => {
                  if ($$props.panel.stepEditor) $$render(consequent_4);
                });
              }
              reset(div_3);
              template_effect(() =>
                set_attribute2(div_3, "id", `step-editor-${entry().id}`),
              );
              append($$anchor4, div_3);
            };
            if_block(node_3, ($$render) => {
              if (get(expanded)) $$render(consequent_5);
            });
          }
          reset(div_2);
          template_effect(
            ($0, $1, $2, $3) => {
              classes = set_class(div_2, 1, "step-card", null, classes, {
                "step-disabled": get(stepDisabled),
                "step-warning": get(warnings).length > 0,
              });
              set_attribute2(div_2, "data-step-id", entry().id);
              set_style(div_2, $0);
              set_attribute2(button_1, "id", `step-card-${entry().id}`);
              classes_1 = set_class(button_1, 1, "step-row", null, classes_1, {
                editing: get(editing) && !get(warnings).length,
              });
              set_attribute2(button_1, "aria-label", $1);
              button_1.disabled = $$props.panel.busy;
              set_attribute2(button_1, "aria-expanded", get(expanded));
              set_attribute2(
                button_1,
                "aria-controls",
                `step-editor-${entry().id}`,
              );
              set_attribute2(
                button_1,
                "aria-describedby",
                get(warnings).length ? `step-warning-${entry().id}` : void 0,
              );
              set_text(text_3, entry().name);
              set_text(
                text_5,
                `${$2 ?? ""} \xB7
                ${$3 ?? ""}`,
              );
            },
            [
              () => `--depth:${Math.min(depth(), 3)}`,
              () =>
                get(stepDisabled)
                  ? `${entry().name} \xB7 ${get(t)("Disabled")}`
                  : entry().name,
              () => actionSummary(entry(), get(t)),
              () =>
                entry()
                  .entities.map((id) => entityName($$props.panel.catalog, id))
                  .join(", "),
            ],
          );
          delegated("click", button_1, () => openStep($$props.panel, entry()));
          append($$anchor3, div_2);
        },
      );
      reset(div_1);
      reset(div);
      var button_2 = sibling(div, 2);
      var text_8 = only_child(button_2, true);
      template_effect(
        ($0, $1) => {
          set_attribute2(div_1, "aria-label", $0);
          button_2.disabled = $$props.panel.busy;
          set_text(text_8, $1);
        },
        [() => get(t)("Steps"), () => get(t)("Create step")],
      );
      delegated("click", button_2, () => startStep($$props.panel));
      append($$anchor2, fragment_1);
    };
    if_block(node, ($$render) => {
      if (!get(entries).length) $$render(consequent);
      else $$render(alternate, -1);
    });
  }
  append($$anchor, fragment);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/SettingsView.svelte
var root12 = from_html(`<span class="changes svelte-82irif"> </span>`);
var root_19 = from_html(
  `<section><h2> <!></h2> <p class="hint"> </p> <input type="file" accept=".yaml,.yml,.json"/> <ha-code-editor></ha-code-editor> <div class="yaml-actions svelte-82irif"><button type="button" class="primary"> </button> <button type="button"> </button> <button type="button" class="download svelte-82irif"> </button></div></section>`,
  2,
);
var $$css = {
  hash: "svelte-82irif",
  code: ".yaml-actions.svelte-82irif {display:flex;align-items:center;flex-wrap:wrap;gap:8px;}.yaml-actions.svelte-82irif .download:where(.svelte-82irif) {margin-left:auto;}ha-code-editor.svelte-82irif {display:block;width:100%;margin:8px 0;--code-mirror-height: 420px;--code-mirror-max-height: 60vh;}section.yaml-panel.svelte-82irif {border-color:var(--divider-color, #d5dce3);border-left-color:var(--divider-color, #d5dce3);background:var(--card-background-color, #fff);}section.yaml-panel.has-changes.svelte-82irif {border-color:var(--warning-color, #e69500);border-left-color:var(--warning-color, #e69500);background:color-mix(\n      in srgb,\n      var(--warning-color, #e69500) 18%,\n      var(--card-background-color, #fff)\n    );}.changes.svelte-82irif {color:var(--warning-color, #e69500);font-size:0.75em;font-weight:500;}",
};
function SettingsView($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css);
  let panel = prop($$props, "panel", 7);
  let data = user_derived(() => {
    $$props.revision;
    return { t: panel().t };
  });
  let t = user_derived(() => get(data).t);
  let yamlDirty = user_derived(() => panel().yamlDirty);
  let autoExportStarted = false;
  user_effect(() => {
    $$props.revision;
    if (!autoExportStarted && !panel().busy) {
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled) return;
        autoExportStarted = true;
        void panel().exportYaml();
      });
      return () => {
        cancelled = true;
      };
    }
  });
  var section = root_19();
  let classes;
  var h2 = child(section);
  var text2 = child(h2);
  var node = sibling(text2);
  {
    var consequent = ($$anchor2) => {
      var span = root12();
      var text_1 = only_child(span);
      template_effect(
        ($0) => set_text(text_1, `(${$0 ?? ""})`),
        [() => get(t)("changes")],
      );
      append($$anchor2, span);
    };
    if_block(node, ($$render) => {
      if (get(yamlDirty)) $$render(consequent);
    });
  }
  reset(h2);
  var p = sibling(h2, 2);
  var text_2 = only_child(p, true);
  var input = sibling(p, 2);
  var ha_code_editor = sibling(input, 2);
  set_custom_element_data(ha_code_editor, "role", "group");
  template_effect(
    ($0) => set_custom_element_data(ha_code_editor, "aria-label", $0),
    [() => get(t)("Occupied YAML")],
  );
  set_custom_element_data(ha_code_editor, "dir", "ltr");
  set_class(ha_code_editor, 1, "svelte-82irif");
  action(
    ha_code_editor,
    ($$node, $$action_arg) => properties?.($$node, $$action_arg),
    () => ({ mode: "yaml", value: panel().yaml, linewrap: true }),
  );
  var div = sibling(ha_code_editor, 2);
  var button = child(div);
  var text_3 = only_child(button, true);
  var button_1 = sibling(button, 2);
  var text_4 = only_child(button_1, true);
  var button_2 = sibling(button_1, 2);
  var text_5 = only_child(button_2, true);
  reset(div);
  reset(section);
  template_effect(
    ($0, $1, $2, $3, $4, $5) => {
      classes = set_class(
        section,
        1,
        "yaml-panel svelte-82irif",
        null,
        classes,
        { "has-changes": get(yamlDirty) },
      );
      set_text(text2, `${$0 ?? ""} `);
      set_text(text_2, $1);
      set_attribute2(input, "aria-label", $2);
      ha_code_editor.dir = ha_code_editor.dir;
      button.disabled =
        panel().busy ||
        panel().stale ||
        panel().document.source === "file" ||
        !panel().yaml;
      set_text(text_3, $3);
      button_1.disabled = panel().busy || !get(yamlDirty);
      set_text(text_4, $4);
      button_2.disabled = panel().busy || !panel().yaml;
      set_text(text_5, $5);
    },
    [
      () => get(t)("YAML"),
      () =>
        get(t)(
          "Edit the YAML and save to validate and apply your changes. Invalid code is kept in the editor.",
        ),
      () => get(t)("Choose configuration file"),
      () => get(t)("Save changes"),
      () => get(t)("Discard changes"),
      () => get(t)("Download"),
    ],
  );
  delegated("change", input, async (event2) => {
    const file = event2.currentTarget.files?.[0];
    if (file) {
      const epoch = panel().epoch;
      const yaml = await file.text();
      if (epoch !== panel().epoch) return;
      panel().yaml = yaml;
      panel().flush();
    }
  });
  event("value-changed", ha_code_editor, (event2) => {
    if (!isValueChangedEvent(event2) || typeof event2.detail.value !== "string")
      return;
    panel().yaml = event2.detail.value;
    panel().flush();
  });
  delegated("click", button, () => panel().saveYaml());
  delegated("click", button_1, () => panel().discardYaml());
  delegated("click", button_2, () =>
    download("occupied.yaml", panel().yaml, "text/yaml"),
  );
  append($$anchor, section);
  pop();
}
delegate(["change", "click"]);

// custom_components/occupied/frontend/ha-controls.ts
async function loadHaControls() {
  if (
    customElements.get("ha-selector") &&
    customElements.get("ha-generic-picker") &&
    customElements.get("ha-top-app-bar-fixed") &&
    customElements.get("ha-code-editor")
  ) {
    return;
  }
  await customElements.whenDefined("partial-panel-resolver");
  const resolver = document.createElement("partial-panel-resolver");
  await resolver
    ._getRoutes([{ url_path: "config", component_name: "config" }])
    .routes.config.load();
  await customElements.whenDefined("ha-panel-config");
  const config = document.createElement("ha-panel-config");
  await Promise.all([
    config.routerOptions.routes.automation.load(),
    config.routerOptions.routes.integrations.load(),
  ]);
  await Promise.all([
    customElements.whenDefined("ha-selector"),
    customElements.whenDefined("ha-generic-picker"),
    customElements.whenDefined("ha-top-app-bar-fixed"),
    customElements.whenDefined("ha-code-editor"),
  ]);
}
var historyChartLoad;
function loadHaHistoryChart() {
  if (customElements.get("state-history-chart-timeline")) {
    return Promise.resolve();
  }
  historyChartLoad ??= (async () => {
    await customElements.whenDefined("partial-panel-resolver");
    const resolver = document.createElement("partial-panel-resolver");
    await resolver
      ._getRoutes([{ url_path: "history", component_name: "history" }])
      .routes.history.load();
    if (!customElements.get("state-history-chart-timeline")) {
      throw new Error("Home Assistant history chart is unavailable");
    }
  })().catch((error) => {
    historyChartLoad = void 0;
    throw error;
  });
  return historyChartLoad;
}

// custom_components/occupied/frontend/timeline.ts
function calendarDayPlan(plans, date) {
  const current = plans.find((plan) => plan.simulation_date === date);
  if (!current) {
    return void 0;
  }
  const start = calendarMidnight(date, current.timezone);
  const end = calendarMidnight(shiftScheduleDate(date, 1), current.timezone);
  const within = (time) =>
    Date.parse(time) >= Date.parse(start) && Date.parse(time) < Date.parse(end);
  return {
    ...current,
    start,
    end,
    events: plans
      .flatMap((plan) => plan.events)
      .filter((event2) => within(event2.time))
      .sort((a, b) => Date.parse(a.time) - Date.parse(b.time)),
    issues: plans.flatMap((plan) => plan.issues),
  };
}
function previewStateHistory(plan, _program, names = {}, t = (text2) => text2) {
  const start = Date.parse(plan.start),
    end = Date.parse(plan.end);
  const entities = /* @__PURE__ */ new Map();
  const covers = /* @__PURE__ */ new Map();
  const stateLabels = { on: "On", off: "Off" };
  const label = (state2) => t(stateLabels[state2] || "Unknown");
  for (const event2 of [...plan.events].sort(
    (a, b) => Date.parse(a.time) - Date.parse(b.time),
  )) {
    const at = Date.parse(event2.time);
    if (at >= end) {
      continue;
    }
    const typed = /^(light|switch)\.turn_(on|off)$/.test(event2.action.action);
    for (const entity of event2.action.entities) {
      if (!/^(light|switch|cover)\./.test(entity)) {
        continue;
      }
      let history2 = entities.get(entity);
      if (!history2) {
        history2 = {
          entity_id: entity,
          name: names[entity] || entity,
          data: [
            {
              state: "unknown",
              state_localize: label("unknown"),
              last_changed: start,
            },
          ],
        };
        entities.set(entity, history2);
      }
      const intended = event2.action.action.endsWith("turn_on") ? "on" : "off";
      let state2 =
        typed && event2.action.action.startsWith(`${entity.split(".", 1)[0]}.`)
          ? intended
          : "unknown";
      let localized = label(state2);
      if (entity.startsWith("cover.")) {
        const target = coverTarget(event2.action, covers.get(entity));
        covers.set(entity, target);
        const parts = [];
        if (target.position !== void 0) {
          let position = t("Position {position}%").replace("{position}", () =>
            String(target.position),
          );
          if (target.position === 100) {
            position = t("Open");
          } else if (target.position === 0) {
            position = t("Closed");
          }
          parts.push(position);
        }
        if (target.tilt_position !== void 0) {
          parts.push(
            t("Tilt {position}%").replace("{position}", () =>
              String(target.tilt_position),
            ),
          );
        }
        state2 = parts.length > 0 ? JSON.stringify(target) : "unknown";
        localized = parts.length > 0 ? parts.join(" \xB7 ") : label("unknown");
      }
      const previous = history2.data.at(-1);
      const time = Math.max(start, at);
      if (previous.last_changed === time) {
        previous.state = state2;
        previous.state_localize = localized;
      } else if (previous.state !== state2) {
        history2.data.push({
          state: state2,
          state_localize: localized,
          last_changed: time,
        });
      }
    }
  }
  return [...entities.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function calendarStateHistory(
  plans,
  day,
  program,
  names = {},
  t = (text2) => text2,
) {
  const start = Date.parse(day.start),
    end = Date.parse(day.end);
  const events = plans
    .flatMap((plan) => plan.events)
    .filter(
      (event2) =>
        Date.parse(event2.time) >= start && Date.parse(event2.time) < end,
    );
  return previewStateHistory({ ...day, events }, program, names, t);
}
function stamp(value, zone, locale) {
  if (!value) {
    return "\u2014";
  }
  try {
    return formatTimestamp(value, zone, locale);
  } catch {
    return value;
  }
}

// custom_components/occupied/frontend/PreviewStateGraph.svelte
var root13 = from_html(`<p class="hint"> </p>`);
var root_110 = from_html(
  `<state-history-chart-timeline></state-history-chart-timeline>`,
  2,
);
var root_27 = from_html(`<p role="status"> </p>`);
var root_36 = from_html(`<!> <!> <!>`, 1);
var $$css2 = {
  hash: "svelte-1cnjgem",
  code: "state-history-chart-timeline.svelte-1cnjgem {display:block;width:100%;}state-history-chart-timeline[hidden].svelte-1cnjgem {display:none;}",
};
function PreviewStateGraph($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css2);
  let names = prop($$props, "names", 19, () => ({}));
  let ready = state(false);
  let failed = state(false);
  let narrow = state(false);
  let data = user_derived(() =>
    $$props.schedulePlans
      ? calendarStateHistory(
          $$props.schedulePlans,
          $$props.plan,
          $$props.program,
          names(),
          $$props.t,
        )
      : previewStateHistory($$props.plan, $$props.program, names(), $$props.t),
  );
  let chartHass = user_derived(() => ({
    ...$$props.hass,
    config: { ...$$props.hass.config, time_zone: $$props.plan.timezone },
    locale: { ...$$props.hass.locale, time_zone: "server" },
  }));
  onMount(() => {
    let disposed = false;
    const media = window.matchMedia("(max-width: 600px)");
    const updateNarrow = () => {
      set2(narrow, media.matches, true);
    };
    updateNarrow();
    media.addEventListener("change", updateNarrow);
    loadHaHistoryChart().then(
      () => {
        if (!disposed) set2(ready, true);
      },
      () => {
        if (!disposed) set2(failed, true);
      },
    );
    return () => {
      disposed = true;
      media.removeEventListener("change", updateNarrow);
    };
  });
  var fragment = root_36();
  var node = first_child(fragment);
  {
    var consequent = ($$anchor2) => {
      var p = root13();
      var text2 = only_child(p, true);
      template_effect(
        ($0) => set_text(text2, $0),
        [
          () =>
            $$props.t(
              $$props.plan.events.length === 0
                ? "No steps are scheduled for this date."
                : "No light, switch, or cover actions on this date. Other actions are listed in Event details.",
            ),
        ],
      );
      append($$anchor2, p);
    };
    if_block(node, ($$render) => {
      if (!get(data).length) $$render(consequent);
    });
  }
  var node_1 = sibling(node, 2);
  {
    var consequent_1 = ($$anchor2) => {
      var p_1 = root13();
      var text_1 = only_child(p_1, true);
      template_effect(
        ($0) => set_text(text_1, $0),
        [
          () =>
            $$props.t(
              "Cover strips show planned position and tilt targets. Travel time and positions after stop actions are unknown.",
            ),
        ],
      );
      append($$anchor2, p_1);
    };
    var d = user_derived(() =>
      get(data).some((entity) => entity.entity_id.startsWith("cover.")),
    );
    if_block(node_1, ($$render) => {
      if (get(d)) $$render(consequent_1);
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    var consequent_2 = ($$anchor2) => {
      var p_2 = root13();
      var text_2 = only_child(p_2, true);
      template_effect(
        ($0) => set_text(text_2, $0),
        [
          () =>
            $$props.t(
              "The Home Assistant graph could not load. Planned actions are available in Event details.",
            ),
        ],
      );
      append($$anchor2, p_2);
    };
    var consequent_3 = ($$anchor2) => {
      var state_history_chart_timeline = root_110();
      template_effect(() =>
        set_custom_element_data(
          state_history_chart_timeline,
          "hidden",
          get(data).length === 0,
        ),
      );
      template_effect(
        ($0) =>
          set_custom_element_data(
            state_history_chart_timeline,
            "aria-label",
            $0,
          ),
        [() => $$props.t("Planned device states")],
      );
      set_class(state_history_chart_timeline, 1, "svelte-1cnjgem");
      action(
        state_history_chart_timeline,
        ($$node, $$action_arg) => properties?.($$node, $$action_arg),
        () => ({
          hass: get(chartHass),
          data: get(data),
          names: names(),
          startTime: new Date($$props.plan.start),
          endTime: new Date($$props.plan.end),
          showNames: true,
          narrow: get(narrow),
          paddingYAxis: get(narrow) ? 105 : 185,
          clickForMoreInfo: false,
        }),
      );
      append($$anchor2, state_history_chart_timeline);
    };
    var consequent_4 = ($$anchor2) => {
      var p_3 = root_27();
      var text_3 = only_child(p_3, true);
      template_effect(
        ($0) => set_text(text_3, $0),
        [() => $$props.t("Loading graph\u2026")],
      );
      append($$anchor2, p_3);
    };
    if_block(node_2, ($$render) => {
      if (get(failed) && get(data).length > 0) $$render(consequent_2);
      else if (get(ready)) $$render(consequent_3, 1);
      else if (get(data).length > 0) $$render(consequent_4, 2);
    });
  }
  append($$anchor, fragment);
  pop();
}

// custom_components/occupied/frontend/live-preview.ts
function liveRunning(session) {
  return (
    !!session && ["ready", "executing", "stopping"].includes(session.state)
  );
}
function mergeLiveSession(previous, incoming) {
  if (!incoming || previous?.id !== incoming.id) {
    return incoming;
  }
  if (incoming.cursor < previous.cursor) {
    return previous;
  }
  const states = [
    "ready",
    "executing",
    "stopping",
    "completed",
    "stopped",
    "interrupted",
  ];
  if (
    incoming.cursor === previous.cursor &&
    states.indexOf(incoming.state) < states.indexOf(previous.state)
  ) {
    return previous;
  }
  const terminal = /* @__PURE__ */ new Set([
    "completed",
    "stopped",
    "interrupted",
  ]);
  if (terminal.has(previous.state) && !terminal.has(incoming.state)) {
    return previous;
  }
  return {
    ...incoming,
    outcomes: { ...previous.outcomes, ...incoming.outcomes },
  };
}
function eventLiveResult(event2, session) {
  if (!session || !event2.group_id) {
    return;
  }
  const outcome = event2.id ? session.outcomes[event2.id] : void 0;
  const current =
    session.next_group?.id === event2.group_id && liveRunning(session);
  return { current, outcome };
}
function lastGroupResult(session) {
  const outcomes = Object.values(session.outcomes).filter(
    (outcome) => outcome.group_id === session.last_group_id,
  );
  if (outcomes.length === 0) {
    return "";
  }
  const succeeded = outcomes.filter(
    (outcome) => outcome.status === "dispatched",
  ).length;
  if (succeeded === outcomes.length) {
    return "Dispatched";
  }
  return succeeded > 0 ? "Partial success" : "Event failed or interrupted";
}

// custom_components/occupied/frontend/Timeline.svelte
var root14 = from_html(`<h2> </h2>`);
var root_111 = from_html(`<th scope="col"> </th>`);
var root_28 = from_html(`<td> </td>`);
var root_37 = from_html(`<span> </span> <div> </div>`, 1);
var root_44 = from_html(`<td><!></td>`);
var root_54 = from_html(`<tr><!><!></tr>`);
var root_64 = from_html(
  `<details><summary> </summary> <p class="hint"> </p> <input type="search"/> <div><div class="table-wrap"><table><thead><tr><!><!></tr></thead><tbody></tbody></table></div> <div class="row"><button type="button"> </button> <span> </span> <button type="button"> </button></div></div></details>`,
);
var root_72 = from_html(`<p> </p>`);
var root_8 = from_html(`<!> <!> <!>`, 1);
var root_9 = from_html(`<p role="status"> </p>`);
var root_10 = from_html(`<section><!> <!></section>`);
var $$css3 = {
  hash: "svelte-16g6nis",
  code: "tr.current.svelte-16g6nis {background:var(--secondary-background-color, #eef4ff);outline:2px solid var(--primary-color, #03a9f4);outline-offset:-2px;}tr.completed.svelte-16g6nis {background:color-mix(\n      in srgb,\n      var(--success-color, #4caf50) 12%,\n      transparent\n    );}",
};
function Timeline($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css3);
  let t = prop($$props, "t", 3, (text2) => text2),
    entityNames = prop($$props, "entityNames", 19, () => ({})),
    loading = prop($$props, "loading", 3, false),
    showLoading = prop($$props, "showLoading", 19, loading),
    liveSession = prop($$props, "liveSession", 3, null);
  let labels = user_derived(
    () =>
      new Map([
        ...stepEntries($$props.program || {}).map((resource) => [
          `step:${resource.id}`,
          resource.name,
        ]),
        ...randomEntries($$props.program || {}).map((resource) => [
          `random:${resource.id}`,
          resource.name,
        ]),
      ]),
  );
  function eventLabel(event2) {
    return (
      get(labels).get(
        `${event2.kind.startsWith("random_") ? "random" : "step"}:${event2.source_id}`,
      ) || event2.source_id
    );
  }
  let query = state("");
  let page = state(0);
  let filtered = user_derived(
    () =>
      $$props.plan?.events.filter(
        (event2) =>
          JSON.stringify(event2).toLowerCase().includes(get(query)) ||
          eventLabel(event2).toLowerCase().includes(get(query)),
      ) ?? [],
  );
  let currentPage = user_derived(() =>
    Math.max(0, Math.min(get(page), Math.ceil(get(filtered).length / 50) - 1)),
  );
  var section = root_10();
  var node = child(section);
  {
    var consequent = ($$anchor2) => {
      var fragment = comment();
      var node_1 = first_child(fragment);
      snippet(node_1, () => $$props.heading);
      append($$anchor2, fragment);
    };
    var consequent_1 = ($$anchor2) => {
      var h2 = root14();
      var text_1 = only_child(h2, true);
      template_effect(
        ($0) => set_text(text_1, $0),
        [
          () =>
            formatScheduleDate($$props.plan.simulation_date, $$props.locale),
        ],
      );
      append($$anchor2, h2);
    };
    if_block(node, ($$render) => {
      if ($$props.heading) $$render(consequent);
      else if ($$props.plan) $$render(consequent_1, 1);
    });
  }
  var node_2 = sibling(node, 2);
  {
    var consequent_7 = ($$anchor2) => {
      var fragment_1 = root_8();
      var node_3 = first_child(fragment_1);
      PreviewStateGraph(node_3, {
        get plan() {
          return $$props.plan;
        },
        get schedulePlans() {
          return $$props.schedulePlans;
        },
        get program() {
          return $$props.program;
        },
        get hass() {
          return $$props.hass;
        },
        get names() {
          return entityNames();
        },
        get t() {
          return t();
        },
      });
      var node_4 = sibling(node_3, 2);
      {
        var consequent_6 = ($$anchor3) => {
          var details = root_64();
          var summary = child(details);
          var text_2 = only_child(summary);
          var p = sibling(summary, 2);
          var text_3 = only_child(p);
          var input = sibling(p, 2);
          var div = sibling(input, 2);
          var div_1 = child(div);
          var table = child(div_1);
          var thead = child(table);
          var tr = child(thead);
          var node_5 = child(tr);
          each(
            node_5,
            16,
            () => ["Planned time", "Source", "Action", "Targets"],
            index,
            ($$anchor4, label) => {
              var th = root_111();
              var text_4 = only_child(th, true);
              template_effect(($0) => set_text(text_4, $0), [() => t()(label)]);
              append($$anchor4, th);
            },
          );
          var node_6 = sibling(node_5);
          {
            var consequent_2 = ($$anchor4) => {
              var th_1 = root_111();
              var text_5 = only_child(th_1, true);
              template_effect(
                ($0) => set_text(text_5, $0),
                [() => t()("Result")],
              );
              append($$anchor4, th_1);
            };
            if_block(node_6, ($$render) => {
              if (liveSession()) $$render(consequent_2);
            });
          }
          reset(tr);
          reset(thead);
          var tbody = sibling(thead);
          each(
            tbody,
            21,
            () =>
              get(filtered).slice(
                get(currentPage) * 50,
                get(currentPage) * 50 + 50,
              ),
            index,
            ($$anchor4, event2) => {
              const live = user_derived(() =>
                eventLiveResult(get(event2), liveSession()),
              );
              var tr_1 = root_54();
              let classes;
              var node_7 = child(tr_1);
              each(
                node_7,
                17,
                () => [
                  stamp(
                    get(event2).time,
                    $$props.plan.timezone,
                    $$props.locale,
                  ),
                  `${eventLabel(get(event2))} \xB7 ${t()(get(event2).kind === "random_start" ? "Random start" : get(event2).kind === "random_end" ? "Random end" : get(event2).kind)}`,
                  get(event2).action.action,
                  get(event2).action.entities.join(", "),
                ],
                index,
                ($$anchor5, value) => {
                  var td = root_28();
                  var text_6 = only_child(td, true);
                  template_effect(() => set_text(text_6, get(value)));
                  append($$anchor5, td);
                },
              );
              var node_8 = sibling(node_7);
              {
                var consequent_5 = ($$anchor5) => {
                  var td_1 = root_44();
                  var node_9 = child(td_1);
                  {
                    var consequent_3 = ($$anchor6) => {
                      var fragment_2 = root_37();
                      var span = first_child(fragment_2);
                      var text_7 = only_child(span, true);
                      var div_2 = sibling(span, 2);
                      var text_8 = only_child(div_2, true);
                      template_effect(
                        ($0) => {
                          set_class(
                            span,
                            1,
                            clsx2(
                              get(live).outcome.status === "dispatched"
                                ? "hint"
                                : "error",
                            ),
                          );
                          set_text(text_7, $0);
                          set_text(text_8, get(live).outcome.detail);
                        },
                        [() => t()(get(live).outcome.status)],
                      );
                      append($$anchor6, fragment_2);
                    };
                    var consequent_4 = ($$anchor6) => {
                      var text_9 = text();
                      template_effect(
                        ($0) => set_text(text_9, $0),
                        [() => t()("Next event")],
                      );
                      append($$anchor6, text_9);
                    };
                    if_block(node_9, ($$render) => {
                      if (get(live)?.outcome) $$render(consequent_3);
                      else if (get(live)?.current) $$render(consequent_4, 1);
                    });
                  }
                  reset(td_1);
                  append($$anchor5, td_1);
                };
                if_block(node_8, ($$render) => {
                  if (liveSession()) $$render(consequent_5);
                });
              }
              reset(tr_1);
              template_effect(() => {
                set_attribute2(
                  tr_1,
                  "aria-current",
                  get(live)?.current ? "step" : void 0,
                );
                classes = set_class(tr_1, 1, "svelte-16g6nis", null, classes, {
                  current: get(live)?.current,
                  completed: get(live)?.outcome?.status === "dispatched",
                });
              });
              append($$anchor4, tr_1);
            },
          );
          reset(tbody);
          reset(table);
          reset(div_1);
          var div_3 = sibling(div_1, 2);
          var button = child(div_3);
          var text_10 = only_child(button, true);
          var span_1 = sibling(button, 2);
          var text_11 = only_child(span_1);
          var button_1 = sibling(span_1, 2);
          var text_12 = only_child(button_1, true);
          reset(div_3);
          reset(div);
          reset(details);
          template_effect(
            ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) => {
              set_text(
                text_2,
                `${$0 ?? ""} \xB7 ${$$props.plan.events.length ?? ""}`,
              );
              set_text(
                text_3,
                `${$1 ?? ""}: ${$2 ?? ""} \xB7 ${$3 ?? ""}: ${$4 ?? ""}`,
              );
              set_attribute2(input, "placeholder", $5);
              set_attribute2(input, "aria-label", $6);
              button.disabled = get(currentPage) === 0;
              set_text(text_10, $7);
              set_text(
                text_11,
                `${get(filtered).length ?? ""}
              ${$8 ?? ""} \xB7 ${get(currentPage) + 1}/${$9 ?? ""}`,
              );
              button_1.disabled =
                (get(currentPage) + 1) * 50 >= get(filtered).length;
              set_text(text_12, $10);
            },
            [
              () => t()("Event details"),
              () => t()("Behavior revision"),
              () => $$props.plan.behavior_hash.slice(0, 12),
              () => t()("Plan revision"),
              () => $$props.plan.source_revision?.slice(0, 12) || "\u2014",
              () => t()("Filter events"),
              () => t()("Filter events"),
              () => t()("Previous"),
              () => t()("events"),
              () => Math.max(1, Math.ceil(get(filtered).length / 50)),
              () => t()("Next"),
            ],
          );
          delegated("input", input, (event2) => {
            set2(query, event2.currentTarget.value.toLowerCase(), true);
            set2(page, 0);
          });
          delegated("click", button, () => set2(page, get(currentPage) - 1));
          delegated("click", button_1, () => set2(page, get(currentPage) + 1));
          append($$anchor3, details);
        };
        if_block(node_4, ($$render) => {
          if ($$props.plan.events.length > 0) $$render(consequent_6);
        });
      }
      var node_10 = sibling(node_4, 2);
      each(
        node_10,
        17,
        () => $$props.plan.issues.filter((issue) => issue.severity !== "info"),
        index,
        ($$anchor3, issue) => {
          var p_1 = root_72();
          var text_13 = only_child(p_1);
          template_effect(() => {
            set_class(
              p_1,
              1,
              clsx2(get(issue).severity === "warning" ? "hint" : "error"),
            );
            set_text(
              text_13,
              `${get(issue).code ?? ""}: ${get(issue).message ?? ""}`,
            );
          });
          append($$anchor3, p_1);
        },
      );
      append($$anchor2, fragment_1);
    };
    var consequent_8 = ($$anchor2) => {
      var p_2 = root_9();
      var text_14 = only_child(p_2, true);
      template_effect(
        ($0) => set_text(text_14, $0),
        [() => t()("Loading schedule\u2026")],
      );
      append($$anchor2, p_2);
    };
    if_block(node_2, ($$render) => {
      if ($$props.plan) $$render(consequent_7);
      else if (showLoading()) $$render(consequent_8, 1);
    });
  }
  reset(section);
  template_effect(() => set_attribute2(section, "aria-busy", loading()));
  append($$anchor, section);
  pop();
}
delegate(["input", "click"]);

// custom_components/occupied/frontend/LivePreviewControls.svelte
var root15 = from_html(
  `<button type="button" class="primary svelte-100n2ef"> </button> <button type="button" class="svelte-100n2ef"> </button>`,
  1,
);
var root_112 = from_html(
  `<button type="button" class="svelte-100n2ef"> </button>`,
);
var root_29 = from_html(
  `<button type="button" class="primary svelte-100n2ef"> </button> <!> <button type="button" class="svelte-100n2ef"> </button>`,
  1,
);
var root_38 = from_html(`<div class="live-actions svelte-100n2ef"><!></div>`);
var root_45 = from_html(`<p class="svelte-100n2ef"> </p>`);
var root_55 = from_html(`<p class="error svelte-100n2ef"> </p>`);
var root_65 = from_html(`<p class="hint svelte-100n2ef"> </p>`);
var root_73 = from_html(`<p class="call svelte-100n2ef"> </p>`);
var root_82 = from_html(
  `<p class="svelte-100n2ef"><strong> </strong></p> <!>`,
  1,
);
var root_92 = from_html(
  `<div role="status" aria-live="polite" aria-atomic="true"><strong> </strong> <p class="svelte-100n2ef"> </p> <!> <!></div> <!> <!> <!> <!> <!>`,
  1,
);
var root_102 = from_html(`<p role="status" class="hint svelte-100n2ef"> </p>`);
var root_11 = from_html(
  `<!> <section class="live-card svelte-100n2ef"><h2 class="svelte-100n2ef"> </h2> <p class="svelte-100n2ef"><strong> </strong></p> <p class="hint svelte-100n2ef"> </p> <!> <!></section> <!>`,
  1,
);
var $$css4 = {
  hash: "svelte-100n2ef",
  code: ".live-card.svelte-100n2ef {border:1px solid var(--divider-color, #ddd);border-radius:12px;padding:16px;margin-bottom:16px;}h2.svelte-100n2ef {margin:0;}p.svelte-100n2ef {margin:8px 0;}.call.svelte-100n2ef {overflow-wrap:anywhere;}.live-actions.svelte-100n2ef {position:sticky;top:64px;z-index:2;display:flex;flex-wrap:wrap;gap:8px;padding:12px;margin-bottom:16px;background:var(--card-background-color, white);border:1px solid var(--divider-color, #ddd);border-radius:12px;}.live-actions.svelte-100n2ef button:where(.svelte-100n2ef) {min-height:48px;margin:0;}.primary.svelte-100n2ef {flex:1;}\n  @media (max-width: 600px) {.live-actions.svelte-100n2ef {top:calc(56px + env(safe-area-inset-top, 0px));padding-bottom:max(12px, env(safe-area-inset-bottom, 0px));}\n  }",
};
function LivePreviewControls($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css4);
  const actionControls = ($$anchor2) => {
    var div = root_38();
    var node = child(div);
    {
      var consequent = ($$anchor3) => {
        var fragment = root15();
        var button = first_child(fragment);
        var text2 = only_child(button, true);
        var button_1 = sibling(button, 2);
        var text_1 = only_child(button_1, true);
        template_effect(
          ($0, $1) => {
            button.disabled =
              !$$props.panel.liveReady ||
              !$$props.panel.liveCanAdvance ||
              get(executing) ||
              $$props.panel.liveStopping ||
              get(session)?.state !== "ready";
            set_text(text2, $0);
            button_1.disabled =
              $$props.panel.liveStopping || get(session)?.state === "stopping";
            set_text(text_1, $1);
          },
          [
            () => get(t)(get(executing) ? "Running\u2026" : "Next event"),
            () =>
              get(t)($$props.panel.liveStopping ? "Stopping\u2026" : "Stop"),
          ],
        );
        delegated("click", button, () => $$props.panel.nextLiveEvent());
        delegated("click", button_1, () => $$props.panel.stopLivePreview());
        append($$anchor3, fragment);
      };
      var alternate = ($$anchor3) => {
        var fragment_1 = root_29();
        var button_2 = first_child(fragment_1);
        var text_2 = only_child(button_2, true);
        var node_1 = sibling(button_2, 2);
        {
          var consequent_1 = ($$anchor4) => {
            var button_3 = root_112();
            var text_3 = only_child(button_3, true);
            template_effect(
              ($0) => {
                button_3.disabled =
                  $$props.panel.busy ||
                  $$props.panel.liveBusy ||
                  !$$props.panel.liveReady;
                set_text(text_3, $0);
              },
              [() => get(t)("Resume scheduling")],
            );
            delegated("click", button_3, () =>
              $$props.panel.resumeScheduling(),
            );
            append($$anchor4, button_3);
          };
          if_block(node_1, ($$render) => {
            if ($$props.panel.schedulingPaused) $$render(consequent_1);
          });
        }
        var button_4 = sibling(node_1, 2);
        var text_4 = only_child(button_4, true);
        template_effect(
          ($0, $1) => {
            button_2.disabled = !get(canStart);
            set_text(text_2, $0);
            button_4.disabled = $$props.panel.busy || $$props.panel.liveBusy;
            set_text(text_4, $1);
          },
          [
            () => get(t)(get(session) ? "Run again" : "Start live preview"),
            () => get(t)("Refresh Preview"),
          ],
        );
        delegated("click", button_2, () => $$props.panel.startLivePreview());
        delegated("click", button_4, () =>
          $$props.panel.refreshPreviewSchedule(),
        );
        append($$anchor3, fragment_1);
      };
      if_block(node, ($$render) => {
        if (get(running)) $$render(consequent);
        else $$render(alternate, -1);
      });
    }
    reset(div);
    template_effect(
      ($0) => set_attribute2(div, "aria-label", $0),
      [() => get(t)("Live preview controls")],
    );
    append($$anchor2, div);
  };
  let t = user_derived(() => $$props.panel.t);
  let session = user_derived(() =>
    $$props.panel.liveVisible ? $$props.panel.liveSession : null,
  );
  let running = user_derived(() => $$props.panel.liveRunning);
  let executing = user_derived(
    () => $$props.panel.liveBusy || get(session)?.state === "executing",
  );
  let lastResult = user_derived(() =>
    get(session) ? lastGroupResult(get(session)) : "",
  );
  let canStart = user_derived(
    () =>
      $$props.panel.liveReady &&
      !$$props.panel.busy &&
      !$$props.panel.liveBusy &&
      !get(running) &&
      (get(session)
        ? !get(session).storage_failed
        : !!$$props.panel.preview?.valid &&
          !!$$props.panel.preview?.plans[0]?.events.length),
  );
  let currentOutcomes = user_derived(() =>
    Object.values(get(session)?.outcomes || {}).filter(
      (outcome) => outcome.group_id === get(session)?.last_group_id,
    ),
  );
  var fragment_2 = root_11();
  var node_2 = first_child(fragment_2);
  {
    var consequent_2 = ($$anchor2) => {
      actionControls($$anchor2);
    };
    if_block(node_2, ($$render) => {
      if (get(session)) $$render(consequent_2);
    });
  }
  var section = sibling(node_2, 2);
  var h2 = child(section);
  var text_5 = only_child(h2, true);
  var p = sibling(h2, 2);
  var strong = child(p);
  var text_6 = only_child(strong, true);
  reset(p);
  var p_1 = sibling(p, 2);
  var text_7 = only_child(p_1, true);
  var node_3 = sibling(p_1, 2);
  {
    var consequent_9 = ($$anchor2) => {
      var fragment_4 = root_92();
      var div_1 = first_child(fragment_4);
      var strong_1 = child(div_1);
      var text_8 = only_child(strong_1, true);
      var p_2 = sibling(strong_1, 2);
      var text_9 = only_child(p_2);
      var node_4 = sibling(p_2, 2);
      {
        var consequent_3 = ($$anchor3) => {
          var p_3 = root_45();
          var text_10 = only_child(p_3);
          template_effect(
            ($0, $1) => set_text(text_10, `${$0 ?? ""}: ${$1 ?? ""}`),
            [
              () => get(t)("Simulated time"),
              () =>
                stamp(
                  get(session).simulated_time,
                  $$props.panel.livePlan.timezone,
                  $$props.panel._hass.locale,
                ),
            ],
          );
          append($$anchor3, p_3);
        };
        if_block(node_4, ($$render) => {
          if (get(session).simulated_time && $$props.panel.livePlan)
            $$render(consequent_3);
        });
      }
      var node_5 = sibling(node_4, 2);
      {
        var consequent_4 = ($$anchor3) => {
          var p_4 = root_45();
          var text_11 = only_child(p_4);
          template_effect(
            ($0, $1) => set_text(text_11, `${$0 ?? ""}: ${$1 ?? ""}`),
            [() => get(t)("Last result"), () => get(t)(get(lastResult))],
          );
          append($$anchor3, p_4);
        };
        if_block(node_5, ($$render) => {
          if (get(lastResult)) $$render(consequent_4);
        });
      }
      reset(div_1);
      var node_6 = sibling(div_1, 2);
      {
        var consequent_5 = ($$anchor3) => {
          var p_5 = root_55();
          var text_12 = only_child(p_5, true);
          template_effect(() => set_text(text_12, get(session).detail));
          append($$anchor3, p_5);
        };
        if_block(node_6, ($$render) => {
          if (get(session).state === "interrupted") $$render(consequent_5);
        });
      }
      var node_7 = sibling(node_6, 2);
      {
        var consequent_6 = ($$anchor3) => {
          var p_6 = root_65();
          var text_13 = only_child(p_6, true);
          template_effect(
            ($0) => set_text(text_13, $0),
            [
              () =>
                get(t)(
                  "This session uses an earlier program revision. Its actions are frozen.",
                ),
            ],
          );
          append($$anchor3, p_6);
        };
        if_block(node_7, ($$render) => {
          if (get(session).earlier_revision) $$render(consequent_6);
        });
      }
      var node_8 = sibling(node_7, 2);
      {
        var consequent_7 = ($$anchor3) => {
          var p_7 = root_65();
          var text_14 = only_child(p_7, true);
          template_effect(
            ($0) => set_text(text_14, $0),
            [
              () =>
                get(t)(
                  "Only the account that started this session can advance. You can stop it.",
                ),
            ],
          );
          append($$anchor3, p_7);
        };
        if_block(node_8, ($$render) => {
          if (!$$props.panel.liveCanAdvance && get(running))
            $$render(consequent_7);
        });
      }
      var node_9 = sibling(node_8, 2);
      {
        var consequent_8 = ($$anchor3) => {
          var fragment_5 = root_82();
          var p_8 = first_child(fragment_5);
          var strong_2 = child(p_8);
          var text_15 = only_child(strong_2);
          reset(p_8);
          var node_10 = sibling(p_8, 2);
          each(
            node_10,
            17,
            () => get(session).next_group.calls,
            index,
            ($$anchor4, call) => {
              var p_9 = root_73();
              var text_16 = only_child(p_9);
              template_effect(
                ($0) =>
                  set_text(
                    text_16,
                    `${get(call).action.action ?? ""} \xB7 ${$0 ?? ""}`,
                  ),
                [() => get(call).action.entities.join(", ")],
              );
              append($$anchor4, p_9);
            },
          );
          template_effect(
            ($0) =>
              set_text(
                text_15,
                `${$0 ?? ""}: ${get(session).next_group.title ?? ""}`,
              ),
            [() => get(t)("Next event")],
          );
          append($$anchor3, fragment_5);
        };
        if_block(node_9, ($$render) => {
          if (get(session).next_group && get(running)) $$render(consequent_8);
        });
      }
      var node_11 = sibling(node_9, 2);
      each(
        node_11,
        17,
        () =>
          get(currentOutcomes).filter(
            (outcome) => outcome.status !== "dispatched",
          ),
        index,
        ($$anchor3, outcome) => {
          var p_10 = root_55();
          var text_17 = only_child(p_10);
          template_effect(() =>
            set_text(
              text_17,
              `${(get(outcome).action?.action || "") ?? ""}: ${get(outcome).detail ?? ""}`,
            ),
          );
          append($$anchor3, p_10);
        },
      );
      template_effect(
        ($0, $1) => {
          set_text(text_8, $0);
          set_text(text_9, `${get(session).date ?? ""} \xB7 ${$1 ?? ""}`);
        },
        [
          () =>
            get(t)(
              get(session).state === "completed"
                ? "Day complete"
                : get(session).state === "ready" && get(session).cursor === 0
                  ? "Ready to start"
                  : get(session).state === "executing"
                    ? "Running\u2026"
                    : get(session).state === "stopping"
                      ? "Stopping\u2026"
                      : get(session).state === "stopped"
                        ? "Stopped"
                        : get(session).state === "interrupted"
                          ? "Interrupted"
                          : "Ready for next event",
            ),
          () =>
            get(t)("{done} of {total} events")
              .replace("{done}", String(get(session).cursor))
              .replace("{total}", String(get(session).total)),
        ],
      );
      append($$anchor2, fragment_4);
    };
    var alternate_1 = ($$anchor2) => {
      var p_11 = root_65();
      var text_18 = only_child(p_11, true);
      template_effect(
        ($0) => set_text(text_18, $0),
        [
          () =>
            get(t)(
              "Starting prepares the session. Devices run only when you press Next event.",
            ),
        ],
      );
      append($$anchor2, p_11);
    };
    if_block(node_3, ($$render) => {
      if (get(session)) $$render(consequent_9);
      else $$render(alternate_1, -1);
    });
  }
  var node_12 = sibling(node_3, 2);
  {
    var consequent_10 = ($$anchor2) => {
      var p_12 = root_102();
      var text_19 = only_child(p_12, true);
      template_effect(
        ($0) => set_text(text_19, $0),
        [() => get(t)("Recovering live preview\u2026")],
      );
      append($$anchor2, p_12);
    };
    if_block(node_12, ($$render) => {
      if (!$$props.panel.liveReady) $$render(consequent_10);
    });
  }
  reset(section);
  var node_13 = sibling(section, 2);
  {
    var consequent_11 = ($$anchor2) => {
      actionControls($$anchor2);
    };
    if_block(node_13, ($$render) => {
      if (!get(session)) $$render(consequent_11);
    });
  }
  template_effect(
    ($0, $1, $2, $3) => {
      set_attribute2(section, "aria-label", $0);
      set_text(text_5, $1);
      set_text(text_6, $2);
      set_text(text_7, $3);
    },
    [
      () => get(t)("Live preview"),
      () => get(t)("Live preview"),
      () => get(t)("Controls real devices"),
      () =>
        get(t)(
          get(session)
            ? "Scheduling stays paused until you choose Resume scheduling."
            : "Normal scheduling pauses until you choose Resume scheduling. Each press runs one event immediately, even with management disabled or dry run selected.",
        ),
    ],
  );
  append($$anchor, fragment_2);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/PreviewView.svelte
var root16 = from_html(`<span class="hint" role="status"> </span>`);
var root_113 = from_html(
  `<div class="schedule-heading svelte-5w63kc"><h2 aria-live="polite" class="svelte-5w63kc"> </h2> <!> <div class="day-navigation svelte-5w63kc" role="group"><ha-icon-button></ha-icon-button> <button type="button" class="text-button svelte-5w63kc"> </button>  <ha-icon-button></ha-icon-button></div></div>`,
  2,
);
var root_210 = from_html(`<!> <!>`, 1);
var $$css5 = {
  hash: "svelte-5w63kc",
  code: ".schedule-heading.svelte-5w63kc {display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;margin-bottom:20px;}h2.svelte-5w63kc {margin:0;}.day-navigation.svelte-5w63kc {display:flex;align-items:center;gap:4px;}.day-navigation.svelte-5w63kc button:where(.svelte-5w63kc) {margin:0;}",
};
function PreviewView($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css5);
  const dayHeading = ($$anchor2) => {
    var div = root_113();
    var h2 = child(div);
    var text2 = only_child(h2, true);
    var node = sibling(h2, 2);
    {
      var consequent = ($$anchor3) => {
        var span = root16();
        var text_1 = only_child(span, true);
        template_effect(
          ($0) => set_text(text_1, $0),
          [() => get(t)("Loading schedule\u2026")],
        );
        append($$anchor3, span);
      };
      if_block(node, ($$render) => {
        if (get(showLoading) && get(plan)) $$render(consequent);
      });
    }
    var div_1 = sibling(node, 2);
    var ha_icon_button = child(div_1);
    template_effect(
      ($0) => set_custom_element_data(ha_icon_button, "title", $0),
      [() => get(t)("Previous day")],
    );
    action(
      ha_icon_button,
      ($$node, $$action_arg) => properties?.($$node, $$action_arg),
      () => ({
        path: previousIcon,
        label: get(t)("Previous day"),
        disabled:
          $$props.panel.busy ||
          $$props.panel.liveRunning ||
          $$props.panel.liveBusy,
      }),
    );
    var button = sibling(ha_icon_button, 2);
    var text_2 = only_child(button, true);
    var ha_icon_button_1 = sibling(button, 2);
    template_effect(
      ($0) => set_custom_element_data(ha_icon_button_1, "title", $0),
      [() => get(t)("Next day")],
    );
    action(
      ha_icon_button_1,
      ($$node, $$action_arg) => properties?.($$node, $$action_arg),
      () => ({
        path: nextIcon,
        label: get(t)("Next day"),
        disabled:
          $$props.panel.busy ||
          $$props.panel.liveRunning ||
          $$props.panel.liveBusy,
      }),
    );
    reset(div_1);
    reset(div);
    template_effect(
      ($0, $1, $2) => {
        set_text(text2, $0);
        set_attribute2(div_1, "aria-label", $1);
        button.disabled =
          $$props.panel.busy ||
          $$props.panel.liveRunning ||
          $$props.panel.liveBusy ||
          get(date) === $$props.panel.document.simulation_date;
        set_text(text_2, $2);
      },
      [
        () =>
          formatPreviewDate(
            get(date),
            $$props.panel.document.simulation_date,
            $$props.panel._hass.locale,
            get(t),
          ),
        () => get(t)("Schedule day"),
        () => get(t)("Today"),
      ],
    );
    delegated("click", ha_icon_button, () => $$props.panel.movePreviewDay(-1));
    delegated("click", button, () =>
      $$props.panel.selectPreviewDate($$props.panel.document.simulation_date),
    );
    delegated("click", ha_icon_button_1, () => $$props.panel.movePreviewDay(1));
    append($$anchor2, div);
  };
  let showLoading = state(false);
  user_effect(() => {
    $$props.revision;
    if (!$$props.panel.busy) {
      set2(showLoading, false);
      return;
    }
    set2(showLoading, false);
    const timeout = window.setTimeout(() => {
      set2(showLoading, true);
    }, 250);
    return () => window.clearTimeout(timeout);
  });
  let data = user_derived(() => {
    $$props.revision;
    const t2 = $$props.panel.t;
    return { t: t2 };
  });
  let t = user_derived(() => get(data).t);
  let plan = user_derived(() =>
    $$props.panel.liveVisible && $$props.panel.livePlan
      ? $$props.panel.livePlan
      : calendarDayPlan(
          $$props.panel.preview?.plans || [],
          $$props.panel.preview?.plans.at(-1)?.simulation_date ||
            $$props.panel.previewDate,
        ),
  );
  let date = user_derived(
    () =>
      get(plan)?.simulation_date ||
      $$props.panel.previewDate ||
      $$props.panel.document.simulation_date,
  );
  const previousIcon =
    "M15.41,16.59L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.59Z";
  const nextIcon =
    "M8.59,16.59L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.59Z";
  let entityNames = user_derived(() =>
    Object.fromEntries(
      $$props.panel.catalog.entities.map((entity) => [
        entity.entity_id,
        entity.name,
      ]),
    ),
  );
  var fragment = root_210();
  var node_1 = first_child(fragment);
  LivePreviewControls(node_1, {
    get panel() {
      return $$props.panel;
    },
  });
  var node_2 = sibling(node_1, 2);
  {
    let $0 = user_derived(() =>
      $$props.panel.liveVisible && $$props.panel.livePlan
        ? [$$props.panel.livePlan]
        : $$props.panel.preview?.plans,
    );
    let $1 = user_derived(() =>
      $$props.panel.liveVisible && $$props.panel.liveProgram
        ? $$props.panel.liveProgram
        : $$props.panel.previewProgram,
    );
    let $2 = user_derived(() =>
      $$props.panel.liveVisible ? $$props.panel.liveSession : null,
    );
    Timeline(node_2, {
      get plan() {
        return get(plan);
      },
      get schedulePlans() {
        return get($0);
      },
      get program() {
        return get($1);
      },
      get liveSession() {
        return get($2);
      },
      get t() {
        return get(t);
      },
      get locale() {
        return $$props.panel._hass.locale;
      },
      get hass() {
        return $$props.panel._hass;
      },
      get entityNames() {
        return get(entityNames);
      },
      get heading() {
        return dayHeading;
      },
      get loading() {
        return $$props.panel.busy;
      },
      get showLoading() {
        return get(showLoading);
      },
    });
  }
  append($$anchor, fragment);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/UnsavedStepDialog.svelte
var root17 = from_html(
  `<div class="step-exit-overlay"><dialog open="" class="step-exit-dialog" role="alertdialog" aria-modal="true" aria-labelledby="step-exit-title" aria-describedby="step-exit-description"><h2 id="step-exit-title"> </h2> <p id="step-exit-description"> </p> <div class="step-delete-actions"><button type="button"> </button> <button type="button" class="danger"> </button></div></dialog></div>`,
);
function UnsavedStepDialog($$anchor, $$props) {
  push($$props, true);
  let t = user_derived(() => $$props.panel.t);
  let keepEditing;
  onMount(() => keepEditing.focus());
  var div = root17();
  var dialog = child(div);
  var h2 = child(dialog);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  var div_1 = sibling(p, 2);
  var button = child(div_1);
  var text_2 = only_child(button, true);
  bind_this(
    button,
    ($$value) => (keepEditing = $$value),
    () => keepEditing,
  );
  var button_1 = sibling(button, 2);
  var text_3 = only_child(button_1, true);
  reset(div_1);
  reset(dialog);
  reset(div);
  template_effect(
    ($0, $1, $2, $3) => {
      set_text(text2, $0);
      set_text(text_1, $1);
      set_text(text_2, $2);
      set_text(text_3, $3);
    },
    [
      () => get(t)("Unsaved changes"),
      () =>
        get(t)(
          $$props.panel.randomEditor
            ? "This random event has unsaved changes. Discard them and continue?"
            : "This step has unsaved changes. Discard them and continue?",
        ),
      () => get(t)("Keep editing"),
      () => get(t)("Discard changes"),
    ],
  );
  delegated("click", button, () => $$props.panel.cancelStepExit());
  delegated("click", button_1, () => $$props.panel.confirmStepExit());
  append($$anchor, div);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/random-editor-controller.ts
function openRandom(panel, entry) {
  if (panel.busy) {
    return;
  }
  if (panel.activeEditor) {
    const same = !!entry && panel.randomEditor?.id === entry.id;
    panel.requestStepExit(() => {
      if (!same) {
        openRandom(panel, entry);
      }
    });
    return;
  }
  panel.randomEditor = randomEditor(panel.draft, entry);
  panel.tab = "random";
  panel.error = "";
  panel.issues = [];
  panel.renderView();
  focusEditor(panel, "name");
  if (entry) {
    panel.shadowRoot
      .getElementById(`random-editor-${entry.id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
function createRandomEditorContext(panel) {
  const editor = panel.randomEditor,
    form = editor.form,
    t = panel.t;
  const refresh = (key2) => {
    panel.flush();
    focusEditor(panel, key2);
  };
  const changed = (key2) => {
    if (
      !["entities", "cover"].includes(form.on.kind) ||
      form.on.kind !== form.off.kind
    ) {
      form.sameEntities = false;
    }
    if (form.sameEntities) {
      form.off.entities = [...form.on.entities];
    }
    panel.version++;
    panel.validatedVersion = -1;
    const errors = randomErrors(panel.draft, editor);
    for (const field of Object.keys(editor.errors)) {
      if (errors[field]) {
        editor.errors[field] = errors[field];
      } else {
        delete editor.errors[field];
      }
    }
    delete editor.errors[key2];
    panel.flush();
  };
  const scopedEditor = (prefix, options) =>
    new Proxy(editor, {
      get(target, key2) {
        if (key2 === "errors") {
          return Object.fromEntries(
            Object.entries(target.errors)
              .filter(([field]) => field.startsWith(prefix))
              .map(([field, message]) => [field.slice(prefix.length), message]),
          );
        }
        if (options && (key2 === "showEndTime" || key2 === "showEndOffset")) {
          return options[key2];
        }
        return Reflect.get(target, key2);
      },
      set(target, key2, value) {
        if (options && (key2 === "showEndTime" || key2 === "showEndOffset")) {
          options[key2] = value;
          return true;
        }
        return Reflect.set(target, key2, value);
      },
    });
  const timing = (edge) => ({
    editor: scopedEditor(`${edge}.`, editor[`${edge}Options`]),
    form: new Proxy(form, {}),
    time: new Proxy(form[edge], {}),
    t,
    fieldPrefix: `${edge}.`,
    ...(edge === "start" && { randomId: editor.id }),
    changed: (key2) => changed(`${edge}.${key2}`),
    refresh: (key2) => refresh(key2 ? `${edge}.${key2}` : void 0),
  });
  const action2 = (phase) => ({
    editor: scopedEditor(`${phase}.`),
    form: new Proxy(form[phase], {}),
    t,
    fieldPrefix: `${phase}.`,
    changed: (key2) => changed(`${phase}.${key2}`),
  });
  const submit = async () => {
    editor.errors = randomErrors(panel.draft, editor);
    if (Object.keys(editor.errors).length > 0) {
      return refresh(Object.keys(editor.errors)[0]);
    }
    try {
      const candidate = buildRandom(panel.draft, editor);
      editor.candidatePath = ["random", editor.id];
      if (panel.document?.source === "file") {
        panel.randomEditor = null;
        panel.change([], candidate, true);
      } else {
        await panel.save(candidate);
      }
    } catch (error) {
      panel.fail(error);
    }
  };
  const cancel = () =>
    panel.requestStepExit(() =>
      panel.shadowRoot.getElementById(`random-card-${editor.id}`)?.focus(),
    );
  const context = { editor: new Proxy(editor, {}), t, changed };
  return {
    ...context,
    form: new Proxy(form, {}),
    timing,
    action: action2,
    submit,
    cancel,
  };
}
async function deleteRandom(panel) {
  const editor = panel.randomEditor;
  if (!editor || panel.busy) {
    return;
  }
  const candidate = copy(panel.draft);
  if (randomReferences(candidate, editor.id).length > 0) {
    panel.error = panel.t(
      "Other random events depend on this window. Change their starts before deleting.",
    );
    panel.flush();
    return;
  }
  delete candidate.random?.[editor.id];
  if (panel.document?.source === "file") {
    panel.randomEditor = null;
    panel.change([], candidate, true);
    return;
  }
  await panel.save(candidate);
}

// custom_components/occupied/frontend/DeleteRandomDialog.svelte
var root18 = from_html(`<li> </li>`);
var root_114 = from_html(`<p> </p> <ul></ul> <p class="hint"> </p>`, 1);
var root_211 = from_html(
  `<dialog class="step-delete-dialog" aria-labelledby="random-delete-title"><h2 id="random-delete-title"> </h2> <p> </p> <!> <div class="step-delete-actions"><button type="button"> </button> <button type="button" class="danger"> </button></div></dialog>`,
);
function DeleteRandomDialog($$anchor, $$props) {
  push($$props, true);
  let dialog;
  let dependents = user_derived(() =>
    randomEntries($$props.panel.draft, $$props.panel.catalog).filter((entry) =>
      randomReferences(
        $$props.panel.draft,
        $$props.panel.randomEditor?.id || "",
      ).some((path) => path[1] === entry.id),
    ),
  );
  onMount(() => {
    dialog.showModal();
    dialog.querySelector("button")?.focus();
  });
  var dialog_1 = root_211();
  var h2 = child(dialog_1);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  var node = sibling(p, 2);
  {
    var consequent = ($$anchor2) => {
      var fragment = root_114();
      var p_1 = first_child(fragment);
      var text_2 = only_child(p_1);
      var ul = sibling(p_1, 2);
      each(
        ul,
        21,
        () => get(dependents),
        index,
        ($$anchor3, entry) => {
          var li = root18();
          var text_3 = only_child(li, true);
          template_effect(() => set_text(text_3, get(entry).name));
          append($$anchor3, li);
        },
      );
      reset(ul);
      var p_2 = sibling(ul, 2);
      var text_4 = only_child(p_2, true);
      template_effect(
        ($0, $1) => {
          set_text(text_2, `${$0 ?? ""}:`);
          set_text(text_4, $1);
        },
        [
          () => $$props.panel.t("Used by"),
          () => $$props.panel.t("Change those relationships before deleting."),
        ],
      );
      append($$anchor2, fragment);
    };
    if_block(node, ($$render) => {
      if (get(dependents).length) $$render(consequent);
    });
  }
  var div = sibling(node, 2);
  var button = child(div);
  var text_5 = only_child(button, true);
  var button_1 = sibling(button, 2);
  var text_6 = only_child(button_1, true);
  reset(div);
  reset(dialog_1);
  bind_this(
    dialog_1,
    ($$value) => (dialog = $$value),
    () => dialog,
  );
  template_effect(
    ($0, $1, $2, $3) => {
      set_text(text2, $0);
      set_text(text_1, $1);
      button.disabled = $$props.panel.busy;
      set_text(text_5, $2);
      button_1.disabled =
        $$props.panel.busy || $$props.panel.stale || !!get(dependents).length;
      set_text(text_6, $3);
    },
    [
      () => $$props.panel.t("Delete random event?"),
      () =>
        $$props.panel.t(
          "This removes the random event and all its future occurrences.",
        ),
      () => $$props.panel.t("Cancel"),
      () => $$props.panel.t("Delete random event"),
    ],
  );
  event("close", dialog_1, function (...$$args) {
    $$props.onClose?.apply(this, $$args);
  });
  delegated("click", button, () => dialog.close());
  delegated("click", button_1, async () => {
    await deleteRandom($$props.panel);
    if (!$$props.panel.error && !$$props.panel.randomEditor) dialog.close();
  });
  append($$anchor, dialog_1);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/AdvancedRandomSettings.svelte
var root19 = from_html(`<button type="button"> </button>`);
var root_115 = from_html(
  `<label class="step-weekday-option"><input type="checkbox"/><span> </span></label>`,
);
var root_212 = from_html(
  `<dialog class="step-advanced-dialog" aria-labelledby="random-advanced-title" aria-describedby="random-weekdays-description"><h2 id="random-advanced-title"> </h2> <p id="random-weekdays-description" class="hint"> </p> <fieldset class="step-weekdays"><legend> </legend> <div class="step-weekday-presets"></div> <div class="step-weekday-options"></div></fieldset> <!> <p class="hint"> </p> <div class="step-delete-actions"><button type="button"> </button> <button type="button" class="primary"> </button></div></dialog>`,
);
function AdvancedRandomSettings($$anchor, $$props) {
  push($$props, true);
  let form = user_derived(() => $$props.context.form),
    t = user_derived(() => $$props.context.t),
    changed = user_derived(() => $$props.context.changed);
  let selectedDays = state(proxy(untrack(() => [...get(form).days])));
  let dialog;
  const presets = [
    ["Every day", days],
    ["Weekdays", days.slice(0, 5)],
    ["Weekends", days.slice(5)],
  ];
  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  let dayError = user_derived(() =>
    get(selectedDays).length ? void 0 : get(t)("Choose at least one day."),
  );
  onMount(() => {
    dialog.showModal();
    dialog.querySelector("input")?.focus();
  });
  function apply2() {
    if ($$props.panel.busy || get(dayError)) return;
    get(form).days = [...get(selectedDays)];
    get(changed)("days");
    dialog.close();
  }
  var dialog_1 = root_212();
  var h2 = child(dialog_1);
  var text2 = only_child(h2, true);
  var p = sibling(h2, 2);
  var text_1 = only_child(p, true);
  var fieldset = sibling(p, 2);
  var legend = child(fieldset);
  var text_2 = only_child(legend, true);
  var div = sibling(legend, 2);
  each(
    div,
    21,
    () => presets,
    index,
    ($$anchor2, $$item) => {
      var $$array = user_derived(() => to_array(get($$item), 2));
      let label = () => get($$array)[0];
      let selection = () => get($$array)[1];
      var button = root19();
      var text_3 = only_child(button, true);
      template_effect(
        ($0, $1) => {
          set_attribute2(button, "aria-pressed", $0);
          set_text(text_3, $1);
        },
        [
          () =>
            get(selectedDays).length === selection().length &&
            selection().every((day) => get(selectedDays).includes(day)),
          () => get(t)(label()),
        ],
      );
      delegated("click", button, () =>
        set2(selectedDays, [...selection()], true),
      );
      append($$anchor2, button);
    },
  );
  reset(div);
  var div_1 = sibling(div, 2);
  each(
    div_1,
    21,
    () => days,
    index,
    ($$anchor2, day, index2) => {
      var label_1 = root_115();
      var input = child(label_1);
      remove_input_defaults(input);
      var span = sibling(input);
      var text_4 = only_child(span, true);
      reset(label_1);
      template_effect(
        ($0, $1) => {
          set_checked(input, $0);
          set_text(text_4, $1);
        },
        [
          () => get(selectedDays).includes(get(day)),
          () => get(t)(weekdays[index2]),
        ],
      );
      delegated("change", input, (event2) => {
        set2(
          selectedDays,
          days.filter((candidate) =>
            candidate === get(day)
              ? event2.currentTarget.checked
              : get(selectedDays).includes(candidate),
          ),
          true,
        );
      });
      append($$anchor2, label_1);
    },
  );
  reset(div_1);
  reset(fieldset);
  var node = sibling(fieldset, 2);
  {
    let $0 = user_derived(() => (get(dayError) ? { days: get(dayError) } : {}));
    FieldError(node, {
      key: "days",
      get errors() {
        return get($0);
      },
    });
  }
  var p_1 = sibling(node, 2);
  var text_5 = only_child(p_1, true);
  var div_2 = sibling(p_1, 2);
  var button_1 = child(div_2);
  var text_6 = only_child(button_1, true);
  var button_2 = sibling(button_1, 2);
  var text_7 = only_child(button_2, true);
  reset(div_2);
  reset(dialog_1);
  bind_this(
    dialog_1,
    ($$value) => (dialog = $$value),
    () => dialog,
  );
  template_effect(
    ($0, $1, $2, $3, $4, $5) => {
      set_text(text2, $0);
      set_text(text_1, $1);
      set_attribute2(
        fieldset,
        "aria-describedby",
        get(dayError) ? "step-error-days" : void 0,
      );
      fieldset.disabled = $$props.panel.busy;
      set_text(text_2, $2);
      set_text(text_5, $3);
      set_text(text_6, $4);
      button_2.disabled = $$props.panel.busy || !!get(dayError);
      set_text(text_7, $5);
    },
    [
      () => get(t)("Advanced settings"),
      () => get(t)("Choose which days this random event should run."),
      () => get(t)("Run on"),
      () => get(t)("Apply these settings, then save the random event."),
      () => get(t)("Cancel"),
      () => get(t)("Apply"),
    ],
  );
  event("close", dialog_1, function (...$$args) {
    $$props.onClose?.apply(this, $$args);
  });
  delegated("click", button_1, () => dialog.close());
  delegated("click", button_2, apply2);
  append($$anchor, dialog_1);
  pop();
}
delegate(["click", "change"]);

// custom_components/occupied/frontend/RandomActions.svelte
var root20 = from_html(
  `<div role="separator"></div> <button type="button" role="menuitem" tabindex="-1" class="danger"> </button>`,
  1,
);
var root_116 = from_html(
  `<div class="step-editor-actions"><button type="button" class="icon-button" aria-haspopup="menu" data-random-actions=""><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"></path></svg></button> <div class="step-actions-menu" popover="auto" role="menu" tabindex="-1"><button type="button" role="menuitem" tabindex="-1"> </button> <!></div></div> <!> <!>`,
  1,
);
function RandomActions($$anchor, $$props) {
  push($$props, true);
  let context = prop($$props, "context", 7),
    advancedOpen = prop($$props, "advancedOpen", 15, false);
  let menuOpen = state(false);
  let deleteOpen = state(false);
  let trigger;
  let menu;
  let menuId = user_derived(() => `random-actions-${context().editor.id}`);
  function closeDialog() {
    const focusTarget =
      advancedOpen() && $$props.advancedTrigger
        ? $$props.advancedTrigger
        : trigger;
    flushSync(() => {
      set2(deleteOpen, false);
      advancedOpen(false);
    });
    if (focusTarget.isConnected) focusTarget.focus();
  }
  function closeMenu(restoreFocus = true) {
    menu.hidePopover();
    set2(menuOpen, false);
    if (restoreFocus) trigger.focus();
  }
  function positionMenu() {
    if (!menu.matches(":popover-open")) return;
    const anchor = trigger.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const above = anchor.top - bounds.height - 8;
    const top = above >= 16 ? above : anchor.bottom + 8;
    menu.style.left = `${Math.max(16, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 16))}px`;
    menu.style.top = `${Math.max(16, Math.min(top, window.innerHeight - bounds.height - 16))}px`;
  }
  function openMenu(last = false) {
    menu.showPopover();
    set2(menuOpen, true);
    positionMenu();
    const items = menu.querySelectorAll("button:not(:disabled)");
    (last ? items[items.length - 1] : items[0])?.focus({ preventScroll: true });
  }
  function menuKeydown(event2) {
    const items = [...menu.querySelectorAll("button:not(:disabled)")];
    const index2 = items.indexOf($$props.panel.shadowRoot.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event2.key)) {
      event2.preventDefault();
      const next2 =
        event2.key === "Home"
          ? 0
          : event2.key === "End"
            ? items.length - 1
            : (index2 + (event2.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[next2]?.focus();
    } else if (event2.key === "Escape") {
      event2.preventDefault();
      closeMenu();
    } else if (event2.key === "Tab") {
      closeMenu();
    }
  }
  var fragment = root_116();
  event("resize", $window, positionMenu);
  event("scroll", $window, positionMenu);
  var div = first_child(fragment);
  var button = child(div);
  bind_this(
    button,
    ($$value) => (trigger = $$value),
    () => trigger,
  );
  var div_1 = sibling(button, 2);
  var button_1 = child(div_1);
  var text2 = only_child(button_1, true);
  var node = sibling(button_1, 2);
  {
    var consequent = ($$anchor2) => {
      var fragment_1 = root20();
      var button_2 = sibling(first_child(fragment_1), 2);
      var text_1 = only_child(button_2, true);
      template_effect(
        ($0) => {
          button_2.disabled = $$props.panel.busy || $$props.panel.stale;
          set_text(text_1, $0);
        },
        [() => $$props.panel.t("Delete random event")],
      );
      delegated("click", button_2, () => {
        closeMenu(false);
        flushSync(() => set2(deleteOpen, true));
      });
      append($$anchor2, fragment_1);
    };
    if_block(node, ($$render) => {
      if (context().editor.existing) $$render(consequent);
    });
  }
  reset(div_1);
  bind_this(
    div_1,
    ($$value) => (menu = $$value),
    () => menu,
  );
  reset(div);
  var node_1 = sibling(div, 2);
  {
    var consequent_1 = ($$anchor2) => {
      DeleteRandomDialog($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        onClose: closeDialog,
      });
    };
    if_block(node_1, ($$render) => {
      if (get(deleteOpen)) $$render(consequent_1);
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    var consequent_2 = ($$anchor2) => {
      AdvancedRandomSettings($$anchor2, {
        get panel() {
          return $$props.panel;
        },
        get context() {
          return context();
        },
        onClose: closeDialog,
      });
    };
    if_block(node_2, ($$render) => {
      if (advancedOpen()) $$render(consequent_2);
    });
  }
  template_effect(
    ($0, $1, $2, $3) => {
      set_attribute2(button, "aria-label", $0);
      set_attribute2(button, "title", $1);
      set_attribute2(button, "aria-expanded", get(menuOpen));
      set_attribute2(button, "aria-controls", get(menuId));
      button.disabled = $$props.panel.busy;
      set_attribute2(div_1, "id", get(menuId));
      set_attribute2(div_1, "aria-label", $2);
      button_1.disabled = $$props.panel.busy;
      set_text(text2, $3);
    },
    [
      () => $$props.panel.t("Random event actions"),
      () => $$props.panel.t("Random event actions"),
      () => $$props.panel.t("Random event actions"),
      () => $$props.panel.t(context().form.enabled ? "Disable" : "Enable"),
    ],
  );
  delegated("click", button, () => (get(menuOpen) ? closeMenu() : openMenu()));
  delegated("keydown", button, (event2) => {
    if (event2.key === "ArrowDown" || event2.key === "ArrowUp") {
      event2.preventDefault();
      openMenu(event2.key === "ArrowUp");
    }
  });
  event("toggle", div_1, (event2) =>
    set2(menuOpen, event2.newState === "open"),
  );
  delegated("keydown", div_1, menuKeydown);
  delegated("click", button_1, () => {
    closeMenu();
    context().form.enabled = !context().form.enabled;
    context().changed("enabled");
  });
  append($$anchor, fragment);
  pop();
}
delegate(["click", "keydown"]);

// custom_components/occupied/frontend/random-explanation.ts
function randomExplanation(
  form,
  program,
  catalog,
  t = (text2) => text2,
  locale,
) {
  const say = (text2, values = {}) => {
    let message = t(text2);
    for (const [key2, value] of Object.entries(values)) {
      message = message.replaceAll(`{${key2}}`, () => String(value));
    }
    return message;
  };
  const entries = [
    ...stepEntries(program, catalog, t),
    ...randomEntries(program, catalog).map((entry) => ({
      id: `random:${entry.id}`,
      name: entry.name,
    })),
  ];
  const start = timingExplanation(
    form.start,
    entries,
    t,
    catalog.time_sources,
    {
      includeHints: false,
      subject: "Window starts",
      days: form.days,
      locale,
    },
  );
  let end = timingExplanation(form.end, entries, t, catalog.time_sources, {
    includeHints: false,
    subject: "Window ends",
    locale,
  });
  let windowSeconds;
  const clockSeconds = (value) =>
    /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
      ? value
          .split(":")
          .reduce(
            (total, part, index2) =>
              total + Number(part) * [3600, 60, 1][index2],
            0,
          )
      : NaN;
  if (
    form.start.mode === "absolute" &&
    form.end.mode === "absolute" &&
    !form.start.end &&
    !form.end.end
  ) {
    const difference =
      clockSeconds(form.end.start) - clockSeconds(form.start.start);
    if (Number.isFinite(difference)) {
      windowSeconds = difference < 0 ? difference + 86400 : difference;
      if (difference < 0) {
        end += ` ${t("the next day")}`;
      }
    }
  }
  if (form.end.mode === "duration") {
    const duration2 = durationSeconds(
      form.end.maxDuration || form.end.minDuration || "",
    );
    if (Number.isFinite(duration2) && duration2 > 0) {
      windowSeconds = duration2;
    }
  }
  const minDuration = durationSeconds(form.minDuration);
  const maxDuration = durationSeconds(form.maxDuration);
  const cannotFit =
    windowSeconds !== void 0 &&
    Number.isFinite(minDuration) &&
    minDuration > windowSeconds;
  const sentences = [
    ...(form.enabled ? [] : [t("This random event is disabled.")]),
    `${start}.`,
    `${end}.`,
  ];
  const minimum = Number(form.minCount);
  const maximum = Number(form.maxCount);
  const validCount = (value) =>
    Number.isSafeInteger(value) && value >= 0 && value <= 1e3;
  const validCounts =
    !!form.minCount.trim() &&
    !!form.maxCount.trim() &&
    validCount(minimum) &&
    validCount(maximum) &&
    maximum >= minimum;
  if (validCounts && maximum === 0) {
    sentences.push(
      t("No events run because the event count is zero."),
      t("Dependent random events also skip this window."),
    );
    return sentences.join(" ");
  }
  if (cannotFit) {
    sentences.push(
      t(
        "No events can run because the minimum duration is longer than the window.",
      ),
    );
  } else if (!validCounts) {
    sentences.push(
      t("Choose valid event counts to describe how often events run."),
    );
  } else if (minimum === maximum) {
    sentences.push(
      minimum === 1
        ? t("One event starts at a random time during each window.")
        : say("{count} events start at random times during each window.", {
            count: minimum,
          }),
    );
  } else {
    sentences.push(
      say(
        "Between {min} and {max} events start at random times during each window.",
        {
          min: minimum,
          max: maximum,
        },
      ),
    );
  }
  if (validCounts && minimum === 0) {
    sentences.push(
      t(
        "A window may have no events; dependent random events skip that window.",
      ),
    );
  }
  const duration = (seconds) => durationLabel(seconds, t);
  if (
    !Number.isFinite(minDuration) ||
    !Number.isFinite(maxDuration) ||
    minDuration <= 0 ||
    maxDuration < minDuration ||
    maxDuration > 604800
  ) {
    sentences.push(
      t("Choose valid durations to describe how long each event lasts."),
    );
  } else if (windowSeconds !== void 0 && minDuration > windowSeconds) {
    sentences.push(t("Reduce the minimum duration or extend the window."));
  } else {
    const longest =
      windowSeconds === void 0
        ? maxDuration
        : Math.min(maxDuration, windowSeconds);
    sentences.push(
      minDuration === longest
        ? say("Each event lasts {duration}.", {
            duration: duration(minDuration),
          })
        : say("Each event lasts between {min} and {max}.", {
            min: duration(minDuration),
            max: duration(longest),
          }),
    );
  }
  const action2 = (selected) => {
    const names = [...new Set(selected.entities)].map((id) =>
      entityName(catalog, id),
    );
    if (names.length === 0) {
      return "";
    }
    const last = names.pop();
    const entities =
      names.length > 0 ? `${names.join(", ")} ${t("and")} ${last}` : last;
    if (selected.kind === "scene") {
      return say("activate {entities}", { entities });
    }
    if (selected.kind === "cover") {
      const descriptions = {
        "cover.open_cover": "open {entities}",
        "cover.close_cover": "close {entities}",
        "cover.stop_cover": "stop {entities}",
        "cover.set_cover_position":
          "set the position of {entities} to {position}%",
        "cover.open_cover_tilt": "open the tilt of {entities}",
        "cover.close_cover_tilt": "close the tilt of {entities}",
        "cover.stop_cover_tilt": "stop the tilt of {entities}",
        "cover.set_cover_tilt_position":
          "set the tilt of {entities} to {position}%",
      };
      const description = descriptions[selected.service];
      if (!description) {
        return "";
      }
      const position =
        selected.service === "cover.set_cover_position"
          ? selected.position
          : selected.tiltPosition;
      if (
        description.includes("{position}") &&
        (!position.trim() ||
          !Number.isSafeInteger(Number(position)) ||
          Number(position) < 0 ||
          Number(position) > 100)
      ) {
        return "";
      }
      return say(description, { entities, position });
    }
    if (selected.kind === "service") {
      return selected.service.trim()
        ? say("run {service} for {entities}", {
            service: selected.service.trim(),
            entities,
          })
        : "";
    }
    return say(
      selected.action === "turn_off"
        ? "turn off {entities}"
        : "turn on {entities}",
      { entities },
    );
  };
  const on2 = action2(form.on);
  const off = action2(
    form.sameEntities ? { ...form.off, entities: form.on.entities } : form.off,
  );
  if (on2 && !cannotFit) {
    sentences.push(say("When each event starts, {action}.", { action: on2 }));
  }
  if (off && !cannotFit) {
    sentences.push(say("When each event ends, {action}.", { action: off }));
  }
  const conclusion =
    validCounts && maximum === 1
      ? "The event finishes before the window closes."
      : "Events may overlap, but all finish before the window closes.";
  sentences.push(
    t(
      cannotFit
        ? "Duration limits take priority over the event count."
        : conclusion,
    ),
  );
  return sentences.join(" ");
}

// custom_components/occupied/frontend/RandomEventEditor.svelte
var root21 = from_html(`<button type="button" class="text-button"> </button>`);
var root_117 = from_html(
  `<label class="same-entities svelte-e4ijcz"><input type="checkbox"/> </label>`,
);
var root_213 = from_html(
  `<section class="step-editor random-editor"><div class="step-name-editor"><!></div> <p class="hint"> </p> <div class="editor-sections"><!> <!></div> <button type="button" aria-haspopup="dialog" data-builder-field="days" data-random-advanced=""> </button> <!> <h3> </h3> <div class="random-frequency svelte-e4ijcz"><div><!> <!></div> <div><!></div> <!> <!></div> <p class="hint" data-random-explanation="" aria-live="polite"> </p> <p class="hint"> </p> <div class="editor-sections"><!> <div><!> <!></div></div> <div class="builder-footer"><button type="button"> </button> <!> <button type="button" class="primary" data-random-submit=""> </button></div></section>`,
);
var $$css6 = {
  hash: "svelte-e4ijcz",
  code: ".random-advanced-button.svelte-e4ijcz {margin-top:16px;}.random-frequency.svelte-e4ijcz {display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:16px;}.same-entities.svelte-e4ijcz {display:flex;align-items:center;gap:8px;margin-top:16px;}\n  @media (max-width: 600px) {.random-frequency.svelte-e4ijcz {grid-template-columns:1fr;gap:0;}\n  }",
};
function RandomEventEditor($$anchor, $$props) {
  push($$props, true);
  append_styles($$anchor, $$css6);
  let context = user_derived(() => {
    $$props.revision;
    return createRandomEditorContext($$props.panel);
  });
  let editor = user_derived(() => get(context).editor),
    form = user_derived(() => get(context).form),
    t = user_derived(() => get(context).t),
    changed = user_derived(() => get(context).changed),
    submit = user_derived(() => get(context).submit),
    cancel = user_derived(() => get(context).cancel);
  let advancedOpen = state(false);
  let advancedButton;
  let advancedTrigger = state(void 0);
  let showMaxCount = state(
    proxy(
      untrack(() => Number(get(form).minCount) !== Number(get(form).maxCount)),
    ),
  );
  let maxCountVisible = user_derived(
    () =>
      get(showMaxCount) ||
      Number(get(form).minCount) !== Number(get(form).maxCount) ||
      !!get(editor).errors.maxCount,
  );
  async function save2() {
    await get(submit)();
    if ($$props.panel.randomEditor?.errors.days) {
      set2(advancedTrigger, advancedButton, true);
      set2(advancedOpen, true);
    }
  }
  var section = root_213();
  var div = child(section);
  var node = child(div);
  {
    let $0 = user_derived(() => ({
      hideLabel: true,
      placeholder: get(t)("Optional title"),
    }));
    EditorField(node, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get(context);
      },
      key: "name",
      label: "Random event name",
      get value() {
        return get(form).name;
      },
      update: (value) => (get(form).name = value),
      get options() {
        return get($0);
      },
    });
  }
  reset(div);
  var p = sibling(div, 2);
  var text2 = only_child(p, true);
  var div_1 = sibling(p, 2);
  var node_1 = child(div_1);
  {
    let $0 = user_derived(() => get(context).timing("start"));
    TimingEditor(node_1, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get($0);
      },
      heading: "Window starts",
      clockLabel: "Window start",
      windowEndLabel: "Latest window start (optional)",
      addWindowEndLabel: "Randomize window start",
      explanationSubject: "Window starts",
    });
  }
  var node_2 = sibling(node_1, 2);
  {
    let $0 = user_derived(() => get(context).timing("end"));
    TimingEditor(node_2, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get($0);
      },
      heading: "Window ends",
      clockLabel: "Window end",
      windowEndLabel: "Latest window end (optional)",
      addWindowEndLabel: "Randomize window end",
      explanationSubject: "Window ends",
      modes: [
        ["absolute", "Absolute time"],
        ["duration", "Duration"],
      ],
    });
  }
  reset(div_1);
  var button = sibling(div_1, 2);
  let classes;
  var text_1 = only_child(button, true);
  bind_this(
    button,
    ($$value) => (advancedButton = $$value),
    () => advancedButton,
  );
  var node_3 = sibling(button, 2);
  {
    let $0 = user_derived(() => ({ ...get(editor).errors }));
    FieldError(node_3, {
      key: "days",
      get errors() {
        return get($0);
      },
    });
  }
  var h3 = sibling(node_3, 2);
  var text_2 = only_child(h3, true);
  var div_2 = sibling(h3, 2);
  var div_3 = child(div_2);
  var node_4 = child(div_3);
  EditorField(node_4, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
    key: "minCount",
    label: "Minimum events per window",
    get value() {
      return get(form).minCount;
    },
    update: (value) => {
      if (!get(maxCountVisible)) get(form).maxCount = value;
      get(form).minCount = value;
    },
    options: { type: "number", min: 0, max: 1e3, step: 1 },
  });
  var node_5 = sibling(node_4, 2);
  {
    var consequent = ($$anchor2) => {
      var button_1 = root21();
      var text_3 = only_child(button_1, true);
      template_effect(
        ($0) => {
          button_1.disabled = $$props.panel.busy;
          set_text(text_3, $0);
        },
        [() => get(t)("Add maximum events")],
      );
      delegated("click", button_1, () => {
        set2(showMaxCount, true);
        get(changed)("maxCount");
        focusEditor($$props.panel, "maxCount");
      });
      append($$anchor2, button_1);
    };
    if_block(node_5, ($$render) => {
      if (!get(maxCountVisible)) $$render(consequent);
    });
  }
  reset(div_3);
  var div_4 = sibling(div_3, 2);
  var node_6 = child(div_4);
  {
    var consequent_1 = ($$anchor2) => {
      {
        const trailing = ($$anchor3) => {
          var button_2 = root21();
          var text_4 = only_child(button_2, true);
          template_effect(
            ($0) => {
              button_2.disabled = $$props.panel.busy;
              set_text(text_4, $0);
            },
            [() => get(t)("Remove maximum events")],
          );
          delegated("click", button_2, () => {
            get(form).maxCount = get(form).minCount;
            set2(showMaxCount, false);
            get(changed)("maxCount");
            focusEditor($$props.panel, "minCount");
          });
          append($$anchor3, button_2);
        };
        EditorField($$anchor2, {
          get panel() {
            return $$props.panel;
          },
          get context() {
            return get(context);
          },
          key: "maxCount",
          label: "Maximum events per window",
          get value() {
            return get(form).maxCount;
          },
          update: (value) => (get(form).maxCount = value),
          options: { type: "number", min: 0, max: 1e3, step: 1 },
          trailing,
          $$slots: { trailing: true },
        });
      }
    };
    if_block(node_6, ($$render) => {
      if (get(maxCountVisible)) $$render(consequent_1);
    });
  }
  reset(div_4);
  var node_7 = sibling(div_4, 2);
  EditorField(node_7, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
    key: "minDuration",
    label: "Minimum duration",
    get value() {
      return get(form).minDuration;
    },
    update: (value) => (get(form).minDuration = value),
    options: { placeholder: "5m" },
  });
  var node_8 = sibling(node_7, 2);
  EditorField(node_8, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
    key: "maxDuration",
    label: "Maximum duration",
    get value() {
      return get(form).maxDuration;
    },
    update: (value) => (get(form).maxDuration = value),
    options: { placeholder: "15m" },
  });
  reset(div_2);
  var p_1 = sibling(div_2, 2);
  var text_5 = only_child(p_1, true);
  var p_2 = sibling(p_1, 2);
  var text_6 = only_child(p_2, true);
  var div_5 = sibling(p_2, 2);
  var node_9 = child(div_5);
  {
    let $0 = user_derived(() => get(context).action("on"));
    ActionEditor(node_9, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get($0);
      },
      heading: "When event starts",
      kindLabel: "Start action",
      entityLabel: "Start entities",
    });
  }
  var div_6 = sibling(node_9, 2);
  var node_10 = child(div_6);
  {
    let $0 = user_derived(() => get(context).action("off"));
    ActionEditor(node_10, {
      get panel() {
        return $$props.panel;
      },
      get context() {
        return get($0);
      },
      heading: "When event ends",
      kindLabel: "End action",
      entityLabel: "End entities",
      get hideEntities() {
        return get(form).sameEntities;
      },
    });
  }
  var node_11 = sibling(node_10, 2);
  {
    var consequent_2 = ($$anchor2) => {
      var label = root_117();
      var input = child(label);
      remove_input_defaults(input);
      var text_7 = sibling(input, 1, true);
      reset(label);
      template_effect(
        ($0) => {
          set_checked(input, get(form).sameEntities);
          set_text(text_7, $0);
        },
        [() => get(t)("Use the same entities")],
      );
      delegated("change", input, (event2) => {
        get(form).sameEntities = event2.currentTarget.checked;
        get(changed)("sameEntities");
      });
      append($$anchor2, label);
    };
    var d = user_derived(
      () =>
        ["entities", "cover"].includes(get(form).on.kind) &&
        get(form).on.kind === get(form).off.kind,
    );
    if_block(node_11, ($$render) => {
      if (get(d)) $$render(consequent_2);
    });
  }
  reset(div_6);
  reset(div_5);
  var div_7 = sibling(div_5, 2);
  var button_3 = child(div_7);
  var text_8 = only_child(button_3, true);
  var node_12 = sibling(button_3, 2);
  RandomActions(node_12, {
    get panel() {
      return $$props.panel;
    },
    get context() {
      return get(context);
    },
    get advancedOpen() {
      return get(advancedOpen);
    },
    set advancedOpen($$value) {
      set2(advancedOpen, $$value, true);
    },
    get advancedTrigger() {
      return get(advancedTrigger);
    },
    set advancedTrigger($$value) {
      set2(advancedTrigger, $$value, true);
    },
  });
  var button_4 = sibling(node_12, 2);
  var text_9 = only_child(button_4, true);
  reset(div_7);
  reset(section);
  template_effect(
    ($0, $1, $2, $3, $4, $5, $6) => {
      set_text(text2, $0);
      classes = set_class(
        button,
        1,
        "random-advanced-button svelte-e4ijcz",
        null,
        classes,
        { error: !!get(editor).errors.days },
      );
      set_attribute2(button, "aria-expanded", get(advancedOpen));
      set_attribute2(
        button,
        "aria-describedby",
        get(editor).errors.days ? "step-error-days" : void 0,
      );
      button.disabled = $$props.panel.busy;
      set_text(text_1, $1);
      set_text(text_2, $2);
      set_text(text_5, $3);
      set_text(text_6, $4);
      button_3.disabled = $$props.panel.busy;
      set_text(text_8, $5);
      button_4.disabled = $$props.panel.busy || $$props.panel.stale;
      set_text(text_9, $6);
    },
    [
      () =>
        get(t)(
          "Choose a window, a duration, and actions for the start and end of each occurrence.",
        ),
      () => get(t)("Advanced settings"),
      () => get(t)("Frequency and duration"),
      () =>
        randomExplanation(
          get(form),
          $$props.panel.draft,
          $$props.panel.catalog,
          get(t),
          $$props.panel._hass.locale,
        ),
      () => get(t)("Use durations like 5m, 30s, or 1h."),
      () => get(t)("Cancel"),
      () =>
        get(t)(
          $$props.panel.document?.source === "file"
            ? "Add to draft"
            : "Save random event",
        ),
    ],
  );
  delegated("click", button, (event2) => {
    set2(advancedTrigger, event2.currentTarget, true);
    set2(advancedOpen, true);
  });
  delegated("click", button_3, function (...$$args) {
    get(cancel)?.apply(this, $$args);
  });
  delegated("click", button_4, save2);
  append($$anchor, section);
  pop();
}
delegate(["click", "change"]);

// custom_components/occupied/frontend/RandomView.svelte
var root22 = from_html(
  `<section class="step-empty"><h2> </h2> <p class="hint"> </p> <button type="button" class="primary" data-create-random=""> </button></section>`,
);
var root_118 = from_html(`<span class="step-status-badge"> </span>`);
var root_214 = from_html(`<span class="step-row-time"> </span>`);
var root_39 = from_html(
  `<div style="--depth:0"><button type="button"><span class="step-row-content"><span class="step-row-heading"><strong> </strong><!></span> <span class="hint"> </span></span> <!></button> <div><!></div></div>`,
);
var root_46 = from_html(
  `<p class="hint"> </p> <div class="step-list"></div> <button type="button" class="primary" data-create-random=""> </button>`,
  1,
);
function RandomView($$anchor, $$props) {
  push($$props, true);
  let data = user_derived(() => {
    $$props.revision;
    return {
      t: $$props.panel.t,
      entries: randomEntries($$props.panel.draft, $$props.panel.catalog),
      steps: [
        ...stepEntries(
          $$props.panel.draft,
          $$props.panel.catalog,
          $$props.panel.t,
        ),
        ...randomEntries($$props.panel.draft, $$props.panel.catalog).map(
          (entry) => ({ id: `random:${entry.id}`, name: entry.name }),
        ),
      ],
    };
  });
  let t = user_derived(() => get(data).t),
    entries = user_derived(() => get(data).entries),
    steps = user_derived(() => get(data).steps);
  var fragment = comment();
  var node = first_child(fragment);
  {
    var consequent = ($$anchor2) => {
      var section = root22();
      var h2 = child(section);
      var text2 = only_child(h2, true);
      var p = sibling(h2, 2);
      var text_1 = only_child(p, true);
      var button = sibling(p, 2);
      var text_2 = only_child(button, true);
      reset(section);
      template_effect(
        ($0, $1, $2) => {
          set_text(text2, $0);
          set_text(text_1, $1);
          button.disabled = $$props.panel.busy;
          set_text(text_2, $2);
        },
        [
          () => get(t)("Random activity"),
          () =>
            get(t)(
              "Run actions at random times within a window. Choose how often they run and how long each occurrence lasts.",
            ),
          () => get(t)("Create your first random event"),
        ],
      );
      delegated("click", button, () => openRandom($$props.panel));
      append($$anchor2, section);
    };
    var alternate = ($$anchor2) => {
      var fragment_1 = root_46();
      var p_1 = first_child(fragment_1);
      var text_3 = only_child(p_1, true);
      var div = sibling(p_1, 2);
      each(
        div,
        21,
        () => get(entries),
        (entry) => entry.id,
        ($$anchor3, entry) => {
          const editing = user_derived(
            () =>
              $$props.panel.randomEditor?.existing &&
              $$props.panel.randomEditor.id === get(entry).id,
          );
          const disabled = user_derived(() =>
            get(editing)
              ? $$props.panel.randomEditor?.form.enabled === false
              : get(entry).enabled === false,
          );
          var div_1 = root_39();
          let classes;
          var button_1 = child(div_1);
          let classes_1;
          var span = child(button_1);
          var span_1 = child(span);
          var strong = child(span_1);
          var text_4 = only_child(strong, true);
          var node_1 = sibling(strong);
          {
            var consequent_1 = ($$anchor4) => {
              var span_2 = root_118();
              var text_5 = only_child(span_2, true);
              template_effect(
                ($0) => set_text(text_5, $0),
                [() => get(t)("Disabled")],
              );
              append($$anchor4, span_2);
            };
            if_block(node_1, ($$render) => {
              if (get(disabled)) $$render(consequent_1);
            });
          }
          reset(span_1);
          var span_3 = sibling(span_1, 2);
          var text_6 = only_child(span_3);
          reset(span);
          var node_2 = sibling(span, 2);
          {
            var consequent_2 = ($$anchor4) => {
              var span_4 = root_214();
              var text_7 = only_child(span_4);
              template_effect(
                ($0, $1) => set_text(text_7, `${$0 ?? ""} \u2192 ${$1 ?? ""}`),
                [
                  () =>
                    timingSummary(
                      { timing: get(entry).start },
                      get(steps),
                      get(t),
                      $$props.panel.catalog.time_sources,
                      $$props.panel._hass.locale,
                    ),
                  () =>
                    timingExplanation(
                      timingForm(get(entry).end),
                      get(steps),
                      get(t),
                      $$props.panel.catalog.time_sources,
                      {
                        subject: "Window ends",
                        includeHints: false,
                        locale: $$props.panel._hass.locale,
                      },
                    ),
                ],
              );
              append($$anchor4, span_4);
            };
            if_block(node_2, ($$render) => {
              if (!get(editing)) $$render(consequent_2);
            });
          }
          reset(button_1);
          var div_2 = sibling(button_1, 2);
          var node_3 = child(div_2);
          {
            var consequent_3 = ($$anchor4) => {
              RandomEventEditor($$anchor4, {
                get panel() {
                  return $$props.panel;
                },
                get revision() {
                  return $$props.revision;
                },
              });
            };
            if_block(node_3, ($$render) => {
              if (get(editing)) $$render(consequent_3);
            });
          }
          reset(div_2);
          reset(div_1);
          template_effect(
            ($0, $1, $2, $3) => {
              classes = set_class(div_1, 1, "step-card", null, classes, {
                "step-disabled": get(disabled),
              });
              set_attribute2(div_1, "data-random-id", get(entry).id);
              set_attribute2(button_1, "id", `random-card-${get(entry).id}`);
              classes_1 = set_class(button_1, 1, "step-row", null, classes_1, {
                editing: get(editing),
              });
              set_attribute2(button_1, "aria-label", $0);
              set_attribute2(button_1, "aria-expanded", get(editing));
              set_attribute2(
                button_1,
                "aria-controls",
                `random-editor-${get(entry).id}`,
              );
              button_1.disabled = $$props.panel.busy;
              set_text(text_4, get(entry).name);
              set_text(
                text_6,
                `${$1 ?? ""}
              ${$2 ?? ""} \xB7 ${(get(entry).min_duration || "5m") ?? ""}\u2013${(get(entry).max_duration || "15m") ?? ""} \xB7 ${$3 ?? ""}`,
              );
              set_attribute2(div_2, "id", `random-editor-${get(entry).id}`);
            },
            [
              () =>
                get(disabled)
                  ? `${get(entry).name} \xB7 ${get(t)("Disabled")}`
                  : get(entry).name,
              () => countSummary(get(entry).count),
              () => get(t)("times per window"),
              () =>
                get(entry)
                  .on.entities.map((id) =>
                    entityName($$props.panel.catalog, id),
                  )
                  .join(", "),
            ],
          );
          delegated("click", button_1, () =>
            openRandom($$props.panel, get(entry)),
          );
          append($$anchor3, div_1);
        },
      );
      reset(div);
      var button_2 = sibling(div, 2);
      var text_8 = only_child(button_2, true);
      template_effect(
        ($0, $1, $2) => {
          set_text(text_3, $0);
          set_attribute2(div, "aria-label", $1);
          button_2.disabled = $$props.panel.busy;
          set_text(text_8, $2);
        },
        [
          () =>
            get(t)(
              "Run actions at random times within a window. Choose how often they run and how long each occurrence lasts.",
            ),
          () => get(t)("Random events"),
          () => get(t)("Create random event"),
        ],
      );
      delegated("click", button_2, () => openRandom($$props.panel));
      append($$anchor2, fragment_1);
    };
    if_block(node, ($$render) => {
      if (!get(entries).length) $$render(consequent);
      else $$render(alternate, -1);
    });
  }
  append($$anchor, fragment);
  pop();
}
delegate(["click"]);

// custom_components/occupied/frontend/App.svelte
var root23 = from_html(`<button type="button"> </button>`);
var root_119 = from_html(`<div id="toolbar" class="toolbar"><!></div>`);
var root_215 = from_html(`<p> </p>`);
var root_310 = from_html(`<p id="house"> </p>`);
var root_47 = from_html(`<option> </option>`);
var root_56 = from_html(
  `<label for="instance-select"> </label> <select id="instance-select"></select>`,
  1,
);
var root_66 = from_html(`<p class="hint"> </p>`);
var root_74 = from_html(`<p class="banner" role="status"> </p>`);
var root_83 = from_html(`<button type="button" class="text-button"> </button>`);
var root_93 = from_html(`<p class="error"> </p> <p class="error"> </p>`, 1);
var root_103 = from_html(`<p> </p> <button type="button"> </button>`, 1);
var root_1110 = from_html(
  `<ha-top-app-bar-fixed><div slot="title">Occupied</div> <main><header><div><!> <!> <!></div></header> <!> <!> <div id="notice" class="banner" role="status"> </div> <div id="error" class="error" role="alert"> </div> <nav aria-label="Occupied"></nav> <div id="secondary-nav"><!></div> <div id="issues"></div> <div id="view"><!></div></main></ha-top-app-bar-fixed> <!>`,
  3,
);
function App($$anchor, $$props) {
  push($$props, true);
  const $updates = () => store_get($$props.updates, "$updates", $$stores);
  const [$$stores, $$cleanup] = setup_stores();
  const toolbar = ($$anchor2) => {
    var div = root_119();
    var node = child(div);
    {
      var consequent = ($$anchor3) => {
        var button = root23();
        var text_1 = only_child(button, true);
        template_effect(
          ($0) => {
            button.disabled = get(panel).busy;
            set_text(text_1, $0);
          },
          [() => get(t)("Reload saved program")],
        );
        delegated("click", button, () => get(panel).reloadSaved(true));
        append($$anchor3, button);
      };
      if_block(node, ($$render) => {
        if (get(panel).stale) $$render(consequent);
      });
    }
    reset(div);
    template_effect(() =>
      set_attribute2(
        div,
        "hidden",
        !get(panel).selectedInstance?.loaded || !get(panel).stale,
      ),
    );
    append($$anchor2, div);
  };
  const renderIssue = ($$anchor2, item = noop, primary2 = noop) => {
    const className = user_derived(() =>
      item().severity === "warning" ? "hint" : "error",
    );
    const text2 = user_derived(() =>
      primary2()
        ? item().message
        : `${item().severity || "error"} \xB7 ${item().path || "$"}: ${item().message}`,
    );
    var fragment = comment();
    var node_1 = first_child(fragment);
    {
      var consequent_1 = ($$anchor3) => {
        var button_1 = root23();
        var text_2 = only_child(button_1, true);
        template_effect(() => {
          set_class(button_1, 1, clsx2(get(className)));
          set_text(text_2, get(text2));
        });
        delegated("click", button_1, () => get(panel).focusIssue(item()));
        append($$anchor3, button_1);
      };
      var alternate = ($$anchor3) => {
        var p = root_215();
        var text_3 = only_child(p, true);
        template_effect(() => {
          set_class(p, 1, clsx2(get(className)));
          set_text(text_3, get(text2));
        });
        append($$anchor3, p);
      };
      if_block(node_1, ($$render) => {
        if (get(panel).activeEditor && item().severity !== "warning")
          $$render(consequent_1);
        else $$render(alternate, -1);
      });
    }
    append($$anchor2, fragment);
  };
  let panel = user_derived(() => {
    $updates();
    return new Proxy($$props.panel, {
      get(target, key2) {
        const value = Reflect.get(target, key2, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });
  let revision = user_derived($updates);
  let controllerName = user_derived(
    () => get(panel).draft?.name || get(panel).selectedInstance?.name,
  );
  let state2 = user_derived(() => {
    get(revision);
    const showingSteps =
      get(panel).tab === "steps" &&
      get(panel).draft &&
      get(panel).selectedInstance?.loaded &&
      !get(panel)._loading &&
      (!get(panel).stepEditor || get(panel).stepEditor.existing);
    const entries = showingSteps ? stepEntries(get(panel).draft) : [];
    return {
      t: get(panel).t,
      notices: get(panel).notices(),
      primary: primaryTabs.some(([id]) => id === get(panel).tab),
      issues: get(panel)
        .visibleIssues()
        .filter((issue) => !warningStepId(issue, entries)),
    };
  });
  let t = user_derived(() => get(state2).t),
    notices = user_derived(() => get(state2).notices),
    primary = user_derived(() => get(state2).primary),
    issues = user_derived(() => get(state2).issues);
  const primaryTabs = [
    ["steps", "Steps"],
    ["random", "Random"],
    ["preview", "Preview"],
    ["settings", "Settings"],
  ];
  var fragment_1 = root_1110();
  var ha_top_app_bar_fixed = first_child(fragment_1);
  set_custom_element_data(ha_top_app_bar_fixed, "back-button", true);
  template_effect(
    ($0) => set_custom_element_data(ha_top_app_bar_fixed, "narrow", $0),
    [() => get(panel).hasAttribute("narrow")],
  );
  var main = sibling(child(ha_top_app_bar_fixed), 2);
  var header = child(main);
  var div_1 = child(header);
  var node_2 = child(div_1);
  {
    var consequent_2 = ($$anchor2) => {
      var p_1 = root_310();
      var text_4 = only_child(p_1, true);
      template_effect(
        ($0) => set_text(text_4, $0),
        [() => get(t)("Loading controller\u2026")],
      );
      append($$anchor2, p_1);
    };
    var consequent_3 = ($$anchor2) => {
      var p_2 = root_310();
      var text_5 = only_child(p_2, true);
      template_effect(() => set_text(text_5, get(controllerName)));
      append($$anchor2, p_2);
    };
    var d = user_derived(
      () =>
        get(controllerName) !== "Occupied" &&
        !/^Occupied [0-9a-f]{8}$/.test(get(controllerName)),
    );
    if_block(node_2, ($$render) => {
      if (!get(controllerName)) $$render(consequent_2);
      else if (get(d)) $$render(consequent_3, 1);
    });
  }
  var node_3 = sibling(node_2, 2);
  {
    var consequent_4 = ($$anchor2) => {
      var fragment_2 = root_56();
      var label_1 = first_child(fragment_2);
      var text_6 = only_child(label_1, true);
      var select = sibling(label_1, 2);
      each(
        select,
        21,
        () => get(panel).instances,
        index,
        ($$anchor3, instance) => {
          var option = root_47();
          var text_7 = only_child(option);
          var option_value = {};
          template_effect(
            ($0) => {
              set_text(text_7, `${get(instance).name ?? ""} \xB7 ${$0 ?? ""}`);
              if (
                option_value !== (option_value = get(instance).config_entry_id)
              ) {
                option.value = (option.__value = option_value) ?? "";
              }
            },
            [
              () =>
                get(t)(
                  get(instance).loaded ? get(instance).status : "Unloaded",
                ),
            ],
          );
          append($$anchor3, option);
        },
      );
      reset(select);
      var select_value;
      init_select(select);
      template_effect(
        ($0) => {
          set_text(text_6, $0);
          select.disabled = get(panel).busy;
          if (
            select_value !== (select_value = get(panel).selectedEntry || "")
          ) {
            ((select.value = (select.__value = select_value) ?? ""),
              select_option(select, select_value));
          }
        },
        [() => get(t)("Controller")],
      );
      delegated("change", select, (event2) => {
        get(panel).selectInstance(event2.currentTarget.value);
        event2.currentTarget.value = get(panel).selectedEntry || "";
      });
      append($$anchor2, fragment_2);
    };
    if_block(node_3, ($$render) => {
      if (get(panel).instances.length > 1) $$render(consequent_4);
    });
  }
  var node_4 = sibling(node_3, 2);
  {
    var consequent_5 = ($$anchor2) => {
      var p_3 = root_66();
      var text_8 = only_child(p_3, true);
      template_effect(
        ($0) => set_text(text_8, $0),
        [() => get(t)("Managed file")],
      );
      append($$anchor2, p_3);
    };
    if_block(node_4, ($$render) => {
      if (get(panel).selectedInstance?.source === "file")
        $$render(consequent_5);
    });
  }
  reset(div_1);
  reset(header);
  var node_5 = sibling(header, 2);
  each(
    node_5,
    17,
    () => get(panel).selectedInstance?.overlaps || [],
    index,
    ($$anchor2, overlap) => {
      var p_4 = root_74();
      var text_9 = only_child(p_4);
      template_effect(
        ($0, $1, $2) =>
          set_text(
            text_9,
            `${$0 ?? ""}
        ${get(overlap).name ?? ""}: ${$1 ?? ""}. ${$2 ?? ""}`,
          ),
        [
          () => get(t)("Shared devices with"),
          () => get(overlap).entities.join(", "),
          () => get(t)("Actions and cleanup can interfere between instances."),
        ],
      );
      append($$anchor2, p_4);
    },
  );
  var node_6 = sibling(node_5, 2);
  toolbar(node_6);
  var div_2 = sibling(node_6, 2);
  var text_10 = only_child(div_2, true);
  var div_3 = sibling(div_2, 2);
  var text_11 = only_child(div_3, true);
  var nav = sibling(div_3, 2);
  each(
    nav,
    21,
    () => primaryTabs,
    index,
    ($$anchor2, $$item) => {
      var $$array = user_derived(() => to_array(get($$item), 2));
      let id = () => get($$array)[0];
      let label = () => get($$array)[1];
      var button_2 = root23();
      var text_12 = only_child(button_2, true);
      template_effect(
        ($0) => {
          set_attribute2(button_2, "data-tab", id());
          set_attribute2(
            button_2,
            "aria-current",
            get(panel).tab === id() ? "page" : "false",
          );
          button_2.disabled = !get(panel).selectedInstance?.loaded;
          set_text(text_12, $0);
        },
        [() => get(t)(label())],
      );
      delegated("click", button_2, () => get(panel).navigate(id()));
      append($$anchor2, button_2);
    },
  );
  reset(nav);
  var div_4 = sibling(nav, 2);
  var node_7 = child(div_4);
  {
    var consequent_6 = ($$anchor2) => {
      var button_3 = root_83();
      var text_13 = only_child(button_3, true);
      template_effect(
        ($0) => set_text(text_13, $0),
        [() => get(t)("Back to steps")],
      );
      delegated("click", button_3, () => get(panel).navigate("steps"));
      append($$anchor2, button_3);
    };
    if_block(node_7, ($$render) => {
      if (!get(primary)) $$render(consequent_6);
    });
  }
  reset(div_4);
  var div_5 = sibling(div_4, 2);
  each(
    div_5,
    21,
    () => get(issues),
    index,
    ($$anchor2, issue) => {
      renderIssue(
        $$anchor2,
        () => get(issue),
        () => get(primary),
      );
    },
  );
  reset(div_5);
  var div_6 = sibling(div_5, 2);
  var node_8 = child(div_6);
  key(
    node_8,
    () => `${get(panel).selectedEntry}:${get(panel).tab}`,
    ($$anchor2) => {
      var fragment_4 = comment();
      var node_9 = first_child(fragment_4);
      {
        const failed = ($$anchor3, error = noop) => {
          var fragment_5 = root_93();
          var p_5 = first_child(fragment_5);
          var text_14 = only_child(p_5, true);
          var p_6 = sibling(p_5, 2);
          var text_15 = only_child(p_6, true);
          template_effect(
            ($0, $1) => {
              set_text(text_14, $0);
              set_text(text_15, $1);
            },
            [
              () => errorMessage(error()),
              () =>
                get(t)(
                  "This draft cannot be shown. Discard edits or import a corrected program from Settings.",
                ),
            ],
          );
          append($$anchor3, fragment_5);
        };
        boundary(node_9, { failed }, ($$anchor3) => {
          var fragment_6 = comment();
          var node_10 = first_child(fragment_6);
          {
            var consequent_7 = ($$anchor4) => {
              var fragment_7 = root_103();
              var p_7 = first_child(fragment_7);
              var text_16 = only_child(p_7, true);
              var button_4 = sibling(p_7, 2);
              var text_17 = only_child(button_4, true);
              template_effect(
                ($0, $1) => {
                  set_text(text_16, $0);
                  set_text(text_17, $1);
                },
                [
                  () =>
                    get(t)(
                      "This instance is unavailable. Check Settings \u2192 Devices & services, then retry.",
                    ),
                  () => get(t)("Retry"),
                ],
              );
              delegated("click", button_4, () => get(panel).retry());
              append($$anchor4, fragment_7);
            };
            var consequent_9 = ($$anchor4) => {
              var fragment_8 = comment();
              var node_11 = first_child(fragment_8);
              {
                var consequent_8 = ($$anchor5) => {
                  var button_5 = root23();
                  var text_18 = only_child(button_5, true);
                  template_effect(
                    ($0) => set_text(text_18, $0),
                    [() => get(t)("Retry")],
                  );
                  delegated("click", button_5, () => get(panel).retry());
                  append($$anchor5, button_5);
                };
                if_block(node_11, ($$render) => {
                  if (get(panel).error && !get(panel)._loading)
                    $$render(consequent_8);
                });
              }
              append($$anchor4, fragment_8);
            };
            var consequent_10 = ($$anchor4) => {
              StepEditor($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            var consequent_11 = ($$anchor4) => {
              RandomEventEditor($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            var consequent_12 = ($$anchor4) => {
              StepsView($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            var consequent_13 = ($$anchor4) => {
              RandomView($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            var consequent_14 = ($$anchor4) => {
              SettingsView($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            var consequent_15 = ($$anchor4) => {
              PreviewView($$anchor4, {
                get panel() {
                  return get(panel);
                },
                get revision() {
                  return get(revision);
                },
              });
            };
            if_block(node_10, ($$render) => {
              if (
                get(panel).selectedEntry &&
                !get(panel).selectedInstance?.loaded
              )
                $$render(consequent_7);
              else if (get(panel)._loading || !get(panel).draft)
                $$render(consequent_9, 1);
              else if (get(panel).stepEditor && !get(panel).stepEditor.existing)
                $$render(consequent_10, 2);
              else if (
                get(panel).randomEditor &&
                !get(panel).randomEditor.existing
              )
                $$render(consequent_11, 3);
              else if (get(panel).tab === "steps") $$render(consequent_12, 4);
              else if (get(panel).tab === "random") $$render(consequent_13, 5);
              else if (get(panel).tab === "settings")
                $$render(consequent_14, 6);
              else if (get(panel).tab === "preview") $$render(consequent_15, 7);
            });
          }
          append($$anchor3, fragment_6);
        });
      }
      append($$anchor2, fragment_4);
    },
  );
  reset(div_6);
  reset(main);
  reset(ha_top_app_bar_fixed);
  var node_12 = sibling(ha_top_app_bar_fixed, 2);
  {
    var consequent_16 = ($$anchor2) => {
      UnsavedStepDialog($$anchor2, {
        get panel() {
          return get(panel);
        },
      });
    };
    if_block(node_12, ($$render) => {
      if (get(panel).pendingStepExit) $$render(consequent_16);
    });
  }
  template_effect(() => {
    set_attribute2(div_2, "hidden", !get(notices));
    set_text(text_10, get(notices));
    set_attribute2(div_3, "hidden", !get(panel).error);
    set_text(text_11, get(panel).error);
  });
  append($$anchor, fragment_1);
  pop();
  $$cleanup();
}
delegate(["click", "change"]);

// custom_components/occupied/frontend/occupied-panel.ts
var OccupiedPanel = class extends HTMLElement {
  // Program state
  draft;
  saved;
  document;
  catalog = { entities: [], services: {} };
  revision = "";
  stale = false;
  dirty = false;
  // Draft edits bump version; validatedVersion records the last valid one.
  version = 0;
  validatedVersion = -1;
  issues = [];
  error = "";
  busy = false;
  // Incremented on reload/disconnect so late responses are discarded.
  epoch = 0;
  // View state
  tab = "steps";
  t = translator("en");
  stepEditor = null;
  randomEditor = null;
  get activeEditor() {
    return this.stepEditor || this.randomEditor;
  }
  get hasEditorChanges() {
    if (this.stepEditor) {
      return hasStepChanges(this.stepEditor);
    }
    return this.randomEditor ? hasRandomChanges(this.randomEditor) : false;
  }
  pendingStepExit = null;
  selectedStep = null;
  preview;
  previewProgram;
  previewDate = "";
  liveSession = null;
  livePlan;
  liveProgram;
  liveVisible = false;
  liveReady = false;
  liveBusy = false;
  liveStopping = false;
  liveCanAdvance = false;
  schedulingPaused = false;
  _liveRecoveryEpoch = 0;
  get liveRunning() {
    return liveRunning(this.liveSession);
  }
  yaml = "";
  yamlSaved = "";
  get yamlDirty() {
    return this.yaml !== this.yamlSaved;
  }
  _hass;
  _loading = false;
  instances = [];
  selectedEntry = null;
  _instancesReady = false;
  _instancesEpoch = 0;
  _instancesUnsubscribe = null;
  _instancesSubscribing = false;
  _panel;
  _loadedEntry = null;
  _subscriptionEpoch = 0;
  _unsubscribe = null;
  _subscribing = false;
  _liveConnection;
  updates = writable(0);
  updateRevision = 0;
  component;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  set hass(value) {
    const localeChanged =
      this._hass?.locale?.language !== value?.locale?.language ||
      this._hass?.locale?.time_format !== value?.locale?.time_format;
    const changed = this._hass?.connection !== value?.connection;
    this._hass = value;
    this.t = translator(value?.language);
    for (const selector of this.shadowRoot.querySelectorAll(
      "ha-selector,ha-generic-picker",
    )) {
      selector.hass = value;
    }
    if (localeChanged) {
      this.flush();
    }
    if (changed) {
      this._disposeSubscription();
      this._disposeInstances();
      this._instancesReady = false;
      void this._subscribe();
    }
    void this._load();
  }
  set panel(value) {
    this._panel = value;
    void this._load();
  }
  set narrow(value) {
    const narrow = !!value;
    if (this.hasAttribute("narrow") === narrow) {
      return;
    }
    this.toggleAttribute("narrow", narrow);
    this.flush();
  }
  set route(_value) {
    void this._load();
  }
  get selectedInstance() {
    return this.instances.find(
      (item) => item.config_entry_id === this.selectedEntry,
    );
  }
  connectedCallback() {
    if (!this.component) {
      const style = document.createElement("style");
      style.textContent = styles;
      this.shadowRoot.append(style);
      this.component = mount(App, {
        target: this.shadowRoot,
        props: { panel: this, updates: this.updates },
      });
      this.flush();
    }
    void this._load();
    window.addEventListener("beforeunload", this._beforeUnload);
    globalThis.addEventListener("location-changed", this._locationChanged);
    globalThis.addEventListener("popstate", this._locationChanged);
    document.addEventListener("visibilitychange", this._liveVisibilityChanged);
  }
  disconnectedCallback() {
    if (this.component) {
      void unmount(this.component);
      this.component = void 0;
    }
    this.shadowRoot.replaceChildren();
    this.epoch++;
    this.busy = this.liveBusy = this.liveStopping = false;
    this._loadedEntry = null;
    this._loading = false;
    this._disposeSubscription();
    this._disposeInstances();
    this._instancesReady = false;
    window.removeEventListener("beforeunload", this._beforeUnload);
    globalThis.removeEventListener("location-changed", this._locationChanged);
    globalThis.removeEventListener("popstate", this._locationChanged);
    document.removeEventListener(
      "visibilitychange",
      this._liveVisibilityChanged,
    );
  }
  _locationChanged = () => void this._load();
  _beforeUnload = (event2) => {
    if (!(this.dirty || this.yamlDirty || this.hasEditorChanges)) {
      return;
    }
    event2.preventDefault();
    event2.returnValue = "";
  };
  // --- Backend connection -------------------------------------------------
  _disposeInstances() {
    this._instancesEpoch++;
    this._instancesUnsubscribe?.();
    this._instancesUnsubscribe = null;
    this._instancesSubscribing = false;
  }
  async _subscribeInstances() {
    if (
      this._instancesUnsubscribe ||
      this._instancesSubscribing ||
      !this.isConnected
    ) {
      return;
    }
    this._instancesSubscribing = true;
    const epoch = this._instancesEpoch;
    try {
      const unsubscribe = await this._hass.connection.subscribeMessage(
        (instances) => {
          if (epoch !== this._instancesEpoch || !this.isConnected) {
            return;
          }
          this.instances = instances;
          this.flush();
          if (!this.selectedInstance?.loaded && this._loadedEntry) {
            this.epoch++;
            this._loadedEntry = null;
            this._loading = this.busy = false;
            this._disposeSubscription();
          }
          void this._load();
        },
        { type: "occupied/instances_subscribe" },
      );
      if (epoch !== this._instancesEpoch || !this.isConnected) {
        unsubscribe();
      } else {
        this._instancesUnsubscribe = unsubscribe;
      }
    } catch (error) {
      if (epoch === this._instancesEpoch) {
        this.fail(error);
      }
    } finally {
      if (epoch === this._instancesEpoch) {
        this._instancesSubscribing = false;
      }
    }
  }
  _writeSelection(entry, replace = false) {
    const url = new URL(location.href);
    url.searchParams.set("config_entry", entry);
    history[replace ? "replaceState" : "pushState"](null, "", url);
    globalThis.dispatchEvent(new Event("location-changed"));
  }
  selectInstance(entry) {
    if (entry === this.selectedEntry || this.busy) {
      return;
    }
    if (!this._canSwitchInstance()) {
      this.flush();
      return;
    }
    this._resetInstance(entry);
    this._writeSelection(entry);
    void this._load();
  }
  _canSwitchInstance() {
    return (
      !(this.dirty || this.yamlDirty || this.hasEditorChanges) ||
      globalThis.confirm(
        this.t("This instance has unsaved changes. Discard them and switch?"),
      )
    );
  }
  _resetInstance(entry) {
    this.epoch++;
    this._disposeSubscription();
    this._loadedEntry = null;
    this.selectedEntry = entry;
    Object.assign(this, {
      draft: void 0,
      saved: void 0,
      document: void 0,
      catalog: { entities: [], services: {} },
      revision: "",
      stale: false,
      dirty: false,
      version: 0,
      validatedVersion: -1,
      issues: [],
      error: "",
      busy: false,
      _loading: false,
      tab: "steps",
      stepEditor: null,
      randomEditor: null,
      pendingStepExit: null,
      selectedStep: null,
      preview: void 0,
      previewProgram: void 0,
      previewDate: "",
      liveSession: null,
      livePlan: void 0,
      liveProgram: void 0,
      liveVisible: false,
      liveReady: false,
      liveBusy: false,
      liveStopping: false,
      liveCanAdvance: false,
      schedulingPaused: false,
      yaml: "",
      yamlSaved: "",
    });
    this.renderView();
  }
  ws(type, data = {}) {
    return this._hass.callWS({
      type: `occupied/${type}`,
      config_entry_id: this._loadedEntry,
      ...data,
    });
  }
  _disposeSubscription() {
    this._liveConnection?.removeEventListener?.("ready", this._liveConnected);
    this._liveConnection?.removeEventListener?.(
      "disconnected",
      this._liveDisconnected,
    );
    this._liveConnection = void 0;
    this.liveReady = false;
    this._liveRecoveryEpoch++;
    this._subscriptionEpoch++;
    this._unsubscribe?.();
    this._unsubscribe = null;
    this._subscribing = false;
  }
  async _subscribe() {
    if (
      !this.isConnected ||
      !this._loadedEntry ||
      !this._hass?.connection ||
      this._unsubscribe ||
      this._subscribing
    ) {
      return;
    }
    this._subscribing = true;
    this._liveConnection = this._hass.connection;
    this._hass.connection.addEventListener?.("ready", this._liveConnected);
    this._hass.connection.addEventListener?.(
      "disconnected",
      this._liveDisconnected,
    );
    const epoch = this._subscriptionEpoch;
    try {
      const unsubscribe = await this._hass.connection.subscribeMessage(
        (snapshot2) => {
          if (epoch === this._subscriptionEpoch && this.isConnected) {
            this._onSnapshot(snapshot2);
          }
        },
        { type: "occupied/subscribe", config_entry_id: this._loadedEntry },
      );
      if (epoch !== this._subscriptionEpoch || !this.isConnected) {
        unsubscribe();
      } else {
        this._unsubscribe = unsubscribe;
        await this.recoverLivePreview();
      }
    } catch (error) {
      if (epoch === this._subscriptionEpoch) {
        this.fail(error);
      }
    } finally {
      if (epoch === this._subscriptionEpoch) {
        this._subscribing = false;
      }
    }
  }
  _onSnapshot(snapshot2) {
    if (snapshot2.loaded === false) {
      this.liveReady = false;
      this._liveRecoveryEpoch++;
    }
    this.schedulingPaused = snapshot2.paused ?? this.schedulingPaused;
    if (snapshot2.live_preview !== void 0) {
      const changedSession =
        this.liveSession?.id !== snapshot2.live_preview?.id;
      this.liveSession = mergeLiveSession(
        this.liveSession,
        snapshot2.live_preview,
      );
      if (changedSession) {
        this.liveReady = false;
        void this.recoverLivePreview();
      }
    }
    if (snapshot2.configuration_source && this.document) {
      this.document.configuration_source = snapshot2.configuration_source;
      this.document.source = snapshot2.configuration_source.mode;
    }
    this.stale = !!(
      snapshot2.source_revision &&
      this.revision &&
      snapshot2.source_revision !== this.revision
    );
    this.flush();
    if (this.stale && !this.dirty && !this.busy && !this.activeEditor) {
      void this.reloadSaved();
    }
  }
  async _load() {
    if (!this.isConnected || !this._hass || !this._panel) {
      return;
    }
    if (!this._instancesReady) {
      const epoch2 = this._instancesEpoch;
      try {
        const instances = await this._hass.callWS({
          type: "occupied/instances",
        });
        if (epoch2 !== this._instancesEpoch || !this.isConnected) {
          return;
        }
        this.instances = instances;
        this._instancesReady = true;
        void this._subscribeInstances();
      } catch (error) {
        if (epoch2 === this._instancesEpoch) {
          this.fail(error);
        }
        return;
      }
    }
    const entry =
      new URLSearchParams(location.search).get("config_entry") ||
      this._panel.config?.config_entry_id ||
      this.selectedEntry ||
      this.instances.find((item) => item.loaded)?.config_entry_id ||
      this.instances[0]?.config_entry_id;
    if (!entry) {
      this.flush();
      return;
    }
    if (entry !== this.selectedEntry) {
      if (this.busy || !this._canSwitchInstance()) {
        if (this.selectedEntry) {
          this._writeSelection(this.selectedEntry, true);
        }
        return;
      }
      this._resetInstance(entry);
    }
    if (
      !this.selectedInstance?.loaded ||
      this._loading ||
      this._loadedEntry === entry
    ) {
      return;
    }
    this._loading = true;
    this.flush();
    this._disposeSubscription();
    const epoch = ++this.epoch;
    this._loadedEntry = entry;
    try {
      const [doc, catalog] = await Promise.all([
        this.ws("program"),
        this.ws("catalog"),
        loadHaControls(),
      ]);
      if (epoch !== this.epoch) {
        return;
      }
      if (this.draft && (this.dirty || this.yamlDirty || this.activeEditor)) {
        this.document = doc;
        this.saved = doc.program;
        this.stale = doc.revision !== this.revision;
      } else {
        this.adopt(doc);
        this.resetDraft();
      }
      this.catalog = catalog;
      this.error = "";
      this.renderView();
      void this._subscribe();
    } catch (error) {
      if (epoch === this.epoch) {
        this._loadedEntry = null;
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this._loading = false;
        this.flush();
      }
    }
  }
  // --- Rendering ----------------------------------------------------------
  /**
  Commit Svelte updates before callers focus a newly rendered field.
  */
  flush() {
    if (this.component) {
      flushSync(() => this.updates.set(++this.updateRevision));
    }
  }
  renderView() {
    if (this.tab === "preview") {
      void this.loadPreview();
    }
    this.flush();
  }
  navigate(tab) {
    if (this.activeEditor) {
      this.requestStepExit(() => {
        this.navigate(tab);
      });
      return;
    }
    if (this.tab === tab) {
      return;
    }
    if (this.yamlDirty) {
      if (
        !globalThis.confirm(
          this.t("There are unsaved edits. Discard them and switch views?"),
        )
      ) {
        return;
      }
      this.discardEdits(false);
    }
    this.tab = tab;
    if (tab === "preview") {
      void this.recoverLivePreview();
    }
    this.renderView();
  }
  requestStepExit(action2) {
    const editor = this.activeEditor;
    if (!editor) {
      action2();
      return;
    }
    if (this.hasEditorChanges) {
      this.pendingStepExit = action2;
      this.flush();
      return;
    }
    this.finishStepExit(action2);
  }
  cancelStepExit() {
    this.pendingStepExit = null;
    this.flush();
  }
  confirmStepExit() {
    const action2 = this.pendingStepExit;
    if (action2) {
      this.finishStepExit(action2);
    }
  }
  finishStepExit(action2) {
    this.pendingStepExit = null;
    this.stepEditor = null;
    this.randomEditor = null;
    this.selectedStep = null;
    this.error = "";
    this.issues = [];
    this.version++;
    action2();
    this.renderView();
  }
  retry() {
    this._instancesReady = false;
    void this._load();
  }
  notices() {
    const t = this.t;
    const programNotice = this.stale
      ? t(
          "The saved program changed. Your draft is preserved; reload the saved program before saving.",
        )
      : "";
    return [
      programNotice,
      this.document?.source === "file"
        ? t(
            "Managed file is authoritative. Export draft changes to your file, then reload.",
          )
        : "",
      this.document?.configuration_source?.status === "error"
        ? t("File error: see Settings or Home Assistant Repairs")
        : "",
    ]
      .filter(Boolean)
      .join(" \xB7 ");
  }
  // --- Draft editing ------------------------------------------------------
  /**
  Record the saved program from a backend document.
  */
  adopt(doc) {
    this.document = doc;
    this.saved = doc.program;
    this.revision = doc.revision;
    this.stale = false;
  }
  /**
  Replace the draft with the saved program, dropping local edits.
  */
  resetDraft() {
    this.draft = copy(this.saved);
    this.dirty = !!this.document.needs_apply;
    this.version++;
    this.validatedVersion = -1;
    this.issues = [];
  }
  discardEdits(render = true) {
    this.resetDraft();
    this.yaml = this.yamlSaved;
    this.error = "";
    if (render) {
      this.renderView();
    }
  }
  discardYaml() {
    this.yaml = this.yamlSaved;
    this.error = "";
    this.issues = [];
    this.flush();
  }
  change(path, value, rerender = false) {
    if (path.length === 0) {
      this.draft = value;
    } else {
      set(this.draft, path, value);
    }
    this.edited(rerender);
  }
  edited(rerender = false) {
    this.version++;
    this.dirty = true;
    this.validatedVersion = -1;
    if (rerender) {
      this.renderView();
    } else {
      this.flush();
    }
  }
  fail(error) {
    this.error = errorMessage(error);
    this.flush();
  }
  attempt(action2) {
    try {
      action2();
    } catch (error) {
      this.fail(error);
    }
  }
  /**
  Run one backend action at a time; failures are shown, not thrown.
  */
  async run(action2) {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
    this.flush();
    const epoch = this.epoch;
    try {
      return await action2(epoch);
    } catch (error) {
      if (epoch === this.epoch) {
        if (isRevisionConflict(error)) {
          this.stale = true;
        }
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this.busy = false;
        this.flush();
      }
    }
  }
  showIssues(result) {
    this.issues = result.issues || [];
    this.flush();
    if (result.valid === false && this.issues.length === 0) {
      this.fail(
        this.t("Preview contains infeasible dates. Review timeline issues."),
      );
    }
  }
  /**
  Saved-program warnings persist independently of temporary editor issues.
  */
  visibleIssues() {
    const issues = /* @__PURE__ */ new Map();
    for (const issue of [...(this.document?.warnings || []), ...this.issues]) {
      const key2 = JSON.stringify([
        issue.severity,
        issue.code,
        issue.model_path || issue.path || "$",
        issue.message,
      ]);
      issues.set(key2, issue);
    }
    return [...issues.values()];
  }
  /**
  Show a backend issue on the step editor field it belongs to.
  */
  focusIssue(issue) {
    const editor = this.activeEditor;
    if (!editor) {
      return;
    }
    const path = issue.model_path || [],
      prefix = editor.candidatePath || [];
    if (prefix.length === 0 || prefix.some((key2, i) => path[i] !== key2)) {
      this.fail(
        this.t(
          "Finish or cancel this step to edit other configuration issues.",
        ),
      );
      return;
    }
    const field = this.randomEditor
      ? randomEditorField(path.slice(prefix.length), this.randomEditor.form)
      : editorField(path.slice(prefix.length), this.stepEditor.form);
    editor.errors[field] = issue.message;
    this.renderView();
    this.shadowRoot
      .querySelector(`[data-builder-field="${CSS.escape(field)}"]`)
      ?.focus();
  }
  // --- Backend actions ----------------------------------------------------
  validate() {
    const version = this.version,
      draft = copy(this.draft);
    return this.run(async (epoch) => {
      const result = await this.ws("editor_validate", { program: draft });
      if (epoch !== this.epoch || version !== this.version) {
        return;
      }
      this.showIssues(result);
      if (result.valid) {
        this.validatedVersion = version;
      }
    });
  }
  save(candidate) {
    if (this.document?.source === "file" || this.stale) {
      return;
    }
    const version = this.version,
      draft = copy(candidate || this.draft),
      expected = this.revision,
      editor = this.activeEditor,
      submittedForm = editor ? copy(editor.form) : null;
    return this.run(async (epoch) => {
      const validation = await this.ws("editor_validate", { program: draft });
      if (epoch !== this.epoch) {
        return;
      }
      if (version !== this.version) {
        this.fail(
          this.t(
            "Your changes are kept. Save again to include the latest edits.",
          ),
        );
        return;
      }
      this.showIssues(validation);
      if (!validation.valid) {
        if (editor && this.issues.length > 0) {
          this.focusIssue(
            this.issues.find((i) => i.severity !== "warning") || this.issues[0],
          );
        }
        return;
      }
      this.validatedVersion = version;
      const result = await this.ws("save", {
        program: draft,
        expected_revision: expected,
      });
      if (epoch !== this.epoch) {
        return;
      }
      if (!result.valid) {
        return this.showIssues(result);
      }
      this.adopt({ ...this.document, ...result, needs_apply: false });
      if (editor && this.activeEditor === editor) {
        this.draft = copy(result.program);
        this.dirty = false;
        if (this.stepEditor) {
          this.selectedStep = editor.id;
        }
        editor.existing = true;
        if (this.randomEditor) {
          this.randomEditor.original = submittedForm;
        } else {
          this.stepEditor.original = submittedForm;
        }
        if (version !== this.version) {
          this.fail(
            this.t("Earlier changes saved. Your newer edits are still open."),
          );
          return;
        }
        this.stepEditor = null;
        this.randomEditor = null;
      }
      if (version === this.version) {
        this.draft = copy(result.program);
        this.dirty = false;
        this.renderView();
        if (editor) {
          this.shadowRoot
            .getElementById(
              `${this.tab === "random" ? "random" : "step"}-card-${editor.id}`,
            )
            ?.focus({ preventScroll: true });
        }
      } else {
        this.dirty = true;
      }
    });
  }
  async reloadSaved(discard = false) {
    if (
      this.busy ||
      ((this.dirty || this.yamlDirty || this.activeEditor) && !discard)
    ) {
      return;
    }
    const version = this.version;
    return this.run(async (epoch) => {
      const doc = await this.ws("program");
      if (epoch !== this.epoch || version !== this.version) {
        return;
      }
      this.adopt(doc);
      this.resetDraft();
      this.stepEditor = null;
      this.randomEditor = null;
      this.renderView();
    });
  }
  movePreviewDay(days2) {
    return this.selectPreviewDate(
      shiftScheduleDate(
        this.previewDate || this.document.simulation_date,
        days2,
      ),
    );
  }
  selectPreviewDate(date) {
    if (
      this.busy ||
      this.liveBusy ||
      this.liveRunning ||
      this.tab !== "preview" ||
      date === this.previewDate
    ) {
      return;
    }
    this.previewDate = date;
    this.liveVisible = false;
    return this.loadPreview();
  }
  loadPreview() {
    if (
      this.busy ||
      !this.draft ||
      !this.document ||
      this.liveRunning ||
      (this.liveVisible && this.livePlan)
    ) {
      return;
    }
    const version = this.version,
      draft = copy(this.draft),
      date = this.previewDate || this.document.simulation_date;
    this.previewDate = date;
    return this.run(async (epoch) => {
      const result = await this.ws("preview", {
        program: draft,
        date,
        days: 1,
        seed: "preview-1",
      });
      if (
        epoch !== this.epoch ||
        version !== this.version ||
        date !== this.previewDate
      ) {
        return;
      }
      this.preview = result;
      this.previewProgram = draft;
      this.showIssues(result);
    });
  }
  _liveDisconnected = () => {
    this.liveReady = false;
    this._liveRecoveryEpoch++;
    this.flush();
  };
  _liveConnected = () => void this.recoverLivePreview();
  _liveVisibilityChanged = () => {
    if (document.visibilityState === "visible") {
      void this.recoverLivePreview();
    } else {
      this._liveDisconnected();
    }
  };
  adoptLive(result) {
    this.liveSession = mergeLiveSession(this.liveSession, result.session);
    if (this.liveSession && result.call_outcomes) {
      this.liveSession.outcomes = {
        ...this.liveSession.outcomes,
        ...result.call_outcomes,
      };
    }
    this.liveCanAdvance = result.can_advance;
    this.schedulingPaused = this.liveSession?.paused ?? this.schedulingPaused;
    if (result.plan && result.program) {
      this.livePlan = result.plan;
      this.liveProgram = result.program;
      this.liveVisible =
        !!result.session && (this.liveRunning || result.session.paused);
      if (this.liveVisible) {
        this.previewDate = result.session.date;
      }
    }
    this.flush();
  }
  async recoverLivePreview() {
    if (!this._loadedEntry || !this.isConnected) {
      return;
    }
    const epoch = this.epoch,
      recovery = ++this._liveRecoveryEpoch;
    this.liveReady = false;
    this.flush();
    try {
      const result = await this.ws("live_preview/status");
      if (epoch !== this.epoch || recovery !== this._liveRecoveryEpoch) {
        return;
      }
      this.adoptLive(result);
      this.liveReady = true;
    } catch (error) {
      if (epoch === this.epoch && recovery === this._liveRecoveryEpoch) {
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch && recovery === this._liveRecoveryEpoch) {
        this.flush();
      }
    }
  }
  async startLivePreview() {
    if (this.liveBusy || this.liveRunning || !this.liveReady || this.busy) {
      return;
    }
    const frozen = this.liveVisible && this.liveSession;
    const program = frozen ? this.liveProgram : this.previewProgram;
    const fingerprint = frozen
      ? this.liveSession?.plan_fingerprint
      : this.preview?.plan_fingerprint;
    if (!program || !fingerprint) {
      return;
    }
    const epoch = this.epoch;
    this.liveBusy = true;
    this.error = "";
    this.flush();
    try {
      const result = await this.ws("live_preview/start", {
        program: copy(program),
        date: this.previewDate,
        seed: "preview-1",
        expected_plan_fingerprint: fingerprint,
        request_id: crypto.randomUUID(),
      });
      if (epoch === this.epoch) {
        this.adoptLive(result);
      }
    } catch (error) {
      if (epoch === this.epoch) {
        this.fail(error);
        await this.recoverLivePreview();
      }
    } finally {
      if (epoch === this.epoch) {
        this.liveBusy = false;
        this.flush();
      }
    }
  }
  async nextLiveEvent() {
    const session = this.liveSession;
    if (
      !session?.next_group ||
      session.state !== "ready" ||
      !this.liveReady ||
      !this.liveCanAdvance ||
      this.liveBusy ||
      this.liveStopping
    ) {
      return;
    }
    const epoch = this.epoch;
    this.liveBusy = true;
    this.error = "";
    this.flush();
    try {
      const result = await this.ws("live_preview/next", {
        session_id: session.id,
        expected_group_id: session.next_group.id,
        request_id: crypto.randomUUID(),
      });
      if (epoch === this.epoch && this.liveSession?.id === session.id) {
        this.adoptLive(result);
      }
    } catch (error) {
      if (epoch === this.epoch) {
        this.fail(error);
        await this.recoverLivePreview();
      }
    } finally {
      if (epoch === this.epoch) {
        this.liveBusy = false;
        this.flush();
      }
    }
  }
  async stopLivePreview() {
    const session = this.liveSession;
    if (!session || !this.liveRunning || this.liveStopping) {
      return;
    }
    const epoch = this.epoch;
    this.liveStopping = true;
    this.flush();
    try {
      const result = await this.ws("live_preview/stop", {
        session_id: session.id,
      });
      if (epoch === this.epoch && this.liveSession?.id === session.id) {
        this.adoptLive(result);
      }
    } catch (error) {
      if (epoch === this.epoch) {
        this.fail(error);
        await this.recoverLivePreview();
      }
    } finally {
      if (epoch === this.epoch) {
        this.liveStopping = false;
        this.flush();
      }
    }
  }
  resumeScheduling() {
    return this.run(async (epoch) => {
      await this._hass.callWS({
        type: "call_service",
        domain: "occupied",
        service: "resume",
        service_data: { config_entry_id: this._loadedEntry },
      });
      if (epoch === this.epoch) {
        await this.recoverLivePreview();
      }
    });
  }
  refreshPreviewSchedule() {
    if (this.liveRunning || this.liveBusy) {
      return;
    }
    this.liveVisible = false;
    return this.loadPreview();
  }
  saveYaml() {
    if (this.document?.source === "file" || this.stale) {
      return;
    }
    const yaml = this.yaml,
      version = this.version,
      expected = this.revision;
    return this.run(async (epoch) => {
      const result = await this.ws("save", {
        program: yaml,
        expected_revision: expected,
      });
      if (epoch !== this.epoch) {
        return;
      }
      if (!result.valid) {
        return this.showIssues(result);
      }
      this.adopt({ ...this.document, ...result, needs_apply: false });
      this.yamlSaved = yaml;
      this.issues = [];
      if (version === this.version) {
        this.draft = copy(result.program);
        this.dirty = false;
        this.version++;
        this.validatedVersion = this.version;
      }
      this.flush();
    });
  }
  exportYaml() {
    if (this.yamlDirty) {
      return;
    }
    const yaml = this.yaml;
    return this.run(async (epoch) => {
      const result = await this.ws("export", { program: copy(this.draft) });
      if (epoch !== this.epoch) {
        return;
      }
      this.showIssues(result);
      if (result.valid && this.yaml === yaml) {
        this.yaml = result.yaml;
        this.yamlSaved = result.yaml;
      }
    });
  }
};
function isRevisionConflict(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "revision_conflict"
  );
}
function editorField(tail, form) {
  const has = (key2) => tail.includes(key2),
    head2 = tail[0];
  if (["name", "days", "entities", "data"].includes(String(head2))) {
    return String(head2);
  }
  if (head2 === "action") {
    return form.kind === "service" ? "service" : "kind";
  }
  if (head2 === "timing") {
    if (has("absolute_time")) {
      return has("end") ? "end" : "start";
    }
    if (has("start_offset")) {
      return "startOffset";
    }
    if (has("end_offset")) {
      return "endOffset";
    }
    return "anchor";
  }
  return "name";
}
function randomEditorField(tail, form) {
  const head2 = tail[0];
  if (head2 === "start" || head2 === "end") {
    if (tail[1] === "duration") {
      return `${head2}.${tail[2] === "max" ? "maxDuration" : "minDuration"}`;
    }
    if (tail.length === 1) {
      let field = "anchor";
      if (form[head2].mode === "absolute") {
        field = "start";
      } else if (form[head2].mode === "duration") {
        field = "minDuration";
      }
      return `${head2}.${field}`;
    }
    return `${head2}.${editorField(["timing", ...tail.slice(1)], form.on)}`;
  }
  if (head2 === "on" || head2 === "off") {
    return `${head2}.${editorField(tail.slice(1), form[head2])}`;
  }
  if (head2 === "count") {
    return tail[1] === "max" ? "maxCount" : "minCount";
  }
  return (
    {
      min_duration: "minDuration",
      max_duration: "maxDuration",
      days: "days",
    }[String(head2)] || "name"
  );
}
if (!customElements.get("occupied-panel")) {
  customElements.define("occupied-panel", OccupiedPanel);
}
export { OccupiedPanel };
