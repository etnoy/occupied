// The builder edits canonical steps in place. Containers, defaults and opaque
// configuration remain intact unless the user explicitly changes their behavior.
import {
  copy,
  days,
  identifier,
  around,
  parentSteps,
  references,
} from "./model.js";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (values) => [...new Set(values)].sort();
export function targetEntities(program, targets = {}) {
  return sorted([
    ...(targets.entities || []),
    ...(targets.groups || []).flatMap(
      (id) => program.groups?.find((g) => g.id === id)?.entities || [],
    ),
  ]);
}
export function routineEntries(program) {
  return (program.routines || []).flatMap((routine, ri) =>
    ["steps", "activities", "activity_windows"].flatMap((kind) =>
      (routine[kind] || []).map((item, index) => ({
        ...item,
        kind,
        container: routine,
        path: ["routines", ri, kind, index],
        days: (routine.days || days).filter(
          (d) => !item.days || item.days.includes(d),
        ),
        entities: targetEntities(program, {
          entities:
            kind === "activity_windows"
              ? targetEntities(program, item.targets)
              : (item.actions || item.on_start || []).flatMap((a) =>
                  targetEntities(program, a.targets),
                ),
        }),
      })),
    ),
  );
}
function minutes(value) {
  if (typeof value === "number") return value / 60;
  const text = String(value || "0s");
  if (!/^-?(?:\d+(?:\.\d+)?[hms])+$/.test(text)) return NaN;
  const total = [...text.matchAll(/(\d+(?:\.\d+)?)([hms])/g)].reduce(
    (n, [, amount, unit]) =>
      n + Number(amount) * { h: 60, m: 1, s: 1 / 60 }[unit],
    0,
  );
  return text.startsWith("-") ? -total : total;
}
function rangeCenter(range = {}) {
  const low = minutes(range.fixed ?? range.min),
    high = minutes(range.fixed ?? range.max);
  return { center: (low + high) / 2, spread: (high - low) / 2 };
}
function clockMinutes(value) {
  const [h, m, s = 0] = (value || "").split(":").map(Number);
  return h * 60 + m + s / 60;
}
function clockText(value) {
  const seconds = ((Math.round(value * 60) % 86400) + 86400) % 86400;
  const text = `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}`;
  return seconds % 60
    ? `${text}:${String(seconds % 60).padStart(2, "0")}`
    : text;
}
export function timingForm(when = {}) {
  const value = {
    mode: "clock",
    time: "18:00",
    variation: 0,
    sun: "sunset",
    offset: 30,
    direction: "after",
    parent: "",
    fallback: "",
  };
  if (when.relative_to || when.sun_range) {
    const { center, spread } = rangeCenter(
      when.offset_range || when.sun_range.offset_range,
    );
    Object.assign(value, {
      mode: when.relative_to ? "relative" : "sun",
      parent: when.relative_to || "",
      sun: when.sun_range?.sun || "sunset",
      offset: Math.abs(center),
      direction: center < 0 ? "before" : "after",
      variation: spread,
      fallback: when.sun_range?.fallback || "",
    });
  } else if (when.clock_range) {
    const start = clockMinutes(when.clock_range.earliest);
    let end = clockMinutes(when.clock_range.latest);
    if (when.clock_range.cross_midnight) end += 1440;
    value.time = clockText((start + end) / 2);
    value.variation = (end - start) / 2;
  }
  return value;
}
export function simpleRoutine(entry) {
  if (entry.kind !== "steps" || !entry.actions?.length) return false;
  const actions = entry.actions;
  if (
    !actions.every((a) =>
      /^(?:(?:light|switch)\.)?turn_(on|off)$/.test(a.action),
    )
  )
    return false;
  if (
    !actions.every((a) =>
      a.action.endsWith(
        actions[0].action.endsWith("turn_on") ? "turn_on" : "turn_off",
      ),
    )
  )
    return false;
  if (
    !entry.entities.length ||
    entry.entities.some((e) => !/^(light|switch)\./.test(e))
  )
    return false;
  // Different per-action settings cannot be represented by one brightness field.
  if (
    actions.length > 1 &&
    (actions.length !== 2 ||
      !same(actions[1].data || {}, {}) ||
      actions[0].action !== actions[1].action ||
      actions.some((a) => a.targets?.groups?.length) ||
      !(actions[0].targets?.entities || []).every((e) =>
        e.startsWith("light."),
      ) ||
      !(actions[1].targets?.entities || []).every((e) =>
        e.startsWith("switch."),
      ) ||
      actions.some((a) => a.stagger || a.target_order || a.resources?.length))
  )
    return false;
  const time = timingForm(entry.when);
  return (
    Number.isFinite(time.variation) &&
    time.variation >= 0 &&
    time.variation < 720 &&
    Number.isFinite(time.offset) &&
    /^\d{2}:\d{2}(?::\d{2})?$/.test(time.time)
  );
}
export function routineEditor(program, entry, parent) {
  const form = {
    name: entry?.name || "",
    entities: [...(entry?.entities || parent?.entities || [])],
    action: entry?.actions?.[0]?.action.endsWith("turn_off")
      ? "turn_off"
      : "turn_on",
    brightness:
      entry?.actions?.[0]?.data?.brightness_pct ??
      (entry?.actions?.[0]?.data?.brightness == null
        ? ""
        : Math.round((entry.actions[0].data.brightness * 10000) / 255) / 100),
    days: [...(entry?.days || parent?.days || days)],
    timing: timingForm(entry?.when),
  };
  if (parent)
    Object.assign(form.timing, {
      mode: "relative",
      parent: parent.id,
      offset: 30,
    });
  return {
    id: entry?.id || identifier(program, "routine"),
    existing: !!entry,
    stage: 0,
    form,
    original: copy(form),
    changed: !entry,
    errors: {},
  };
}
export function editorErrors(program, editor, stage = 2) {
  const { form, id } = editor,
    errors = {};
  if (!form.entities.length)
    errors.entities = "Select at least one light or switch.";
  if (form.entities.some((e) => !/^(light|switch)\.[a-z0-9_]+$/.test(e)))
    errors.entities =
      "The routine builder supports lights and switches. Other entities use Advanced settings.";
  if (stage < 1) return errors;
  if (!form.name.trim()) errors.name = "Give this routine a name.";
  if (
    form.brightness !== "" &&
    (!Number.isFinite(Number(form.brightness)) ||
      Number(form.brightness) <= 0 ||
      Number(form.brightness) > 100)
  )
    errors.brightness = "Choose a brightness between 1 and 100%.";
  if (stage < 2) return errors;
  if (!form.days.length) errors.days = "Choose at least one day.";
  const time = form.timing;
  if (
    !Number.isFinite(Number(time.variation)) ||
    time.variation === "" ||
    Number(time.variation) < 0 ||
    Number(time.variation) >= 720
  )
    errors.variation = "Choose between 0 and 719 minutes of variation.";
  if (
    time.mode === "clock" &&
    !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time.time)
  )
    errors.time = "Choose a time.";
  if (
    time.mode !== "clock" &&
    (time.offset === "" ||
      !Number.isFinite(Number(time.offset)) ||
      Number(time.offset) < 0 ||
      Number(time.offset) > 10080)
  )
    errors.offset = "Choose an offset between 0 and 10080 minutes.";
  if (time.mode === "relative") {
    const parent = routineEntries(program).find(
      (e) => e.id === time.parent && e.kind === "steps",
    );
    if (!parent || !parentSteps(program, id).some((e) => e.id === parent.id))
      errors.parent =
        "Choose another routine without creating a circular relationship.";
    else if (form.days.some((d) => !parent.days.includes(d)))
      errors.days = `Choose days when ${parent.name} runs: ${parent.days.join(", ")}.`;
  }
  // Explain downstream day conflicts here, before backend validation.
  for (const child of routineEntries(program))
    if (
      child.when?.relative_to === id &&
      child.missing_anchor !== "skip" &&
      child.days.some((d) => !form.days.includes(d))
    )
      errors.days = `${child.name} depends on this routine. Keep its days (${child.days.join(", ")}) or edit it first.`;
  return errors;
}
export function formWhen(time) {
  if (time.mode === "clock")
    return { clock_range: around(time.time, Number(time.variation)) };
  const offset = Number(time.offset) * (time.direction === "before" ? -1 : 1),
    spread = Number(time.variation);
  const range = spread
    ? { min: `${offset - spread}m`, max: `${offset + spread}m` }
    : { fixed: `${offset}m` };
  if (time.mode === "relative")
    return { relative_to: time.parent, offset_range: range };
  return {
    sun_range: {
      sun: time.sun,
      offset_range: range,
      ...(time.fallback ? { fallback: time.fallback } : {}),
    },
  };
}
export function buildRoutine(program, editor) {
  const errors = editorErrors(program, editor);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const next = copy(program),
    { form, original } = editor;
  let entry = routineEntries(next).find((e) => e.id === editor.id);
  if (editor.existing && !entry)
    throw new Error(
      "This routine changed elsewhere. Cancel and reopen it before saving.",
    );
  if (!entry) {
    const container = {
      id: identifier(next, `${editor.id}_schedule`),
      name: form.name.trim(),
      days: [...days],
      steps: [
        {
          id: editor.id,
          name: form.name.trim(),
          actions: [],
          allow_cross_boundary: true,
        },
      ],
      activities: [],
      activity_windows: [],
    };
    (next.routines ||= []).push(container);
    entry = routineEntries(next).find((e) => e.id === editor.id);
  }
  const item = next.routines[entry.path[1]].steps[entry.path[3]];
  const isNew = !item.when;
  item.name = form.name.trim();
  if (isNew || !same(form.timing, original.timing))
    item.when = formWhen(form.timing);
  if (isNew || !same(form.days, original.days)) {
    item.days = [...form.days];
    if (form.days.some((d) => !(entry.container.days || days).includes(d))) {
      // Widen only this item, retaining siblings and inherited settings.
      const container = copy(entry.container);
      container.id = identifier(next, `${editor.id}_schedule`);
      container.name = item.name;
      container.days = [...days];
      container.steps = [item];
      container.activities = [];
      container.activity_windows = [];
      next.routines[entry.path[1]].steps.splice(entry.path[3], 1);
      next.routines.push(container);
    }
  }
  const targetsChanged = !same(
    sorted(form.entities),
    sorted(original.entities),
  );
  const actionChanged = form.action !== original.action;
  const brightnessChanged = form.brightness !== original.brightness;
  if (isNew || targetsChanged || actionChanged || brightnessChanged) {
    const action = copy(
      item.actions[0] || { action: form.action, targets: {}, data: {} },
    );
    const data = actionChanged ? {} : { ...action.data };
    if (form.action === "turn_on" && (isNew || brightnessChanged)) {
      delete data.brightness;
      if (form.brightness === "") delete data.brightness_pct;
      else data.brightness_pct = Number(form.brightness);
    }
    // Shorthand handles both domains; light-only data must never reach switches.
    action.action = form.action;
    action.data = data;
    if (
      !targetsChanged &&
      !isNew &&
      item.actions.length === 1 &&
      !(
        form.entities.some((e) => e.startsWith("switch.")) &&
        Object.keys(data).some((k) => k !== "transition")
      )
    ) {
      item.actions = [action];
    } else {
      const lights = form.entities.filter((e) => e.startsWith("light."));
      const switches = form.entities.filter((e) => e.startsWith("switch."));
      item.actions = [];
      if (lights.length)
        item.actions.push({ ...action, targets: { entities: lights }, data });
      if (switches.length)
        item.actions.push({
          ...action,
          targets: { entities: switches },
          data: {},
        });
    }
  }
  // Only newly managed lights receive an off baseline. Existing baselines and
  // handover overrides are never replaced by routine edits.
  const lighting = (next.lighting ||= {});
  const managed = new Set(targetEntities(next, lighting.managed_targets));
  const newLights = form.entities.filter(
    (e) =>
      (isNew || targetsChanged) && e.startsWith("light.") && !managed.has(e),
  );
  if (newLights.length) {
    lighting.managed_targets ||= { entities: [], groups: [] };
    lighting.managed_targets.entities = sorted([
      ...(lighting.managed_targets.entities || []),
      ...newLights,
    ]);
    const baselined = new Set(
      (lighting.baseline || []).flatMap((b) => targetEntities(next, b.targets)),
    );
    const missing = newLights.filter((e) => !baselined.has(e));
    if (missing.length)
      (lighting.baseline ||= []).push({
        targets: { entities: missing },
        state: "off",
      });
  }
  return next;
}
export function dependentNames(program, id) {
  const paths = references(program, id);
  return routineEntries(program)
    .filter((e) => paths.some((p) => e.path.every((k, i) => p[i] === k)))
    .map((e) => e.name);
}
export function timingSummary(entry, entries, t = (v) => v) {
  if (!entry.when) return t("Repeated activity window");
  const when = entry.when;
  if (when.clock_range) {
    const { earliest, latest, cross_midnight } = when.clock_range;
    return earliest === latest
      ? `${t("At")} ${earliest}`
      : `${earliest}–${latest}${cross_midnight ? ` · ${t("overnight")}` : ""}`;
  }
  const range = when.offset_range || when.sun_range?.offset_range;
  const { center, spread } = rangeCenter(range);
  const name = when.relative_to
    ? entries.find((e) => e.id === when.relative_to)?.name || when.relative_to
    : t(when.sun_range.sun === "sunset" ? "sunset" : "sunrise");
  if (center === 0 && spread === 0) return name;
  if (spread && Math.abs(center) >= spread) {
    const low = Math.abs(center) - spread,
      high = Math.abs(center) + spread;
    return `${low}–${high} ${t("min")} ${t(center < 0 ? "before" : "after")} ${name}`;
  }
  if (center === 0) return `${t("Around")} ${name} ±${spread} ${t("min")}`;
  return `${Math.abs(center)} ${t("min")} ${t(center < 0 ? "before" : "after")} ${name}${spread ? ` ±${spread} ${t("min")}` : ""}`;
}
