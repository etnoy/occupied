// Generated from time-format.ts by pnpm run build. Do not edit.
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
/**
Format a canonical local clock value without applying a timezone offset.
*/
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
/**
Format an absolute timestamp with HA's time preference and the requested zone.
*/
export function formatTimestamp(value, zone, locale) {
  return new Intl.DateTimeFormat(formatterLocale(locale), {
    dateStyle: "short",
    timeStyle: "medium",
    hourCycle: hourCycle(locale),
    timeZone: zone && zone !== "home_assistant" ? zone : undefined,
  }).format(new Date(value));
}
