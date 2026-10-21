import test from "node:test";
import assert from "node:assert/strict";
import type { Action, Program } from "@occupied/lib/types.js";
import type { LoadedOccupiedPanel } from "@occupied/occupied-panel.js";
import {
  actionForm,
  actionErrors,
  buildAction,
  buildStep,
  hasStepChanges,
  stepEditor,
  stepEntries,
} from "@occupied/lib/models/step-model.js";
import {
  buildRandom,
  randomEditor,
  randomEntries,
} from "@occupied/lib/models/random-model.js";
import { createRandomEditorContext } from "@occupied/lib/controllers/random-editor-controller.js";
import { actionSummary } from "@occupied/lib/controllers/steps.js";
import { changeActionKind } from "@occupied/lib/utils/action-kind.js";
import {
  canSetBrightness,
  entitySettingsSummary,
  resetEntitySettings,
  setActionEntities,
  updateEntitySetting,
} from "@occupied/lib/utils/entity-settings.js";
import { translator } from "@occupied/lib/i18n/translations.js";

void test("brightness is available for every light turn-on action", () => {
  assert.equal(canSetBrightness("light.dimmable", "turn_on"), true);
  assert.equal(canSetBrightness("light.unknown", "turn_on"), true);
  assert.equal(canSetBrightness("switch.a", "turn_on"), false);
  assert.equal(canSetBrightness("light.a", "turn_off"), false);
});

void test("per-entity settings use an existing mapping without adding defaults to other targets", () => {
  const form = actionForm({
    action: "turn_on",
    entities: ["light.a", "light.b", "switch.a"],
  });
  assert.deepEqual(buildAction(form), {
    action: "turn_on",
    entities: form.entities,
  });
  updateEntitySetting(form, "light.a", "brightness", "40");
  updateEntitySetting(form, "light.a", "transition", "3");
  updateEntitySetting(form, "light.b", "brightness", "80");
  assert.deepEqual(actionErrors(form), {});
  const expected: Action = {
    action: "set_state",
    entities: {
      "light.a": { state: "on", brightness: 102, transition: 3 },
      "light.b": { state: "on", brightness: 204 },
      "switch.a": { state: "on" },
    },
  };
  assert.deepEqual(buildAction(form), expected);
  assert.deepEqual(buildAction(actionForm(expected)), expected);
  form.entitySettings = {};
  assert.deepEqual(buildAction(form), {
    action: "turn_on",
    entities: form.entities,
  });
});

void test("all device brightness integers survive untouched percentage round trips and metadata edits", () => {
  for (let raw = 1; raw <= 255; raw++) {
    const source: Action = {
      action: "set_state",
      entities: {
        "light.a": { state: "on", brightness: raw, transition: 0.5 },
      },
      stagger: { enabled: true, period: "90s" },
    };
    const program: Program = {
      steps: {
        evening: { timing: { absolute_time: { start: "18:00" } }, ...source },
      },
    };
    const entry = stepEntries(program)[0];
    assert.equal(actionSummary(entry, translator()), "Turn on");
    assert.ok(!entry.name?.includes("Custom YAML"));
    const editor = stepEditor(program, entry);
    assert.equal(hasStepChanges(editor), false);
    editor.form.name = "Renamed";
    editor.form.timing.start = "19:00";
    assert.equal(hasStepChanges(editor), true);
    assert.deepEqual(buildAction(editor.form), source);
    assert.deepEqual(
      buildStep(program, editor).steps?.evening.entities,
      source.entities,
    );
    updateEntitySetting(editor.form, "light.a", "transition", "2");
    assert.deepEqual(buildAction(editor.form).entities, {
      "light.a": { state: "on", brightness: raw, transition: 2 },
    });
  }
});

void test("brightness input edits replace device precision, clearing fields omits data, and zero fade remains explicit", () => {
  const form = actionForm({
    action: "set_state",
    entities: { "light.a": { state: "on", brightness: 13 } },
  });
  updateEntitySetting(form, "light.a", "brightness", "50");
  assert.deepEqual(buildAction(form).entities, {
    "light.a": { state: "on", brightness: 128 },
  });
  updateEntitySetting(form, "light.a", "brightness", "0.1");
  assert.deepEqual(buildAction(form).entities, {
    "light.a": { state: "on", brightness: 1 },
  });
  updateEntitySetting(form, "light.a", "brightness", "");
  updateEntitySetting(form, "light.a", "transition", "0");
  assert.deepEqual(buildAction(form).entities, {
    "light.a": { state: "on", transition: 0 },
  });
  updateEntitySetting(form, "light.a", "transition", "");
  assert.equal(buildAction(form).action, "turn_on");
});

void test("invalid settings report individual fields and switches never accept light data", () => {
  const form = actionForm({
    action: "turn_on",
    entities: ["light.a", "switch.a"],
  });
  for (const brightness of ["0", "-1", "101", "NaN", "Infinity"]) {
    updateEntitySetting(form, "light.a", "brightness", brightness);
    assert.equal(
      actionErrors(form)["entitySettings.light.a.brightness"],
      "entity_brightness_error",
    );
  }
  updateEntitySetting(form, "light.a", "brightness", "25.5");
  for (const transition of ["-1", "604801", "NaN", "Infinity"]) {
    updateEntitySetting(form, "light.a", "transition", transition);
    assert.equal(
      actionErrors(form)["entitySettings.light.a.transition"],
      "entity_transition_error",
    );
  }
  updateEntitySetting(form, "light.a", "transition", "0.25");
  assert.deepEqual(actionErrors(form), {});
  updateEntitySetting(form, "switch.a", "brightness", "50");
  assert.equal(
    actionErrors(form)["entitySettings.switch.a.brightness"],
    "entity_brightness_error",
  );
});

void test("entity removal/replacement and action changes cannot leak old settings", () => {
  const form = actionForm({
    action: "set_state",
    entities: { "light.a": { state: "on", brightness: 45, transition: 3 } },
  });
  setActionEntities(form, ["light.b"]);
  setActionEntities(form, ["light.a", "light.b", "light.b"]);
  assert.deepEqual(buildAction(form), {
    action: "turn_on",
    entities: ["light.a", "light.b"],
  });
  updateEntitySetting(form, "light.a", "brightness", "50");
  updateEntitySetting(form, "light.a", "transition", "3");
  changeActionKind(form, "turn_off", () => {
    throw new Error("No lossy block replacement");
  });
  assert.deepEqual(buildAction(form).entities, {
    "light.a": { state: "off", transition: 3 },
    "light.b": { state: "off" },
  });
  changeActionKind(form, "turn_on", () => false);
  assert.deepEqual(buildAction(form).entities, {
    "light.a": { state: "on", transition: 3 },
    "light.b": { state: "on" },
  });
  changeActionKind(form, "service", () => false);
  changeActionKind(form, "turn_on", () => false);
  assert.equal(buildAction(form).action, "turn_on");
  assert.equal(form.entitySettings, undefined);
});

void test("GUI to YAML conversions include later GUI edits and preserve stagger", () => {
  const form = actionForm({
    action: "set_state",
    entities: { "light.a": { state: "on", brightness: 7, transition: 1 } },
    stagger: { enabled: true, period: "2m" },
  });
  changeActionKind(form, "custom", () => false);
  assert.ok(form.customYaml?.includes("brightness: 7"));
  changeActionKind(form, "turn_on", () => {
    throw new Error("Supported mapping is lossless");
  });
  updateEntitySetting(form, "light.a", "brightness", "40");
  changeActionKind(form, "custom", () => false);
  assert.ok(form.customYaml?.includes("brightness: 102"));
  assert.deepEqual(buildAction(form).actions?.[0].stagger, {
    enabled: true,
    period: "2m",
  });
});

void test("advanced, mixed-state, invalid and ordered mappings remain intact in Custom YAML", () => {
  const sources: Action[] = [
    {
      action: "set_state",
      entities: { "light.a": { state: "on", rgb_color: [1, 2, 3] } },
    },
    {
      action: "set_state",
      entities: { "light.a": { state: "on" }, "light.b": { state: "off" } },
    },
    { action: "set_state", entities: { "cover.a": { position: 25 } } },
    {
      action: "set_state",
      entities: { "light.a": { state: "on", brightness_pct: 40 } },
    },
    {
      action: "set_state",
      entities: { "light.a": { state: "off", brightness: 25 } },
    },
    {
      action: "set_state",
      entities: { "switch.a": { state: "on", transition: 3 } },
    },
    {
      action: "set_state",
      entities: { "light.a": { state: "on", brightness: 1.5 } },
    },
    {
      action: "set_state",
      entities: { "light.a": { state: "on", transition: -1 } },
    },
    {
      action: "set_state",
      entities: { "light.a": { state: "on" } },
      data: { transition: 3 },
    },
  ];
  for (const source of sources) {
    const form = actionForm(source);
    assert.equal(form.kind, "custom");
    assert.deepEqual(buildAction(form), { actions: [source] });
  }
  const block = { actions: sources.slice(0, 2) };
  assert.deepEqual(buildAction(actionForm(block)), block);
});

void test("random phases share only target IDs and prune settings when shared targets change", () => {
  const program: Program = {
    random: {
      evening: {
        start: { absolute_time: { start: "18:00" } },
        end: { absolute_time: { start: "23:00" } },
        on: {
          action: "set_state",
          entities: {
            "light.a": { state: "on", brightness: 13, transition: 2 },
            "switch.a": { state: "on" },
          },
        },
        off: {
          action: "set_state",
          entities: {
            "light.a": { state: "off", transition: 7 },
            "switch.a": { state: "off" },
          },
        },
      },
    },
  };
  const editor = randomEditor(program, randomEntries(program)[0]);
  assert.equal(editor.form.sameEntities, true);
  assert.deepEqual(
    buildRandom(program, editor).random?.evening.on,
    program.random?.evening.on,
  );
  assert.deepEqual(
    buildRandom(program, editor).random?.evening.off,
    program.random?.evening.off,
  );
  updateEntitySetting(editor.form.on, "light.a", "transition", "4");
  assert.deepEqual(
    buildRandom(program, editor).random?.evening.off,
    program.random?.evening.off,
  );
  const panel = {
    epoch: 1,
    version: 1,
    draft: program,
    randomEditor: editor,
    t: translator(),
    flush() {},
  } as unknown as LoadedOccupiedPanel;
  setActionEntities(editor.form.on, ["light.b", "switch.a"]);
  createRandomEditorContext(panel).action("on").changed("entities");
  assert.deepEqual(editor.form.off.entities, ["light.b", "switch.a"]);
  assert.equal(editor.form.off.entitySettings, undefined);
  assert.deepEqual(buildRandom(program, editor).random?.evening.off, {
    action: "turn_off",
    entities: ["light.b", "switch.a"],
  });
});

void test("resetting or clearing all optional settings restores a clean form", () => {
  const editor = stepEditor({});
  editor.form.entities = ["light.a"];
  editor.original = structuredClone(editor.form);
  updateEntitySetting(editor.form, "light.a", "brightness", "40");
  assert.equal(hasStepChanges(editor), true);
  resetEntitySettings(editor.form, "light.a");
  assert.equal(hasStepChanges(editor), false);
  updateEntitySetting(editor.form, "light.a", "transition", "3");
  updateEntitySetting(editor.form, "light.a", "transition", "");
  assert.equal(hasStepChanges(editor), false);
});

void test("saved settings do not depend on catalog availability and summaries are translated", () => {
  const source: Action = {
    action: "set_state",
    entities: { "light.missing": { state: "off", transition: 2 } },
  };
  const form = actionForm(source);
  assert.deepEqual(buildAction(form), source);
  assert.equal(
    entitySettingsSummary(
      form.entitySettings?.["light.missing"],
      translator("en"),
      form.action,
    ),
    "",
  );
  assert.equal(
    entitySettingsSummary(
      { brightness: "40", transition: "3" },
      translator("sv"),
    ),
    "Ljusstyrka 40%",
  );
});
