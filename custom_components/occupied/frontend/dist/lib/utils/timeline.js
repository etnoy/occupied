// Generated from custom_components/occupied/frontend/src/lib/utils/timeline.ts by pnpm run build. Do not edit.
import { translator } from "../i18n/translations.js";
import { coverTarget } from "./cover.js";
import {
  calendarMidnight,
  shiftScheduleDate,
  formatTimestamp,
} from "./time-format.js";
export function calendarDayPlan(plans, date) {
  const current = plans.find((plan) => plan.simulation_date === date);
  if (!current) {
    return undefined;
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
      .filter((event) => within(event.time))
      .sort((a, b) => Date.parse(a.time) - Date.parse(b.time)),
    issues: plans.flatMap((plan) => plan.issues),
  };
}
export function previewStateHistory(
  plan,
  _program,
  names = {},
  t = translator(),
) {
  const start = Date.parse(plan.start),
    end = Date.parse(plan.end);
  const entities = new Map();
  const covers = new Map();
  const stateLabels = {
    on: "on_label",
    off: "off_label",
  };
  const label = (state) => t(stateLabels[state] || "unknown");
  for (const event of [...plan.events].sort(
    (a, b) => Date.parse(a.time) - Date.parse(b.time),
  )) {
    if (event.superseded) {
      continue;
    }
    const at = Date.parse(event.time);
    if (at >= end) {
      continue;
    }
    const typed = /^(light|switch)\.turn_(on|off)$/.test(event.action.action);
    for (const entity of event.action.entities) {
      if (!/^(light|switch|cover)\./.test(entity)) {
        continue;
      }
      let history = entities.get(entity);
      if (!history) {
        const initialState = entity.startsWith("cover.") ? "unknown" : "off";
        history = {
          entity_id: entity,
          name: names[entity] || entity,
          data: [
            {
              state: initialState,
              state_localize: label(initialState),
              last_changed: start,
            },
          ],
        };
        entities.set(entity, history);
      }
      const intended = event.action.action.endsWith("turn_on") ? "on" : "off";
      let state =
        typed && event.action.action.startsWith(`${entity.split(".", 1)[0]}.`)
          ? intended
          : "unknown";
      let localized = label(state);
      if (entity.startsWith("cover.")) {
        const target = coverTarget(event.action, covers.get(entity));
        covers.set(entity, target);
        const parts = [];
        if (target.position !== undefined) {
          let position = t("cover_position_summary").replace("{position}", () =>
            String(target.position),
          );
          if (target.position === 100) {
            position = t("open");
          } else if (target.position === 0) {
            position = t("closed");
          }
          parts.push(position);
        }
        if (target.tilt_position !== undefined) {
          parts.push(
            t("cover_tilt_summary").replace("{position}", () =>
              String(target.tilt_position),
            ),
          );
        }
        state = parts.length > 0 ? JSON.stringify(target) : "unknown";
        localized = parts.length > 0 ? parts.join(" · ") : label("unknown");
      }
      const previous = history.data.at(-1);
      const time = Math.max(start, at);
      if (previous.last_changed === time) {
        previous.state = state;
        previous.state_localize = localized;
      } else if (previous.state !== state) {
        history.data.push({
          state,
          state_localize: localized,
          last_changed: time,
        });
      }
    }
  }
  return [...entities.values()].sort((a, b) => a.name.localeCompare(b.name));
}
// Calendar dates now coincide with the displayed local day. Include overnight
// events from surrounding source dates without carrying yesterday's state forward.
export function calendarStateHistory(
  plans,
  day,
  program,
  names = {},
  t = translator(),
) {
  const start = Date.parse(day.start),
    end = Date.parse(day.end);
  const events = plans
    .flatMap((plan) => plan.events)
    .filter(
      (event) =>
        Date.parse(event.time) >= start && Date.parse(event.time) < end,
    );
  return previewStateHistory({ ...day, events }, program, names, t);
}
export function stamp(value, zone, locale) {
  if (!value) {
    return "—";
  }
  try {
    return formatTimestamp(value, zone, locale);
  } catch {
    return value;
  }
}
export function eventDetails(event, label, timezone, t, locale) {
  const kinds = {
    random_start: "random_start",
    random_end: "random_end",
  };
  let action = event.action.action;
  if (event.tick) {
    const tick = t("tick_progress")
      .replace("{tick}", () => String(event.tick))
      .replace("{count}", () => String(event.tick_count));
    action += ` · ${tick} · ${event.period_seconds}s`;
  }
  if (event.superseded) {
    action += ` · ${t("superseded")}`;
  }
  return {
    time: stamp(event.time, timezone, locale),
    source: `${label} · ${t(kinds[event.kind] || event.kind)}`,
    action,
    targets: event.action.entities.join(", "),
    settings:
      Object.keys(event.action.data || {}).length > 0
        ? JSON.stringify(event.action.data)
        : "—",
  };
}
export function staggerTransitions(plan) {
  const groups = new Map();
  for (const event of plan.events) {
    if (
      !event.tick ||
      !event.authored_at ||
      !event.period_seconds ||
      !event.tick_count
    ) {
      continue;
    }
    const id = `${event.occurrence_id}:${event.configured_index}`;
    let group = groups.get(id);
    if (!group) {
      group = {
        start: event.authored_at,
        end: new Date(
          Date.parse(event.authored_at) + event.period_seconds * 1000,
        ).toISOString(),
        period: event.period_seconds,
        interval: event.period_seconds / event.tick_count,
        count: event.tick_count,
        events: [],
      };
      groups.set(id, group);
    }
    group.events.push(event);
  }
  return [...groups].map(([id, group]) => ({ id, ...group }));
}
