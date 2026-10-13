// Generated from step-model.ts by pnpm run build. Do not edit.
import { formatClock } from "./time-format.js";
// The builder edits canonical steps in place. Containers, defaults and opaque
// configuration remain intact unless the user explicitly changes their behavior.
import { copy, days, identifier, parentSteps, references } from "./model.js";
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
export function stepEntries(program) {
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
  if (value === "0") {
    return 0;
  }
  if (typeof value === "number") {
    return value / 60;
  }
  const text = value || "0s";
  if (
    !/^[+-]?(?:\d+(?:\.\d+)?h)?(?:\d+(?:\.\d+)?m)?(?:\d+(?:\.\d+)?s)?$/.test(
      text,
    ) ||
    ["", "+", "-"].includes(text)
  ) {
    return NaN;
  }
  const total = [...text.matchAll(/(\d+(?:\.\d+)?)([hms])/g)].reduce(
    (n, [, amount, unit]) =>
      n + Number(amount) * { h: 60, m: 1, s: 1 / 60 }[unit],
    0,
  );
  return text.startsWith("-") ? -total : total;
}
function clockMinutes(value) {
  const [h, m, s = 0] = (value || "").split(":").map(Number);
  return h * 60 + m + s / 60;
}
export const solarEvents = [
  "sunrise",
  "sunset",
  "dawn",
  "dusk",
  "noon",
  "midnight",
];
export function timeSourceChoices(program, id, catalog = {}) {
  return [
    ...parentSteps(program, id).map((step) => ({
      value: `step:${step.id}`,
      name: step.name,
      group: "Steps",
    })),
    ...(catalog.time_sources ||
      solarEvents.map((event) => ({
        value: `sun:${event}`,
        name: event,
        group: "Solar events",
      }))),
  ];
}
export function timingForm(when = {}) {
  const range =
    when.offset_range ||
    when.sun_range?.offset_range ||
    when.entity_range?.offset_range;
  const clock = when.clock_range;
  let anchor = "";
  if (when.relative_to) {
    anchor = `step:${when.relative_to}`;
  } else if (when.sun_range) {
    anchor = `sun:${when.sun_range.sun}`;
  } else if (when.entity_range) {
    const attribute = when.entity_range.attribute
      ? `:${when.entity_range.attribute}`
      : "";
    anchor = `entity:${when.entity_range.entity_id}${attribute}`;
  }
  return {
    mode: clock || !range ? "absolute" : "relative",
    start: clock?.earliest || "18:00",
    end: clock && clock.latest !== clock.earliest ? clock.latest : "",
    anchor,
    startOffset: range?.fixed ?? range?.min ?? "0s",
    endOffset:
      range && range.fixed == null && range.min !== range.max
        ? (range.max ?? "")
        : "",
  };
}
export function simpleStep(entry) {
  if (entry.kind !== "steps" || !entry.actions?.length) {
    return false;
  }
  const actions = entry.actions;
  if (actions.length === 1 && actions[0].action.includes(".")) {
    const action = actions[0];
    if (!/^(light|switch)\.turn_(on|off)$/.test(action.action)) {
      return (
        entry.entities.length > 0 &&
        !action.stagger &&
        !action.target_order &&
        !action.resources?.length
      );
    }
  }
  if (
    actions.some(
      (a) => !/^(?:(?:light|switch)\.)?turn_(on|off)$/.test(a.action),
    )
  ) {
    return false;
  }
  if (
    actions.some(
      (a) =>
        !a.action.endsWith(
          actions[0].action.endsWith("turn_on") ? "turn_on" : "turn_off",
        ),
    )
  ) {
    return false;
  }
  if (
    entry.entities.length === 0 ||
    entry.entities.some((e) => !/^(light|switch)\./.test(e))
  ) {
    return false;
  }
  // Different per-action settings cannot be represented by one brightness field.
  if (
    actions.length > 1 &&
    (actions.length !== 2 ||
      !same(actions[1].data || {}, {}) ||
      actions[0].action !== actions[1].action ||
      actions.some((a) => a.targets?.groups?.length) ||
      (actions[0].targets?.entities || []).some(
        (e) => !e.startsWith("light."),
      ) ||
      (actions[1].targets?.entities || []).some(
        (e) => !e.startsWith("switch."),
      ) ||
      actions.some((a) => a.stagger || a.target_order || a.resources?.length))
  ) {
    return false;
  }
  return !!entry.when;
}
export function stepEditor(program, entry, parent) {
  const source = entry || parent;
  const action = source?.actions?.[0]?.action;
  let kind = "entities";
  if (action === "scene.turn_on") {
    kind = "scene";
  } else if (action && !/^(?:(?:light|switch)\.)?turn_(on|off)$/.test(action)) {
    kind = "service";
  }
  const form = {
    name: entry?.name || "",
    enabled: entry?.enabled !== false,
    kind,
    service: source?.actions?.[0]?.action || "homeassistant.turn_on",
    data: JSON.stringify(source?.actions?.[0]?.data || {}, null, 2),
    entities: [...(entry?.entities || [])],
    action: entry?.actions?.[0]?.action.endsWith("turn_off")
      ? "turn_off"
      : "turn_on",
    brightness:
      entry?.actions?.[0]?.data?.brightness_pct ??
      (entry?.actions?.[0]?.data?.brightness == null
        ? ""
        : Math.round((entry.actions[0].data.brightness * 10_000) / 255) / 100),
    days: [...(entry?.days || parent?.days || days)],
    timing: timingForm(entry?.when),
  };
  if (parent) {
    Object.assign(form.timing, {
      mode: "relative",
      anchor: `step:${parent.id}`,
      startOffset: "30m",
    });
  }
  return {
    id: entry?.id || identifier(program, "step"),
    existing: !!entry,
    form,
    original: copy(form),
    changed: !entry,
    errors: {},
  };
}
/**
Compare the current form to its saved baseline, including reverted edits.
*/
export function hasStepChanges(editor) {
  return (
    !editor.existing ||
    JSON.stringify(editor.form) !== JSON.stringify(editor.original)
  );
}
export function offsetErrors(time) {
  const errors = {},
    low = minutes(time.startOffset);
  const formatError = "Use h, m or s, for example 30m, 1h, 1h30m or -10m.";
  if (!time.startOffset || !Number.isFinite(low)) {
    errors.startOffset = formatError;
  } else if (Math.abs(low) > 10_080) {
    errors.startOffset = "Offsets must be within seven days.";
  }
  if (time.endOffset) {
    const high = minutes(time.endOffset);
    if (!Number.isFinite(high)) {
      errors.endOffset = formatError;
    } else if (Math.abs(high) > 10_080) {
      errors.endOffset = "Offsets must be within seven days.";
    } else if (Number.isFinite(low) && high < low) {
      errors.endOffset = "The end offset must be at least the start offset.";
    }
  }
  return errors;
}
export function editorErrors(program, editor) {
  const { form, id } = editor,
    errors = {};
  if (form.entities.length === 0) {
    errors.entities =
      form.kind === "scene"
        ? "Select a Home Assistant scene."
        : "Select at least one entity.";
  }
  if (form.entities.some((e) => !/^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(e))) {
    errors.entities = "Choose valid Home Assistant entity IDs.";
  }
  if (
    form.kind === "scene" &&
    (form.entities.length !== 1 || !form.entities[0]?.startsWith("scene."))
  ) {
    errors.entities = "Select one Home Assistant scene.";
  }
  if (
    form.kind === "entities" &&
    form.entities.some((e) => !/^(light|switch)\./.test(e))
  ) {
    errors.entities = "Choose lights and switches, or select a service action.";
  }
  if (form.kind === "service") {
    if (!/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(form.service)) {
      errors.service = "Choose a service using domain.service.";
    }
    try {
      const data = JSON.parse(form.data);
      if (!data || Array.isArray(data) || typeof data !== "object") {
        throw new TypeError("Expected service data to be a JSON object");
      }
    } catch {
      errors.data = "Service data must be a JSON object.";
    }
  }
  if (editor.existing && !form.name.trim()) {
    errors.name = "Give this step a name.";
  }
  if (
    form.kind === "entities" &&
    form.brightness !== "" &&
    (!Number.isFinite(Number(form.brightness)) ||
      Number(form.brightness) <= 0 ||
      Number(form.brightness) > 100)
  ) {
    errors.brightness = "Choose a brightness between 1 and 100%.";
  }
  if (form.days.length === 0) {
    errors.days = "Choose at least one day.";
  }
  const time = form.timing;
  const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
  if (time.mode === "absolute") {
    if (!clockPattern.test(time.start)) {
      errors.start = "Choose a start time.";
    }
    if (time.end && !clockPattern.test(time.end)) {
      errors.end = "Choose a valid end time or leave it blank.";
    }
  } else if (time.mode === "relative") {
    Object.assign(errors, offsetErrors(time));
    if (time.anchor.startsWith("step:")) {
      const parent = stepEntries(program).find(
        (e) => e.id === time.anchor.slice(5) && e.kind === "steps",
      );
      if (
        !parent ||
        parentSteps(program, id).every((e) => e.id !== parent.id)
      ) {
        errors.anchor =
          "Choose another step without creating a circular relationship.";
      } else if (form.days.some((d) => !parent.days.includes(d))) {
        errors.anchor = `This step runs on days when ${parent.name} does not.`;
      }
    } else if (
      !solarEvents.map((event) => `sun:${event}`).includes(time.anchor) &&
      !/^entity:[a-z_][a-z0-9_]*\.[a-z0-9_]+(?::(?:start_time|end_time))?$/.test(
        time.anchor,
      )
    ) {
      errors.anchor = "Choose a step or Home Assistant time source.";
    }
  } else {
    errors.mode = "Choose absolute time or relative to.";
  }
  // Explain downstream day conflicts here, before backend validation.
  for (const child of stepEntries(program)) {
    if (
      child.when?.relative_to === id &&
      child.missing_anchor !== "skip" &&
      child.days.some((d) => !form.days.includes(d))
    ) {
      errors.days = `${child.name} depends on this step. Keep its days (${child.days.join(", ")}) or edit it first.`;
    }
  }
  return errors;
}
export function formWhen(time) {
  if (time.mode === "absolute") {
    const end = time.end || time.start;
    return {
      clock_range: {
        earliest: time.start,
        latest: end,
        cross_midnight: clockMinutes(end) < clockMinutes(time.start),
      },
    };
  }
  const startOffset = time.startOffset === "0" ? "0s" : time.startOffset;
  const endOffset = time.endOffset === "0" ? "0s" : time.endOffset;
  const range = endOffset
    ? { min: startOffset, max: endOffset }
    : { fixed: startOffset };
  if (time.anchor.startsWith("step:")) {
    return { relative_to: time.anchor.slice(5), offset_range: range };
  }
  if (time.anchor.startsWith("entity:")) {
    const [, entity_id, attribute] = time.anchor.split(":", 3);
    return {
      entity_range: {
        entity_id,
        ...(attribute && { attribute }),
        offset_range: range,
      },
    };
  }
  return {
    sun_range: {
      sun: time.anchor.slice(4),
      offset_range: range,
    },
  };
}
export function buildStep(program, editor) {
  const errors = editorErrors(program, editor);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }
  const next = copy(program),
    { form, original } = editor;
  let entry = stepEntries(next).find((e) => e.id === editor.id);
  if (editor.existing && !entry) {
    throw new Error(
      "This step changed elsewhere. Cancel and reopen it before saving.",
    );
  }
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
    entry = stepEntries(next).find((e) => e.id === editor.id);
  }
  if (!entry || !next.routines) {
    throw new Error("Step could not be created");
  }
  const container = next.routines[entry.path[1]];
  const item = container.steps[entry.path[3]];
  item.actions ||= [];
  const isNew = !item.when;
  item.name = form.name.trim();
  item.enabled = form.enabled;
  if (isNew || !same(form.timing, original.timing)) {
    item.when = formWhen(form.timing);
  }
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
  const kindChanged = form.kind !== original.kind;
  const actionChanged = form.action !== original.action || kindChanged;
  const serviceChanged =
    form.service !== original.service || form.data !== original.data;
  const brightnessChanged = form.brightness !== original.brightness;
  if (form.kind !== "entities") {
    if (isNew || targetsChanged || kindChanged || serviceChanged) {
      const action = copy(item.actions[0] || { action: form.service });
      action.action = form.kind === "scene" ? "scene.turn_on" : form.service;
      if (isNew || targetsChanged || kindChanged) {
        action.targets = { entities: [...form.entities] };
      }
      if (form.kind === "scene") {
        action.data = kindChanged ? {} : action.data || {};
      } else {
        action.data = JSON.parse(form.data);
      }
      item.actions = [action];
    }
  } else if (isNew || targetsChanged || actionChanged || brightnessChanged) {
    const action = copy(
      item.actions[0] || { action: form.action, targets: {}, data: {} },
    );
    const data = actionChanged ? {} : { ...action.data };
    if (form.action === "turn_on" && (isNew || brightnessChanged)) {
      delete data.brightness;
      if (form.brightness === "") {
        delete data.brightness_pct;
      } else {
        data.brightness_pct = Number(form.brightness);
      }
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
      if (lights.length > 0) {
        item.actions.push({ ...action, targets: { entities: lights }, data });
      }
      if (switches.length > 0) {
        item.actions.push({
          ...action,
          targets: { entities: switches },
          data: {},
        });
      }
    }
  }
  // Only newly managed lights receive an off baseline. Existing baselines and
  // handover overrides are never replaced by step edits.
  const lighting = (next.lighting ||= {});
  const managed = new Set(targetEntities(next, lighting.managed_targets));
  const newLights = form.entities.filter(
    (e) =>
      form.kind === "entities" &&
      (isNew || targetsChanged || kindChanged) &&
      e.startsWith("light.") &&
      !managed.has(e),
  );
  if (newLights.length > 0) {
    lighting.managed_targets ||= { entities: [], groups: [] };
    lighting.managed_targets.entities = sorted([
      ...(lighting.managed_targets.entities || []),
      ...newLights,
    ]);
    const baselined = new Set(
      (lighting.baseline || []).flatMap((b) => targetEntities(next, b.targets)),
    );
    const missing = newLights.filter((e) => !baselined.has(e));
    if (missing.length > 0) {
      (lighting.baseline ||= []).push({
        targets: { entities: missing },
        state: "off",
      });
    }
  }
  return next;
}
export function dependentNames(program, id) {
  const paths = references(program, id);
  return stepEntries(program)
    .filter((e) => paths.some((p) => e.path.every((k, i) => p[i] === k)))
    .map((e) => e.name);
}
function scheduleDaySuffix(selected, t) {
  if (!selected) {
    return "";
  }
  if (selected.length === 0) {
    return ` ${t("on no days")}`;
  }
  if (days.every((day) => selected.includes(day))) {
    return ` ${t("every day")}`;
  }
  if (
    selected.length === 5 &&
    days.slice(0, 5).every((day) => selected.includes(day))
  ) {
    return ` ${t("on weekdays")}`;
  }
  if (
    selected.length === 2 &&
    days.slice(5).every((day) => selected.includes(day))
  ) {
    return ` ${t("on weekends")}`;
  }
  const weekdayNames = {
    mon: "Mondays",
    tue: "Tuesdays",
    wed: "Wednesdays",
    thu: "Thursdays",
    fri: "Fridays",
    sat: "Saturdays",
    sun: "Sundays",
  };
  return ` ${t("on")} ${selected.map((day) => t(weekdayNames[day] || day)).join(", ")}`;
}
export function timingSummary(
  entry,
  entries,
  t = (v) => v,
  sources = [],
  locale,
) {
  if (!entry.when) {
    return `${t("Repeated activity window")}${scheduleDaySuffix(entry.days, t)}${entry.days ? "." : ""}`;
  }
  return timingExplanation(timingForm(entry.when), entries, t, sources, {
    includeHints: false,
    locale,
    days: entry.days,
  });
}
export function timingExplanation(
  input,
  entries = [],
  t = (value) => value,
  sources = [],
  { includeHints = true, locale, days: selectedDays } = {},
) {
  const recurrence = scheduleDaySuffix(selectedDays, t);
  const time = {
    start: "",
    end: "",
    anchor: "",
    startOffset: "0s",
    endOffset: "",
    ...input,
  };
  if (time.mode === "absolute") {
    const valid = (value) =>
      /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
    const display = (value) => formatClock(value, locale);
    const seconds = (value) =>
      value
        .split(":")
        .reduce(
          (sum, part, index) => sum + Number(part) * [3600, 60, 1][index],
          0,
        );
    if (!valid(time.start) || (time.end && !valid(time.end))) {
      return t("Choose valid start and end times.");
    }
    const fixedTime = `${t("Runs at")} ${display(time.start)}${recurrence}${includeHints || selectedDays ? "." : ""}`;
    if (!time.end) {
      return `${fixedTime}${includeHints ? ` ${t("Add an end of window to introduce randomness.")}` : ""}`;
    }
    if (seconds(time.end) === seconds(time.start)) {
      return `${fixedTime}${includeHints ? ` ${t("Start and end are the same, so the time is fixed.")}` : ""}`;
    }
    const nextDay =
      seconds(time.end) < seconds(time.start) ? ` ${t("the next day")}` : "";
    return `${t("Runs at a random time between")} ${display(time.start)} ${t("and")} ${display(time.end)}${nextDay}${recurrence}.`;
  }
  if (Object.keys(offsetErrors(time)).length > 0) {
    return t("Enter valid offsets to see when this step runs.");
  }
  if (!time.anchor) {
    return t("Choose a step or event.");
  }
  const step = time.anchor.startsWith("step:");
  let name;
  if (step) {
    name =
      entries.find((entry) => entry.id === time.anchor.slice(5))?.name ||
      time.anchor.slice(5);
  } else if (time.anchor.startsWith("sun:")) {
    name = t(time.anchor.slice(4));
  } else {
    name =
      sources.find((source) => source.value === time.anchor)?.name ||
      time.anchor
        .slice(7)
        .replace(
          /:(start_time|end_time)$/,
          (_, attribute) =>
            ` · ${t(attribute === "start_time" ? "start" : "end")}`,
        );
  }
  const low = minutes(time.startOffset),
    high = time.endOffset ? minutes(time.endOffset) : low;
  const duration = (offset) => {
    let remaining = Math.round(Math.abs(offset) * 60 * 1e6) / 1e6;
    const hours = Math.floor(remaining / 3600);
    remaining -= hours * 3600;
    const mins = Math.floor(remaining / 60);
    const seconds = Math.round((remaining - mins * 60) * 1e6) / 1e6;
    return [
      [hours, "hour", "hours"],
      [mins, "minute", "minutes"],
      [seconds, "second", "seconds"],
    ]
      .filter(([amount]) => amount)
      .map(
        ([amount, singular, plural]) =>
          `${amount} ${t(amount === 1 ? singular : plural)}`,
      )
      .join(" ");
  };
  const offsetLabel = (offset) =>
    `${duration(offset)} ${t(offset < 0 ? "before" : "after")}`;
  if (low === high) {
    return low === 0
      ? `${t("Runs at the same time as")} ${name}${recurrence}.`
      : `${t("Runs")} ${offsetLabel(low)} ${name}${recurrence}.`;
  }
  const anchorStart = step ? `${t("the start of")} ${name}` : name;
  if (low === 0) {
    return `${t("Runs at a random time between")} ${anchorStart} ${t("and")} ${offsetLabel(high)} ${name}${recurrence}.`;
  }
  if (high === 0) {
    return `${t("Runs at a random time between")} ${offsetLabel(low)} ${name} ${t("and")} ${anchorStart}${recurrence}.`;
  }
  const firstBound =
    Math.sign(low) === Math.sign(high) ? duration(low) : offsetLabel(low);
  return `${t("Runs at a random time between")} ${firstBound} ${t("and")} ${offsetLabel(high)} ${name}${recurrence}.`;
}
