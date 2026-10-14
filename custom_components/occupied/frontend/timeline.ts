import type { Program, Translate, Plan } from "./types.js";
import type { HomeAssistantLocale } from "./time-format.js";
import { coverTarget, type CoverPosition } from "./cover.js";
import {
  calendarMidnight,
  shiftScheduleDate,
  formatTimestamp,
} from "./time-format.js";
export function calendarDayPlan(plans: Plan[], date: string): Plan | undefined {
  const current = plans.find((plan) => plan.simulation_date === date);
  if (!current) {
    return undefined;
  }
  const start = calendarMidnight(date, current.timezone);
  const end = calendarMidnight(shiftScheduleDate(date, 1), current.timezone);
  const within = (time: string) =>
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

export interface PreviewHistoryEntity {
  entity_id: string;
  name: string;
  data: { state: string; state_localize: string; last_changed: number }[];
}
export function previewStateHistory(
  plan: Plan,
  _program: Program,
  names: Record<string, string> = {},
  t: Translate = (text) => text,
): PreviewHistoryEntity[] {
  const start = Date.parse(plan.start),
    end = Date.parse(plan.end);
  const entities = new Map<string, PreviewHistoryEntity>();
  const covers = new Map<string, CoverPosition>();
  const stateLabels: Record<string, string> = { on: "On", off: "Off" };
  const label = (state: string) => t(stateLabels[state] || "Unknown");
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
        history = {
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
        const parts: string[] = [];
        if (target.position !== undefined) {
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
        if (target.tilt_position !== undefined) {
          parts.push(
            t("Tilt {position}%").replace("{position}", () =>
              String(target.tilt_position),
            ),
          );
        }
        state = parts.length > 0 ? JSON.stringify(target) : "unknown";
        localized = parts.length > 0 ? parts.join(" · ") : label("unknown");
      }
      const previous = history.data.at(-1)!;
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
  plans: Plan[],
  day: Plan,
  program: Program,
  names: Record<string, string> = {},
  t: Translate = (text) => text,
): PreviewHistoryEntity[] {
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

export function stamp(
  value?: string | null,
  zone?: string,
  locale?: HomeAssistantLocale,
) {
  if (!value) {
    return "—";
  }
  try {
    return formatTimestamp(value, zone, locale);
  } catch {
    return value;
  }
}

export function staggerTransitions(plan: Plan) {
  const groups = new Map<
    string,
    {
      start: string;
      end: string;
      period: number;
      interval: number;
      count: number;
      events: Plan["events"];
    }
  >();
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
