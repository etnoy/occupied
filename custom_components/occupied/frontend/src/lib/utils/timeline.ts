import { managedOffEntities } from "../models/run-condition.js";
import { translator } from "../i18n/translations.js";
import type { Program, Translate, Plan, PlannedEvent } from "../types.js";
import type { HomeAssistantLocale } from "./time-format.js";
import {
  coverActions,
  coverTarget,
  isCoverAction,
  type CoverPosition,
} from "./cover.js";
import { formatTimestamp, formatEventTime } from "./time-format.js";

export function calendarDayPlan(plans: Plan[], date: string): Plan | undefined {
  const current = plans.find((plan) => plan.simulation_date === date);
  if (!current) {
    return undefined;
  }
  const { start, end } = current;
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
  markers?: { time: number; description: string }[];
  data: {
    state: string;
    state_localize: string;
    last_changed: number;
    end_time?: number;
  }[];
}

function isStateEvent(event: PlannedEvent) {
  return (
    event.action.entities.length > 0 &&
    event.action.entities.every((entity) =>
      entity.startsWith("cover.")
        ? isCoverAction(event.action) && !event.action.action.includes(".stop_")
        : /^(light|switch)\./.test(entity) &&
          /^(light|switch|homeassistant)\.turn_(on|off)$/.test(
            event.action.action,
          ) &&
          (event.action.action.startsWith("homeassistant.") ||
            event.action.action.startsWith(`${entity.split(".", 1)[0]}.`)),
    )
  );
}

// Known targets describe state intervals; opaque commands happen at an instant.
// Synthetic rows let both share HA's native time axis and zoom.
export function previewTimelineData(
  plan: Plan,
  program: Program,
  names: Record<string, string> = {},
  t: Translate = translator(),
  locale?: HomeAssistantLocale,
): PreviewHistoryEntity[] {
  const states = previewStateHistory(plan, program, names, t);
  const rows = new Map<string, PreviewHistoryEntity>();
  const start = Date.parse(plan.start),
    end = Date.parse(plan.end);
  for (const group of groupPreviewEvents(
    plan.events.filter(
      (event) =>
        !event.superseded &&
        !isStateEvent(event) &&
        Date.parse(event.time) >= start &&
        Date.parse(event.time) < end,
    ),
  )) {
    const event = group.event;
    const random = event.kind.startsWith("random_");
    const id = `occupied-${random ? "random" : "step"}:${event.source_id}`;
    const source = (random ? program.random : program.steps)?.[event.source_id];
    let row = rows.get(id);
    if (!row) {
      row = {
        entity_id: id,
        name: source?.name || event.source_id,
        data: [],
        markers: [],
      };
      rows.set(id, row);
    }
    const actions = group.actions.map((action) => {
      const targets = action.entities
        .map((entity) => names[entity] || entity)
        .join(", ");

      return [
        action.event.action.action,
        targets,
        JSON.stringify(action.event.action.data),
      ]
        .filter(Boolean)
        .join(" · ");
    });
    row.markers!.push({
      time: Date.parse(event.time),
      description: [
        row.name,
        formatEventTime(event.time, plan.timezone, locale),
        ...actions,
      ].join("\n"),
    });
  }

  return [...states, ...rows.values()];
}

export function previewStateHistory(
  plan: Plan,
  program: Program,
  names: Record<string, string> = {},
  t: Translate = translator(),
): PreviewHistoryEntity[] {
  const start = Date.parse(plan.start),
    end = Date.parse(plan.end);
  const entities = new Map<string, PreviewHistoryEntity>();
  const covers = new Map<string, CoverPosition>();
  const stateLabels: Record<string, string> = {
    on: "on_label",
    off: "off_label",
  };
  const label = (state: string) => t(stateLabels[state] || "unknown");
  const extraEntities = program.run_condition?.off_entities ?? [];
  const managedExtras = new Set(managedOffEntities(program, extraEntities));
  for (const entity of extraEntities) {
    if (managedExtras.has(entity)) {
      continue;
    }
    const state = "off";
    entities.set(entity, {
      entity_id: entity,
      name: names[entity] || entity,
      data: [{ state, state_localize: label(state), last_changed: start }],
    });
  }
  for (const event of [
    ...(plan.history_events || []),
    ...plan.events,
    ...(plan.future_events || []),
  ].sort((a, b) => Date.parse(a.time) - Date.parse(b.time))) {
    if (event.superseded) {
      continue;
    }
    const at = Date.parse(event.time);
    const typed = /^(light|switch|homeassistant)\.turn_(on|off)$/.test(
      event.action.action,
    );
    for (const entity of event.action.entities) {
      if (!/^(light|switch|cover)\./.test(entity)) {
        continue;
      }
      let history = entities.get(entity);
      if (
        at >= end &&
        (!history || history.data.at(-1)?.end_time !== undefined)
      ) {
        continue;
      }
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
        typed &&
        (event.action.action.startsWith("homeassistant.") ||
          event.action.action.startsWith(`${entity.split(".", 1)[0]}.`))
          ? intended
          : "unknown";
      let localized = label(state);
      if (entity.startsWith("cover.")) {
        const target = coverTarget(event.action, covers.get(entity));
        covers.set(entity, target);
        const parts: string[] = [];
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
      const previous = history.data.at(-1)!;
      if (at >= end) {
        if (previous.state !== state) {
          previous.end_time = at;
        }
        continue;
      }
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

  for (const entity of managedExtras) {
    if (!entities.has(entity)) {
      entities.set(entity, {
        entity_id: entity,
        name: names[entity] || entity,
        data: [
          {
            state: "unknown",
            state_localize: label("unknown"),
            last_changed: start,
          },
        ],
      });
    }
  }

  return [...entities.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Calendar slices retain prior planned actions as chart context only. They do
// not become executable events or appear in the selected day's event details.
export function calendarStateHistory(
  plans: Plan[],
  day: Plan,
  program: Program,
  names: Record<string, string> = {},
  t: Translate = translator(),
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

export function eventDetails(
  event: PlannedEvent,
  label: string,
  timezone: string,
  t: Translate,
  locale?: HomeAssistantLocale,
  entityNames: Record<string, string> = {},
) {
  const kinds: Record<string, string> = {
    random_start: "random_start",
    random_end: "random_end",
  };
  const actionLabels: Record<string, string> = {
    turn_on: "on_label",
    turn_off: "off_label",
    "scene.turn_on": "activate_scene",
    ...Object.fromEntries(coverActions),
  };
  const service = event.action.action;
  const shortService = service.split(".").at(-1)!;
  const actionLabel = actionLabels[service] || actionLabels[shortService];
  let action = actionLabel ? t(actionLabel) : service;
  const positionFields: Record<string, string> = {
    "cover.set_cover_position": "position",
    "cover.set_cover_tilt_position": "tilt_position",
  };
  const positionField = positionFields[service];
  if (positionField && event.action.data?.[positionField] !== undefined) {
    action += ` · ${event.action.data[positionField]}%`;
  }
  if (event.superseded) {
    action += ` · ${t("superseded")}`;
  }

  return {
    time: formatEventTime(event.time, timezone, locale),
    source: `${label} · ${t(kinds[event.kind] || event.kind)}`,
    action,
    actionState: ["on_label", "off_label"].includes(actionLabel)
      ? shortService.slice(5)
      : undefined,
    targets: event.action.entities
      .map((entity) => entityNames[entity] || entity)
      .join(", "),
  };
}

export function groupPreviewEvents(events: PlannedEvent[]) {
  const groups = new Map<
    string,
    {
      key: string;
      event: PlannedEvent;
      actions: {
        key: string;
        event: PlannedEvent;
        events: PlannedEvent[];
        entities: string[];
      }[];
    }
  >();
  const actionKeys = new Map<string, Map<string, number>>();
  for (const event of events) {
    const key = JSON.stringify([
      Date.parse(event.time),
      event.source_id,
      event.kind,
      event.source_date,
    ]);
    let group = groups.get(key);
    if (!group) {
      group = { key, event, actions: [] };
      groups.set(key, group);
      actionKeys.set(key, new Map());
    }
    // On/off calls can be split by entity domain by the planner.
    const service = /^(?:light|switch|homeassistant)\.turn_(on|off)$/.test(
      event.action.action,
    )
      ? event.action.action.split(".", 2)[1]
      : event.action.action;
    const actionKey = JSON.stringify([
      service,
      Object.entries(event.action.data || {}).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
      !!event.superseded,
    ]);
    const keys = actionKeys.get(key)!;
    let index = keys.get(actionKey);
    if (index === undefined) {
      index = group.actions.length;
      keys.set(actionKey, index);
      group.actions.push({ key: actionKey, event, events: [], entities: [] });
    }
    const action = group.actions[index]!;
    action.events.push(event);
    for (const entity of event.action.entities) {
      if (!action.entities.includes(entity)) {
        action.entities.push(entity);
      }
    }
  }

  return [...groups.values()];
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
