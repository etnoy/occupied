import test from "node:test";
import type { LoadedOccupiedPanel } from "@occupied/occupied-panel.js";
import assert from "node:assert/strict";
import type {
  HomeAssistant,
  InstanceDocument,
  ProgramDocument,
  PreviewResult,
  LivePreviewResponse,
  LivePreviewSession,
} from "@occupied/lib/types.js";
import { stepEditor, stepEntries } from "@occupied/lib/models/step-model.js";
import {
  deleteStep,
  startStep,
  openStep,
} from "@occupied/lib/controllers/steps.js";
import { createStepEditorContext } from "@occupied/lib/controllers/step-editor-controller.js";
import { previewAction } from "@occupied/lib/controllers/action-preview-controller.js";
import { changeActionKind } from "@occupied/lib/utils/action-kind.js";
import { randomEntries } from "@occupied/lib/models/random-model.js";
import {
  openRandom,
  createRandomEditorContext,
  deleteRandom,
} from "@occupied/lib/controllers/random-editor-controller.js";

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

async function fixture(startupState?: string, reportedState = startupState) {
  const originalNow = Date.now;
  Date.now = () => Date.parse("2026-10-06T12:00:00Z");
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
      "document",
      "removeEventListener",
    ].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  let url = new URL("http://localhost/occupied?config_entry=main"),
    accepted = false,
    confirmations = 0;
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: { removeEventListener() {} } },
    removeEventListener: { configurable: true, value() {} },
    CSS: { configurable: true, value: { escape: (value: string) => value } },
    HTMLElement: {
      configurable: true,
      value: class {
        isConnected = true;
        shadowRoot = {
          replaceChildren() {},
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
        removeEventListener() {},
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
  const { OccupiedPanel, hasProgram } =
    await import("@occupied/occupied-panel.js");
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
  const connectionListeners = new Map<string, () => void>();
  const connectionCallbacks = new Map<string, Set<() => void>>();
  let liveOverride:
    | ((message: Record<string, unknown>) => Promise<LivePreviewResponse>)
    | undefined;
  let programOverride:
      ((entry: string) => Promise<ProgramDocument>) | undefined,
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
    config: startupState ? { state: startupState } : undefined,
    callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
      messages.push(message);
      const entry = String(message.config_entry_id);
      const responses: Record<string, unknown> = {
        get_config: { state: reportedState },
        "occupied/instances": instances,
        "occupied/program": documents[entry],
        "occupied/catalog": { entities: [], services: {} },
        "occupied/preview": preview,
        "occupied/editor_validate": { valid: true, issues: [] },
        "occupied/export": {
          valid: true,
          issues: [],
          yaml: JSON.stringify(message.program),
        },
        "occupied/live_preview/status": { session: null, can_advance: false },
      };
      if (message.type === "occupied/program" && programOverride) {
        return (await programOverride(entry)) as T;
      }
      if (message.type === "occupied/preview" && previewOverride) {
        preview.program = structuredClone(documents[entry].program);

        return (await previewOverride()) as T;
      }
      if (message.type === "occupied/preview") {
        preview.program = structuredClone(documents[entry].program);
      }

      return String(message.type).startsWith("occupied/live_preview/") &&
        liveOverride
        ? ((await liveOverride(message)) as T)
        : (responses[String(message.type)] as T);
    },
    connection: {
      addEventListener: (event, callback) => {
        const callbacks =
          connectionCallbacks.get(event) || new Set<() => void>();
        callbacks.add(callback);
        connectionCallbacks.set(event, callbacks);
        connectionListeners.set(event, () => {
          const listeners = [...callbacks];
          for (const listener of listeners) {
            listener();
          }
        });
      },
      removeEventListener: (event, callback) => {
        const callbacks = connectionCallbacks.get(event);
        callbacks?.delete(callback);
        if (callbacks?.size === 0) {
          connectionListeners.delete(event);
        }
      },
      subscribeMessage: <T>(
        callback: (snapshot: T) => void,
        message: Record<string, unknown>,
      ) => {
        const key = `${message.type}:${message.config_entry_id || "all"}`;
        subscriptions.set(key, callback as (snapshot: unknown) => void);

        return Promise.resolve(() => {
          disposed.push(key);
          subscriptions.delete(key);

          return Promise.resolve();
        });
      },
    },
  };
  panel.hass = hass;
  panel.panel = {};
  await settle();
  if (!startupState || startupState === "RUNNING") {
    assert.ok(hasProgram(panel));
  }

  return {
    panel: panel as LoadedOccupiedPanel,
    documents,
    instances,
    disposed,
    subscriptions,
    messages,
    preview,
    connectionListeners,
    setLiveOverride(value: typeof liveOverride) {
      liveOverride = value;
    },
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
      panel.disconnectedCallback();
      Date.now = originalNow;
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

for (const retryFails of [false, true]) {
  void test(`failed runtime subscription can retry with loaded draft (${retryFails})`, async () => {
    const f = await fixture();
    try {
      const draft = f.panel.draft;
      let attempts = 0;
      const connection = f.panel._hass.connection;
      f.panel.hass = {
        ...f.panel._hass,
        connection: {
          ...connection,
          subscribeMessage: (callback, message) => {
            if (message.type === "occupied/subscribe") {
              attempts++;
              if (attempts === 1 || retryFails) {
                return Promise.reject(new Error("Subscription unavailable"));
              }
            }

            return connection.subscribeMessage(callback, message);
          },
        },
      };
      await settle();
      assert.equal(attempts, 1);
      assert.match(f.panel.notices(), /Live updates are unavailable/);
      assert.equal(f.panel.liveReady, false);
      for (let update = 0; update < 5; update++) {
        f.panel.hass = f.panel._hass;
        await settle();
      }
      assert.equal(attempts, 1);
      f.panel.retry();
      f.panel.retry();
      await settle();
      assert.equal(attempts, 2);
      assert.equal(f.panel.draft, draft);
      if (retryFails) {
        assert.match(f.panel.notices(), /Live updates are unavailable/);
        assert.equal(f.panel.liveReady, false);
      } else {
        assert.doesNotMatch(f.panel.notices(), /Live updates are unavailable/);
        assert.equal(f.panel.liveReady, true);
        f.subscriptions.get("occupied/subscribe:main")!({
          source_revision: "external",
        });
        assert.equal(f.panel.stale, true);
      }
    } finally {
      f.restore();
    }
  });
}

async function deletionFixture() {
  const f = await fixture();
  f.documents.main.program = {
    schema_version: 1,
    name: "main",
    steps: {
      evening: {
        name: "Evening",
        timing: { absolute_time: { start: "18:00" } },
        action: "turn_on",
        entities: ["light.test"],
      },
    },
  };
  await f.panel.reloadSaved(true);
  f.panel.stepEditor = stepEditor(f.panel.draft, stepEntries(f.panel.draft)[0]);
  f.panel.selectedStep = "evening";

  return f;
}

void test("GUI step deletion saves the removed step and adopts the authoritative result", async () => {
  const f = await deletionFixture();
  try {
    const requests: Record<string, unknown>[] = [];
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      requests.push(structuredClone(message));

      return Promise.resolve({
        valid: true,
        issues: [],
        program: structuredClone(message.program),
        revision: "deleted",
      } as T);
    };
    assert.equal(await deleteStep(f.panel, "evening"), true);
    assert.deepEqual(
      requests.map((message) => message.type),
      ["occupied/editor_validate", "occupied/save"],
    );
    assert.equal(requests[1].expected_revision, "revision-main");
    assert.equal(
      (requests[1].program as ProgramDocument["program"]).steps?.evening,
      undefined,
    );
    assert.equal(f.panel.saved.steps?.evening, undefined);
    assert.deepEqual(f.panel.draft, f.panel.saved);
    assert.equal(f.panel.revision, "deleted");
    assert.equal(f.panel.dirty, false);
    assert.equal(f.panel.stepEditor, null);
  } finally {
    f.restore();
  }
});

void test("managed-file step deletion changes only the draft", async () => {
  const f = await deletionFixture();
  try {
    f.panel.document.source = "file";
    f.panel._hass.callWS = () => {
      throw new Error("Managed-file deletion must not send a save");
    };
    assert.equal(await deleteStep(f.panel, "evening"), true);
    assert.equal(f.panel.draft.steps?.evening, undefined);
    assert.ok(f.panel.saved.steps?.evening);
    assert.equal(f.panel.revision, "revision-main");
    assert.equal(f.panel.dirty, true);
    assert.equal(f.panel.stepEditor, null);
  } finally {
    f.restore();
  }
});

for (const failure of ["validation", "conflict"]) {
  void test(`failed ${failure} keeps the deletion editor and program intact`, async () => {
    const f = await deletionFixture();
    try {
      const editor = f.panel.stepEditor;
      f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
        if (failure === "validation") {
          return Promise.resolve({ valid: false, issues: [] } as T);
        }

        return message.type === "occupied/save"
          ? Promise.reject({
              code: "revision_conflict",
              message: "Program changed",
            })
          : Promise.resolve({ valid: true, issues: [] } as T);
      };
      assert.equal(await deleteStep(f.panel, "evening"), false);
      assert.equal(f.panel.stepEditor, editor);
      assert.ok(f.panel.draft.steps?.evening);
      assert.ok(f.panel.saved.steps?.evening);
      assert.equal(f.panel.busy, false);
      assert.ok(f.panel.error);
    } finally {
      f.restore();
    }
  });
}

for (const guard of ["busy", "stale", "dependent"]) {
  void test(`${guard} prevents step deletion`, async () => {
    const f = await deletionFixture();
    try {
      if (guard === "dependent") {
        f.panel.draft.steps!.dependent = {
          timing: { relative_to: { step: "evening" } },
          action: "turn_off",
          entities: ["light.test"],
        };
      } else {
        f.panel[guard as "busy" | "stale"] = true;
      }
      f.panel._hass.callWS = () => {
        throw new Error("Guarded deletion must not save");
      };
      assert.equal(await deleteStep(f.panel, "evening"), false);
      assert.ok(f.panel.draft.steps?.evening);
      assert.ok(f.panel.stepEditor);
    } finally {
      f.restore();
    }
  });
}

void test("a loaded proof document awaiting migration is not an unsaved user edit", async () => {
  const f = await fixture();
  try {
    f.documents.main.needs_apply = true;
    await f.panel.reloadSaved(true);
    assert.equal(f.panel.document.needs_apply, true);
    assert.equal(f.panel.dirty, false);
    assert.deepEqual(f.panel.draft, f.panel.saved);
    assert.equal(
      f.messages.filter((message) => message.type === "occupied/save").length,
      0,
    );
  } finally {
    f.restore();
  }
});

for (const viewChange of ["YAML", "run condition"]) {
  void test(`tab navigation preserves the managed-file draft when discarding ${viewChange}`, async () => {
    const f = await fixture();
    try {
      f.route("guest");
      await settle();
      assert.equal(f.panel.document.source, "file");
      f.panel.change(["steps", "draft_step"], {
        action: "turn_on",
        entities: ["light.test"],
        timing: { absolute_time: { start: "18:00" } },
      });
      const draft = structuredClone(f.panel.draft);
      const version = f.panel.version;
      f.panel.navigate("settings");
      f.panel.openRunCondition();
      f.panel.yaml = f.panel.yamlSaved = "schema_version: 1\nname: guest\n";
      if (viewChange === "YAML") {
        f.panel.yaml += "# Unsaved YAML\n";
      } else {
        f.panel.runConditionForm!.enabled = true;
      }
      f.panel.runConditionErrors = { entityId: "Unfinished form" };
      f.accept();
      f.panel.navigate("steps");
      assert.equal(f.panel.tab, "steps");
      assert.deepEqual(f.panel.draft, draft);
      assert.equal(f.panel.dirty, true);
      assert.equal(f.panel.version, version);
      assert.deepEqual(f.panel.saved.steps, {});
      assert.equal(f.panel.yaml, f.panel.yamlSaved);
      assert.equal(f.panel.runConditionForm, null);
      assert.equal(f.panel.runConditionOriginal, null);
      assert.deepEqual(f.panel.runConditionErrors, {});
      assert.equal(f.confirmations, 1);
    } finally {
      f.restore();
    }
  });
}

void test("cancelling tab navigation keeps view edits and the managed-file draft", async () => {
  const f = await fixture();
  try {
    f.route("guest");
    await settle();
    f.panel.change(["name"], "Draft name");
    f.panel.navigate("settings");
    f.panel.yaml = "# Pending YAML";
    f.panel.navigate("steps");
    assert.equal(f.panel.tab, "settings");
    assert.equal(f.panel.draft.name, "Draft name");
    assert.equal(f.panel.dirty, true);
    assert.equal(f.panel.yaml, "# Pending YAML");
    assert.equal(f.confirmations, 1);
  } finally {
    f.restore();
  }
});

for (const failedRequest of ["program", "catalog"]) {
  void test(`a failed ${failedRequest} load waits for Retry across HA updates`, async () => {
    const f = await fixture();
    try {
      const original = f.panel._hass.callWS.bind(f.panel._hass);
      let fail = true;
      let attempts = 0;
      f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
        if (
          message.config_entry_id === "guest" &&
          message.type === `occupied/${failedRequest}`
        ) {
          attempts++;
          if (fail) {
            return Promise.reject(new Error("Controller load failed"));
          }
        }

        return original<T>(message);
      };
      f.route("guest");
      await settle();
      for (let update = 0; update < 10; update++) {
        f.panel.hass = f.panel._hass;
        await settle();
      }
      assert.equal(attempts, 1);
      assert.equal(f.panel._loading, false);
      assert.equal(f.panel.error, "Controller load failed");
      f.panel.retry();
      await settle();
      assert.equal(attempts, 2);
      fail = false;
      f.panel.retry();
      await settle();
      assert.equal(attempts, 3);
      assert.equal(f.panel.draft.name, "guest");
      assert.equal(f.panel.error, "");
    } finally {
      f.restore();
    }
  });
}

void test("in-flight controller discovery is shared across HA updates", async () => {
  const f = await fixture();
  const replies: ((instances: InstanceDocument[]) => void)[] = [];
  try {
    const original = f.panel._hass.callWS.bind(f.panel._hass);
    let attempts = 0;
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      if (message.type === "occupied/instances") {
        attempts++;

        return new Promise<T>((resolve) => {
          replies.push((instances) => resolve(instances as T));
        });
      }

      return original<T>(message);
    };
    f.panel.hass = {
      ...f.panel._hass,
      connection: { ...f.panel._hass.connection },
    };
    for (let update = 0; update < 10; update++) {
      f.panel.hass = f.panel._hass;
    }
    assert.equal(attempts, 1);
  } finally {
    for (const reply of replies) {
      reply(f.instances);
    }
    await settle();
    f.restore();
  }
});

void test("failed controller discovery waits for Retry across HA updates", async () => {
  const f = await fixture();
  try {
    const original = f.panel._hass.callWS.bind(f.panel._hass);
    let attempts = 0;
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      if (message.type === "occupied/instances") {
        attempts++;

        return Promise.reject(new Error("Discovery failed"));
      }

      return original<T>(message);
    };
    f.panel.hass = {
      ...f.panel._hass,
      connection: { ...f.panel._hass.connection },
    };
    await settle();
    for (let update = 0; update < 10; update++) {
      f.panel.hass = f.panel._hass;
      await settle();
    }
    assert.equal(attempts, 1);
    assert.equal(f.panel.error, "Discovery failed");
    f.panel.retry();
    await settle();
    assert.equal(attempts, 2);
  } finally {
    f.restore();
  }
});

for (const raw of ["# Original comment\nschema_version: 99\n", ""]) {
  void test(`invalid stored YAML is preserved for recovery (${JSON.stringify(raw)})`, async () => {
    const f = await fixture();
    try {
      f.documents.main = {
        ...f.documents.main,
        recovery_yaml: raw,
        revision: "invalid:original",
        configuration_source: { mode: "gui", status: "error" },
      };
      await f.panel.reloadSaved();
      const exports = f.messages.filter(
        (m) => m.type === "occupied/export",
      ).length;
      await f.panel.exportYaml();
      assert.equal(f.panel.yaml, raw);
      assert.equal(f.panel.yamlSaved, raw);
      assert.equal(f.panel.yamlRevision, "invalid:original");
      assert.equal(
        f.messages.filter((m) => m.type === "occupied/export").length,
        exports,
      );
      assert.match(f.panel.notices(), /Stored program is invalid/);
      assert.doesNotMatch(f.panel.notices(), /File error/);
      f.panel.yaml = "schema_version: 1\nname: Repaired\n";
      await f.panel.exportYaml();
      assert.equal(f.panel.yaml, "schema_version: 1\nname: Repaired\n");
      const original = f.panel._hass.callWS;
      let save: Record<string, unknown> | undefined;
      f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
        if (message.type === "occupied/save") {
          save = message;

          return Promise.resolve({
            valid: true,
            ...f.documents.main,
            recovery_yaml: null,
            revision: "repaired",
            program: { schema_version: 1, name: "Repaired" },
            configuration_source: { mode: "gui", status: "ok" },
          } as T);
        }

        return original<T>(message);
      };
      await f.panel.saveYaml();
      assert.equal(save?.expected_revision, "invalid:original");
      assert.equal(save?.program, "schema_version: 1\nname: Repaired\n");
      assert.equal(f.panel.document.recovery_yaml, null);
      assert.equal(f.panel.notices(), "");
    } finally {
      f.restore();
    }
  });
}

function liveSession(): LivePreviewSession {
  return {
    id: "live",
    user_id: "owner",
    state: "ready",
    date: "2026-10-05",
    source_revision: "old-revision",
    plan_fingerprint: "frozen-fingerprint",
    cursor: 0,
    total: 2,
    simulated_time: null,
    in_flight: null,
    last_group_id: null,
    next_group: {
      id: "first",
      time: "2026-10-05T08:00:00Z",
      title: "First",
      kind: "step",
      calls: [],
    },
    detail: "Ready to start",
    paused: true,
    earlier_revision: false,
    storage_failed: false,
    outcomes: {},
  };
}

void test("reconnect retrieves the frozen day before enabling Next and leaves the draft intact", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = await fixture();
  try {
    f.panel.change(["name"], "Unsaved editor draft");
    const frozen = { ...f.preview.plans[0], simulation_date: "2026-10-05" };
    let resolve!: (result: LivePreviewResponse) => void;
    f.setLiveOverride(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    f.connectionListeners.get("disconnected")!();
    f.connectionListeners.get("ready")!();
    t.mock.timers.tick(0);
    await settle();
    assert.equal(f.panel.liveReady, false);
    await f.panel.nextLiveEvent();
    assert.equal(
      f.messages.filter((m) => m.type === "occupied/live_preview/next").length,
      0,
    );
    resolve({
      session: liveSession(),
      can_advance: true,
      plan: frozen,
      program: { schema_version: 1, name: "Frozen draft" },
    });
    await settle();
    assert.equal(f.panel.liveReady, true);
    assert.equal(f.panel.livePlan, frozen);
    assert.equal(f.panel.previewDate, "2026-10-05");
    assert.equal(f.panel.draft.name, "Unsaved editor draft");
    f.panel.tab = "preview";
    await f.panel.movePreviewDay(1);
    assert.equal(f.panel.previewDate, "2026-10-05");
  } finally {
    f.restore();
  }
});

void test("Next never advances optimistically or resends after a lost response", async () => {
  const f = await fixture();
  try {
    const session = liveSession();
    f.setLiveOverride((message) => {
      if (message.type === "occupied/live_preview/next") {
        return Promise.reject(new Error("Connection lost after dispatch"));
      }

      return Promise.resolve({
        session: { ...session, cursor: 1, last_group_id: "first" },
        can_advance: true,
        plan: f.preview.plans[0],
        program: f.panel.draft,
      });
    });
    f.panel.liveSession = session;
    f.panel.liveReady = f.panel.liveCanAdvance = true;
    const advance = f.panel.nextLiveEvent();
    assert.equal(f.panel.liveSession.cursor, 0);
    await f.panel.nextLiveEvent();
    await advance;
    assert.equal(f.panel.liveSession.cursor, 1);
    assert.equal(
      f.messages.filter((m) => m.type === "occupied/live_preview/next").length,
      1,
    );
    assert.equal(f.panel.liveReady, true);
  } finally {
    f.restore();
  }
});

void test("Stop remains available during Next and late responses cannot resume a stopped session", async () => {
  const f = await fixture();
  try {
    const session = liveSession();
    let resolve!: (value: LivePreviewResponse) => void;
    f.setLiveOverride((message) =>
      message.type === "occupied/live_preview/next"
        ? new Promise((done) => {
            resolve = done;
          })
        : Promise.resolve({
            session: { ...session, state: "stopped" },
            can_advance: true,
          }),
    );
    f.panel.liveSession = session;
    f.panel.liveReady = f.panel.liveCanAdvance = true;
    const advance = f.panel.nextLiveEvent();
    assert.equal(f.panel.liveBusy, true);
    await f.panel.stopLivePreview();
    assert.equal(f.panel.liveSession.state, "stopped");
    resolve({ session, can_advance: true });
    await advance;
    assert.equal(f.panel.liveSession.state, "stopped");
    assert.equal(f.panel.schedulingPaused, true);
  } finally {
    f.restore();
  }
});

void test("late live status from another controller cannot replace the current session", async () => {
  const f = await fixture();
  try {
    let resolve!: (value: LivePreviewResponse) => void;
    f.setLiveOverride((message) =>
      message.config_entry_id === "main"
        ? new Promise((done) => {
            resolve = done;
          })
        : Promise.resolve({ session: null, can_advance: false }),
    );
    const recovery = f.panel.recoverLivePreview();
    f.route("guest");
    await settle();
    resolve({
      session: liveSession(),
      can_advance: true,
      plan: f.preview.plans[0],
      program: { schema_version: 1, name: "Wrong controller" },
    });
    await recovery;
    assert.equal(f.panel.selectedEntry, "guest");
    assert.equal(f.panel.liveSession, null);
    assert.equal(f.panel.livePlan, undefined);
  } finally {
    f.restore();
  }
});

for (const operation of ["next", "stop"] as const) {
  void test(`unloading during live ${operation} resets controls and ignores the old response`, async () => {
    const f = await fixture();
    try {
      const session = liveSession();
      let resolve!: (value: LivePreviewResponse) => void;
      let held = true;
      f.setLiveOverride((message) =>
        held && message.type === `occupied/live_preview/${operation}`
          ? new Promise((done) => {
              resolve = done;
            })
          : Promise.resolve({
              session: { ...session, cursor: 1 },
              can_advance: true,
              plan: f.preview.plans[0],
              program: f.panel.draft,
            }),
      );
      f.panel.liveSession = session;
      f.panel.liveReady = f.panel.liveCanAdvance = true;
      const pending =
        operation === "next"
          ? f.panel.nextLiveEvent()
          : f.panel.stopLivePreview();
      assert.equal(
        operation === "next" ? f.panel.liveBusy : f.panel.liveStopping,
        true,
      );
      const update = f.subscriptions.get("occupied/instances_subscribe:all")!;
      f.instances[0].loaded = false;
      update(f.instances);
      await settle();
      assert.equal(f.panel.liveBusy, false);
      assert.equal(f.panel.liveStopping, false);
      held = false;
      f.instances[0].loaded = true;
      update(f.instances);
      await settle();
      assert.equal(f.panel.liveReady, true);
      assert.equal(f.panel.liveSession?.cursor, 1);
      resolve({ session: { ...session, cursor: 99 }, can_advance: false });
      await pending;
      assert.equal(f.panel.liveSession?.cursor, 1);
      assert.equal(f.panel.liveBusy, false);
      assert.equal(f.panel.liveStopping, false);
      await f.panel.nextLiveEvent();
      assert.equal(
        f.messages.filter((m) => m.type === "occupied/live_preview/next")
          .length,
        operation === "next" ? 2 : 1,
      );
    } finally {
      f.restore();
    }
  });
}

void test("disconnecting during an advance cannot leave recovered controls permanently busy", async () => {
  const f = await fixture();
  try {
    const session = liveSession();
    let resolve!: (result: LivePreviewResponse) => void;
    f.setLiveOverride((message) =>
      message.type === "occupied/live_preview/next"
        ? new Promise((done) => {
            resolve = done;
          })
        : Promise.resolve({
            session: { ...session, cursor: 1 },
            can_advance: true,
            plan: f.preview.plans[0],
            program: f.panel.draft,
          }),
    );
    f.panel.liveSession = session;
    f.panel.liveReady = f.panel.liveCanAdvance = true;
    const advancing = f.panel.nextLiveEvent();
    f.panel.disconnectedCallback();
    assert.equal(f.panel.liveBusy, false);
    assert.equal(f.panel.liveReady, false);
    f.panel.panel = {};
    await settle();
    assert.equal(f.panel.liveSession?.cursor, 1);
    assert.equal(f.panel.liveReady, true);
    resolve({ session: { ...session, cursor: 1 }, can_advance: true });
    await advancing;
    assert.equal(f.panel.liveBusy, false);
    assert.equal(
      f.messages.filter(
        (message) => message.type === "occupied/live_preview/next",
      ).length,
      1,
    );
  } finally {
    f.restore();
  }
});

void test("preview loads the controller program independently of editor state", async () => {
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
    assert.equal("program" in requests()[0], false);
    assert.equal("seed" in requests()[0], false);
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
    assert.equal(f.panel.previewProgram?.name, f.documents.main.program.name);
  } finally {
    f.restore();
  }
});

void test("reloading on Preview regenerates the saved program before live start is available", async () => {
  const f = await fixture();
  try {
    const cachedProgram = () => f.panel.previewProgram;
    f.preview.plan_fingerprint = "old-preview";
    f.panel.navigate("preview");
    await settle();
    const updated = { ...f.documents.main.program, name: "External program" };
    f.documents.main = {
      ...f.documents.main,
      program: updated,
      revision: "external",
    };
    let resolve!: (value: PreviewResult) => void;
    f.setPreviewOverride(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await f.panel.reloadSaved();
    const previews = f.messages.filter(
      (message) => message.type === "occupied/preview",
    );
    assert.equal(previews.length, 2);
    assert.equal("program" in previews[1], false);
    assert.equal(f.panel.preview, undefined);
    assert.equal(cachedProgram(), undefined);
    await f.panel.startLivePreview();
    assert.equal(
      f.messages.filter(
        (message) => message.type === "occupied/live_preview/start",
      ).length,
      0,
    );
    resolve({ ...f.preview, plan_fingerprint: "updated-preview" });
    await settle();
    assert.equal(cachedProgram()?.name, "External program");
    await f.panel.startLivePreview();
    const start = f.messages.find(
      (message) => message.type === "occupied/live_preview/start",
    );
    assert.equal("program" in start!, false);
    assert.equal("seed" in start!, false);
    assert.equal(start?.expected_plan_fingerprint, "updated-preview");
  } finally {
    f.restore();
  }
});

void test("a failed preview refresh cannot start the previous saved program", async () => {
  const f = await fixture();
  try {
    f.preview.plan_fingerprint = "old-preview";
    f.panel.navigate("preview");
    await settle();
    f.documents.main = {
      ...f.documents.main,
      program: { ...f.documents.main.program, name: "External program" },
      revision: "external",
    };
    f.setPreviewOverride(() =>
      Promise.reject(new Error("Preview unavailable")),
    );
    await f.panel.reloadSaved();
    await settle();
    assert.equal(f.panel.preview, undefined);
    assert.equal(f.panel.previewProgram, undefined);
    assert.match(f.panel.error, /Preview unavailable/);
    await f.panel.startLivePreview();
    assert.equal(
      f.messages.filter(
        (message) => message.type === "occupied/live_preview/start",
      ).length,
      0,
    );
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
    assert.equal(f.panel.previewProgram?.name, f.documents.main.program.name);
  } finally {
    f.restore();
  }
});

void test("preview day navigation loads adjacent dates and Today without overlapping requests", async () => {
  const f = await fixture();
  try {
    Date.now = () => Date.parse("2026-12-31T12:00:00Z");
    f.documents.main.simulation_date = "2026-12-31";
    f.panel.navigate("preview");
    await settle();
    assert.equal(f.panel.previewDate, "2026-12-31");
    const requests = () =>
      f.messages.filter((message) => message.type === "occupied/preview");
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
    await f.panel.selectPreviewDate(f.panel.today);
    assert.equal(f.panel.previewDate, "2026-12-31");
    const count = requests().length;
    await f.panel.selectPreviewDate(f.panel.today);
    assert.equal(requests().length, count);
    assert.ok(
      requests().every(
        (message) =>
          message.days === 1 && !("program" in message) && !("seed" in message),
      ),
    );
    f.route("guest");
    await settle();
    assert.equal(f.panel.previewDate, "");
    f.panel.navigate("preview");
    await settle();
    assert.equal(f.panel.previewDate, "2026-12-31");
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
    f.route("guest");
    await settle();
    assert.deepEqual(f.panel.visibleIssues(), []);
    f.route("main");
    await settle();
    assert.deepEqual(f.panel.visibleIssues(), [warning]);
    f.documents.main = { ...f.documents.main, warnings: [] };
    await f.panel.reloadSaved();
    assert.deepEqual(f.panel.visibleIssues(), []);
  } finally {
    f.restore();
  }
});

void test("navigation to another controller preserves unsaved drafts and step forms when declined", async () => {
  const f = await fixture();
  try {
    f.panel.change(["name"], "Pending name");
    f.route("guest");
    await settle();
    assert.equal(f.panel.selectedEntry, "main");
    assert.equal(f.panel.draft.name, "Pending name");
    f.panel.discardEdits();
    f.panel.stepEditor = stepEditor(f.panel.draft);
    f.panel.stepEditor.form.name = "Pending step";
    f.route("guest");
    assert.equal(f.panel.selectedEntry, "main");
    assert.equal(f.panel.stepEditor.form.name, "Pending step");
    assert.equal(f.confirmations, 2);
    f.accept();
    f.route("guest");
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
    f.route("guest");
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
    f.route("main");
    await settle();
    f.route("guest");
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

void test("a failed entry reload recovers on the next availability transition with its draft", async () => {
  const f = await fixture();
  try {
    f.panel.change(["name"], "Pending draft");
    let fail = true;
    f.setProgramOverride((entry) => {
      return fail
        ? Promise.reject(new Error("Controller is not loaded"))
        : Promise.resolve(f.documents[entry]);
    });
    const update = f.subscriptions.get("occupied/instances_subscribe:all")!;
    const available = (loaded: boolean) =>
      update(
        f.instances.map((instance) =>
          instance.config_entry_id === "main"
            ? { ...instance, loaded }
            : { ...instance },
        ),
      );
    available(false);
    await settle();
    available(true);
    await settle();
    assert.equal(f.panel.error, "Controller is not loaded");
    assert.equal(f.panel.draft.name, "Pending draft");
    available(false);
    await settle();
    fail = false;
    available(true);
    await settle();
    assert.equal(f.panel.error, "");
    assert.equal(f.panel.draft.name, "Pending draft");
    assert.equal(f.panel.dirty, true);
  } finally {
    f.restore();
  }
});

void test("recovery mode keeps the preserved program safe from GUI edits and saves", async () => {
  const f = await fixture();
  try {
    f.panel.document.recovery_yaml = "schema_version: 99\nname: Preserved\n";
    const before = structuredClone(f.panel.draft);
    f.messages.length = 0;
    f.panel.change(["name"], "Accidental replacement");
    await f.panel.save();
    assert.deepEqual(f.panel.draft, before);
    assert.equal(f.messages.length, 0);
    assert.equal(f.panel.dirty, false);
    await f.panel.exportYaml();
    assert.equal(f.panel.yaml, f.panel.document.recovery_yaml);
  } finally {
    f.restore();
  }
});

void test("discarding a preserved program requires confirmation and an explicit save flag", async () => {
  const f = await fixture();
  try {
    f.panel.document.recovery_yaml = "schema_version: 99\n";
    f.panel.revision = "invalid:preserved";
    f.messages.length = 0;
    await f.panel.discardRecovery();
    assert.equal(f.confirmations, 1);
    assert.equal(f.messages.length, 0);
    assert.equal(f.panel.recovering, true);
    const requests: Record<string, unknown>[] = [];
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      requests.push(message);

      return Promise.resolve({
        ...f.panel.document,
        valid: true,
        recovery_yaml: null,
        revision: "discarded",
      } as T);
    };
    f.accept();
    await f.panel.discardRecovery();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].discard_recovery, true);
    assert.equal(requests[0].expected_revision, "invalid:preserved");
    assert.equal(f.panel.recovering, false);
    assert.equal(f.panel.revision, "discarded");
    assert.equal(f.panel.dirty, false);
    assert.equal(f.panel.yaml, "");
    assert.equal(f.panel.tab, "steps");
  } finally {
    f.restore();
  }
});

void test("discard preserves YAML edits made while its request is in flight", async () => {
  const f = await fixture();
  try {
    f.panel.document.recovery_yaml = "schema_version: 99\n";
    await f.panel.exportYaml();
    let resolve!: (value: unknown) => void;
    f.panel._hass.callWS = <T>() =>
      new Promise<T>((done) => {
        resolve = (value) => done(value as T);
      });
    f.accept();
    const pending = f.panel.discardRecovery();
    f.panel.yaml = "schema_version: 1\nname: Newer repair\n";
    resolve({
      ...f.panel.document,
      valid: true,
      recovery_yaml: null,
      revision: "discarded",
    });
    await pending;
    assert.equal(f.panel.recovering, false);
    assert.equal(f.panel.yaml, "schema_version: 1\nname: Newer repair\n");
    assert.equal(f.panel.yamlDirty, true);
    assert.equal(f.panel.yamlRevision, "discarded");
    assert.equal(f.panel.tab, "settings");
  } finally {
    f.restore();
  }
});

void test("repairing preserved YAML unlocks the GUI without an explicit discard", async () => {
  const f = await fixture();
  try {
    f.panel.document.recovery_yaml = "schema_version: 99\n";
    await f.panel.exportYaml();
    f.panel.yaml = "schema_version: 1\nname: Repaired\n";
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      assert.equal(message.discard_recovery, undefined);
      assert.equal(message.program, f.panel.yaml);

      return Promise.resolve({
        ...f.panel.document,
        valid: true,
        recovery_yaml: null,
        revision: "repaired",
        program: { schema_version: 1, name: "Repaired" },
      } as T);
    };
    await f.panel.saveYaml();
    assert.equal(f.panel.recovering, false);
    assert.equal(f.panel.draft.name, "Repaired");
    assert.equal(f.panel.yamlDirty, false);
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
    editor.form.name = "Window on";
    editor.form.entities = ["light.basement"];
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

for (const phase of ["on", "off"] as const) {
  for (const field of ["service", "data"] as const) {
    void test(`random ${phase} action conversion displays ${field} errors after rendering`, async () => {
      const f = await fixture();
      try {
        openRandom(f.panel);
        const editor = f.panel.randomEditor!;
        const context = createRandomEditorContext(f.panel).action(phase);
        context.form.kind = "service";
        context.form.entities = ["switch.proof"];
        context.form.service = field === "service" ? "" : "switch.turn_on";
        context.form.data = field === "data" ? "{" : "{}";
        editor.errors["start.anchor"] = "retained";
        const errors = changeActionKind(context.form, "custom", () => true);
        context.setErrors(errors);
        assert.equal(editor.errors[`${phase}.${field}`], errors[field]);
        assert.equal(editor.errors["start.anchor"], "retained");
        context.changed("kind");
        const rendered = createRandomEditorContext(f.panel).action(phase);
        assert.equal(rendered.form.kind, "service");
        assert.ok(rendered.editor.errors[field]);
        assert.equal(editor.errors[field], undefined);
      } finally {
        f.restore();
      }
    });
  }
}

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
    assert.equal(f.panel.tab, "steps");
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

void test("random count ordering validates immediately when either bound changes and blocks invalid saves", async () => {
  const f = await fixture();
  try {
    openRandom(f.panel);
    const editor = f.panel.randomEditor!;
    editor.form.on.entities = ["light.a"];
    const context = createRandomEditorContext(f.panel);
    context.changed("on.entities");
    const requests: string[] = [];
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      requests.push(String(message.type));

      return Promise.resolve({} as T);
    };
    editor.form.maxCount = "2";
    context.changed("maxCount");
    assert.equal(editor.errors.maxCount, "random_count_order_error");
    assert.equal(editor.form.minCount, "3");
    assert.equal(editor.form.maxCount, "2");
    await context.submit();
    assert.deepEqual(requests, []);
    assert.equal(f.panel.randomEditor, editor);
    context.changed("maxCount");
    assert.equal(editor.errors.maxCount, "random_count_order_error");
    editor.form.maxCount = "3";
    context.changed("maxCount");
    assert.deepEqual(editor.errors, {});
    editor.form.minCount = "4";
    context.changed("minCount");
    assert.equal(editor.errors.maxCount, "random_count_order_error");
    editor.form.minCount = "3";
    context.changed("minCount");
    assert.deepEqual(editor.errors, {});
    editor.form.maxCount = "1.5";
    context.changed("maxCount");
    assert.equal(editor.errors.maxCount, "random_count_error");
    editor.form.minCount = editor.form.maxCount = "0";
    context.changed("maxCount");
    assert.deepEqual(editor.errors, {});
  } finally {
    f.restore();
  }
});

void test("editing a blank fixed count reports the visible field without revealing a hidden maximum", async () => {
  const f = await fixture();
  try {
    openRandom(f.panel);
    const editor = f.panel.randomEditor!;
    const context = createRandomEditorContext(f.panel);
    editor.form.minCount = editor.form.maxCount = "";
    context.changed("minCount");
    assert.deepEqual(editor.errors, { minCount: "random_count_error" });
    editor.form.minCount = editor.form.maxCount = "3";
    context.changed("minCount");
    assert.deepEqual(editor.errors, {});
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
    assert.equal(f.panel.tab, "steps");
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
    f.route("guest");
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

async function yamlFixture() {
  const f = await fixture();
  const requests: Record<string, unknown>[] = [];
  const original = f.panel._hass.callWS.bind(f.panel._hass);
  f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
    requests.push(structuredClone(message));
    if (message.type === "occupied/export") {
      const program = message.program as ProgramDocument["program"];

      return Promise.resolve({
        valid: true,
        issues: [],
        yaml: `schema_version: 1\nname: ${program.name}\n`,
      } as T);
    }
    if (message.type === "occupied/save") {
      if (message.expected_revision !== f.documents.main.revision) {
        return Promise.reject({
          code: "revision_conflict",
          message: "Reload first",
        });
      }
      f.documents.main = {
        ...f.documents.main,
        program: { schema_version: 1, name: "Local YAML" },
        revision: "yaml-updated",
      };

      return Promise.resolve({ valid: true, ...f.documents.main } as T);
    }

    return original<T>(message);
  };

  return {
    ...f,
    requests,
    externalSave() {
      f.documents.main = {
        ...f.documents.main,
        revision: "external-save",
        program: { ...f.documents.main.program, name: "External change" },
      };
    },
  };
}

void test("reloading a saved program keeps edited YAML tied to its original revision", async () => {
  const f = await yamlFixture();
  try {
    await f.panel.exportYaml();
    f.panel.yaml = "schema_version: 1\nname: Local YAML\n";
    f.externalSave();
    await f.panel.reloadSaved(true);
    assert.equal(f.panel.revision, "external-save");
    assert.equal(f.panel.yamlDirty, true);
    await f.panel.saveYaml();
    const save = f.requests.find((message) => message.type === "occupied/save");
    assert.equal(save?.expected_revision, "revision-main");
    assert.equal(f.documents.main.program.name, "External change");
    assert.equal(f.panel.stale, true);
    assert.equal(f.panel.yaml, "schema_version: 1\nname: Local YAML\n");
  } finally {
    f.restore();
  }
});

void test("reloading a saved program refreshes unedited YAML", async () => {
  const f = await yamlFixture();
  try {
    await f.panel.exportYaml();
    f.externalSave();
    await f.panel.reloadSaved();
    assert.equal(f.panel.yaml, "schema_version: 1\nname: External change\n");
    assert.equal(f.panel.yamlDirty, false);
    f.panel.yaml = "schema_version: 1\nname: Local YAML\n";
    await f.panel.saveYaml();
    const save = f.requests.find((message) => message.type === "occupied/save");
    assert.equal(save?.expected_revision, "external-save");
    assert.equal(f.panel.stale, false);
  } finally {
    f.restore();
  }
});

void test("unchanged YAML cannot send another save", async () => {
  const f = await yamlFixture();
  try {
    await f.panel.exportYaml();
    await f.panel.saveYaml();
    assert.equal(
      f.requests.filter((message) => message.type === "occupied/save").length,
      0,
    );
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
    assert.equal(f.panel.yamlRevision, "yaml-save");
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
    assert.equal(f.panel.yamlRevision, "new");
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

void test("direct action previews validate unsaved actions and surface execution failures without saving", async () => {
  const f = await fixture();
  try {
    startStep(f.panel);
    const form = f.panel.stepEditor!.form;
    const originalDraft = structuredClone(f.panel.draft);
    const requests: Record<string, unknown>[] = [];
    let result: unknown = {
      valid: true,
      calls: [],
      outcomes: [{ status: "dispatched" }],
    };
    const callWS = f.panel._hass.callWS;
    f.panel._hass.callWS = <T>(
      message: Record<string, unknown>,
    ): Promise<T> => {
      requests.push(message);

      return message.type === "occupied/action_preview"
        ? Promise.resolve(result as T)
        : callWS<T>(message);
    };
    await previewAction(f.panel, form);
    assert.equal(f.panel.error, f.panel.t("entities_required_error"));
    assert.equal(requests.length, 0);
    form.entities = ["light.unsaved"];
    assert.equal(await previewAction(f.panel, form), "Command completed.");
    assert.equal(f.panel.error, "");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].type, "occupied/action_preview");
    assert.equal(requests[0].execute, true);
    assert.deepEqual(requests[0].action, {
      action: "turn_on",
      entities: ["light.unsaved"],
    });
    result = { valid: false, issues: [{ message: "Unavailable entity" }] };
    assert.equal(await previewAction(f.panel, form), undefined);
    assert.equal(f.panel.error, "Unavailable entity");
    result = {
      valid: true,
      calls: [],
      outcomes: [
        { status: "dispatched" },
        { status: "uncertain", detail: "Device timeout" },
        { status: "skipped" },
      ],
    };
    assert.equal(await previewAction(f.panel, form), undefined);
    assert.match(f.panel.error, /Command timed out and may still complete/);
    assert.match(f.panel.error, /Device timeout/);
    assert.match(f.panel.error, /Skipped because an earlier command/);
    assert.equal(f.panel.busy, false);
    assert.deepEqual(f.panel.draft, originalDraft);
    assert.equal(
      requests.every((message) => message.type === "occupied/action_preview"),
      true,
    );
  } finally {
    f.restore();
  }
});

void test("pending custom action previews cannot execute after unloading or execute twice", async () => {
  const f = await fixture();
  try {
    startStep(f.panel);
    const form = f.panel.stepEditor!.form;
    form.kind = "custom";
    form.customYaml = "action: turn_on\nentities: [light.main]";
    let resolve!: (value: unknown) => void;
    const callWS = f.panel._hass.callWS;
    f.panel._hass.callWS = <T>(message: Record<string, unknown>): Promise<T> =>
      message.type === "occupied/action_yaml"
        ? new Promise((done) => {
            resolve = done as (value: unknown) => void;
          })
        : callWS<T>(message);
    const pending = previewAction(f.panel, form);
    assert.equal(f.panel.busy, true);
    assert.equal(await previewAction(f.panel, form), undefined);
    f.instances[0].loaded = false;
    f.subscriptions.get("occupied/instances_subscribe:all")!(f.instances);
    await settle();
    resolve({
      valid: true,
      actions: [{ action: "turn_on", entities: ["light.main"] }],
    });
    assert.equal(await pending, undefined);
    assert.equal(f.panel.error, "");
    assert.equal(f.panel.busy, false);
    assert.equal(
      f.messages.some((message) => message.type === "occupied/action_preview"),
      false,
    );
  } finally {
    f.restore();
  }
});

for (const kind of ["step", "random"] as const) {
  void test(`pending ${kind} submission cannot edit another controller`, async () => {
    const f = await fixture();
    try {
      let submit: () => Promise<void>;
      if (kind === "step") {
        startStep(f.panel);
        f.panel.stepEditor!.form.entities = ["light.main"];
        submit = createStepEditorContext(f.panel).submit;
      } else {
        openRandom(f.panel);
        f.panel.randomEditor!.form.on.entities = ["light.main"];
        createRandomEditorContext(f.panel).changed("on.entities");
        submit = createRandomEditorContext(f.panel).submit;
      }
      const pending = submit();
      f.accept();
      f.route("guest");
      await pending;
      await settle();
      assert.equal(f.panel.selectedEntry, "guest");
      assert.deepEqual(f.panel.draft, f.documents.guest.program);
      assert.equal(f.panel.error, "");
      assert.equal(f.panel.dirty, false);
      assert.equal(
        f.messages.some((message) =>
          ["occupied/save", "occupied/editor_validate"].includes(
            String(message.type),
          ),
        ),
        false,
      );
      // A callback retained by the old view must also stay inert.
      await submit();
      assert.deepEqual(f.panel.draft, f.documents.guest.program);
    } finally {
      f.restore();
    }
  });
}

void test("steps, random events, and preview requests use only the selected controller", async () => {
  const f = await fixture();
  try {
    for (const entry of ["main", "guest"]) {
      f.documents[entry].program.steps = {
        shared_id: {
          name: `${entry} step`,
          action: "turn_on",
          entities: [`light.${entry}`],
          timing: { absolute_time: { start: "18:00" } },
        },
      };
      f.documents[entry].program.random = {
        shared_id: {
          name: `${entry} random`,
          start: { absolute_time: { start: "18:00" } },
          end: { absolute_time: { start: "23:00" } },
          on: { action: "turn_on", entities: [`light.${entry}`] },
          off: { action: "turn_off", entities: [`light.${entry}`] },
        },
      };
    }
    await f.panel.reloadSaved();
    for (const entry of ["main", "guest", "main"]) {
      f.route(entry);
      await settle();
      assert.deepEqual(
        stepEntries(f.panel.draft).map((step) => step.name),
        [`${entry} step`],
      );
      assert.deepEqual(
        randomEntries(f.panel.draft).map((event) => event.name),
        [`${entry} random`],
      );
      assert.equal(f.panel.preview, undefined);
      assert.equal(f.panel.liveSession, null);
      f.panel.navigate("preview");
      await settle();
      const request = f.messages.findLast(
        (message) => message.type === "occupied/preview",
      )!;
      assert.equal(request.config_entry_id, entry);
      assert.equal("program" in request, false);
      assert.deepEqual(f.panel.previewProgram, f.documents[entry].program);
    }
  } finally {
    f.restore();
  }
});

for (const kind of ["step", "random"] as const) {
  void test(`late custom YAML errors from a ${kind} editor stay with its controller`, async () => {
    const f = await fixture();
    try {
      if (kind === "step") {
        startStep(f.panel);
      } else {
        openRandom(f.panel);
      }
      const form =
        kind === "step"
          ? f.panel.stepEditor!.form
          : f.panel.randomEditor!.form.on;
      form.entities = ["light.main"];
      form.kind = "custom";
      form.customYaml = "action: turn_on\nentities: [light.main]";
      let resolve!: (value: unknown) => void;
      const callWS = f.panel._hass.callWS;
      f.panel._hass.callWS = <T>(
        message: Record<string, unknown>,
      ): Promise<T> =>
        message.type === "occupied/action_yaml"
          ? new Promise((done) => {
              resolve = done as (value: unknown) => void;
            })
          : callWS<T>(message);
      const pending =
        kind === "step"
          ? createStepEditorContext(f.panel).submit()
          : createRandomEditorContext(f.panel).submit();
      assert.ok(resolve);
      f.accept();
      f.route("guest");
      await settle();
      resolve({ valid: false, issues: [{ message: "Old controller error" }] });
      await pending;
      assert.equal(f.panel.error, "");
      assert.deepEqual(f.panel.issues, []);
      assert.deepEqual(f.panel.draft, f.documents.guest.program);
      assert.equal(f.panel.stepEditor, null);
      assert.equal(f.panel.randomEditor, null);
    } finally {
      f.restore();
    }
  });
}

void test("preview Today follows HA midnight without reloading the saved document", async () => {
  const f = await fixture();
  const originalNow = Date.now;
  try {
    Date.now = () => Date.parse("2026-10-05T09:59:59Z");
    f.panel._hass.config = { time_zone: "Pacific/Kiritimati" };
    f.panel.document.simulation_date = "2026-10-04";
    f.panel.navigate("preview");
    await settle();
    const requests = () =>
      f.messages.filter((message) => message.type === "occupied/preview");
    assert.equal(requests().at(-1)?.date, "2026-10-05");
    Date.now = () => Date.parse("2026-10-05T10:00:00Z");
    assert.equal(f.panel.today, "2026-10-06");
    assert.equal(f.panel.previewDate, "2026-10-05");
    await f.panel.selectPreviewDate(f.panel.today);
    assert.equal(requests().at(-1)?.date, "2026-10-06");
    assert.equal(f.panel.document.simulation_date, "2026-10-04");
  } finally {
    Date.now = originalNow;
    f.restore();
  }
});

void test("shared service entities follow edits and clear when a phase changes kind", async () => {
  const f = await fixture();
  try {
    openRandom(f.panel);
    const form = f.panel.randomEditor!.form;
    form.on.kind = form.off.kind = "service";
    form.on.service = "remote.turn_on";
    form.off.service = "remote.turn_off";
    form.on.entities = ["remote.tv"];
    form.sameEntities = true;
    createRandomEditorContext(f.panel).changed("on.entities");
    assert.equal(form.sameEntities, true);
    assert.deepEqual(form.off.entities, ["remote.tv"]);
    form.off.kind = "scene";
    createRandomEditorContext(f.panel).changed("off.kind");
    assert.equal(form.sameEntities, false);
  } finally {
    f.restore();
  }
});

void test("entity recovery refreshes both warning stores and catalog while preserving every edit", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = await deletionFixture();
  try {
    const warning = {
      code: "entity_unavailable",
      severity: "warning",
      message: "Unresolved entity: light.test",
      model_path: ["steps", "evening", "entities"],
    };
    const error = {
      code: "input",
      severity: "error",
      message: "Keep this validation error",
    };
    f.panel.document.warnings = [warning];
    f.panel.issues = [warning, error];
    f.panel.hass = {
      ...f.panel._hass,
      states: { "light.test": { state: "unavailable", attributes: {} } },
    };
    f.panel.change(["name"], "Unsaved draft");
    f.panel.stepEditor!.form.name = "Unsaved editor";
    f.panel.openRunCondition();
    f.panel.runConditionForm!.enabled = true;
    f.panel.yaml = "# Unsaved YAML";
    f.panel.tab = "steps";
    const draft = f.panel.draft;
    const editor = f.panel.stepEditor;
    const condition = f.panel.runConditionForm;
    const version = f.panel.version;
    const callWS = f.panel._hass.callWS.bind(f.panel._hass);
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      if (message.type === "occupied/catalog") {
        return Promise.resolve({
          entities: [
            { entity_id: "light.test", name: "Recovered light", state: "off" },
          ],
          services: {},
        } as T);
      }

      return callWS<T>(message);
    };
    f.documents.main.warnings = [];
    f.panel.hass = {
      ...f.panel._hass,
      states: { "light.test": { state: "off", attributes: {} } },
    };
    t.mock.timers.tick(250);
    await settle();
    assert.deepEqual(f.panel.visibleIssues(), [error]);
    assert.equal(f.panel.catalog.entities[0].name, "Recovered light");
    assert.equal(f.panel.draft, draft);
    assert.equal(f.panel.draft.name, "Unsaved draft");
    assert.equal(f.panel.stepEditor, editor);
    assert.equal(editor!.form.name, "Unsaved editor");
    assert.equal(f.panel.runConditionForm, condition);
    assert.equal(condition!.enabled, true);
    assert.equal(f.panel.yaml, "# Unsaved YAML");
    assert.equal(f.panel.tab, "steps");
    assert.equal(f.panel.version, version);
    assert.equal(f.panel.dirty, true);
    assert.equal(f.confirmations, 0);
  } finally {
    f.restore();
  }
});

void test("same-object reconnect retries temporary discovery failure and keeps revision conflicts", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = await fixture();
  try {
    f.panel.change(["name"], "Unsaved restart draft");
    f.documents.main = {
      ...f.documents.main,
      revision: "changed-during-restart",
    };
    const callWS = f.panel._hass.callWS.bind(f.panel._hass);
    let attempts = 0;
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      return message.type === "occupied/instances" && ++attempts === 1
        ? Promise.reject(new Error("HA still starting"))
        : callWS<T>(message);
    };
    const connection = f.panel._hass.connection;
    f.connectionListeners.get("disconnected")!();
    f.connectionListeners.get("ready")!();
    t.mock.timers.tick(0);
    await settle();
    assert.equal(f.panel.error, "HA still starting");
    t.mock.timers.tick(1000);
    await settle();
    assert.equal(f.panel._hass.connection, connection);
    assert.equal(f.panel.error, "");
    assert.equal(f.panel.runtimeSubscriptionError, "");
    assert.equal(f.panel.draft.name, "Unsaved restart draft");
    assert.equal(f.panel.revision, "revision-main");
    assert.equal(f.panel.stale, true);
    assert.ok(f.subscriptions.has("occupied/subscribe:main"));
  } finally {
    f.restore();
  }
});

void test("late environment refresh cannot update another controller", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = await deletionFixture();
  let resolve!: (doc: ProgramDocument) => void;
  try {
    f.panel.stepEditor = null;
    f.panel.hass = {
      ...f.panel._hass,
      states: { "light.test": { state: "unavailable", attributes: {} } },
    };
    f.setProgramOverride(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    f.panel.hass = {
      ...f.panel._hass,
      states: { "light.test": { state: "off", attributes: {} } },
    };
    t.mock.timers.tick(250);
    await settle();
    f.setProgramOverride(undefined);
    f.route("guest");
    await settle();
    resolve({
      ...f.documents.main,
      warnings: [{ severity: "warning", message: "Old response" }],
    });
    await settle();
    assert.equal(f.panel.selectedEntry, "guest");
    assert.equal(f.panel.draft.name, "guest");
    assert.deepEqual(f.panel.visibleIssues(), []);
  } finally {
    f.restore();
  }
});

void test("staggered recovery retains genuine warnings and ignores ordinary state updates", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = await deletionFixture();
  try {
    f.panel.stepEditor = null;
    f.panel.draft.steps!.evening.entities = ["light.test", "light.other"];
    f.documents.main.program.steps!.evening.entities = [
      "light.test",
      "light.other",
    ];
    const states = {
      "light.test": { state: "unknown", attributes: {} },
      "light.other": { state: "unavailable", attributes: {} },
    };
    f.panel.hass = { ...f.panel._hass, states: structuredClone(states) };
    const callWS = f.panel._hass.callWS.bind(f.panel._hass);
    let refreshes = 0;
    f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
      const warnings = Object.entries(states)
        .filter(([, value]) => ["unknown", "unavailable"].includes(value.state))
        .map(([entity]) => ({
          code: "entity_unavailable",
          severity: "warning",
          message: `Unresolved entity: ${entity}`,
          model_path: ["steps", "evening", "entities"],
        }));
      if (message.type === "occupied/program") {
        refreshes++;

        return Promise.resolve({ ...f.documents.main, warnings } as T);
      }

      return message.type === "occupied/editor_validate"
        ? Promise.resolve({ valid: true, issues: warnings } as T)
        : callWS<T>(message);
    };
    states["light.test"].state = "off";
    f.panel.hass = { ...f.panel._hass, states: structuredClone(states) };
    t.mock.timers.tick(250);
    await settle();
    assert.deepEqual(
      f.panel.visibleIssues().map((issue) => issue.message),
      ["Unresolved entity: light.other"],
    );
    assert.equal(refreshes, 1);
    states["light.test"].state = "on";
    f.panel.hass = { ...f.panel._hass, states: structuredClone(states) };
    t.mock.timers.tick(1000);
    await settle();
    assert.equal(refreshes, 1);
    states["light.other"].state = "off";
    f.panel.hass = { ...f.panel._hass, states: structuredClone(states) };
    t.mock.timers.tick(250);
    await settle();
    assert.deepEqual(f.panel.visibleIssues(), []);
    assert.equal(refreshes, 2);
  } finally {
    f.restore();
  }
});

for (const failure of [
  "occupied/program",
  "occupied/catalog",
  "occupied/subscribe",
  "occupied/instances_subscribe",
]) {
  void test(`reconnect automatically recovers a temporary ${failure} failure`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const f = await fixture();
    try {
      f.panel.change(["name"], "Keep this draft");
      let failed = false;
      const callWS = f.panel._hass.callWS.bind(f.panel._hass);
      const subscribe = f.panel._hass.connection.subscribeMessage.bind(
        f.panel._hass.connection,
      );
      f.panel._hass.callWS = <T>(message: Record<string, unknown>) => {
        if (message.type === failure && !failed) {
          failed = true;

          return Promise.reject(new Error("Still starting"));
        }

        return callWS<T>(message);
      };
      f.panel._hass.connection.subscribeMessage = <T>(
        callback: (value: T) => void,
        message: Record<string, unknown>,
      ) => {
        if (message.type === failure && !failed) {
          failed = true;

          return Promise.reject(new Error("Still starting"));
        }

        return subscribe(callback, message);
      };
      f.connectionListeners.get("ready")!();
      t.mock.timers.tick(0);
      await settle();
      t.mock.timers.tick(1000);
      await settle();
      assert.equal(failed, true);
      assert.equal(f.panel.error, "");
      assert.equal(f.panel.runtimeSubscriptionError, "");
      assert.equal(f.panel.draft.name, "Keep this draft");
      assert.ok(f.subscriptions.has("occupied/subscribe:main"));
      assert.ok(f.subscriptions.has("occupied/instances_subscribe:all"));
    } finally {
      f.restore();
    }
  });
}

void test("initial discovery recovery keeps retrying if the subsequent environment refresh fails", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = await fixture();
  const { OccupiedPanel, hasProgram } =
    await import("@occupied/occupied-panel.js");
  const panel = new OccupiedPanel();
  try {
    f.panel.disconnectedCallback();
    const callWS = f.panel._hass.callWS.bind(f.panel._hass);
    let discoveries = 0;
    let catalogs = 0;
    panel.hass = {
      ...f.panel._hass,
      callWS: <T>(message: Record<string, unknown>) => {
        if (message.type === "occupied/instances" && ++discoveries === 1) {
          return Promise.reject(new Error("HA restarting"));
        }

        return message.type === "occupied/catalog" && ++catalogs === 2
          ? Promise.reject(new Error("Environment still starting"))
          : callWS<T>(message);
      },
    };
    panel.panel = {};
    await settle();
    assert.equal(panel.error, "HA restarting");
    t.mock.timers.tick(1000);
    await settle();
    assert.ok(hasProgram(panel));
    assert.equal(catalogs, 2);
    t.mock.timers.tick(1000);
    await settle();
    assert.equal(catalogs, 3);
    assert.equal(panel.error, "");
  } finally {
    panel.disconnectedCallback();
    f.restore();
  }
});

void test("startup waits for the started event before loading and validating", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = await fixture("STARTING");
  try {
    assert.equal(f.panel.starting, true);
    assert.deepEqual(
      f.messages.map((message) => message.type),
      ["get_config"],
    );
    assert.deepEqual(f.panel.visibleIssues(), []);
    const started = f.subscriptions.get("subscribe_events:all");
    assert.ok(started);
    started({ event_type: "homeassistant_started" });
    t.mock.timers.tick(0);
    await settle();
    await settle();
    assert.equal(f.panel.starting, false);
    assert.ok(f.panel.draft);
    assert.ok(
      f.messages.some((message) => message.type === "occupied/editor_validate"),
    );
    assert.ok(f.disposed.includes("subscribe_events:all"));
  } finally {
    f.restore();
  }
});

void test("startup rechecks config after subscribing in case the started event was missed", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = await fixture("STARTING", "RUNNING");
  try {
    t.mock.timers.tick(0);
    await settle();
    await settle();
    assert.equal(f.panel.starting, false);
    assert.ok(f.panel.draft);
    assert.ok(
      f.messages.some((message) => message.type === "occupied/editor_validate"),
    );
    assert.ok(f.disposed.includes("subscribe_events:all"));
  } finally {
    f.restore();
  }
});

void test("switching between random events and steps protects unsaved editors in both directions", async () => {
  const f = await fixture();
  try {
    openRandom(f.panel);
    const random = f.panel.randomEditor!;
    random.form.name = "Unsaved random event";
    startStep(f.panel);
    assert.equal(f.panel.randomEditor, random);
    assert.equal(f.panel.stepEditor, null);
    assert.ok(f.panel.pendingStepExit);
    f.panel.cancelStepExit();
    assert.equal(f.panel.randomEditor, random);
    openStep(f.panel, {
      id: "existing",
      name: "Existing step",
      path: ["steps", "existing"],
      timing: {},
      days: [],
      action: "turn_on",
    });
    assert.equal(f.panel.randomEditor, random);
    f.panel.confirmStepExit();
    assert.equal(f.panel.randomEditor, null);
    const step = f.panel.stepEditor!;
    step.form.name = "Unsaved step";
    openRandom(f.panel);
    assert.equal(f.panel.stepEditor, step);
    assert.equal(f.panel.randomEditor, null);
    assert.ok(f.panel.pendingStepExit);
    f.panel.confirmStepExit();
    assert.equal(f.panel.stepEditor, null);
    assert.ok(f.panel.randomEditor);
    assert.equal(f.panel.tab, "steps");
  } finally {
    f.restore();
  }
});
