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
  TimelineDocument,
  PreviewResult,
  JsonObject,
  Tab,
  InstanceDocument,
} from "./types.js";
import { errorMessage, progress } from "./util.js";
import { copy, set } from "./model.js";
import { styles } from "./styles.js";
import { translator } from "./translations.js";
import { mount, unmount, flushSync } from "svelte";
import { writable } from "svelte/store";
import App from "./App.svelte";
import { loadHaControls } from "./ha-controls.js";
import { hasStepChanges } from "./step-model.js";

type PanelConfig = { config?: { config_entry_id?: string } };

export class OccupiedPanel extends HTMLElement {
  declare shadowRoot: ShadowRoot;

  // Program state
  draft!: Program;
  saved!: Program;
  document!: ProgramDocument;
  status!: RuntimeSnapshot;
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
  tab: Tab = "routines";
  t = translator("en");
  stepEditor: StepEditor | null = null;
  pendingStepExit: (() => void) | null = null;
  selectedStep: string | null = null;
  actual?: TimelineDocument;
  timelineDate = "";
  preview?: PreviewResult;
  previewProgram!: Program;
  previewVersion?: number;
  previewSettings: { date: string; days: number; seed: string; at?: string } = {
    date: "",
    days: 1,
    seed: "preview-1",
    at: "",
  };
  sourcePath?: string;
  yaml = "";
  includeSensitive = false;
  diagnostics?: JsonObject;

  _hass!: HomeAssistant;
  _loading = false;
  instances: InstanceDocument[] = [];
  selectedEntry: string | null = null;
  private _instancesReady = false;
  private _instancesEpoch = 0;
  private _instancesUnsubscribe: (() => void) | null = null;
  private _instancesSubscribing = false;
  private _panel?: PanelConfig;
  private _loadedEntry: string | null = null;
  private _timer?: ReturnType<typeof setInterval>;
  private _timelineTimer: ReturnType<typeof setTimeout> | null = null;
  private _timelineLoading = false;
  private _subscriptionEpoch = 0;
  private _unsubscribe: (() => void) | null = null;
  private _subscribing = false;
  viewRevision = 0;
  private updates = writable(0);
  private updateRevision = 0;
  private component?: ReturnType<typeof mount>;

  constructor() {
    super();
    // HA may assign properties before connecting the panel.
    this.attachShadow({ mode: "open" });
  }

  set hass(value: HomeAssistant) {
    const localeChanged =
      this._hass?.locale?.language !== value?.locale?.language ||
      this._hass?.locale?.time_format !== value?.locale?.time_format;
    const changed = this._hass?.connection !== value?.connection;
    this._hass = value;
    this.t = translator(value?.language);
    // Stable views capture hass when built; keep their HA elements current.
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
    this._timer = setInterval(() => {
      for (const bar of this.shadowRoot.querySelectorAll<HTMLProgressElement>(
        "progress[data-start]",
      )) {
        bar.value = progress(bar.dataset.start!, bar.dataset.deadline!);
      }
    }, 1000);
  }
  disconnectedCallback() {
    if (this.component) {
      void unmount(this.component);
      this.component = undefined;
    }
    this.shadowRoot.replaceChildren();
    this.epoch++;
    this._loadedEntry = null;
    this._loading = false;
    this._disposeSubscription();
    this._disposeInstances();
    this._instancesReady = false;
    clearInterval(this._timer);
    if (this._timelineTimer) {
      clearTimeout(this._timelineTimer);
    }
    window.removeEventListener("beforeunload", this._beforeUnload);
    globalThis.removeEventListener("location-changed", this._locationChanged);
    globalThis.removeEventListener("popstate", this._locationChanged);
  }
  private _locationChanged = () => void this._load();
  private _beforeUnload = (event: BeforeUnloadEvent) => {
    if (!(this.dirty || this.stepEditor?.changed)) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  };

  // --- Backend connection -------------------------------------------------

  private _disposeInstances() {
    this._instancesEpoch++;
    this._instancesUnsubscribe?.();
    this._instancesUnsubscribe = null;
    this._instancesSubscribing = false;
  }
  private async _subscribeInstances() {
    if (
      this._instancesUnsubscribe ||
      this._instancesSubscribing ||
      !this.isConnected
    ) {
      return;
    }
    this._instancesSubscribing = true;
    const epoch = this._instancesEpoch;
    try {
      const unsubscribe = await this._hass.connection.subscribeMessage<
        InstanceDocument[]
      >(
        (instances) => {
          if (epoch !== this._instancesEpoch || !this.isConnected) {
            return;
          }
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
        { type: "occupied/instances_subscribe" },
      );
      if (epoch !== this._instancesEpoch || !this.isConnected) {
        unsubscribe();
      } else {
        this._instancesUnsubscribe = unsubscribe;
      }
    } catch (error) {
      if (epoch === this._instancesEpoch) {
        this.fail(error);
      }
    } finally {
      if (epoch === this._instancesEpoch) {
        this._instancesSubscribing = false;
      }
    }
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
      !(this.dirty || (this.stepEditor && hasStepChanges(this.stepEditor))) ||
      globalThis.confirm(
        this.t("This instance has unsaved changes. Discard them and switch?"),
      )
    );
  }
  private _resetInstance(entry: string) {
    this.epoch++;
    this._disposeSubscription();
    if (this._timelineTimer) {
      clearTimeout(this._timelineTimer);
    }
    this._timelineTimer = null;
    this._timelineLoading = false;
    this._loadedEntry = null;
    this.selectedEntry = entry;
    Object.assign(this, {
      draft: undefined,
      saved: undefined,
      document: undefined,
      status: undefined,
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
      tab: "routines",
      stepEditor: null,
      pendingStepExit: null,
      selectedStep: null,
      actual: undefined,
      timelineDate: "",
      preview: undefined,
      previewProgram: undefined,
      previewVersion: undefined,
      previewSettings: { date: "", days: 1, seed: "preview-1", at: "" },
      sourcePath: undefined,
      yaml: "",
      includeSensitive: false,
      diagnostics: undefined,
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
    this._subscriptionEpoch++;
    this._unsubscribe?.();
    this._unsubscribe = null;
    this._subscribing = false;
  }
  private async _subscribe() {
    if (
      !this.isConnected ||
      !this._loadedEntry ||
      !this._hass?.connection ||
      this._unsubscribe ||
      this._subscribing
    ) {
      return;
    }
    this._subscribing = true;
    const epoch = this._subscriptionEpoch;
    try {
      const unsubscribe =
        await this._hass.connection.subscribeMessage<RuntimeSnapshot>(
          (snapshot) => {
            if (epoch === this._subscriptionEpoch && this.isConnected) {
              this._onSnapshot(snapshot);
            }
          },
          { type: "occupied/subscribe", config_entry_id: this._loadedEntry },
        );
      if (epoch !== this._subscriptionEpoch || !this.isConnected) {
        unsubscribe();
      } else {
        this._unsubscribe = unsubscribe;
      }
    } catch (error) {
      if (epoch === this._subscriptionEpoch) {
        this.fail(error);
      }
    } finally {
      if (epoch === this._subscriptionEpoch) {
        this._subscribing = false;
      }
    }
  }
  private _onSnapshot(snapshot: RuntimeSnapshot) {
    this.status = snapshot;
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
    if (this.tab === "timeline" && !this._timelineTimer) {
      this._timelineTimer = setTimeout(() => {
        this._timelineTimer = null;
        void this.loadTimeline();
      }, 1000);
    }
    if (this.stale && !this.dirty && !this.busy && !this.stepEditor) {
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
      const [doc, catalog, status] = await Promise.all([
        this.ws("program"),
        this.ws("catalog"),
        this.ws("status"),
        loadHaControls(),
      ]);
      if (epoch !== this.epoch) {
        return;
      }
      if (this.draft && (this.dirty || this.stepEditor)) {
        this.document = doc;
        this.saved = doc.program;
        this.stale = doc.revision !== this.revision;
      } else {
        this.adopt(doc);
        this.resetDraft();
      }
      this.catalog = catalog;
      this.status = status;
      this.previewSettings.date = doc.simulation_date;
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

  // --- Rendering ----------------------------------------------------------

  /**
  Commit Svelte updates before callers focus a newly rendered field.
  */
  flush() {
    if (this.component) {
      flushSync(() => this.updates.set(++this.updateRevision));
    }
  }
  renderView() {
    this.viewRevision++;
    if (this.tab === "timeline") {
      void this.loadTimeline();
    }
    this.flush();
  }
  navigate(tab: Tab) {
    if (this.stepEditor) {
      this.requestStepExit(() => {
        this.tab = tab;
        this.renderView();
      });
      return;
    }
    if (this.tab === tab) {
      return;
    }
    this.tab = tab;
    this.renderView();
  }
  requestStepExit(action: () => void) {
    const editor = this.stepEditor;
    if (!editor) {
      action();
      return;
    }
    if (hasStepChanges(editor)) {
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
    let programNotice = "";
    if (this.stale) {
      programNotice = t(
        "The saved program changed. Your draft is preserved; reload the saved program before saving.",
      );
    } else if (this.dirty && !this.stepEditor) {
      programNotice = t("Unsaved edits");
    }
    return [
      programNotice,
      this.document?.source === "file"
        ? t(
            "Managed file is authoritative. Export draft changes to your file, then reload.",
          )
        : "",
      this.document?.configuration_source?.status === "error"
        ? t("File error: see Configuration or Home Assistant Repairs")
        : "",
      this.previewVersion != null &&
      this.previewVersion !== this.version &&
      this.tab === "preview"
        ? t("Preview belongs to an earlier draft")
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  // --- Draft editing ------------------------------------------------------

  /**
  Record the saved program from a backend document.
  */
  private adopt(doc: ProgramDocument) {
    this.document = doc;
    this.saved = doc.program;
    this.revision = doc.revision;
    this.stale = false;
  }
  /**
  Replace the draft with the saved program, dropping local edits.
  */
  private resetDraft() {
    this.draft = copy(this.saved);
    this.dirty = !!this.document.needs_apply;
    this.version++;
    this.validatedVersion = -1;
    this.issues = [];
  }
  discardEdits() {
    this.resetDraft();
    this.error = "";
    this.renderView();
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
    this.error = errorMessage(error);
    this.flush();
  }
  attempt(action: () => unknown) {
    try {
      action();
    } catch (error) {
      this.fail(error);
    }
  }
  /**
  Run one backend action at a time; failures are shown, not thrown.
  */
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
  private showIssues(result: { valid?: boolean; issues?: Issue[] }) {
    this.issues = result.issues || [];
    this.flush();
    if (result.valid === false && this.issues.length === 0) {
      this.fail(
        this.t("Preview contains infeasible dates. Review timeline issues."),
      );
    }
  }
  /**
  Saved-program warnings persist independently of temporary editor issues.
  */
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
  /**
  Show a backend issue on the step editor field it belongs to.
  */
  focusIssue(issue: Issue) {
    const editor = this.stepEditor;
    if (!editor) {
      return;
    }
    const path = issue.model_path || [],
      prefix = editor.candidatePath || [];
    if (prefix.length === 0 || prefix.some((key, i) => path[i] !== key)) {
      this.fail(
        this.t(
          "Finish or cancel this step to edit other configuration issues.",
        ),
      );
      return;
    }
    const field = editorField(path.slice(prefix.length), editor.form);
    editor.errors[field] = issue.message;
    this.renderView();
    this.shadowRoot
      .querySelector<HTMLElement>('.routine-editor [aria-invalid="true"]')
      ?.focus();
  }

  // --- Backend actions ----------------------------------------------------

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
      editor = this.stepEditor,
      submittedForm = editor ? copy(editor.form) : null;
    return this.run(async (epoch) => {
      const validation = await this.ws("editor_validate", { program: draft });
      if (epoch !== this.epoch) {
        return;
      }
      if (version !== this.version) {
        this.fail(
          this.t(
            "Your changes are kept. Save again to include the latest edits.",
          ),
        );
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
      if (editor && this.stepEditor === editor) {
        this.draft = copy(result.program);
        this.dirty = false;
        this.selectedStep = editor.id;
        editor.existing = true;
        // Future patches compare against what was actually saved. This also
        // preserves a user reverting a field while its previous value saves.
        editor.original = submittedForm!;
        if (version !== this.version) {
          this.fail(
            this.t("Earlier changes saved. Your newer edits are still open."),
          );
          return;
        }
        this.stepEditor = null;
      }
      if (version === this.version) {
        this.draft = copy(result.program);
        this.dirty = false;
        this.renderView();
        if (editor) {
          this.shadowRoot
            .getElementById(`step-card-${editor.id}`)
            ?.focus({ preventScroll: true });
        }
      } else {
        this.dirty = true;
      }
    });
  }
  async reloadSaved(discard = false) {
    if (this.busy || ((this.dirty || this.stepEditor) && !discard)) {
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
      this.renderView();
    });
  }
  control(service: string, data: Record<string, unknown> = {}) {
    return this.run(async (epoch) => {
      await this._hass.callService("occupied", service, {
        config_entry_id: this._loadedEntry,
        ...data,
      });
      if (epoch !== this.epoch) {
        return;
      }
      const status = await this.ws("status");
      if (epoch === this.epoch) {
        this.status = status;
      }
    });
  }
  async loadTimeline() {
    if (this._timelineLoading) {
      return;
    }
    this._timelineLoading = true;
    const epoch = this.epoch;
    try {
      const doc = await this.ws(
        "timeline",
        this.timelineDate ? { date: this.timelineDate } : {},
      );
      if (epoch !== this.epoch) {
        return;
      }
      this.actual = doc;
      if (this.tab === "timeline") {
        this.viewRevision++;
        this.flush();
      }
    } catch (error) {
      if (epoch === this.epoch) {
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this._timelineLoading = false;
      }
    }
  }
  runPreview() {
    const version = this.version,
      draft = copy(this.draft),
      options = { ...this.previewSettings };
    if (!options.at) {
      delete options.at;
    }
    return this.run(async (epoch) => {
      const result = await this.ws("preview", { program: draft, ...options });
      if (epoch !== this.epoch) {
        return;
      }
      this.preview = result;
      this.previewVersion = version;
      this.previewProgram = draft;
      this.showIssues(result);
    });
  }
  loadDiagnostics() {
    return this.run(async (epoch) => {
      const result = await this.ws("diagnostics", {
        include_sensitive: this.includeSensitive,
      });
      if (epoch === this.epoch) {
        this.diagnostics = result;
      }
    });
  }
  selectSource(source: string, config_file?: string) {
    return this.run(async (epoch) => {
      const result = await this.ws("source", {
        source,
        ...(config_file && { config_file }),
        expected_revision: this.revision,
      });
      if (epoch !== this.epoch) {
        return;
      }
      if (!result.valid) {
        return this.showIssues(result);
      }
      this.adopt({ ...this.document, ...result });
      this.validatedVersion = -1;
      if (!this.dirty) {
        this.draft = copy(result.program);
      }
      this.renderView();
    });
  }
  reloadManaged() {
    return this.run(async (epoch) => {
      const result = await this.ws("reload");
      const doc = await this.ws("program");
      if (epoch !== this.epoch) {
        return;
      }
      this.document = doc;
      this.saved = doc.program;
      this.stale = doc.revision !== this.revision;
      if (!this.dirty) {
        this.revision = doc.revision;
        this.draft = copy(doc.program);
        this.stale = false;
      }
      if (!result.valid) {
        this.showIssues(result);
      }
      this.renderView();
    });
  }
  importYaml() {
    const version = this.version;
    return this.run(async (epoch) => {
      const result = await this.ws("validate", { program: this.yaml });
      if (epoch !== this.epoch || version !== this.version) {
        return;
      }
      this.showIssues(result);
      if (result.valid) {
        this.draft = result.program;
        this.edited(true);
      }
    });
  }
  exportYaml() {
    return this.run(async (epoch) => {
      const result = await this.ws("export", { program: copy(this.draft) });
      if (epoch !== this.epoch) {
        return;
      }
      this.showIssues(result);
      if (result.valid) {
        this.yaml = result.yaml;
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

/**
Map a backend issue path inside a step to the step editor field.
*/
function editorField(tail: Path, form: StepForm): string {
  const has = (key: string) => tail.includes(key),
    head = tail[0];
  if (head === "name" || head === "days") {
    return head;
  }
  if (head === "actions") {
    if (has("targets")) {
      return "entities";
    }
    if (form.kind === "service") {
      return has("data") ? "data" : "service";
    }
    return form.kind === "scene" ? "entities" : "brightness";
  }
  if (has("relative_to") || has("sun")) {
    return "anchor";
  }
  if (form.timing.mode === "absolute") {
    return has("latest") ? "end" : "start";
  }
  return has("max") ? "endOffset" : "startOffset";
}

if (!customElements.get("occupied-panel")) {
  customElements.define("occupied-panel", OccupiedPanel);
}
