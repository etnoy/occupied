import type { HomeAssistant, Program, Timing } from "../types.js";
import { durationSeconds } from "./util.js";

export type ActivityCollection = "steps" | "random";

const day = 86_400;
const solarDefaults: Record<string, number> = {
  dawn: 5 * 3600,
  sunrise: 6 * 3600,
  noon: 12 * 3600,
  sunset: 18 * 3600,
  dusk: 19 * 3600,
  midnight: 0,
};
const solarAttributes: Record<string, string> = {
  dawn: "next_dawn",
  sunrise: "next_rising",
  noon: "next_noon",
  sunset: "next_setting",
  dusk: "next_dusk",
  midnight: "next_midnight",
};

function clockSeconds(value: string): number | undefined {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    return undefined;
  }
  const [, hours, minutes, seconds = "0"] = match;
  if (Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59) {
    return undefined;
  }

  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

// This is a display estimate, independent of the scheduler's randomized plan.
// Keep signed offsets while resolving dependencies; wrap only the final result.
export function chronologicalEntries<T extends { id: string }>(
  entries: T[],
  program: Program,
  collection: ActivityCollection,
  hass?: Pick<HomeAssistant, "states" | "config">,
): T[] {
  const sourceSeconds = (value: unknown): number | undefined => {
    if (typeof value !== "string") {
      return undefined;
    }
    const clock = clockSeconds(value);
    if (clock !== undefined) {
      return clock;
    }
    // HA calendar and input_datetime values without an offset are local times.
    const local = /^\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2}(?::\d{2})?)$/.exec(value);
    if (local) {
      return clockSeconds(local[1]);
    }
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      return undefined;
    }
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: hass?.config?.time_zone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(new Date(timestamp));

    return clockSeconds(parts);
  };
  const resolve = (timing: Timing, seen: Set<string>): number | undefined => {
    let start: number | undefined;
    if (timing.absolute_time) {
      start = clockSeconds(timing.absolute_time.start);
    } else if (timing.relative_to) {
      const relative = timing.relative_to;
      let anchor: number | undefined;
      if (relative.step) {
        anchor = stepStart(relative.step, seen);
      } else if (relative.random) {
        anchor = randomEnd(relative.random, seen);
      } else if (relative.sun) {
        anchor =
          sourceSeconds(
            hass?.states?.["sun.sun"]?.attributes[
              solarAttributes[relative.sun]
            ],
          ) ?? solarDefaults[relative.sun];
      } else if (relative.entity) {
        const entity = hass?.states?.[relative.entity];
        anchor = sourceSeconds(
          relative.attribute
            ? entity?.attributes[relative.attribute]
            : entity?.state,
        );
      }
      if (anchor !== undefined) {
        const offset = relative.start_offset;
        start =
          anchor + durationSeconds(!offset || offset === "0" ? "0s" : offset);
      }
    }
    if (start !== undefined && timing.latest_at) {
      const latest = resolve(timing.latest_at, seen);
      if (latest !== undefined) {
        start = Math.min(start, latest);
      }
    }

    return start !== undefined && Number.isFinite(start) ? start : undefined;
  };
  const stepStart = (id: string, seen: Set<string>): number | undefined => {
    const key = `step:${id}`;
    const step = program.steps?.[id];
    if (!step || seen.has(key)) {
      return undefined;
    }

    return resolve(step.timing, new Set([...seen, key]));
  };
  const randomEnd = (id: string, seen: Set<string>): number | undefined => {
    const key = `random:${id}`;
    const event = program.random?.[id];
    if (!event || seen.has(key)) {
      return undefined;
    }
    const path = new Set([...seen, key]);
    const start = resolve(event.start, path);
    if (event.end.duration) {
      return start === undefined
        ? undefined
        : start + durationSeconds(event.end.duration.min);
    }
    const end = resolve(event.end, path);

    return end !== undefined && start !== undefined && end <= start
      ? end + day
      : end;
  };
  const times = new Map(
    entries.map(({ id }) => {
      const time =
        collection === "steps"
          ? stepStart(id, new Set())
          : resolve(
              program.random?.[id]?.start || {},
              new Set([`random:${id}`]),
            );

      return [id, time === undefined ? Infinity : ((time % day) + day) % day];
    }),
  );

  // Stable ties and unresolved sources retain their configuration order.
  return [...entries].sort((a, b) => times.get(a.id)! - times.get(b.id)!);
}

export function applyActivityOrder<T extends { id: string }>(
  entries: T[],
  order: string[] | null,
): T[] {
  if (!order) {
    return entries;
  }
  const positions = new Map(order.map((id, index) => [id, index]));

  // Newly created activities follow the saved ones in chronological order.
  return [...entries].sort(
    (a, b) =>
      (positions.get(a.id) ?? Infinity) - (positions.get(b.id) ?? Infinity),
  );
}

export interface ActivityNode<T> {
  entry: T;
  children: ActivityNode<T>[];
}

// Keep dependency branches intact, applying the incoming order only to siblings.
// Broken references and cycles stay visible as roots so they can be repaired.
export function activityTree<T extends { id: string }>(
  entries: T[],
  parentId?: (entry: T) => string | undefined,
): ActivityNode<T>[] {
  const nodes = new Map(
    entries.map((entry) => [
      entry.id,
      { entry, children: [] } as ActivityNode<T>,
    ]),
  );
  const parents = new Map(
    entries.map((entry) => [entry.id, parentId?.(entry)]),
  );
  const roots: ActivityNode<T>[] = [];
  for (const entry of entries) {
    const seen = new Set([entry.id]);
    let ancestor = parents.get(entry.id);
    while (ancestor && nodes.has(ancestor) && !seen.has(ancestor)) {
      seen.add(ancestor);
      ancestor = parents.get(ancestor);
    }
    const parent =
      ancestor && seen.has(ancestor)
        ? undefined
        : nodes.get(parents.get(entry.id) || "");
    (parent?.children || roots).push(nodes.get(entry.id)!);
  }

  return roots;
}

export function moveActivityInTree<T extends { id: string }>(
  nodes: ActivityNode<T>[],
  id: string,
  index: number,
): string[] {
  const siblings = nodes.map((node) => node.entry.id);
  const order = moveActivity(siblings, id, index);
  const byId = new Map(nodes.map((node) => [node.entry.id, node]));

  return order.flatMap((key) => [
    key,
    ...moveActivityInTree(byId.get(key)!.children, id, index),
  ]);
}

export function moveActivity(
  order: string[],
  id: string,
  index: number,
): string[] {
  if (!order.includes(id)) {
    return order;
  }
  const next = order.filter((item) => item !== id);
  next.splice(Math.max(0, Math.min(index, next.length)), 0, id);

  return next;
}

export function readActivityOrder(key: string): string[] | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "null");

    return Array.isArray(value) && value.every((id) => typeof id === "string")
      ? [...new Set(value)]
      : null;
  } catch {
    return null;
  }
}

export function writeActivityOrder(key: string, order: string[] | null) {
  try {
    if (order) {
      localStorage.setItem(key, JSON.stringify(order));
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Reordering still works for this view when browser storage is unavailable.
  }
}
