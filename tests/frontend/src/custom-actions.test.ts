import test from "node:test";
import assert from "node:assert/strict";
import {
  actionForm,
  buildAction,
  buildStep,
  stepEditor,
  stepEntries,
} from "@occupied/lib/models/step-model.js";
import {
  applyStagger,
  staggerSettings,
  staggerPeriodError,
  supportsStagger,
} from "@occupied/lib/utils/stagger.js";
import { changeActionKind } from "@occupied/lib/utils/action-kind.js";
import {
  actionTargets,
  actionYaml,
  prepareCustomAction,
} from "@occupied/lib/utils/custom-action.js";
import {
  buildRandom,
  randomEditor,
  randomEntries,
} from "@occupied/lib/models/random-model.js";
import type { Action, Program } from "@occupied/lib/types.js";
import type { OccupiedPanel } from "@occupied/occupied-panel.js";

void test("on/off migration uses current unsaved targets and prepares scene-style YAML", () => {
  const form = actionForm({ action: "turn_on", entities: ["light.old"] });
  form.entities = ["light.sofa", "switch.window"];
  assert.deepEqual(
    changeActionKind(form, "custom", () => false),
    {},
  );
  assert.equal(form.kind, "custom");
  assert.equal(
    form.customYaml,
    'action: "set_state"\nentities:\n  light.sofa:\n    state: "on"\n  switch.window:\n    state: "on"',
  );
  assert.ok(!form.customYaml.includes("brightness"));
  changeActionKind(form, "turn_on", () => {
    throw new Error("Lossless conversion must not prompt");
  });
  assert.equal(form.kind, "entities");
  assert.deepEqual(form.entities, ["light.sofa", "switch.window"]);
  form.action = "turn_off";
  form.customYaml = "";
  changeActionKind(form, "custom", () => false);
  assert.ok(form.customYaml.includes('state: "off"'));
});

void test("cover, scene, and service migration retain targets and data", () => {
  const sources: Action[] = [
    {
      action: "cover.set_cover_position",
      entities: ["cover.blind"],
      data: { position: 40 },
    },
    { action: "scene.turn_on", entities: ["scene.evening"], data: {} },
    {
      action: "script.turn_on",
      entities: ["script.test"],
      data: { variables: { message: "hello" } },
    },
  ];
  for (const source of sources) {
    const form = actionForm(source);
    changeActionKind(form, "custom", () => false);
    assert.equal(form.customActions?.[0].action, source.action);
    assert.deepEqual(form.customActions?.[0].entities, source.entities);
    assert.deepEqual(form.customActions?.[0].data || {}, source.data);
    assert.ok(form.customYaml?.includes(source.action!));
    if (Object.keys(source.data || {}).length === 0) {
      assert.ok(form.customYaml?.includes("data: {}"));
    }
  }
});

void test("lossy replacement requires explicit choice and preserves the custom buffer", () => {
  const form = actionForm({
    actions: [
      {
        action: "set_state",
        entities: { "light.sofa": { state: "on", brightness: 20 } },
      },
    ],
  });
  const text = form.customYaml;
  changeActionKind(form, "turn_on", () => false);
  assert.equal(form.kind, "custom");
  changeActionKind(form, "turn_on", () => true);
  assert.equal(form.kind, "entities");
  form.entities = ["light.sofa"];
  changeActionKind(form, "custom", () => false);
  assert.equal(form.customYaml, text);
  form.customYaml += "\n# My edit";
  changeActionKind(form, "turn_on", () => false);
  assert.equal(form.kind, "custom");
  assert.ok(form.customYaml?.endsWith("# My edit"));
});

void test("metadata and random edits retain complete ordered actions", () => {
  const custom = {
    actions: [
      {
        action: "set_state",
        entities: { "light.sofa": { state: "on", brightness: 24 } },
      },
      {
        action: "cover.set_cover_position",
        entities: ["cover.blind"],
        data: { position: 40 },
      },
      { action: "scene.turn_on", entities: ["scene.evening"] },
    ],
  };
  const program: Program = {
    schema_version: 1,
    name: "House",
    steps: {
      evening: { timing: { absolute_time: { start: "18:00" } }, ...custom },
    },
    random: {
      repeat: {
        start: { absolute_time: { start: "18:00" } },
        end: { absolute_time: { start: "23:00" } },
        on: custom,
        off: { action: "turn_off", entities: ["light.sofa"] },
      },
    },
  };
  const editor = stepEditor(program, stepEntries(program)[0]);
  editor.form.name = "Renamed";
  editor.form.timing.start = "19:00";
  assert.deepEqual(
    buildStep(program, editor).steps?.evening.actions,
    custom.actions,
  );
  const random = randomEditor(program, randomEntries(program)[0]);
  random.form.minCount = random.form.maxCount = "4";
  assert.deepEqual(
    buildRandom(program, random).random?.repeat.on.actions,
    custom.actions,
  );
  assert.deepEqual(actionTargets(custom), [
    "light.sofa",
    "cover.blind",
    "scene.evening",
  ]);
  assert.ok(actionYaml(custom.actions).includes('- action: "set_state"'));
});

void test("unvalidated text cannot save stale actions and late responses cannot overwrite edits", async () => {
  const form = actionForm({
    actions: [{ action: "turn_on", entities: ["light.sofa"] }],
  });
  form.customYaml += "\n# changed";
  assert.throws(() => buildAction(form), /custom_yaml_validation_error/);
  let resolve!: (value: unknown) => void;
  const panel = {
    version: 1,
    activeEditor: {},
    ws: () =>
      new Promise((done) => {
        resolve = done;
      }),
  } as unknown as OccupiedPanel;
  const pending = prepareCustomAction(panel, form);
  form.customYaml += "\n# newer";
  resolve({
    valid: true,
    actions: [{ action: "turn_off", entities: ["light.sofa"] }],
  });
  await assert.rejects(pending, /submit_newer_edits_hint/);
  assert.throws(() => buildAction(form), /custom_yaml_validation_error/);
});

void test("migration quotes service-data keys that YAML could interpret as booleans", () => {
  const form = actionForm({
    action: "script.turn_on",
    entities: ["script.test"],
    data: {
      variables: {
        on: "enabled",
        off: "disabled",
        null: "value",
        yes: "answer",
      },
    },
  });
  changeActionKind(form, "custom", () => false);
  for (const key of ["on", "off", "null", "yes"]) {
    assert.ok(form.customYaml?.includes(`"${key}":`));
  }
  assert.deepEqual(form.customActions?.[0].data, {
    variables: { on: "enabled", off: "disabled", null: "value", yes: "answer" },
  });
});

void test("stagger checkbox state and custom period survive lossless editor conversions", () => {
  const source: Action = {
    action: "turn_on",
    entities: ["light.a", "switch.b"],
    stagger: { enabled: true, period: "90s" },
  };
  const form = actionForm(source);
  assert.deepEqual(buildAction(form), source);
  changeActionKind(form, "custom", () => false);
  assert.deepEqual(form.customActions?.[0].stagger, source.stagger);
  assert.ok(form.customYaml?.includes('period: "90s"'));
  changeActionKind(form, "turn_on", () => false);
  assert.deepEqual(buildAction(form), source);
  form.stagger!.enabled = false;
  assert.deepEqual(buildAction(form).stagger, {
    enabled: false,
    period: "90s",
  });
  const reopened = actionForm(buildAction(form));
  assert.deepEqual(reopened.stagger, { enabled: false, period: "90s" });
  changeActionKind(form, "turn_off", () => false);
  assert.deepEqual(buildAction(form).stagger, {
    enabled: false,
    period: "90s",
  });
  changeActionKind(form, "scene", () => false);
  assert.equal(buildAction(form).stagger, undefined);
});

void test("singular custom mapping preserves stagger options on title/timing edits", () => {
  const source: Action = {
    action: "set_state",
    entities: { "light.a": { state: "on", brightness: 128 } },
    stagger: { enabled: true, period: "3m" },
  };
  const form = actionForm(source);
  assert.deepEqual(buildAction(form), { actions: [source] });
  assert.ok(form.customYaml?.includes('period: "3m"'));
});

void test("advanced stagger options use a buffered 2m default and retain off actions", () => {
  const form = actionForm({ action: "turn_off", entities: ["light.a"] });
  assert.ok(supportsStagger(form));
  const settings = staggerSettings(form);
  assert.deepEqual(settings, { enabled: false, period: "2m" });
  settings.enabled = true;
  settings.period = "90s";
  assert.equal(form.stagger, undefined);
  applyStagger(form, settings);
  assert.deepEqual(buildAction(form).stagger, settings);
  settings.period = "3m";
  assert.equal(buildAction(form).stagger?.period, "90s");
  for (const period of ["", "0s", "-1m", "31m", "120", "0.5s"]) {
    assert.ok(staggerPeriodError({ period }));
  }
  assert.equal(staggerPeriodError({ period: "2m" }), undefined);
});

void test("advanced settings can update a single custom action without losing light settings", () => {
  const source: Action = {
    action: "set_state",
    entities: { "light.a": { state: "off", transition: 3 } },
  };
  const form = actionForm(source);
  assert.ok(supportsStagger(form));
  const text = form.customYaml;
  applyStagger(form, staggerSettings(form));
  assert.equal(form.customYaml, text);
  applyStagger(form, { enabled: true, period: "3m" });
  assert.deepEqual(buildAction(form).actions?.[0], {
    ...source,
    stagger: { enabled: true, period: "3m" },
  });
  assert.ok(form.customYaml?.includes('period: "3m"'));
  form.customYaml += "\n# Unsaved edits";
  assert.equal(supportsStagger(form), false);
});
