import type { HomeAssistant } from "./types.js";

export type HomeAssistantLocale = NonNullable<HomeAssistant["locale"]>;

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

/**
Format a canonical local clock value without applying a timezone offset.
*/
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

/**
Format an absolute timestamp with HA's time preference and the requested zone.
*/
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
