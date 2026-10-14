import test from "node:test";
import assert from "node:assert/strict";
import type {
  HomeAssistant,
  InstanceDocument,
  ProgramDocument,
  PreviewResult,
} from "@occupied/types.js";
import { stepEditor, stepEntries } from "@occupied/step-model.js";
import { startStep } from "@occupied/steps.js";
import { createStepEditorContext } from "@occupied/step-editor-controller.js";
import { randomEntries } from "@occupied/random-model.js";
import {
  openRandom,
  createRandomEditorContext,
  deleteRandom,
} from "@occupied/random-editor-controller.js";

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

async function fixture() {
  const descriptors = new Map(
    [
      "HTMLElement",
      "customElements",
      "window",
      "location",
      "history",
      "confirm",
      "dispatchEvent",
      "CSS",
    ].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  let url = new URL("http://localhost/occupied?config_entry=main"),
    accepted = false,
    confirmations = 0;
  Object.defineProperties(globalThis, {
    CSS: { configurable: true, value: { escape: (value: string) => value } },
    HTMLElement: {
      configurable: true,
      value: class {
        isConnected = true;
        shadowRoot = {
          querySelectorAll: () => [],
          querySelector: () => null,
          getElementById: () => null,
        };
        attachShadow() {
          return this.shadowRoot;
        }
      },
    },
    customElements: {
      configurable: true,
      value: {
        get: (name: string) => (name.startsWith("ha-") ? class {} : undefined),
        define() {},
      },
    },
    window: {
      configurable: true,
      value: {
        get location() {
          return url;
        },
        history: {
          pushState: (_data: unknown, _title: string, next: URL) => {
            url = new URL(next);
          },
          replaceState: (_data: unknown, _title: string, next: URL) => {
            url = new URL(next);
          },
        },
        dispatchEvent() {},
        confirm: () => {
          confirmations++;
          return accepted;
        },
      },
    },
  });
  for (const key of ["location", "history", "confirm", "dispatchEvent"]) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      get: () => Reflect.get(globalThis.window, key),
    });
  }
  const { OccupiedPanel } = await import("@occupied/occupied-panel.js");
  const panel = new OccupiedPanel();
  const instances: InstanceDocument[] = ["main", "guest"].map((id) => ({
    config_entry_id: id,
    name: id,
    loaded: true,
    state: "loaded",
    source: id === "main" ? "gui" : "file",
    status: "disabled",
    enabled: false,
    active: false,
    paused: false,
    overlaps: [],
  }));
  const documents: Record<string, ProgramDocument> = Object.fromEntries(
    instances.map((instance) => [
      instance.config_entry_id,
      {
        program: {
          schema_version: 1,
          name: instance.name,
          steps: {},
        },
        revision: `revision-${instance.config_entry_id}`,
        source: instance.source,
        timezone: "UTC",
        simulation_date: "2026-10-06",
      } satisfies ProgramDocument,
    ]),
  );
  const subscriptions = new Map<string, (value: unknown) => void>();
  const disposed: string[] = [];
  let programOverride:
      | ((entry: string) => Promise<ProgramDocument>)
      | undefined,
    previewOverride: (() => Promise<PreviewResult>) | undefined;
  const messages: Record<string, unknown>[] = [];
  const preview: PreviewResult = {
    valid: true,
    plans: [
      {
        simulation_date: "2026-10-06",
        timezone: "UTC",
        behavior_hash: "preview",
        start: "2026-10-06T00:00:00Z",
        end: "2026-10-07T00:00:00Z",
        events: [],
        steps: {},
        issues: [],
      },
    ],
  };
  const hass: HomeAssistant = {
    callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
      messages.push(message);
      const entry = String(message.config_entry_id);
      const responses: Record<string, unknown> = {
        "occupied/instances": instances,
        "occupied/program": documents[entry],
        "occupied/catalog": { entities: [], services: {} },
        "occupied/preview": preview,
      };
      if (message.type === "occupied/program" && programOverride) {
        return (await programOverride(entry)) as T;
      }
      if (message.type === "occupied/preview" && previewOverride) {
        return (await previewOverride()) as T;
      }
      return responses[String(message.type)] as T;
    },
    connection: {
      subscribeMessage: <T>(
        callback: (snapshot: T) => void,
        message: Record<string, unknown>,
      ) => {
        const key = `${message.type}:${message.config_entry_id || "all"}`;
        subscriptions.set(key, callback as (snapshot: unknown) => void);
        return Promise.resolve(() => {
          disposed.push(key);
          subscriptions.delete(key);
        });
      },
    },
  };
  panel.hass = hass;
  panel.panel = {};
  await settle();
  return {
    panel,
    documents,
    instances,
    disposed,
    subscriptions,
    messages,
    preview,
    get confirmations() {
      return confirmations;
    },
    accept() {
      accepted = true;
    },
    setProgramOverride(value: typeof programOverride) {
      programOverride = value;
    },
    setPreviewOverride(value: typeof previewOverride) {
      previewOverride = value;
    },
    route(entry: string) {
      url.searchParams.set("config_entry", entry);
      panel.route = {};
    },
    restore() {
      for (const [key, descriptor] of descriptors) {
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          Reflect.deleteProperty(globalThis, key);
        }
      }
    },
  };
}

void test("opening preview automatically loads the current date and regenerates after edits", async () => {
  const f = await fixture();
  try {
    f.panel.navigate("preview");
    assert.equal(f.panel.busy, true);
    await settle();
    assert.equal(f.panel.preview, f.preview);
    assert.equal(f.panel.busy, false);
    const requests = () =>
      f.messages.filter((message) => message.type === "occupied/preview");
    assert.equal(requests().length, 1);
    assert.equal(requests()[0].date, f.panel.document.simulation_date);
    assert.equal(requests()[0].days, 1);
    assert.deepEqual(requests()[0].program, f.panel.draft);
    assert.equal("at" in requests()[0], false);
    f.panel.navigate("preview");
    await settle();
    assert.equal(requests().length, 1);
    f.panel.navigate("steps");
    f.panel.change(["name"], "Updated steps");
    f.panel.navigate("preview");
    assert.equal(f.panel.preview, f.preview);
    await settle();
    assert.equal(requests().length, 2);
    assert.equal(f.panel.previewProgram.name, "Updated steps");
  } finally {
    f.restore();
  }
});

void test("a pending preview cannot replace a draft edited while it loads", async () => {
  const f = await fixture();
  try {
    let resolvePreview!: (result: PreviewResult) => void;
    f.setPreviewOverride(
      () =>
        new Promise((resolve) => {
          resolvePreview = resolve;
        }),
    );
    f.panel.navigate("preview");
    f.panel.navigate("steps");
    f.panel.change(["name"], "New draft");
    resolvePreview(f.preview);
    await settle();
    assert.equal(f.panel.preview, undefined);
    assert.equal(f.panel.busy, false);
    f.setPreviewOverride(undefined);
    f.panel.navigate("preview");
    await settle();
    assert.equal(f.panel.previewProgram.name, "New draft");
  } finally {
    f.restore();
  }
});

void test("preview day navigation loads adjacent dates and Today without overlapping requests", async () => {
  const f = await fixture();
  try {
    f.documents.main.simulation_date = "2026-12-31";
    f.panel.navigate("preview");
    await settle();
    assert.equal(f.panel.previewDate, "2026-12-31");
    const requests = () =>
      f.messages.filter((message) => message.type === "occupied/preview");
    const seed = requests()[0].seed;
    const pending = f.panel.movePreviewDay(1);
    assert.equal(f.panel.previewDate, "2027-01-01");
    assert.equal(f.panel.preview, f.preview);
    void f.panel.movePreviewDay(1);
    assert.equal(f.panel.previewDate, "2027-01-01");
    await pending;
    assert.equal(requests().length, 2);
    assert.equal(requests()[1].date, "2027-01-01");
    await f.panel.movePreviewDay(-1);
    assert.equal(f.panel.previewDate, "2026-12-31");
    await f.panel.movePreviewDay(-1);
    assert.equal(f.panel.previewDate, "2026-12-30");
    await f.panel.selectPreviewDate(f.panel.document.simulation_date);
    assert.equal(f.panel.previewDate, "2026-12-31");
    const count = requests().length;
    await f.panel.selectPreviewDate(f.panel.document.simulation_date);
    assert.equal(requests().length, count);
    assert.ok(
      requests().every(
        (message) => message.days === 1 && message.seed === seed,
      ),
    );
    f.panel.selectInstance("guest");
    await settle();
    assert.equal(f.panel.previewDate, "");
    f.panel.navigate("preview");
    await settle();
    assert.equal(f.panel.previewDate, "2026-10-06");
  } finally {
    f.restore();
  }
});

void test("Configure routing selects the requested instance and switches all editor state", async () => {
  const f = await fixture();
  try {
    assert.equal(f.panel.draft.name, "main");
    f.panel.yaml = f.panel.yamlSaved = "old export";
    f.panel.preview = { valid: true, plans: [] };
    f.route("guest");
    await settle();
    assert.equal(f.panel.selectedEntry, "guest");
    assert.equal(f.panel.draft.name, "guest");
    assert.equal(f.panel.document.source, "file");
    assert.equal(f.panel.revision, "revision-guest");
    assert.equal(f.panel.yaml, "");
    assert.equal(f.panel.preview, undefined);
    assert.ok(f.disposed.includes("occupied/subscribe:main"));
    assert.ok(f.subscriptions.has("occupied/subscribe:guest"));
  } finally {
    f.restore();
  }
});

void test("canceling a new step only asks to discard actual edits", async () => {
  const f = await fixture();
  try {
    const original = structuredClone(f.panel.draft);
    startStep(f.panel);
    createStepEditorContext(f.panel).cancel();
    assert.equal(f.panel.stepEditor, null);
    assert.equal(f.panel.pendingStepExit, null);
    assert.deepEqual(f.panel.draft, original);

    startStep(f.panel);
    const context = createStepEditorContext(f.panel);
    context.form.name = "Pending step";
    context.changed("name");
    context.cancel();
    assert.ok(f.panel.pendingStepExit);
    assert.notEqual(f.panel.stepEditor, null);
    assert.equal(context.form.name, "Pending step");
    f.panel.cancelStepExit();
    assert.equal(f.panel.pendingStepExit, null);
    context.cancel();
    f.panel.confirmStepExit();
    assert.equal(f.panel.stepEditor, null);
    assert.deepEqual(f.panel.draft, original);

    startStep(f.panel);
    const reverted = createStepEditorContext(f.panel);
    reverted.form.timing.start = "19:00";
    reverted.changed("start");
    reverted.form.timing.start = reverted.editor.original.timing.start;
    reverted.changed("start");
    reverted.cancel();
    assert.equal(f.panel.stepEditor, null);
    assert.equal(f.panel.pendingStepExit, null);
    assert.deepEqual(f.panel.draft, original);
  } finally {
    f.restore();
  }
});

void test("saved warnings survive navigation and editor exits until a resolved program loads", async () => {
  const f = await fixture();
  try {
    const warning = {
      code: "undefined_baseline",
      message: "Lights without a baseline are left alone: light.shared",
      severity: "warning",
    };
    f.documents.main = { ...f.documents.main, warnings: [warning] };
    await f.panel.reloadSaved();
    assert.deepEqual(f.panel.visibleIssues(), [warning]);
    const error = { message: "Invalid draft", severity: "error" };
    f.panel.issues = [warning, error];
    assert.deepEqual(f.panel.visibleIssues(), [warning, error]);
    f.panel.navigate("settings");
    startStep(f.panel);
    assert.deepEqual(f.panel.issues, []);
    assert.deepEqual(f.panel.visibleIssues(), [warning]);
    f.panel.requestStepExit(() => f.panel.navigate("settings"));
    f.panel.confirmStepExit();
    assert.deepEqual(f.panel.visibleIssues(), [warning]);
    await f.panel.reloadSaved();
    assert.deepEqual(f.panel.visibleIssues(), [warning]);
    f.panel.selectInstance("guest");
    await settle();
    assert.deepEqual(f.panel.visibleIssues(), []);
    f.panel.selectInstance("main");
    await settle();
    assert.deepEqual(f.panel.visibleIssues(), [warning]);
    f.documents.main = { ...f.documents.main, warnings: [] };
    await f.panel.reloadSaved();
    assert.deepEqual(f.panel.visibleIssues(), []);
  } finally {
    f.restore();
  }
});

void test("instance switching preserves unsaved drafts and step forms when declined", async () => {
  const f = await fixture();
  try {
    f.panel.change(["name"], "Pending name");
    f.panel.selectInstance("guest");
    await settle();
    assert.equal(f.panel.selectedEntry, "main");
    assert.equal(f.panel.draft.name, "Pending name");
    f.panel.discardEdits();
    f.panel.stepEditor = stepEditor(f.panel.draft);
    f.panel.stepEditor.form.name = "Pending step";
    f.panel.selectInstance("guest");
    assert.equal(f.panel.selectedEntry, "main");
    assert.equal(f.panel.stepEditor.form.name, "Pending step");
    assert.equal(f.confirmations, 2);
    f.accept();
    f.panel.selectInstance("guest");
    await settle();
    assert.equal(f.panel.draft.name, "guest");
    assert.equal(f.panel.stepEditor, null);
    assert.equal(f.panel.dirty, false);
  } finally {
    f.restore();
  }
});

void test("responses and snapshots from a previous instance cannot replace the selection", async () => {
  const f = await fixture();
  try {
    const oldSnapshot = f.subscriptions.get("occupied/subscribe:main")!;
    f.panel.selectInstance("guest");
    await settle();
    oldSnapshot({
      source_revision: "old-main-revision",
      configuration_source: { mode: "old-main-source" },
    });
    assert.equal(f.panel.document.source, "file");
    assert.equal(f.panel.revision, "revision-guest");
    let resolveProgram!: (value: ProgramDocument) => void;
    f.setProgramOverride((entry) =>
      entry === "main"
        ? new Promise((resolve) => {
            resolveProgram = resolve;
          })
        : Promise.resolve(f.documents[entry]),
    );
    f.panel.selectInstance("main");
    await settle();
    f.panel.selectInstance("guest");
    await settle();
    resolveProgram(f.documents.main);
    await settle();
    assert.equal(f.panel.draft.name, "guest");
    assert.equal(f.panel.revision, "revision-guest");
  } finally {
    f.restore();
  }
});

void test("unloaded selections remain discoverable and recover without losing drafts", async () => {
  const f = await fixture();
  try {
    f.panel.change(["name"], "Pending draft");
    f.instances[0].loaded = false;
    const update = f.subscriptions.get("occupied/instances_subscribe:all")!;
    update(f.instances);
    await settle();
    assert.equal(f.panel.selectedEntry, "main");
    assert.equal(f.panel.selectedInstance?.loaded, false);
    assert.equal(f.panel.draft.name, "Pending draft");
    assert.ok(f.disposed.includes("occupied/subscribe:main"));
    f.documents.main.revision = "new-main-revision";
    f.instances[0].loaded = true;
    update(f.instances);
    await settle();
    assert.equal(f.panel.draft.name, "Pending draft");
    assert.equal(f.panel.dirty, true);
    assert.equal(f.panel.stale, true);
    assert.equal(f.panel.saved.name, "main");
    assert.equal(f.panel.revision, "revision-main");
  } finally {
    f.restore();
  }
});

void test("Save step validates and saves new and edited steps, then closes the editor", async () => {
  const f = await fixture();
  try {
    const requests: Record<string, unknown>[] = [];
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      requests.push(structuredClone(message));
      return Promise.resolve({
        ...f.panel.document,
        valid: true,
        issues: [],
        program: structuredClone(message.program),
        revision: `saved-${requests.length}`,
      } as T);
    };
    startStep(f.panel);
    const editor = f.panel.stepEditor!;
    editor.form.name = "Agnes fönster on";
    editor.form.entities = ["light.agnes"];
    editor.form.timing.start = "18:00:00";
    editor.form.timing.end = "22:00:00";
    createStepEditorContext(f.panel).changed("start");
    await createStepEditorContext(f.panel).submit();
    assert.deepEqual(
      requests.map((r) => r.type),
      ["occupied/editor_validate", "occupied/save"],
    );
    assert.deepEqual(requests[0].program, requests[1].program);
    assert.equal(requests[1].expected_revision, "revision-main");
    assert.equal(f.panel.stepEditor, null);
    assert.equal(f.panel.selectedStep, editor.id);
    assert.equal(f.panel.dirty, false);
    assert.equal(f.panel.error, "");
    assert.deepEqual(f.panel.draft, f.panel.saved);
    assert.deepEqual(f.panel.saved.steps?.[editor.id].timing, {
      absolute_time: { start: "18:00:00", end: "22:00:00" },
    });

    startStep(f.panel, stepEntries(f.panel.draft)[0]);
    f.panel.stepEditor!.form.action = "turn_off";
    createStepEditorContext(f.panel).changed("action");
    await createStepEditorContext(f.panel).submit();
    assert.equal(requests.length, 4);
    assert.equal(requests[2].type, "occupied/editor_validate");
    assert.equal(requests[3].type, "occupied/save");
    assert.equal(requests[3].expected_revision, "saved-2");
    assert.deepEqual(requests[2].program, requests[3].program);
    assert.equal(f.panel.saved.steps?.[editor.id].action, "turn_off");
    assert.equal(Object.keys(f.panel.saved.steps || {}).length, 1);
    assert.equal(f.panel.stepEditor, null);
    assert.equal(f.panel.dirty, false);
  } finally {
    f.restore();
  }
});

void test("random creation, editing, and deletion use the guarded save flow", async () => {
  const f = await fixture();
  try {
    const requests: Record<string, unknown>[] = [];
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      requests.push(structuredClone(message));
      return Promise.resolve({
        ...f.panel.document,
        valid: true,
        issues: [],
        program: structuredClone(message.program),
        revision: `random-${requests.length}`,
      } as T);
    };
    openRandom(f.panel);
    const editor = f.panel.randomEditor!;
    assert.equal(editor.form.sameEntities, true);
    editor.form.on.entities = ["light.a"];
    createRandomEditorContext(f.panel).changed("on.entities");
    assert.deepEqual(editor.form.off.entities, ["light.a"]);
    await createRandomEditorContext(f.panel).submit();
    assert.equal(f.panel.tab, "random");
    assert.equal(f.panel.randomEditor, null);
    assert.equal(f.panel.dirty, false);
    assert.equal(requests[1].expected_revision, "revision-main");
    assert.deepEqual(f.panel.saved.random![editor.id].off.entities, [
      "light.a",
    ]);
    openRandom(f.panel, randomEntries(f.panel.draft)[0]);
    f.panel.randomEditor!.form.minCount = "5";
    f.panel.randomEditor!.form.maxCount = "5";
    createRandomEditorContext(f.panel).changed("maxCount");
    await createRandomEditorContext(f.panel).submit();
    assert.equal(f.panel.saved.random![editor.id].count, 5);
    assert.equal(Object.keys(f.panel.saved.random!).length, 1);
    openRandom(f.panel, randomEntries(f.panel.draft)[0]);
    await deleteRandom(f.panel);
    assert.deepEqual(f.panel.saved.random, {});
    assert.equal(f.panel.randomEditor, null);
    assert.deepEqual(
      requests.map((request) => request.type),
      [
        "occupied/editor_validate",
        "occupied/save",
        "occupied/editor_validate",
        "occupied/save",
        "occupied/editor_validate",
        "occupied/save",
      ],
    );
  } finally {
    f.restore();
  }
});

void test("random forms preserve unsaved changes and backend field errors", async () => {
  const f = await fixture();
  try {
    openRandom(f.panel);
    const editor = f.panel.randomEditor!;
    editor.form.on.entities = ["light.a"];
    createRandomEditorContext(f.panel).changed("on.entities");
    f.panel.navigate("preview");
    assert.equal(f.panel.tab, "random");
    assert.ok(f.panel.pendingStepExit);
    f.panel.cancelStepExit();
    assert.equal(f.panel.randomEditor, editor);
    f.panel._hass.callWS = <T>() =>
      Promise.resolve({
        valid: false,
        issues: [
          {
            severity: "error",
            message: "Invalid duration",
            model_path: ["random", editor.id, "max_duration"],
          },
        ],
      } as T);
    await createRandomEditorContext(f.panel).submit();
    assert.equal(editor.errors.maxDuration, "Invalid duration");
    for (const [path, field] of [
      [[], "minCount"],
      [["min"], "minCount"],
      [["max"], "maxCount"],
    ] as const) {
      f.panel.focusIssue({
        message: "Invalid count",
        model_path: ["random", editor.id, "count", ...path],
      });
      assert.equal(editor.errors[field], "Invalid count");
    }
    assert.equal(f.panel.saved.random, undefined);
    assert.equal(f.panel.randomEditor, editor);
    f.panel.navigate("steps");
    f.panel.confirmStepExit();
    assert.equal(f.panel.randomEditor, null);
    assert.equal(f.panel.tab, "steps");
  } finally {
    f.restore();
  }
});

void test("managed random edits stay in the draft and can be exported or removed", async () => {
  const f = await fixture();
  try {
    f.panel.selectInstance("guest");
    await settle();
    const before = f.messages.length;
    openRandom(f.panel);
    f.panel.randomEditor!.form.on.entities = ["light.guest"];
    createRandomEditorContext(f.panel).changed("on.entities");
    await createRandomEditorContext(f.panel).submit();
    assert.equal(f.panel.randomEditor, null);
    assert.equal(f.panel.dirty, true);
    assert.equal(f.panel.saved.random, undefined);
    assert.equal(f.messages.length, before);
    openRandom(f.panel, randomEntries(f.panel.draft)[0]);
    await deleteRandom(f.panel);
    assert.deepEqual(f.panel.draft.random, {});
    assert.equal(f.messages.length, before);
  } finally {
    f.restore();
  }
});

void test("saving YAML sends code to the validated save API and adopts the saved program", async () => {
  const f = await fixture();
  try {
    const program = { ...f.panel.draft, name: "Edited YAML" };
    const code = "# Keep this comment\nname: Edited YAML\nschema_version: 1";
    f.panel.yaml = code;
    let request: Record<string, unknown> | undefined;
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      request = message;
      return Promise.resolve({
        valid: true,
        ...f.panel.document,
        program,
        revision: "yaml-save",
      } as T);
    };
    await f.panel.saveYaml();
    assert.equal(request?.type, "occupied/save");
    assert.equal(request?.program, code);
    assert.equal(request?.expected_revision, "revision-main");
    assert.equal(f.panel.saved.name, "Edited YAML");
    assert.equal(f.panel.draft.name, "Edited YAML");
    assert.equal(f.panel.revision, "yaml-save");
    assert.equal(f.panel.yaml, code);
    assert.equal(f.panel.yamlDirty, false);
    assert.equal(f.panel.dirty, false);
  } finally {
    f.restore();
  }
});

void test("invalid YAML keeps code, draft and saved program with reviewable errors", async () => {
  const f = await fixture();
  try {
    const before = structuredClone(f.panel.saved);
    f.panel.yaml = "name: [";
    const issues = [{ severity: "error", message: "Invalid YAML", line: 1 }];
    f.panel._hass.callWS = <T>() =>
      Promise.resolve({ valid: false, issues } as T);
    await f.panel.saveYaml();
    assert.equal(f.panel.yaml, "name: [");
    assert.equal(f.panel.yamlDirty, true);
    assert.deepEqual(f.panel.issues, issues);
    assert.deepEqual(f.panel.saved, before);
    assert.deepEqual(f.panel.draft, before);
    assert.equal(f.panel.revision, "revision-main");
  } finally {
    f.restore();
  }
});

void test("YAML saves preserve edits made in flight and tab changes do not export over code", async () => {
  const f = await fixture();
  try {
    let resolve!: (value: unknown) => void;
    f.panel._hass.callWS = <T>() =>
      new Promise<T>((done) => {
        resolve = (value) => done(value as T);
      });
    f.panel.yaml = "name: Submitted";
    const pending = f.panel.saveYaml();
    f.panel.yaml = "name: Newer";
    resolve({
      valid: true,
      ...f.panel.document,
      program: { ...f.panel.draft, name: "Submitted" },
      revision: "new",
    });
    await pending;
    assert.equal(f.panel.yaml, "name: Newer");
    assert.equal(f.panel.yamlSaved, "name: Submitted");
    assert.equal(f.panel.yamlDirty, true);
    assert.equal(f.panel.saved.name, "Submitted");
    await f.panel.exportYaml();
    assert.equal(f.panel.yaml, "name: Newer");
    f.route("guest");
    await settle();
    assert.equal(f.panel.selectedEntry, "main");
    assert.equal(f.confirmations, 1);
    f.panel.discardEdits();
    assert.equal(f.panel.yaml, "name: Submitted");
    assert.equal(f.panel.yamlDirty, false);
  } finally {
    f.restore();
  }
});

void test("YAML save conflicts preserve code and managed files cannot be saved", async () => {
  const f = await fixture();
  try {
    f.panel.yaml = "name: Edited";
    f.panel._hass.callWS = () =>
      Promise.reject({ code: "revision_conflict", message: "Reload first" });
    await f.panel.saveYaml();
    assert.equal(f.panel.stale, true);
    assert.equal(f.panel.yaml, "name: Edited");
    assert.equal(f.panel.yamlDirty, true);
    f.panel.stale = false;
    f.panel.document.source = "file";
    f.panel._hass.callWS = () => {
      assert.fail("managed save must not send a request");
    };
    await f.panel.saveYaml();
  } finally {
    f.restore();
  }
});
