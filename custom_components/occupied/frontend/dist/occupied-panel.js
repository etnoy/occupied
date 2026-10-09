// Generated from occupied-panel.ts by pnpm run build. Do not edit.
import { errorMessage, progress } from "./util.js";
import { copy, set, resources } from "./model.js";
import {
  overviewView,
  timelineView,
  previewView,
  configurationView,
  diagnosticsView,
  settingsView,
} from "./panel-views.js";
import { styles } from "./styles.js";
import { translator } from "./translations.js";
import { renderSteps } from "./steps.js";
import { stepEditorView } from "./step-editor.js";
import { LitElement, html, nothing } from "./lit.js";
const primaryTabs = [
  ["routines", "Your steps"],
  ["settings", "Settings"],
];
// These views read panel state directly and are rebuilt on every render. The
// step list and timeline keep local state (open menus, table filters), so
// their templates are rebuilt only when renderView() is called explicitly.
const liveViews = {
  settings: settingsView,
  overview: overviewView,
  preview: previewView,
  configuration: configurationView,
  diagnostics: diagnosticsView,
};
export class OccupiedPanel extends LitElement {
  static styles = styles;
  // Program state
  draft;
  saved;
  document;
  status;
  catalog = { entities: [], services: {} };
  revision = "";
  stale = false;
  dirty = false;
  // Draft edits bump version; validatedVersion records the last valid one.
  version = 0;
  validatedVersion = -1;
  issues = [];
  error = "";
  busy = false;
  // Incremented on reload/disconnect so late responses are discarded.
  epoch = 0;
  // View state
  tab = "routines";
  t = translator("en");
  stepEditor = null;
  selectedStep = null;
  actual;
  timelineDate = "";
  preview;
  previewProgram;
  previewVersion;
  previewSettings = {
    date: "",
    days: 7,
    seed: "preview-1",
    at: "",
  };
  sourcePath;
  yaml = "";
  includeSensitive = false;
  diagnostics;
  _hass;
  _loading = false;
  _panel;
  _loadedEntry = null;
  _timer;
  _timelineTimer = null;
  _timelineLoading = false;
  _subscriptionEpoch = 0;
  _unsubscribe = null;
  _subscribing = false;
  stableView = nothing;
  constructor() {
    super();
    // Lit reuses an existing root. Creating it eagerly lets HA assign hass
    // before the panel is connected.
    this.attachShadow({ mode: "open" });
  }
  set hass(value) {
    const changed = this._hass?.connection !== value?.connection;
    this._hass = value;
    this.t = translator(value?.language);
    // Stable views capture hass when built; keep their HA elements current.
    for (const selector of this.shadowRoot.querySelectorAll(
      "ha-selector,ha-generic-picker",
    ))
      selector.hass = value;
    if (changed) {
      this._disposeSubscription();
      this._subscribe();
    }
    this._load();
  }
  set panel(value) {
    this._panel = value;
    this._load();
  }
  set narrow(value) {
    this.toggleAttribute("narrow", !!value);
  }
  connectedCallback() {
    super.connectedCallback();
    this._load();
    window.addEventListener("beforeunload", this._beforeUnload);
    this._timer = setInterval(() => {
      for (const bar of this.shadowRoot.querySelectorAll(
        "progress[data-start]",
      ))
        bar.value = progress(bar.dataset.start, bar.dataset.deadline);
    }, 1000);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.epoch++;
    this._loadedEntry = null;
    this._loading = false;
    this._disposeSubscription();
    clearInterval(this._timer);
    if (this._timelineTimer) clearTimeout(this._timelineTimer);
    window.removeEventListener("beforeunload", this._beforeUnload);
  }
  _beforeUnload = (event) => {
    if (this.dirty || this.stepEditor?.changed) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  // --- Backend connection -------------------------------------------------
  ws(type, data = {}) {
    return this._hass.callWS({
      type: `occupied/${type}`,
      config_entry_id: this._loadedEntry,
      ...data,
    });
  }
  _disposeSubscription() {
    this._subscriptionEpoch++;
    this._unsubscribe?.();
    this._unsubscribe = null;
    this._subscribing = false;
  }
  async _subscribe() {
    if (
      !this.isConnected ||
      !this._loadedEntry ||
      !this._hass?.connection ||
      this._unsubscribe ||
      this._subscribing
    )
      return;
    this._subscribing = true;
    const epoch = this._subscriptionEpoch;
    try {
      const unsubscribe = await this._hass.connection.subscribeMessage(
        (snapshot) => {
          if (epoch === this._subscriptionEpoch && this.isConnected)
            this._onSnapshot(snapshot);
        },
        { type: "occupied/subscribe", config_entry_id: this._loadedEntry },
      );
      if (epoch !== this._subscriptionEpoch || !this.isConnected) unsubscribe();
      else this._unsubscribe = unsubscribe;
    } catch (error) {
      if (epoch === this._subscriptionEpoch) this.fail(error);
    } finally {
      if (epoch === this._subscriptionEpoch) this._subscribing = false;
    }
  }
  _onSnapshot(snapshot) {
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
    if (this.tab === "timeline" && !this._timelineTimer)
      this._timelineTimer = setTimeout(() => {
        this._timelineTimer = null;
        this.loadTimeline();
      }, 1000);
    if (this.stale && !this.dirty && !this.busy && !this.stepEditor)
      this.reloadSaved();
  }
  async _load() {
    const entry =
      this._panel?.config?.config_entry_id ||
      new URLSearchParams(window.location.search).get("config_entry");
    if (
      !this.isConnected ||
      !this._hass ||
      !entry ||
      this._loading ||
      this._loadedEntry === entry
    )
      return;
    this._loading = true;
    this._disposeSubscription();
    const epoch = ++this.epoch;
    this._loadedEntry = entry;
    try {
      const [doc, catalog, status] = await Promise.all([
        this.ws("program"),
        this.ws("catalog"),
        this.ws("status"),
      ]);
      if (epoch !== this.epoch) return;
      this.adopt(doc);
      this.resetDraft();
      this.catalog = catalog;
      this.status = status;
      this.previewSettings.date = doc.simulation_date;
      this.error = "";
      this.renderView();
      this._subscribe();
    } catch (error) {
      if (epoch === this.epoch) {
        this._loadedEntry = null;
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) this._loading = false;
    }
  }
  // --- Rendering ----------------------------------------------------------
  /**
   * Render synchronously so callers can focus the resulting field immediately.
   * Lit still owns the nodes and updates only changed parts.
   */
  flush() {
    this.requestUpdate();
    if (this.isConnected) this.performUpdate();
  }
  /** Rebuild the current tab's stable view, then render. */
  renderView() {
    if (this.draft && !this.stepEditor && !liveViews[this.tab])
      this.stableView = this.buildStableView();
    if (this.tab === "timeline") this.loadTimeline();
    this.flush();
  }
  navigate(tab) {
    if (this.stepEditor) return;
    this.tab = tab;
    this.renderView();
  }
  buildStableView() {
    try {
      return this.tab === "timeline" ? timelineView(this) : renderSteps(this);
    } catch (error) {
      this.error = errorMessage(error);
      return html`<p class="error">
        ${this.t(
          "This draft cannot be shown. Discard edits or import a corrected program from Settings.",
        )}
      </p>`;
    }
  }
  currentView() {
    if (!this.draft)
      return this.error && !this._loading
        ? html`<button type="button" @click=${() => this._load()}>
            ${this.t("Retry")}
          </button>`
        : nothing;
    if (this.stepEditor) return stepEditorView(this);
    return liveViews[this.tab]?.(this) ?? this.stableView;
  }
  notices() {
    const t = this.t;
    return [
      this.stale
        ? t(
            "The saved program changed. Your draft is preserved; reload the saved program before saving.",
          )
        : this.dirty && !this.stepEditor
          ? t("Unsaved edits")
          : "",
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
  runtimeControls() {
    const t = this.t,
      state = this.status;
    if (!state) return nothing;
    const label = state.paused
      ? "Paused"
      : !state.enabled
        ? "Off"
        : state.active
          ? "Running"
          : "Waiting";
    const schedulable = resources(this.saved).some((resource) =>
      ["step", "activity", "window"].includes(resource.kind),
    );
    return html`<span
        id="badge"
        class="badge"
        aria-live="polite"
        title=${state.reason || ""}
        >${t(label)}${state.dry_run ? ` · ${t("Dry run")}` : ""}</span
      >
      <button
        type="button"
        class="text-button"
        .disabled=${this.busy ||
        !!this.stepEditor ||
        (!state.enabled && !schedulable)}
        @click=${() => this.control(state.enabled ? "stop" : "start")}
      >
        ${t(state.enabled ? "Turn off simulation" : "Turn on simulation")}
      </button>`;
  }
  toolbar() {
    const t = this.t,
      unsaved = this.dirty && !this.stepEditor;
    return html`<div
      id="toolbar"
      class="toolbar"
      ?hidden=${!unsaved && !this.stale}
    >
      ${unsaved
        ? html`<button
              type="button"
              class="primary"
              .disabled=${this.busy ||
              this.document?.source === "file" ||
              this.stale}
              @click=${() => this.save()}
            >
              ${t("Save changes")}
            </button>
            <button
              type="button"
              .disabled=${this.busy || !this.draft}
              @click=${() => this.discardEdits()}
            >
              ${t("Discard edits")}
            </button>`
        : nothing}
      ${this.stale
        ? html`<button
            type="button"
            .disabled=${this.busy}
            @click=${() => this.reloadSaved(true)}
          >
            ${t("Reload saved program")}
          </button>`
        : nothing}
    </div>`;
  }
  issue(issue, primary) {
    const className = issue.severity === "warning" ? "hint" : "error",
      text = primary
        ? issue.message
        : `${issue.severity || "error"} · ${issue.path || "$"}: ${issue.message}`;
    // Only issues inside the open step editor have a field to focus.
    return this.stepEditor
      ? html`<button
          type="button"
          class=${className}
          @click=${() => this.focusIssue(issue)}
        >
          ${text}
        </button>`
      : html`<p class=${className}>${text}</p>`;
  }
  render() {
    const t = this.t,
      notices = this.notices(),
      primary = primaryTabs.some(([id]) => id === this.tab);
    return html`<main>
      <header>
        <div>
          <h1>Occupied</h1>
          <p id="house">${this.draft?.name || t("Loading household…")}</p>
        </div>
        <div id="runtime" class="row">${this.runtimeControls()}</div>
      </header>
      ${this.toolbar()}
      <div id="notice" class="banner" role="status" ?hidden=${!notices}>
        ${notices}
      </div>
      <div id="error" class="error" role="alert" ?hidden=${!this.error}>
        ${this.error}
      </div>
      <nav aria-label="Occupied">
        ${primaryTabs.map(
          ([id, label]) =>
            html`<button
              type="button"
              data-tab=${id}
              aria-current=${this.tab === id ? "page" : "false"}
              .disabled=${!!this.stepEditor}
              @click=${() => this.navigate(id)}
            >
              ${t(label)}
            </button>`,
        )}
      </nav>
      <div id="secondary-nav">
        ${!primary
          ? html`<button
              type="button"
              class="text-button"
              @click=${() =>
                this.navigate(this.tab === "preview" ? "routines" : "settings")}
            >
              ${t(
                this.tab === "preview" ? "Back to steps" : "Back to settings",
              )}
            </button>`
          : nothing}
      </div>
      <div id="issues">
        ${this.issues.map((issue) => this.issue(issue, primary))}
      </div>
      <div id="view">${this.currentView()}</div>
    </main>`;
  }
  // --- Draft editing ------------------------------------------------------
  /** Record the saved program from a backend document. */
  adopt(doc) {
    this.document = doc;
    this.saved = doc.program;
    this.revision = doc.revision;
    this.stale = false;
  }
  /** Replace the draft with the saved program, dropping local edits. */
  resetDraft() {
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
  change(path, value, rerender = false) {
    if (!path.length) this.draft = value;
    else set(this.draft, path, value);
    this.edited(rerender);
  }
  edited(rerender = false) {
    this.version++;
    this.dirty = true;
    this.validatedVersion = -1;
    if (rerender) this.renderView();
    else this.flush();
  }
  fail(error) {
    this.error = errorMessage(error);
    this.flush();
  }
  attempt(action) {
    try {
      action();
    } catch (error) {
      this.fail(error);
    }
  }
  /** Run one backend action at a time; failures are shown, not thrown. */
  async run(action) {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    this.flush();
    const epoch = this.epoch;
    try {
      return await action(epoch);
    } catch (error) {
      if (epoch === this.epoch) {
        if (isRevisionConflict(error)) this.stale = true;
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this.busy = false;
        this.flush();
      }
    }
  }
  showIssues(result) {
    this.issues = result.issues || [];
    this.flush();
    if (result.valid === false && !this.issues.length)
      this.fail(
        this.t("Preview contains infeasible dates. Review timeline issues."),
      );
  }
  /** Show a backend issue on the step editor field it belongs to. */
  focusIssue(issue) {
    const editor = this.stepEditor;
    if (!editor) return;
    const path = issue.model_path || [],
      prefix = editor.candidatePath || [];
    if (!prefix.length || !prefix.every((key, i) => path[i] === key)) {
      this.fail(
        this.t(
          "Finish or cancel this step to edit other configuration issues.",
        ),
      );
      return;
    }
    const field = editorField(path.slice(prefix.length), editor.form);
    editor.errors[field] = issue.message;
    editor.stage = editorStage(field);
    this.renderView();
    this.shadowRoot
      .querySelector('.routine-editor [aria-invalid="true"]')
      ?.focus();
  }
  // --- Backend actions ----------------------------------------------------
  validate() {
    const version = this.version,
      draft = copy(this.draft);
    return this.run(async (epoch) => {
      const result = await this.ws("editor_validate", { program: draft });
      if (epoch !== this.epoch || version !== this.version) return;
      this.showIssues(result);
      if (result.valid) this.validatedVersion = version;
    });
  }
  save(candidate) {
    if (this.document?.source === "file" || this.stale) return;
    const version = this.version,
      draft = copy(candidate || this.draft),
      expected = this.revision,
      editor = this.stepEditor,
      submittedForm = editor ? copy(editor.form) : null;
    return this.run(async (epoch) => {
      const validation = await this.ws("editor_validate", { program: draft });
      if (epoch !== this.epoch) return;
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
        if (editor && this.issues.length)
          this.focusIssue(
            this.issues.find((i) => i.severity !== "warning") || this.issues[0],
          );
        return;
      }
      this.validatedVersion = version;
      const result = await this.ws("save", {
        program: draft,
        expected_revision: expected,
      });
      if (epoch !== this.epoch) return;
      if (!result.valid) return this.showIssues(result);
      this.adopt({ ...this.document, ...result, needs_apply: false });
      if (editor && this.stepEditor === editor) {
        this.draft = copy(result.program);
        this.dirty = false;
        this.selectedStep = editor.id;
        editor.existing = true;
        // Future patches compare against what was actually saved. This also
        // preserves a user reverting a field while its previous value saves.
        editor.original = submittedForm;
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
      } else this.dirty = true;
    });
  }
  async reloadSaved(discard = false) {
    if (this.busy || ((this.dirty || this.stepEditor) && !discard)) return;
    const version = this.version;
    return this.run(async (epoch) => {
      const doc = await this.ws("program");
      if (epoch !== this.epoch || version !== this.version) return;
      this.adopt(doc);
      this.resetDraft();
      this.stepEditor = null;
      this.renderView();
    });
  }
  control(service, data = {}) {
    return this.run(async () => {
      await this._hass.callService("occupied", service, {
        config_entry_id: this._loadedEntry,
        ...data,
      });
      this.status = await this.ws("status");
    });
  }
  async loadTimeline() {
    if (this._timelineLoading) return;
    this._timelineLoading = true;
    const epoch = this.epoch;
    try {
      const doc = await this.ws(
        "timeline",
        this.timelineDate ? { date: this.timelineDate } : {},
      );
      if (epoch !== this.epoch) return;
      this.actual = doc;
      if (this.tab === "timeline") {
        this.stableView = timelineView(this);
        this.flush();
      }
    } catch (error) {
      if (epoch === this.epoch) this.fail(error);
    } finally {
      this._timelineLoading = false;
    }
  }
  runPreview() {
    const version = this.version,
      draft = copy(this.draft),
      options = { ...this.previewSettings };
    if (!options.at) delete options.at;
    return this.run(async (epoch) => {
      const result = await this.ws("preview", { program: draft, ...options });
      if (epoch !== this.epoch) return;
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
      if (epoch === this.epoch) this.diagnostics = result;
    });
  }
  selectSource(source, config_file) {
    return this.run(async (epoch) => {
      const result = await this.ws("source", {
        source,
        ...(config_file ? { config_file } : {}),
        expected_revision: this.revision,
      });
      if (epoch !== this.epoch) return;
      if (!result.valid) return this.showIssues(result);
      this.adopt({ ...this.document, ...result });
      this.validatedVersion = -1;
      if (!this.dirty) this.draft = copy(result.program);
      this.renderView();
    });
  }
  reloadManaged() {
    return this.run(async (epoch) => {
      const result = await this.ws("reload");
      const doc = await this.ws("program");
      if (epoch !== this.epoch) return;
      this.document = doc;
      this.saved = doc.program;
      this.stale = doc.revision !== this.revision;
      if (!this.dirty) {
        this.revision = doc.revision;
        this.draft = copy(doc.program);
        this.stale = false;
      }
      if (!result.valid) this.showIssues(result);
      this.renderView();
    });
  }
  importYaml() {
    const version = this.version;
    return this.run(async (epoch) => {
      const result = await this.ws("validate", { program: this.yaml });
      if (epoch !== this.epoch || version !== this.version) return;
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
      if (epoch !== this.epoch) return;
      this.showIssues(result);
      if (result.valid) this.yaml = result.yaml;
    });
  }
}
function isRevisionConflict(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "revision_conflict"
  );
}
/** Map a backend issue path inside a step to the step editor field. */
function editorField(tail, form) {
  const has = (key) => tail.includes(key),
    head = tail[0];
  if (head === "name" || head === "days") return head;
  if (head === "actions") {
    if (has("targets")) return "entities";
    if (form.kind === "service") return has("data") ? "data" : "service";
    return form.kind === "scene" ? "entities" : "brightness";
  }
  if (has("relative_to") || has("sun")) return "anchor";
  if (has("fallback")) return "fallback";
  if (form.timing.mode === "absolute") return has("latest") ? "end" : "start";
  return has("max") ? "endOffset" : "startOffset";
}
/** Builder stage (timing, entities, action) that shows a field. */
function editorStage(field) {
  if (field === "entities") return 1;
  return ["name", "brightness", "service", "data"].includes(field) ? 2 : 0;
}
if (!customElements.get("occupied-panel"))
  customElements.define("occupied-panel", OccupiedPanel);
