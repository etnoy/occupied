import { translator } from "../i18n/translations.js";
import type {
  ActionForm,
  Catalog,
  Program,
  RandomForm,
  Translate,
} from "../types.js";
import type { HomeAssistantLocale } from "./time-format.js";
import {
  durationLabel,
  durationSeconds,
  entityName,
  timingExplanation,
} from "./util.js";
import { stepEntries } from "../models/step-model.js";
import { randomEntries } from "../models/random-model.js";

export function randomExplanation(
  form: RandomForm,
  program: Program,
  catalog: Pick<Catalog, "entities" | "time_sources">,
  t: Translate = translator(),
  locale?: HomeAssistantLocale,
): string {
  const say = (text: string, values: Record<string, string | number> = {}) => {
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
      subject: "window_starts",
      days: form.days,
      locale,
    },
  );
  let end = timingExplanation(form.end, entries, t, catalog.time_sources, {
    includeHints: false,
    subject: "window_ends",
    locale,
  });
  let windowSeconds: number | undefined;
  const clockSeconds = (value: string) =>
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
        end += ` ${t("the_next_day")}`;
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
    ...(form.enabled ? [] : [t("random_disabled_hint")]),
    `${start}.`,
    `${end}.`,
  ];
  const minimum = Number(form.minCount);
  const maximum = Number(form.maxCount);
  const validCount = (value: number) =>
    Number.isSafeInteger(value) && value >= 0 && value <= 1000;
  const validCounts =
    !!form.minCount.trim() &&
    !!form.maxCount.trim() &&
    validCount(minimum) &&
    validCount(maximum) &&
    maximum >= minimum;
  if (validCounts && maximum === 0) {
    sentences.push(
      t("random_zero_count_hint"),
      t("random_dependents_skip_hint"),
    );

    return sentences.join(" ");
  }
  if (cannotFit) {
    sentences.push(t("random_duration_exceeds_window"));
  } else if (!validCounts) {
    sentences.push(t("random_counts_prompt"));
  } else if (minimum === maximum) {
    sentences.push(
      minimum === 1
        ? t("random_single_event_summary")
        : say("random_count_summary", {
            count: minimum,
          }),
    );
  } else {
    sentences.push(
      say("random_count_range_summary", {
        min: minimum,
        max: maximum,
      }),
    );
  }
  if (validCounts && minimum === 0) {
    sentences.push(t("random_empty_window_hint"));
  }
  const duration = (seconds: number) => durationLabel(seconds, t);
  if (
    !Number.isFinite(minDuration) ||
    !Number.isFinite(maxDuration) ||
    minDuration <= 0 ||
    maxDuration < minDuration ||
    maxDuration > 604_800
  ) {
    sentences.push(t("random_durations_prompt"));
  } else if (windowSeconds !== undefined && minDuration > windowSeconds) {
    sentences.push(t("random_duration_fit_hint"));
  } else {
    const longest =
      windowSeconds === undefined
        ? maxDuration
        : Math.min(maxDuration, windowSeconds);
    sentences.push(
      minDuration === longest
        ? say("random_duration_summary", {
            duration: duration(minDuration),
          })
        : say("random_duration_range_summary", {
            min: duration(minDuration),
            max: duration(longest),
          }),
    );
  }
  const action = (selected: ActionForm) => {
    if (selected.kind === "custom") {
      return t("custom_yaml_summary");
    }
    const names = [...new Set(selected.entities)].map((id) =>
      entityName(catalog, id),
    );
    if (names.length === 0) {
      return "";
    }
    const last = names.pop()!;
    const entities =
      names.length > 0 ? `${names.join(", ")} ${t("and")} ${last}` : last;
    if (selected.kind === "scene") {
      return say("action_activate_summary", { entities });
    }
    if (selected.kind === "cover") {
      const descriptions: Record<string, string> = {
        "cover.open_cover": "action_open_summary",
        "cover.close_cover": "action_close_summary",
        "cover.stop_cover": "action_stop_summary",
        "cover.set_cover_position": "action_position_summary",
        "cover.open_cover_tilt": "action_open_tilt_summary",
        "cover.close_cover_tilt": "action_close_tilt_summary",
        "cover.stop_cover_tilt": "action_stop_tilt_summary",
        "cover.set_cover_tilt_position": "action_tilt_position_summary",
      };
      const description = descriptions[selected.service];
      if (!description) {
        return "";
      }
      const position =
        selected.service === "cover.set_cover_position"
          ? selected.position
          : selected.tiltPosition;

      return t(description).includes("{position}") &&
        (!position.trim() ||
          !Number.isSafeInteger(Number(position)) ||
          Number(position) < 0 ||
          Number(position) > 100)
        ? ""
        : say(description, { entities, position });
    }
    if (selected.kind === "remote") {
      if (selected.service === "remote.turn_off") {
        return say("action_turn_off_summary", { entities });
      }

      return selected.activity
        ? say("action_remote_activity_summary", {
            activity: selected.activity,
            entities,
          })
        : say("action_remote_default_summary", { entities });
    }
    if (selected.kind === "service") {
      return selected.service.trim()
        ? say("action_service_summary", {
            service: selected.service.trim(),
            entities,
          })
        : "";
    }

    return say(
      selected.action === "turn_off"
        ? "action_turn_off_summary"
        : "action_turn_on_summary",
      { entities },
    );
  };
  const on = action(form.on);
  const off = action(
    form.sameEntities ? { ...form.off, entities: form.on.entities } : form.off,
  );
  if (on && !cannotFit) {
    sentences.push(say("random_start_action_summary", { action: on }));
  }
  if (off && !cannotFit) {
    sentences.push(say("random_end_action_summary", { action: off }));
  }
  if (cannotFit) {
    sentences.push(t("random_duration_priority_hint"));
  } else if (validCounts && maximum === 1) {
    sentences.push(t("random_single_finish_hint"));
  }

  return sentences.join(" ");
}
