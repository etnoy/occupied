// Generated from custom_components/occupied/frontend/src/lib/utils/time-format.ts by pnpm run build. Do not edit.
export function scheduleToday(zone, now = new Date(Date.now())) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone && zone !== "home_assistant" ? zone : undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function shiftScheduleDate(value, days) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function formatScheduleDate(value, locale) {
  const weekday = new Intl.DateTimeFormat(locale?.language, {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
  return `${weekday} ${value}`;
}
export function formatPreviewDate(value, today, locale, t) {
  const valueTime = Date.parse(`${value}T12:00:00Z`);
  const todayTime = Date.parse(`${today}T12:00:00Z`);
  const daysFromToday = Math.round((valueTime - todayTime) / 86_400_000);
  const relativeLabels = {
    [-1]: "yesterday",
    0: "today",
    1: "tomorrow",
  };
  const relativeLabel = relativeLabels[daysFromToday]
    ? t(relativeLabels[daysFromToday])
    : undefined;
  const dateLabel = formatScheduleDate(value, locale);
  return relativeLabel ? `${relativeLabel} · ${dateLabel}` : dateLabel;
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
  const language =
    locale.time_format === "language" ? locale.language : undefined;
  const hourCycle = new Intl.DateTimeFormat(language, {
    hour: "numeric",
  }).resolvedOptions().hourCycle;
  return hourCycle === "h11" || hourCycle === "h12";
}
function formatterLocale(locale) {
  return locale?.language;
}
function hourCycle(locale) {
  return usesAmPm(locale) ? "h12" : "h23";
}
export function formatClock(value, locale) {
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
export function formatTimestamp(value, zone, locale) {
  return new Intl.DateTimeFormat(formatterLocale(locale), {
    dateStyle: "short",
    timeStyle: "medium",
    hourCycle: hourCycle(locale),
    timeZone: zone && zone !== "home_assistant" ? zone : undefined,
  }).format(new Date(value));
}
export function formatEventTime(value, zone, locale) {
  return new Intl.DateTimeFormat(formatterLocale(locale), {
    timeStyle: "medium",
    hourCycle: hourCycle(locale),
    timeZone: zone && zone !== "home_assistant" ? zone : undefined,
  }).format(new Date(value));
}
