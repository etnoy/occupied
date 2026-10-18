import type { HomeAssistant } from "../types.js";

export type HomeAssistantLocale = NonNullable<HomeAssistant["locale"]>;

export function scheduleToday(zone?: string, now = new Date(Date.now())) {
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

export function shiftScheduleDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

export function formatScheduleDate(
  value: string,
  locale?: HomeAssistantLocale,
) {
  const weekday = new Intl.DateTimeFormat(locale?.language, {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));

  return `${weekday} ${value}`;
}

export function formatPreviewDate(
  value: string,
  today: string,
  locale: HomeAssistantLocale | undefined,
  t: (key: string) => string,
) {
  const valueTime = Date.parse(`${value}T12:00:00Z`);
  const todayTime = Date.parse(`${today}T12:00:00Z`);
  const daysFromToday = Math.round((valueTime - todayTime) / 86_400_000);
  const relativeLabels: Record<number, string> = {
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

function usesAmPm(locale?: HomeAssistantLocale) {
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

function formatterLocale(locale?: HomeAssistantLocale) {
  return locale?.language;
}

function hourCycle(locale?: HomeAssistantLocale): "h12" | "h23" {
  return usesAmPm(locale) ? "h12" : "h23";
}

export function formatClock(value: string, locale?: HomeAssistantLocale) {
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
    ...(Number(second) && { second: "2-digit" as const }),
    hourCycle: hourCycle(locale),
    timeZone: "UTC",
  }).format(date);
}

export function formatTimestamp(
  value: string,
  zone?: string,
  locale?: HomeAssistantLocale,
) {
  return new Intl.DateTimeFormat(formatterLocale(locale), {
    dateStyle: "short",
    timeStyle: "medium",
    hourCycle: hourCycle(locale),
    timeZone: zone && zone !== "home_assistant" ? zone : undefined,
  }).format(new Date(value));
}

export function formatEventTime(
  value: string,
  zone?: string,
  locale?: HomeAssistantLocale,
) {
  return new Intl.DateTimeFormat(formatterLocale(locale), {
    timeStyle: "medium",
    hourCycle: hourCycle(locale),
    timeZone: zone && zone !== "home_assistant" ? zone : undefined,
  }).format(new Date(value));
}
