// Generated from custom_components/occupied/frontend/src/lib/utils/timing-order.ts by pnpm run build. Do not edit.
function offsetMinutes(value) {
  if (!value) {
    return 0;
  }
  const match =
    /^([+-]?)(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/.exec(
      value,
    );
  if (!match || !/[hms]/.test(value)) {
    return undefined;
  }
  const amount =
    Number(match[2] || 0) * 60 +
    Number(match[3] || 0) +
    Number(match[4] || 0) / 60;
  return match[1] === "-" ? -amount : amount;
}
function clockMinutes(value) {
  if (!value || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
    return undefined;
  }
  const [hours, minutes, seconds = 0] = value.split(":").map(Number);
  return hours * 60 + minutes + seconds / 60;
}
export function timingOrder(entries, sources = []) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const sourceTimes = new Map(
    sources.flatMap((source) => {
      const minutes = clockMinutes(source.today_time || undefined);
      return minutes === undefined ? [] : [[source.value, minutes]];
    }),
  );
  const memo = new Map();
  const visiting = new Set();
  const resolve = (entry) => {
    if (memo.has(entry.id)) {
      return memo.get(entry.id);
    }
    if (visiting.has(entry.id)) {
      return undefined;
    }
    visiting.add(entry.id);
    const timing = entry.timing || entry.start;
    let base;
    if (timing?.absolute_time) {
      base = clockMinutes(timing.absolute_time.start);
    } else if (timing?.relative_to) {
      const relative = timing.relative_to;
      if (relative.sun) {
        base = sourceTimes.get(`sun:${relative.sun}`);
      } else if (relative.step) {
        const parent = byId.get(relative.step);
        base = parent && resolve(parent);
      } else if (relative.random) {
        const parent = byId.get(`random:${relative.random}`);
        base = parent?.end
          ? resolve({ id: `${parent.id}:end`, timing: parent.end })
          : parent && resolve(parent);
      } else if (relative.entity) {
        base = sourceTimes.get(
          `entity:${relative.entity}${relative.attribute ? `:${relative.attribute}` : ""}`,
        );
      }
      const offset = offsetMinutes(relative.start_offset);
      if (base === undefined || offset === undefined) {
        base = undefined;
      } else {
        base += offset;
      }
    }
    const latest = timing?.latest_at?.absolute_time?.start;
    const latestMinutes = clockMinutes(latest);
    if (
      base !== undefined &&
      latestMinutes !== undefined &&
      base > latestMinutes
    ) {
      base = latestMinutes;
    }
    visiting.delete(entry.id);
    const normalized =
      base === undefined ? undefined : ((base % 1440) + 1440) % 1440;
    memo.set(entry.id, normalized);
    return normalized;
  };
  return (left, right) => {
    const a = resolve(left);
    const b = resolve(right);
    if (a === undefined || b === undefined) {
      return a === undefined ? (b === undefined ? 0 : 1) : -1;
    }
    return a - b;
  };
}
