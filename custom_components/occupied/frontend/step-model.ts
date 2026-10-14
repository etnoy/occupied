import type {
  Program,
  Timing,
  TimingForm,
  StepEntry,
  StepEditor,
  StepForm,
  FieldErrors,
  TimeSource,
  Catalog,
  Translate,
  Action,
  ActionForm,
} from "./types.js";
import {
  durationSeconds,
  offsetErrors,
  timingForm,
  entityName,
} from "./util.js";
import {
  copy,
  days,
  identifier,
  parentSteps,
  parentRandomEvents,
  references,
} from "./model.js";
import { coverActions, coverField, isCoverAction } from "./cover.js";
import {
  actionTargets,
  actionTargetSummary,
  actionYaml,
} from "./custom-action.js";
import { staggerPeriodError } from "./stagger.js";

const sorted = (values: string[]) => [...new Set(values)].sort();
const actionLabels: Record<string, string> = {
  turn_on: "Turn on",
  turn_off: "Turn off",
  "scene.turn_on": "Activate scene",
  ...Object.fromEntries(coverActions),
};

function stepDisplayName(
  step: Action,
  catalog: Pick<Catalog, "entities"> | undefined,
  t: Translate,
): string {
  const label =
    step.actions || step.action === "set_state"
      ? "Custom YAML"
      : actionLabels[step.action || ""] || step.action || "";

  return `${actionTargetSummary(step, catalog)} · ${t(label)}`;
}

export function stepEntries(
  program: Program,
  catalog?: Pick<Catalog, "entities">,
  t: Translate = (value) => value,
): StepEntry[] {
  return Object.entries(program.steps || {}).map(([id, step]) => ({
    ...step,
    id,
    path: ["steps", id],
    days: [...(step.days || days)],
    name: step.name || stepDisplayName(step, catalog, t),
  }));
}

export const solarEvents = [
  "sunrise",
  "sunset",
  "dawn",
  "dusk",
  "noon",
  "midnight",
];

export function timeSourceChoices(
  program: Program,
  id?: string,
  catalog: Partial<Catalog> = {},
  t: Translate = (value) => value,
  randomId?: string,
): TimeSource[] {
  const allowed = new Set(parentSteps(program, id).map((step) => step.id));

  return [
    ...stepEntries(
      program,
      catalog.entities ? { entities: catalog.entities } : undefined,
      t,
    )
      .filter((step) => allowed.has(step.id))
      .map((step) => ({
        value: `step:${step.id}`,
        name: step.name,
        group: "Steps",
      })),
    ...(randomId
      ? parentRandomEvents(program, randomId).map((event) => {
          const first = actionTargets(event.on)[0];
          const name =
            event.name ||
            (catalog.entities
              ? entityName({ entities: catalog.entities }, first)
              : first);

          return {
            value: `random:${event.id}`,
            name: `${t("End of")} ${name}`,
            group: "Random events",
          };
        })
      : []),
    ...(catalog.time_sources ||
      solarEvents.map((event) => ({
        value: `sun:${event}`,
        name: event,
        group: "Solar events",
      }))),
  ];
}

export function stepEditor(
  program: Program,
  entry?: StepEntry | null,
  parent?: StepEntry,
): StepEditor {
  const source = entry || parent;
  const form: StepForm = {
    ...actionForm(source),
    name: entry ? program.steps?.[entry.id]?.name || "" : "",
    enabled: entry?.enabled !== false,
    days: [...(source?.days || days)],
    timing: timingForm(entry?.timing),
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
    changed: false,
    errors: {},
  };
}

export function actionForm(source?: Action): ActionForm {
  const action = source?.action;
  let kind = "entities";
  if (source?.actions || action === "set_state") {
    kind = "custom";
  } else if (action === "scene.turn_on") {
    kind = "scene";
  } else if (
    source &&
    isCoverAction(source) &&
    actionTargets(source).every((entity) => entity.startsWith("cover."))
  ) {
    kind = "cover";
  } else if (action?.includes(".")) {
    kind = "service";
  }

  return {
    kind,
    ...(source?.stagger && { stagger: copy(source.stagger) }),
    ...(kind === "custom" &&
      source && {
        customActions: source.actions || [
          {
            action: source.action,
            entities: source.entities,
            ...(source.data && { data: source.data }),
            ...(source.stagger && { stagger: source.stagger }),
          },
        ],
        customAccepted: actionYaml(
          source.actions?.length === 1
            ? source.actions[0]
            : source.actions || {
                action: source.action,
                entities: source.entities,
                ...(source.data && { data: source.data }),
                ...(source.stagger && { stagger: source.stagger }),
              },
        ),
        customYaml: actionYaml(
          source.actions?.length === 1
            ? source.actions[0]
            : source.actions || {
                action: source.action,
                entities: source.entities,
                ...(source.data && { data: source.data }),
                ...(source.stagger && { stagger: source.stagger }),
              },
        ),
      }),
    service: source?.action || "homeassistant.turn_on",
    data: JSON.stringify(source?.data || {}, null, 2),
    entities: actionTargets(source),
    action: action === "turn_off" ? "turn_off" : "turn_on",
    position: String(source?.data?.position ?? ""),
    tiltPosition: String(source?.data?.tilt_position ?? ""),
  };
}

export function hasStepChanges(editor: StepEditor) {
  return JSON.stringify(editor.form) !== JSON.stringify(editor.original);
}

export function editorErrors(program: Program, editor: StepEditor) {
  const { form, id } = editor,
    errors = {
      ...actionErrors(form),
      ...timingErrors(program, form.timing, id),
    };
  if (form.days.length === 0) {
    errors.days = "Choose at least one day.";
  }

  return errors;
}

export function actionErrors(form: ActionForm): FieldErrors {
  const errors: FieldErrors = {};
  if (form.stagger) {
    const error = staggerPeriodError(form.stagger);
    if (error) {
      errors.stagger = error;
    }
  }
  if (form.kind === "custom") {
    if (!form.customYaml?.trim()) {
      errors.customYaml = "Enter an action mapping or a list of actions.";
    }

    return errors;
  }
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
  if (
    form.kind === "service" &&
    !/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(form.service)
  ) {
    errors.service = "Choose a service using domain.service.";
  }
  if (form.kind === "cover") {
    if (form.entities.some((entity) => !entity.startsWith("cover."))) {
      errors.entities = "Choose cover entities.";
    }
    if (coverActions.every(([action]) => action !== form.service)) {
      errors.service = "Choose a cover action.";
    }
    const field = coverField(form.service);
    if (field) {
      const key = field === "position" ? "position" : "tiltPosition";
      const value = Number(form[key]);
      if (
        !form[key].trim() ||
        !Number.isSafeInteger(value) ||
        value < 0 ||
        value > 100
      ) {
        errors[key] = "Choose a whole number from 0 to 100.";
      }
    }
  } else if (form.kind === "scene" || form.kind === "service") {
    try {
      const data = JSON.parse(form.data);
      if (!data || Array.isArray(data) || typeof data !== "object") {
        throw new TypeError("Expected service data to be a JSON object");
      }
    } catch {
      errors.data = "Service data must be a JSON object.";
    }
  }

  return errors;
}

export function timingErrors(
  program: Program,
  time: TimingForm,
  id?: string,
  randomId?: string,
): FieldErrors {
  const errors: FieldErrors = {};
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
        (e) => e.id === time.anchor.slice(5),
      );
      if (
        !parent ||
        parentSteps(program, id).every((e) => e.id !== parent.id)
      ) {
        errors.anchor =
          "Choose another step without creating a circular relationship.";
      }
    } else if (time.anchor.startsWith("random:")) {
      if (
        !randomId ||
        parentRandomEvents(program, randomId).every(
          (event) => event.id !== time.anchor.slice(7),
        )
      ) {
        errors.anchor =
          "Choose another random event without creating a circular relationship.";
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

  return errors;
}

export function formTiming(time: TimingForm): Timing {
  if (time.mode === "duration") {
    return {
      duration: {
        min: time.minDuration || "",
        ...(time.maxDuration &&
          durationSeconds(time.maxDuration) !==
            durationSeconds(time.minDuration || "") && {
            max: time.maxDuration,
          }),
      },
    };
  }
  if (time.mode === "absolute") {
    return {
      absolute_time: { start: time.start, ...(time.end && { end: time.end }) },
    };
  }
  const offsets = {
    start_offset: String(
      time.startOffset === "0" ? "0s" : time.startOffset || "0s",
    ),
    ...(time.endOffset && {
      end_offset: String(time.endOffset === "0" ? "0s" : time.endOffset),
    }),
  };
  if (time.anchor.startsWith("random:")) {
    return { relative_to: { random: time.anchor.slice(7), ...offsets } };
  }
  if (time.anchor.startsWith("step:")) {
    return { relative_to: { step: time.anchor.slice(5), ...offsets } };
  }
  if (time.anchor.startsWith("entity:")) {
    const [, entity, attribute] = time.anchor.split(":", 3);

    return {
      relative_to: {
        entity,
        ...(attribute && { attribute: attribute as "start_time" | "end_time" }),
        ...offsets,
      },
    };
  }

  return { relative_to: { sun: time.anchor.slice(4), ...offsets } };
}

export function buildStep(program: Program, editor: StepEditor) {
  const errors = editorErrors(program, editor);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }
  if (editor.existing && !program.steps?.[editor.id]) {
    throw new Error(
      "This step changed elsewhere. Cancel and reopen it before saving.",
    );
  }
  const next = copy(program),
    { form } = editor;
  (next.steps ||= {})[editor.id] = {
    ...(form.name.trim() && { name: form.name.trim() }),
    ...(!form.enabled && { enabled: false }),
    days: [...form.days],
    timing: formTiming(form.timing),
    ...buildAction(form),
  };

  return next;
}

export function buildAction(form: ActionForm): Action {
  if (form.kind === "custom") {
    if (!form.customActions || form.customAccepted !== form.customYaml) {
      throw new Error("Validate Custom YAML before adding it to the draft.");
    }

    return { actions: copy(form.customActions) };
  }
  let action = form.action;
  if (form.kind === "scene") {
    action = "scene.turn_on";
  } else if (form.kind === "service" || form.kind === "cover") {
    action = form.service;
  }
  if (form.kind === "cover") {
    const field = coverField(action);

    return {
      action,
      entities: sorted(form.entities),
      ...(field && {
        data: {
          [field]: Number(
            field === "position" ? form.position : form.tiltPosition,
          ),
        },
      }),
    };
  }

  return {
    action,
    entities: sorted(form.entities),
    ...([
      "turn_on",
      "turn_off",
      "light.turn_on",
      "light.turn_off",
      "switch.turn_on",
      "switch.turn_off",
    ].includes(action) &&
      form.stagger && { stagger: copy(form.stagger) }),
    ...(form.kind !== "entities" && { data: JSON.parse(form.data) }),
  };
}

export function dependentNames(program: Program, id: string) {
  const paths = references(program, id);

  return [
    ...stepEntries(program)
      .filter((e) => paths.some((p) => p[0] === "steps" && p[1] === e.id))
      .map((e) => e.name),
    ...Object.entries(program.random || {})
      .filter(([key]) => paths.some((p) => p[0] === "random" && p[1] === key))
      .map(([key, event]) => event.name || key),
  ];
}
