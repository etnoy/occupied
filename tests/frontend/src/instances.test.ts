import test from "node:test";
import assert from "node:assert/strict";
import type {
  HomeAssistant,
  InstanceDocument,
  ProgramDocument,
  RuntimeSnapshot,
} from "@occupied/types.js";
import { stepEditor } from "@occupied/step-model.js";
import { startStep } from "@occupied/steps.js";

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

async function fixture() {
  const descriptors = new Map(
    ["HTMLElement", "customElements", "window"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  let url = new URL("http://localhost/occupied?config_entry=main"),
    accepted = false,
    confirmations = 0;
  Object.defineProperty(globalThis, "HTMLElement", {
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
  });
  Object.defineProperty(globalThis, "customElements", {
    configurable: true,
    value: {
      get: (name: string) => (name.startsWith("ha-") ? class {} : undefined),
      define() {},
    },
  });
  Object.defineProperty(globalThis, "window", {
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
  });
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
          groups: [],
          routines: [],
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
    timelineOverride: (() => Promise<unknown>) | undefined;
  const hass: HomeAssistant = {
    callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
      const entry = String(message.config_entry_id);
      const responses: Record<string, unknown> = {
        "occupied/instances": instances,
        "occupied/program": documents[entry],
        "occupied/catalog": { entities: [], services: {} },
        "occupied/status": {
          enabled: false,
          status: "disabled",
          reason: entry,
        } satisfies RuntimeSnapshot,
      };
      if (message.type === "occupied/program" && programOverride)
        return (await programOverride(entry)) as T;
      if (message.type === "occupied/timeline" && timelineOverride)
        return (await timelineOverride()) as T;
      return responses[String(message.type)] as T;
    },
    callService: async () => {},
    connection: {
      subscribeMessage: async <T>(
        callback: (snapshot: T) => void,
        message: Record<string, unknown>,
      ) => {
        const key = `${message.type}:${message.config_entry_id || "all"}`;
        subscriptions.set(key, callback as (snapshot: unknown) => void);
        return () => {
          disposed.push(key);
          subscriptions.delete(key);
        };
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
    get confirmations() {
      return confirmations;
    },
    accept() {
      accepted = true;
    },
    setProgramOverride(value: typeof programOverride) {
      programOverride = value;
    },
    setTimelineOverride(value: typeof timelineOverride) {
      timelineOverride = value;
    },
    route(entry: string) {
      url.searchParams.set("config_entry", entry);
      panel.route = {};
    },
    restore() {
      for (const [key, descriptor] of descriptors)
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
    },
  };
}

test("Configure routing selects the requested instance and switches all editor state", async () => {
  const f = await fixture();
  try {
    assert.equal(f.panel.draft.name, "main");
    f.panel.yaml = "old export";
    f.panel.sourcePath = "old.yaml";
    f.panel.timelineDate = "2020-01-01";
    f.panel.actual = { dates: ["2020-01-01"] };
    f.panel.preview = { valid: true, plans: [] };
    f.panel.diagnostics = { old: true };
    f.route("guest");
    await settle();
    assert.equal(f.panel.selectedEntry, "guest");
    assert.equal(f.panel.draft.name, "guest");
    assert.equal(f.panel.document.source, "file");
    assert.equal(f.panel.revision, "revision-guest");
    assert.equal(f.panel.yaml, "");
    assert.equal(f.panel.sourcePath, undefined);
    assert.equal(f.panel.timelineDate, "");
    assert.equal(f.panel.actual, undefined);
    assert.equal(f.panel.preview, undefined);
    assert.equal(f.panel.diagnostics, undefined);
    assert.ok(f.disposed.includes("occupied/subscribe:main"));
    assert.ok(f.subscriptions.has("occupied/subscribe:guest"));
  } finally {
    f.restore();
  }
});

test("saved warnings survive navigation and editor exits until a resolved program loads", async () => {
  const f = await fixture();
  try {
    const warning = {
      code: "shared_target",
      message: "light.shared is shared by step, step_2",
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

test("instance switching preserves unsaved drafts and step forms when declined", async () => {
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

test("responses and snapshots from a previous instance cannot replace the selection", async () => {
  const f = await fixture();
  try {
    const oldSnapshot = f.subscriptions.get("occupied/subscribe:main")!;
    let resolveTimeline!: (value: unknown) => void;
    f.setTimelineOverride(
      () =>
        new Promise((resolve) => {
          resolveTimeline = resolve;
        }),
    );
    const pending = f.panel.loadTimeline();
    f.panel.selectInstance("guest");
    await settle();
    oldSnapshot({ enabled: true, reason: "old main snapshot" });
    resolveTimeline({ dates: ["old main history"] });
    await pending;
    assert.equal(f.panel.status.reason, "guest");
    assert.equal(f.panel.actual, undefined);
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

test("unloaded selections remain discoverable and recover without losing drafts", async () => {
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
