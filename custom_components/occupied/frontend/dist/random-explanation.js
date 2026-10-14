// Generated from random-explanation.ts by pnpm run build. Do not edit.
import {
  durationLabel,
  durationSeconds,
  entityName,
  timingExplanation,
} from "./util.js";
import { stepEntries } from "./step-model.js";
import { randomEntries } from "./random-model.js";
export function randomExplanation(
  form,
  program,
  catalog,
  t = (text) => text,
  locale,
) {
  const say = (text, values = {}) => {
    let message = t(text);
    for (const [key, value] of Object.entries(values)) {
      message = message.replaceAll(`{${key}}`, () => String(value));
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
            (total, part, index) => total + Number(part) * [3600, 60, 1][index],
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
      windowSeconds = difference < 0 ? difference + 86_400 : difference;
      if (difference < 0) {
        end += ` ${t("the next day")}`;
      }
    }
  }
  if (form.end.mode === "duration") {
    const duration = durationSeconds(
      form.end.maxDuration || form.end.minDuration || "",
    );
    if (Number.isFinite(duration) && duration > 0) {
      windowSeconds = duration;
    }
  }
  const minDuration = durationSeconds(form.minDuration);
  const maxDuration = durationSeconds(form.maxDuration);
  const cannotFit =
    windowSeconds !== undefined &&
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
    Number.isSafeInteger(value) && value >= 0 && value <= 1000;
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
    maxDuration > 604_800
  ) {
    sentences.push(
      t("Choose valid durations to describe how long each event lasts."),
    );
  } else if (windowSeconds !== undefined && minDuration > windowSeconds) {
    sentences.push(t("Reduce the minimum duration or extend the window."));
  } else {
    const longest =
      windowSeconds === undefined
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
  const action = (selected) => {
    if (selected.kind === "custom") {
      return t("run the Custom YAML actions in order");
    }
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
  const on = action(form.on);
  const off = action(
    form.sameEntities ? { ...form.off, entities: form.on.entities } : form.off,
  );
  if (on && !cannotFit) {
    sentences.push(say("When each event starts, {action}.", { action: on }));
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
