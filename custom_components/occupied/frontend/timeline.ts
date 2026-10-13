import type {
  TimelineDocument,
  Program,
  Translate,
  Plan,
  Targets,
} from "./types.js";
import type { HomeAssistantLocale } from "./time-format.js";
import { formatTimestamp } from "./time-format.js";
import { resources } from "./model.js";

export interface PreviewHistoryEntity {
  entity_id: string;
  name: string;
  data: { state: string; state_localize: string; last_changed: number }[];
}

/**
Planned state strips for HA's native history timeline, independent of live states.
*/
export function previewStateHistory(
  plan: Plan,
  program: Program,
  names: Record<string, string> = {},
  t: Translate = (text) => text,
): PreviewHistoryEntity[] {
  const start = Date.parse(plan.start);
  const end = Date.parse(plan.end);
  const resolve = (targets?: Targets) =>
    new Set([
      ...(targets?.entities || []),
      ...(targets?.groups || []).flatMap(
        (id) =>
          program.groups?.find((group) => group.id === id)?.entities || [],
      ),
    ]);
  const managed = resolve(program.lighting?.managed_targets);
  const baselines = new Map<string, string>();
  for (const baseline of program.lighting?.baseline || []) {
    for (const entity of resolve(baseline.targets)) {
      if (managed.has(entity)) {
        baselines.set(entity, baseline.state);
      }
    }
  }
  const entities = new Map<
    string,
    {
      history: PreviewHistoryEntity;
      baseline: string;
      explicit?: string;
      safety: boolean;
      leases: Set<string>;
    }
  >();
  const stateLabel = (state: string) => {
    if (state === "on") {
      return t("On");
    }
    if (state === "off") {
      return t("Off");
    }
    return t("Unknown");
  };
  const get = (entity: string) => {
    let entry = entities.get(entity);
    if (!entry) {
      const baseline = baselines.get(entity) || "unknown";
      entry = {
        history: {
          entity_id: entity,
          name: names[entity] || entity,
          data: [
            {
              state: baseline,
              state_localize: stateLabel(baseline),
              last_changed: start,
            },
          ],
        },
        baseline,
        safety: false,
        leases: new Set(),
      };
      entities.set(entity, entry);
    }
    return entry;
  };
  // Stable sorting preserves the planner's ordering of actions at the same instant.
  for (const event of [...plan.events].sort(
    (a, b) => Date.parse(a.time) - Date.parse(b.time),
  )) {
    const at = Date.parse(event.time);
    if (at > end) {
      continue;
    }
    const service = event.action.action;
    if (service === "event.fire") {
      continue;
    }
    const typed = /^(light|switch)\.turn_(on|off)$/.test(service);
    const opaque = !typed;
    for (const entity of new Set([
      ...event.action.targets.entities,
      ...(opaque ? event.action.resources || [] : []),
    ])) {
      if (!entity.startsWith("light.") && !entity.startsWith("switch.")) {
        continue;
      }
      const entry = get(entity);
      if (typed && event.kind === "window_start") {
        entry.leases.add(event.lease_id || event.source_id);
      } else if (typed && event.kind === "window_end") {
        entry.leases.delete(event.lease_id || event.source_id);
      } else if (typed && event.priority === 30) {
        entry.safety = true;
      } else if (!entry.safety) {
        const intended = service.endsWith("turn_on") ? "on" : "off";
        entry.explicit = typed ? intended : "unknown";
      }
      const state = entry.safety
        ? "off"
        : (entry.explicit ?? (entry.leases.size > 0 ? "on" : entry.baseline));
      const data = entry.history.data;
      const previous = data.at(-1)!;
      const time = Math.max(start, at);
      if (previous.last_changed === time) {
        previous.state = state;
        previous.state_localize = stateLabel(state);
      } else if (previous.state !== state) {
        data.push({
          state,
          state_localize: stateLabel(state),
          last_changed: time,
        });
      }
    }
  }
  return [...entities.values()]
    .map((entry) => entry.history)
    .sort((a, b) => a.name.localeCompare(b.name));
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
export interface TimelineMark {
  className: string;
  title: string;
  style: string;
  text?: string;
}

export function timelineModel(
  doc: TimelineDocument,
  program: Program,
  t: Translate = (text) => text,
  locale?: HomeAssistantLocale,
) {
  const plan = doc.plan;
  if (!plan) {
    return null;
  }
  const labels = new Map(
    resources(program).map((resource) => [resource.id, resource.name]),
  );
  const start = Date.parse(plan.start),
    end = Date.parse(plan.end),
    width = end - start;
  const position = (time: string) =>
    Math.max(0, Math.min(100, ((Date.parse(time) - start) / width) * 100));
  const lanes = new Map<string, TimelineMark[]>();
  const lane = (id: string, mark: TimelineMark) => {
    if (!lanes.has(id)) {
      lanes.set(id, []);
    }
    lanes.get(id)!.push(mark);
  };
  const bar = (
    kind: string,
    from: string,
    to: string,
    title: string,
  ): TimelineMark => ({
    className: "bar " + kind,
    title,
    style:
      "left:" +
      position(from) +
      "%;width:" +
      Math.max(0.25, position(to) - position(from)) +
      "%",
  });
  let drawn = 0;
  for (const interval of plan.intervals) {
    if (drawn++ >= 800) {
      break;
    }
    lane(
      interval.source_id,
      bar(
        interval.kind,
        interval.start,
        interval.end,
        `${labels.get(interval.source_id) || interval.source_id}: ${stamp(interval.start, plan.timezone, locale)} → ${stamp(interval.end, plan.timezone, locale)} · ${interval.resources.join(", ")}`,
      ),
    );
  }
  for (const [id, time] of Object.entries(plan.steps || {})) {
    if (drawn++ >= 800) {
      break;
    }
    lane(id, {
      className: "marker",
      title: `${labels.get(id) || id}: ${stamp(time, plan.timezone, locale)}`,
      style: `left:${position(time)}%`,
      text: "◆",
    });
  }
  for (const activity of doc.snapshot?.activities || []) {
    if (!activity.deadline) {
      continue;
    }
    const actualStart = new Date(
      Date.parse(activity.deadline) - activity.duration * 1000,
    ).toISOString();
    if (
      Date.parse(activity.deadline) < start ||
      Date.parse(actualStart) > end
    ) {
      continue;
    }
    lane(
      activity.source_id,
      bar(
        "active",
        actualStart,
        activity.deadline,
        `${t("Runtime deadline")}: ${stamp(activity.deadline, plan.timezone, locale)} · ${activity.phase}`,
      ),
    );
  }
  for (const [entity, handover] of Object.entries(
    doc.snapshot?.handover || {},
  )) {
    if (
      Date.parse(handover.deadline) < start ||
      Date.parse(handover.start) > end
    ) {
      continue;
    }
    lane(
      entity,
      bar(
        "ramp",
        handover.start,
        handover.deadline,
        `${entity} · ${t("Handover")}: ${stamp(handover.start, plan.timezone, locale)} → ${stamp(handover.deadline, plan.timezone, locale)} · ${Math.round(handover.progress * 100)}% · ${JSON.stringify(handover.observed)} → ${JSON.stringify(handover.target)}`,
      ),
    );
  }
  return {
    plan,
    labels,
    start,
    width,
    lanes: [...lanes],
    drawn,
    events: doc.events || plan.events,
  };
}
