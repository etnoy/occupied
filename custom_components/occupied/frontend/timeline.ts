import type { TimelineDocument, Program, Translate } from "./types.js";
import type { HomeAssistantLocale } from "./time-format.js";
import { formatTimestamp } from "./time-format.js";
import { resources } from "./model.js";

export function stamp(
  value?: string | null,
  zone?: string,
  locale?: HomeAssistantLocale,
) {
  if (!value) return "—";
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
  if (!plan) return null;
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
    if (!lanes.has(id)) lanes.set(id, []);
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
    if (drawn++ >= 800) break;
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
    if (drawn++ >= 800) break;
    lane(id, {
      className: "marker",
      title: `${labels.get(id) || id}: ${stamp(time, plan.timezone, locale)}`,
      style: `left:${position(time)}%`,
      text: "◆",
    });
  }
  for (const activity of doc.snapshot?.activities || []) {
    if (!activity.deadline) continue;
    const actualStart = new Date(
      Date.parse(activity.deadline) - activity.duration * 1000,
    ).toISOString();
    if (Date.parse(activity.deadline) < start || Date.parse(actualStart) > end)
      continue;
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
    )
      continue;
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
