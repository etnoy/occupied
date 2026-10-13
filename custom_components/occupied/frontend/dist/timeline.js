// Generated from timeline.ts by pnpm run build. Do not edit.
import { formatTimestamp } from "./time-format.js";
/**
Planned state strips for HA's native history timeline, independent of live states.
*/
export function previewStateHistory(
  plan,
  program,
  names = {},
  t = (text) => text,
) {
  const start = Date.parse(plan.start);
  const end = Date.parse(plan.end);
  const resolve = (targets) =>
    new Set([
      ...(targets?.entities || []),
      ...(targets?.groups || []).flatMap(
        (id) =>
          program.groups?.find((group) => group.id === id)?.entities || [],
      ),
    ]);
  const managed = resolve(program.lighting?.managed_targets);
  const baselines = new Map();
  for (const baseline of program.lighting?.baseline || []) {
    for (const entity of resolve(baseline.targets)) {
      if (managed.has(entity)) {
        baselines.set(entity, baseline.state);
      }
    }
  }
  const entities = new Map();
  const stateLabel = (state) => {
    if (state === "on") {
      return t("On");
    }
    if (state === "off") {
      return t("Off");
    }
    return t("Unknown");
  };
  const get = (entity) => {
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
      const previous = data.at(-1);
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
