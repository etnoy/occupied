import type {
  Program,
  Catalog,
  RuntimeSnapshot,
  ProgramDocument,
  StepEditor,
  StepForm,
  Path,
  Issue,
  HomeAssistant,
  HaSelector,
  HaGenericPicker,
  WebSocketResponses,
  PreviewResult,
  Tab,
  InstanceDocument,
  RandomEditorState,
  RandomForm,
  LivePreviewSession,
  Plan,
} from "./lib/types.js";
import { errorMessage } from "./lib/utils/util.js";
import { copy, set } from "./lib/models/model.js";
import styles from "./app.css";
import { translator } from "./lib/i18n/translations.js";
import { mount, unmount, flushSync } from "svelte";
import { writable } from "svelte/store";
import App from "./App.svelte";
import { PreviewController } from "./lib/controllers/preview-controller.js";
import { PanelSubscription } from "./lib/services/subscription.js";
import { loadHaControls } from "./lib/services/ha-controls.js";
import { hasStepChanges } from "./lib/models/step-model.js";
import { hasRandomChanges } from "./lib/models/random-model.js";
import { liveRunning, mergeLiveSession } from "./lib/utils/live-preview.js";

type PanelConfig = { config?: { config_entry_id?: string } };

export class OccupiedPanel extends HTMLElement {
  declare shadowRoot: ShadowRoot;

  draft!: Program;
  saved!: Program;
  document!: ProgramDocument;
  catalog: Catalog = { entities: [], services: {} };
  revision = "";
  stale = false;
  dirty = false;

  // Draft edits bump version; validatedVersion records the last valid one.
  version = 0;
  validatedVersion = -1;

  issues: Issue[] = [];
  error = "";
  busy = false;

  // Incremented on reload/disconnect so late responses are discarded.
  epoch = 0;

  // View state
  tab: Tab = "steps";
  t = translator("en");
  stepEditor: StepEditor | null = null;
  randomEditor: RandomEditorState | null = null;

  get activeEditor() {
    return this.stepEditor || this.randomEditor;
  }

  get hasEditorChanges() {
    if (this.stepEditor) {
      return hasStepChanges(this.stepEditor);
    }

    return this.randomEditor ? hasRandomChanges(this.randomEditor) : false;
  }

  pendingStepExit: (() => void) | null = null;
  selectedStep: string | null = null;
  preview?: PreviewResult;
  previewProgram!: Program;
  previewDate = "";
  liveSession: LivePreviewSession | null = null;
  livePlan?: Plan;
  liveProgram?: Program;
  liveVisible = false;
  liveReady = false;
  liveBusy = false;
  liveStopping = false;
  liveCanAdvance = false;
  schedulingPaused = false;

  get liveRunning() {
    return liveRunning(this.liveSession);
  }

  yaml = "";
  yamlSaved = "";

  get yamlDirty() {
    return this.yaml !== this.yamlSaved;
  }

  _hass!: HomeAssistant;
  _loading = false;
  instances: InstanceDocument[] = [];
  selectedEntry: string | null = null;
  private _instancesReady = false;
  private _instancesEpoch = 0;
  private _panel?: PanelConfig;
  private _loadedEntry: string | null = null;
  private updates = writable(0);
  private updateRevision = 0;
  private component?: ReturnType<typeof mount>;
  private readonly instanceSubscription = new PanelSubscription<
    InstanceDocument[]
  >(
    () => this.isConnected,
    (error) => this.fail(error),
  );
  private readonly runtimeSubscription = new PanelSubscription<RuntimeSnapshot>(
    () => this.isConnected,
    (error) => this.fail(error),
  );
  private readonly previewController = new PreviewController(
    this,
    () => this._loadedEntry,
  );

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set hass(value: HomeAssistant) {
    const localeChanged =
      this._hass?.locale?.language !== value?.locale?.language ||
      this._hass?.locale?.time_format !== value?.locale?.time_format;
    const changed = this._hass?.connection !== value?.connection;
    this._hass = value;
    this.t = translator(value?.language);

    for (const selector of this.shadowRoot.querySelectorAll<
      HaSelector | HaGenericPicker
    >("ha-selector,ha-generic-picker")) {
      selector.hass = value;
    }
    if (localeChanged) {
      this.flush();
    }
    if (changed) {
      this._disposeSubscription();
      this._disposeInstances();
      this._instancesReady = false;
      void this._subscribe();
    }
    void this._load();
  }

  set panel(value: PanelConfig) {
    this._panel = value;
    void this._load();
  }

  set narrow(value: boolean) {
    const narrow = !!value;
    if (this.hasAttribute("narrow") === narrow) {
      return;
    }
    this.toggleAttribute("narrow", narrow);
    this.flush();
  }

  set route(_value: unknown) {
    void this._load();
  }

  get selectedInstance() {
    return this.instances.find(
      (item) => item.config_entry_id === this.selectedEntry,
    );
  }

  connectedCallback() {
    if (!this.component) {
      const style = document.createElement("style");
      style.textContent = styles;
      this.shadowRoot.append(style);
      this.component = mount(App, {
        target: this.shadowRoot,
        props: { panel: this, updates: this.updates },
      });
      this.flush();
    }
    void this._load();
    window.addEventListener("beforeunload", this._beforeUnload);
    globalThis.addEventListener("location-changed", this._locationChanged);
    globalThis.addEventListener("popstate", this._locationChanged);
    document.addEventListener(
      "visibilitychange",
      this.previewController.visibilityChanged,
    );
  }

  disconnectedCallback() {
    if (this.component) {
      void unmount(this.component);
      this.component = undefined;
    }
    this.shadowRoot.replaceChildren();
    this.epoch++;
    this.busy = this.liveBusy = this.liveStopping = false;
    this._loadedEntry = null;
    this._loading = false;
    this._disposeSubscription();
    this._disposeInstances();
    this._instancesReady = false;
    window.removeEventListener("beforeunload", this._beforeUnload);
    globalThis.removeEventListener("location-changed", this._locationChanged);
    globalThis.removeEventListener("popstate", this._locationChanged);
    document.removeEventListener(
      "visibilitychange",
      this.previewController.visibilityChanged,
    );
  }

  private _locationChanged = () => void this._load();
  private _beforeUnload = (event: BeforeUnloadEvent) => {
    if (!(this.dirty || this.yamlDirty || this.hasEditorChanges)) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  };

  private _disposeInstances() {
    this._instancesEpoch++;
    this.instanceSubscription.dispose();
  }

  private _subscribeInstances() {
    return this.instanceSubscription.subscribe(
      this._hass.connection,
      { type: "occupied/instances_subscribe" },
      (instances) => {
        this.instances = instances;
        this.flush();
        if (!this.selectedInstance?.loaded && this._loadedEntry) {
          this.epoch++;
          this._loadedEntry = null;
          this._loading = this.busy = false;
          this._disposeSubscription();
        }
        void this._load();
      },
    );
  }

  private _writeSelection(entry: string, replace = false) {
    const url = new URL(location.href);
    url.searchParams.set("config_entry", entry);
    history[replace ? "replaceState" : "pushState"](null, "", url);
    globalThis.dispatchEvent(new Event("location-changed"));
  }

  selectInstance(entry: string) {
    if (entry === this.selectedEntry || this.busy) {
      return;
    }
    if (!this._canSwitchInstance()) {
      this.flush();

      return;
    }
    this._resetInstance(entry);
    this._writeSelection(entry);
    void this._load();
  }

  private _canSwitchInstance() {
    return (
      !(this.dirty || this.yamlDirty || this.hasEditorChanges) ||
      globalThis.confirm(this.t("instance_switch_confirm"))
    );
  }

  private _resetInstance(entry: string) {
    this.epoch++;
    this._disposeSubscription();
    this._loadedEntry = null;
    this.selectedEntry = entry;
    Object.assign(this, {
      draft: undefined,
      saved: undefined,
      document: undefined,
      catalog: { entities: [], services: {} },
      revision: "",
      stale: false,
      dirty: false,
      version: 0,
      validatedVersion: -1,
      issues: [],
      error: "",
      busy: false,
      _loading: false,
      tab: "steps",
      stepEditor: null,
      randomEditor: null,
      pendingStepExit: null,
      selectedStep: null,
      preview: undefined,
      previewProgram: undefined,
      previewDate: "",
      liveSession: null,
      livePlan: undefined,
      liveProgram: undefined,
      liveVisible: false,
      liveReady: false,
      liveBusy: false,
      liveStopping: false,
      liveCanAdvance: false,
      schedulingPaused: false,
      yaml: "",
      yamlSaved: "",
    });
    this.renderView();
  }

  ws<K extends keyof WebSocketResponses>(
    type: K,
    data: Record<string, unknown> = {},
  ): Promise<WebSocketResponses[K]> {
    return this._hass.callWS<WebSocketResponses[K]>({
      type: `occupied/${type}`,
      config_entry_id: this._loadedEntry,
      ...data,
    });
  }

  private _disposeSubscription() {
    this.previewController.disconnect();
    this.runtimeSubscription.dispose();
  }

  private async _subscribe() {
    if (
      !this.isConnected ||
      !this._loadedEntry ||
      !this._hass?.connection ||
      this.runtimeSubscription.active
    ) {
      return;
    }
    this.previewController.connect(this._hass.connection);
    await this.runtimeSubscription.subscribe(
      this._hass.connection,
      { type: "occupied/subscribe", config_entry_id: this._loadedEntry },
      (snapshot) => this._onSnapshot(snapshot),
      () => this.recoverLivePreview(),
    );
  }

  private _onSnapshot(snapshot: RuntimeSnapshot) {
    if (snapshot.loaded === false) {
      this.previewController.invalidate();
    }
    this.schedulingPaused = snapshot.paused ?? this.schedulingPaused;
    if (snapshot.live_preview !== undefined) {
      const changedSession = this.liveSession?.id !== snapshot.live_preview?.id;
      this.liveSession = mergeLiveSession(
        this.liveSession,
        snapshot.live_preview,
      );
      if (changedSession) {
        this.liveReady = false;
        void this.recoverLivePreview();
      }
    }
    if (snapshot.configuration_source && this.document) {
      this.document.configuration_source = snapshot.configuration_source;
      this.document.source = snapshot.configuration_source.mode;
    }
    this.stale = !!(
      snapshot.source_revision &&
      this.revision &&
      snapshot.source_revision !== this.revision
    );
    this.flush();
    if (this.stale && !this.dirty && !this.busy && !this.activeEditor) {
      void this.reloadSaved();
    }
  }

  private async _load() {
    if (!this.isConnected || !this._hass || !this._panel) {
      return;
    }
    if (!this._instancesReady) {
      const epoch = this._instancesEpoch;
      try {
        const instances = await this._hass.callWS<InstanceDocument[]>({
          type: "occupied/instances",
        });
        if (epoch !== this._instancesEpoch || !this.isConnected) {
          return;
        }
        this.instances = instances;
        this._instancesReady = true;
        void this._subscribeInstances();
      } catch (error) {
        if (epoch === this._instancesEpoch) {
          this.fail(error);
        }

        return;
      }
    }
    const entry =
      new URLSearchParams(location.search).get("config_entry") ||
      this._panel.config?.config_entry_id ||
      this.selectedEntry ||
      this.instances.find((item) => item.loaded)?.config_entry_id ||
      this.instances[0]?.config_entry_id;
    if (!entry) {
      this.flush();

      return;
    }
    if (entry !== this.selectedEntry) {
      if (this.busy || !this._canSwitchInstance()) {
        if (this.selectedEntry) {
          this._writeSelection(this.selectedEntry, true);
        }

        return;
      }
      this._resetInstance(entry);
    }
    if (
      !this.selectedInstance?.loaded ||
      this._loading ||
      this._loadedEntry === entry
    ) {
      return;
    }
    this._loading = true;
    this.flush();
    this._disposeSubscription();
    const epoch = ++this.epoch;
    this._loadedEntry = entry;
    try {
      const [doc, catalog] = await Promise.all([
        this.ws("program"),
        this.ws("catalog"),
        loadHaControls(),
      ]);
      if (epoch !== this.epoch) {
        return;
      }
      if (this.draft && (this.dirty || this.yamlDirty || this.activeEditor)) {
        this.document = doc;
        this.saved = doc.program;
        this.stale = doc.revision !== this.revision;
      } else {
        this.adopt(doc);
        this.resetDraft();
      }
      this.catalog = catalog;
      this.error = "";
      this.renderView();
      void this._subscribe();
    } catch (error) {
      if (epoch === this.epoch) {
        this._loadedEntry = null;
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this._loading = false;
        this.flush();
      }
    }
  }

  flush() {
    if (this.component) {
      flushSync(() => this.updates.set(++this.updateRevision));
    }
  }

  renderView() {
    if (this.tab === "preview") {
      void this.previewController.loadPreview();
    }
    this.flush();
  }

  navigate(tab: Tab) {
    if (this.activeEditor) {
      this.requestStepExit(() => {
        this.navigate(tab);
      });

      return;
    }
    if (this.tab === tab) {
      return;
    }
    if (this.yamlDirty) {
      if (!globalThis.confirm(this.t("view_switch_confirm"))) {
        return;
      }
      this.discardEdits(false);
    }
    this.tab = tab;
    if (tab === "preview") {
      void this.recoverLivePreview();
    }
    this.renderView();
  }

  requestStepExit(action: () => void) {
    const editor = this.activeEditor;
    if (!editor) {
      action();

      return;
    }
    if (this.hasEditorChanges) {
      this.pendingStepExit = action;
      this.flush();

      return;
    }
    this.finishStepExit(action);
  }

  cancelStepExit() {
    this.pendingStepExit = null;
    this.flush();
  }

  confirmStepExit() {
    const action = this.pendingStepExit;
    if (action) {
      this.finishStepExit(action);
    }
  }

  private finishStepExit(action: () => void) {
    this.pendingStepExit = null;
    this.stepEditor = null;
    this.randomEditor = null;
    this.selectedStep = null;
    this.error = "";
    this.issues = [];
    this.version++;
    action();
    this.renderView();
  }

  retry() {
    this._instancesReady = false;
    void this._load();
  }

  notices() {
    const t = this.t;
    const programNotice = this.stale ? t("draft_revision_conflict_hint") : "";

    return [
      programNotice,
      this.document?.source === "file" ? t("managed_file_export_hint") : "",
      this.document?.configuration_source?.status === "error"
        ? t("managed_file_error")
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  private adopt(doc: ProgramDocument) {
    this.document = doc;
    this.saved = doc.program;
    this.revision = doc.revision;
    this.stale = false;
  }

  private resetDraft() {
    this.draft = copy(this.saved);
    this.dirty = !!this.document.needs_apply;
    this.version++;
    this.validatedVersion = -1;
    this.issues = [];
  }

  discardEdits(render = true) {
    this.resetDraft();
    this.yaml = this.yamlSaved;
    this.error = "";
    if (render) {
      this.renderView();
    }
  }

  discardYaml() {
    this.yaml = this.yamlSaved;
    this.error = "";
    this.issues = [];
    this.flush();
  }

  change(path: Path, value: unknown, rerender = false) {
    if (path.length === 0) {
      this.draft = value as Program;
    } else {
      set(this.draft, path, value);
    }
    this.edited(rerender);
  }

  edited(rerender = false) {
    this.version++;
    this.dirty = true;
    this.validatedVersion = -1;
    if (rerender) {
      this.renderView();
    } else {
      this.flush();
    }
  }

  fail(error: unknown) {
    this.error = this.t(errorMessage(error));
    this.flush();
  }

  attempt(action: () => unknown) {
    try {
      action();
    } catch (error) {
      this.fail(error);
    }
  }

  async run<T>(action: (epoch: number) => Promise<T>): Promise<T | undefined> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.error = "";
    this.flush();
    const epoch = this.epoch;
    try {
      return await action(epoch);
    } catch (error) {
      if (epoch === this.epoch) {
        if (isRevisionConflict(error)) {
          this.stale = true;
        }
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this.busy = false;
        this.flush();
      }
    }
  }

  showIssues(result: { valid?: boolean; issues?: Issue[] }) {
    this.issues = result.issues || [];
    this.flush();
    if (result.valid === false && this.issues.length === 0) {
      this.fail(this.t("preview_infeasible_error"));
    }
  }

  visibleIssues() {
    const issues = new Map<string, Issue>();
    for (const issue of [...(this.document?.warnings || []), ...this.issues]) {
      const key = JSON.stringify([
        issue.severity,
        issue.code,
        issue.model_path || issue.path || "$",
        issue.message,
      ]);
      issues.set(key, issue);
    }

    return [...issues.values()];
  }

  focusIssue(issue: Issue) {
    const editor = this.activeEditor;
    if (!editor) {
      return;
    }
    const path = issue.model_path || [],
      prefix = editor.candidatePath || [];
    if (prefix.length === 0 || prefix.some((key, i) => path[i] !== key)) {
      this.fail(this.t("step_edit_in_progress_hint"));

      return;
    }
    const field = this.randomEditor
      ? randomEditorField(path.slice(prefix.length), this.randomEditor.form)
      : editorField(path.slice(prefix.length), this.stepEditor!.form);
    editor.errors[field] = issue.message;
    this.renderView();
    this.shadowRoot
      .querySelector<HTMLElement>(`[data-builder-field="${CSS.escape(field)}"]`)
      ?.focus();
  }

  validate() {
    const version = this.version,
      draft = copy(this.draft);

    return this.run(async (epoch) => {
      const result = await this.ws("editor_validate", { program: draft });
      if (epoch !== this.epoch || version !== this.version) {
        return;
      }
      this.showIssues(result);
      if (result.valid) {
        this.validatedVersion = version;
      }
    });
  }

  save(candidate?: Program) {
    if (this.document?.source === "file" || this.stale) {
      return;
    }
    const version = this.version,
      draft = copy(candidate || this.draft),
      expected = this.revision,
      editor = this.activeEditor,
      submittedForm = editor ? copy(editor.form) : null;

    return this.run(async (epoch) => {
      const validation = await this.ws("editor_validate", { program: draft });
      if (epoch !== this.epoch) {
        return;
      }
      if (version !== this.version) {
        this.fail(this.t("save_newer_edits_hint"));

        return;
      }
      this.showIssues(validation);
      if (!validation.valid) {
        if (editor && this.issues.length > 0) {
          this.focusIssue(
            this.issues.find((i) => i.severity !== "warning") || this.issues[0],
          );
        }

        return;
      }
      this.validatedVersion = version;
      const result = await this.ws("save", {
        program: draft,
        expected_revision: expected,
      });
      if (epoch !== this.epoch) {
        return;
      }
      if (!result.valid) {
        return this.showIssues(result);
      }
      this.adopt({ ...this.document, ...result, needs_apply: false });
      if (editor && this.activeEditor === editor) {
        this.draft = copy(result.program);
        this.dirty = false;
        if (this.stepEditor) {
          this.selectedStep = editor.id;
        }
        editor.existing = true;
        if (this.randomEditor) {
          this.randomEditor.original = submittedForm as RandomForm;
        } else {
          this.stepEditor!.original = submittedForm as StepForm;
        }
        if (version !== this.version) {
          this.fail(this.t("saved_newer_edits_hint"));

          return;
        }
        this.stepEditor = null;
        this.randomEditor = null;
      }
      if (version === this.version) {
        this.draft = copy(result.program);
        this.dirty = false;
        this.renderView();
        if (editor) {
          this.shadowRoot
            .getElementById(
              `${this.tab === "random" ? "random" : "step"}-card-${editor.id}`,
            )
            ?.focus({ preventScroll: true });
        }
      } else {
        this.dirty = true;
      }
    });
  }

  async reloadSaved(discard = false) {
    if (
      this.busy ||
      ((this.dirty || this.yamlDirty || this.activeEditor) && !discard)
    ) {
      return;
    }
    const version = this.version;

    return this.run(async (epoch) => {
      const doc = await this.ws("program");
      if (epoch !== this.epoch || version !== this.version) {
        return;
      }
      this.adopt(doc);
      this.resetDraft();
      this.stepEditor = null;
      this.randomEditor = null;
      this.renderView();
    });
  }

  movePreviewDay(days: number) {
    return this.previewController.movePreviewDay(days);
  }

  selectPreviewDate(date: string) {
    return this.previewController.selectPreviewDate(date);
  }

  recoverLivePreview() {
    return this.previewController.recoverLivePreview();
  }

  startLivePreview() {
    return this.previewController.startLivePreview();
  }

  nextLiveEvent() {
    return this.previewController.nextLiveEvent();
  }

  stopLivePreview() {
    return this.previewController.stopLivePreview();
  }

  resumeScheduling() {
    return this.previewController.resumeScheduling();
  }

  refreshPreviewSchedule() {
    return this.previewController.refreshPreviewSchedule();
  }

  saveYaml() {
    if (this.document?.source === "file" || this.stale) {
      return;
    }
    const yaml = this.yaml,
      version = this.version,
      expected = this.revision;

    return this.run(async (epoch) => {
      const result = await this.ws("save", {
        program: yaml,
        expected_revision: expected,
      });
      if (epoch !== this.epoch) {
        return;
      }
      if (!result.valid) {
        return this.showIssues(result);
      }
      this.adopt({ ...this.document, ...result, needs_apply: false });
      this.yamlSaved = yaml;
      this.issues = [];
      if (version === this.version) {
        this.draft = copy(result.program);
        this.dirty = false;
        this.version++;
        this.validatedVersion = this.version;
      }
      this.flush();
    });
  }

  exportYaml() {
    if (this.yamlDirty) {
      return;
    }
    const yaml = this.yaml;

    return this.run(async (epoch) => {
      const result = await this.ws("export", { program: copy(this.draft) });
      if (epoch !== this.epoch) {
        return;
      }
      this.showIssues(result);
      if (result.valid && this.yaml === yaml) {
        this.yaml = result.yaml;
        this.yamlSaved = result.yaml;
      }
    });
  }
}

function isRevisionConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "revision_conflict"
  );
}

function editorField(tail: Path, form: Pick<StepForm, "kind">): string {
  if (
    form.kind === "custom" &&
    ["actions", "action", "entities", "data"].includes(String(tail[0]))
  ) {
    return "customYaml";
  }
  const has = (key: string) => tail.includes(key),
    head = tail[0];
  if (["name", "days", "entities", "data"].includes(String(head))) {
    return String(head);
  }
  if (head === "action") {
    return form.kind === "service" ? "service" : "kind";
  }
  if (head === "timing") {
    if (has("absolute_time")) {
      return has("end") ? "end" : "start";
    }
    if (has("start_offset")) {
      return "startOffset";
    }
    if (has("end_offset")) {
      return "endOffset";
    }

    return "anchor";
  }

  return "name";
}

function randomEditorField(tail: Path, form: RandomForm): string {
  const head = tail[0];
  if (head === "start" || head === "end") {
    if (tail[1] === "duration") {
      return `${head}.${tail[2] === "max" ? "maxDuration" : "minDuration"}`;
    }
    if (tail.length === 1) {
      let field = "anchor";
      if (form[head].mode === "absolute") {
        field = "start";
      } else if (form[head].mode === "duration") {
        field = "minDuration";
      }

      return `${head}.${field}`;
    }

    return `${head}.${editorField(["timing", ...tail.slice(1)], form.on)}`;
  }
  if (head === "on" || head === "off") {
    return `${head}.${editorField(tail.slice(1), form[head])}`;
  }
  if (head === "count") {
    return tail[1] === "max" ? "maxCount" : "minCount";
  }

  return (
    (
      {
        min_duration: "minDuration",
        max_duration: "maxDuration",
        days: "days",
      } as Record<string, string>
    )[String(head)] || "name"
  );
}

if (!customElements.get("occupied-panel")) {
  customElements.define("occupied-panel", OccupiedPanel);
}
