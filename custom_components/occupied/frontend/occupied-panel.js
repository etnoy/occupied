import { copy, get, set, resources } from "./model.js";
import { button, el, section, details } from "./forms.js";
import { editView } from "./views.js";
import { timeline, stamp } from "./timeline.js";
import { styles } from "./styles.js";
import { translator } from "./translations.js";
import { renderSteps } from "./steps.js";
import { stepEntries } from "./step-model.js";

const tabs = {
  routines: "Your steps",
  settings: "Settings",
};

export class OccupiedPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.tab = "routines";
    this.catalog = { entities: [], services: {} };
    this.selection = new Map();
    this.raw = new Map();
    this.localErrors = new Map();
    this.t = translator("en");
    this.version = 0;
    this.validatedVersion = -1;
    this.dirty = false;
    this.busy = false;
    this.epoch = 0;
    this.error = "";
    this.previewSettings = { date: "", days: 7, seed: "preview-1", at: "" };
    this._beforeUnload = (e) => {
      if (this.dirty || this.stepEditor?.changed) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
  }
  set hass(value) {
    const changed = this._hass?.connection !== value?.connection;
    this._hass = value;
    this.t = translator(value?.language);
    for (const selector of this.shadowRoot.querySelectorAll("ha-selector"))
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
    this.shell();
    this._load();
    window.addEventListener("beforeunload", this._beforeUnload);
    this._timer = setInterval(() => {
      for (const progress of this.shadowRoot.querySelectorAll(
        "progress[data-start]",
      ))
        progress.value = Math.max(
          0,
          Math.min(
            1,
            (Date.now() - Date.parse(progress.dataset.start)) /
              Math.max(
                1,
                Date.parse(progress.dataset.deadline) -
                  Date.parse(progress.dataset.start),
              ),
          ),
        );
    }, 1000);
  }
  disconnectedCallback() {
    this.epoch++;
    this._loadedEntry = null;
    this._loading = false;
    this._disposeSubscription();
    clearInterval(this._timer);
    clearTimeout(this._timelineTimer);
    window.removeEventListener("beforeunload", this._beforeUnload);
  }
  _disposeSubscription() {
    this._subscriptionEpoch = (this._subscriptionEpoch || 0) + 1;
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
          if (epoch !== this._subscriptionEpoch || !this.isConnected) return;
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
          this.toolbar();
          if (this.tab === "overview") this.renderOverview();
          if (this.tab === "timeline" && !this._timelineTimer)
            this._timelineTimer = setTimeout(() => {
              this._timelineTimer = null;
              this.loadTimeline();
            }, 1000);
          if (this.stale && !this.dirty && !this.busy && !this.stepEditor)
            this.reloadSaved();
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
  ws(type, data = {}) {
    return this._hass.callWS({
      type: `occupied/${type}`,
      config_entry_id: this._loadedEntry,
      ...data,
    });
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
      this.document = doc;
      this.saved = doc.program;
      this.draft = copy(doc.program);
      this.revision = doc.revision;
      this.catalog = catalog;
      this.status = status;
      this.dirty = !!doc.needs_apply;
      this.stale = false;
      this.previewSettings.date = doc.simulation_date;
      this.error = "";
      this.raw.clear();
      this.localErrors.clear();
      this.shell();
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
  shell() {
    this.shadowRoot.replaceChildren(el("style", styles));
    const main = el("main"),
      header = el("header"),
      title = el("div");
    title.append(
      el("h1", "Occupied"),
      el("p", this.draft?.name || this.t("Loading household…"), {
        id: "house",
      }),
    );
    header.append(title, el("div", null, { id: "runtime", class: "row" }));
    main.append(
      header,
      el("div", "", { id: "toolbar", class: "toolbar" }),
      el("div", "", { id: "notice", class: "banner", role: "status" }),
      el("div", "", { id: "error", class: "error", role: "alert" }),
    );
    const nav = el("nav", null, { "aria-label": "Occupied" });
    for (const [id, label] of Object.entries(tabs))
      nav.append(
        button(
          this.t(label),
          () => {
            if (this.stepEditor) return;
            this.tab = id;
            this.renderView();
          },
          { "data-tab": id },
        ),
      );
    main.append(
      nav,
      el("div", null, { id: "secondary-nav" }),
      el("div", null, { id: "issues" }),
      el("div", null, { id: "view" }),
    );
    this.shadowRoot.append(main);
    this.toolbar();
  }
  toolbar() {
    const node = this.shadowRoot.getElementById("toolbar");
    if (!node) return;
    const save = button(this.t("Save changes"), () => this.save(), {
        class: "primary",
      }),
      discard = button(this.t("Discard edits"), () => {
        this.draft = copy(this.saved);
        this.dirty = !!this.document.needs_apply;
        this.version++;
        this.validatedVersion = -1;
        this.raw.clear();
        this.localErrors.clear();
        this.issues = [];
        this.error = "";
        this.renderView();
      });
    save.disabled =
      this.busy ||
      this.document?.source === "file" ||
      this.stale ||
      !this.dirty;
    discard.disabled = this.busy || !this.draft;
    node.replaceChildren();
    if (this.dirty && !this.stepEditor) node.append(save, discard);
    if (this.stale)
      node.append(
        button(this.t("Reload saved program"), () => this.reloadSaved(true), {
          disabled: this.busy ? "" : undefined,
        }),
      );
    node.hidden = !node.childElementCount;
    for (const button of this.shadowRoot.querySelectorAll("nav [data-tab]"))
      button.disabled = !!this.stepEditor;
    for (const button of this.shadowRoot.querySelectorAll(
      ".builder-footer button",
    ))
      button.disabled =
        this.busy ||
        (!!this.stale && button.hasAttribute("data-routine-submit"));
    const error = this.shadowRoot.getElementById("error");
    error.textContent = this.error;
    error.hidden = !this.error;
    const runtime = this.shadowRoot.getElementById("runtime");
    runtime.replaceChildren();
    if (this.status) {
      const label = this.status.paused
        ? "Paused"
        : !this.status.enabled
          ? "Off"
          : this.status.active
            ? "Running"
            : "Waiting";
      runtime.append(
        el(
          "span",
          `${this.t(label)}${this.status.dry_run ? ` · ${this.t("Dry run")}` : ""}`,
          {
            id: "badge",
            class: "badge",
            "aria-live": "polite",
            title: this.status.reason || "",
          },
        ),
      );
      const control = button(
        this.t(
          this.status.enabled ? "Turn off simulation" : "Turn on simulation",
        ),
        () => this.control(this.status.enabled ? "stop" : "start"),
        { class: "text-button" },
      );
      control.disabled =
        this.busy ||
        !!this.stepEditor ||
        (!this.status.enabled &&
          !resources(this.saved).some((r) =>
            ["step", "activity", "window"].includes(r.kind),
          ));
      runtime.append(control);
    }
    const notice = this.shadowRoot.getElementById("notice");
    notice.textContent = this.stale
      ? this.t(
          "The saved program changed. Your draft is preserved; reload the saved program before saving.",
        )
      : this.dirty && !this.stepEditor
        ? this.t("Unsaved edits")
        : "";
    if (this.document?.source === "file")
      notice.textContent += ` · ${this.t("Managed file is authoritative. Export draft changes to your file, then reload.")}`;
    if (this.document?.configuration_source?.status === "error")
      notice.textContent += ` · ${this.t("File error: see Configuration or Home Assistant Repairs")}`;
    if (
      this.previewVersion != null &&
      this.previewVersion !== this.version &&
      this.tab === "preview"
    )
      notice.textContent += ` · ${this.t("Preview belongs to an earlier draft")}`;
    notice.textContent = notice.textContent.replace(/^ · /, "");
    notice.hidden = !notice.textContent;
    this.shadowRoot.getElementById("house").textContent =
      this.draft?.name || this.t("Loading household…");
  }
  change(path, value) {
    if (!path.length) this.draft = value;
    else set(this.draft, path, value);
    this.edited();
  }
  edited(render = false) {
    this.version++;
    this.dirty = true;
    this.validatedVersion = -1;
    const active = this.shadowRoot.activeElement;
    for (const [key] of this.raw)
      if (active?.dataset.jsonPath !== key && !this.localErrors.has(key))
        this.raw.delete(key);
    for (const input of this.shadowRoot.querySelectorAll(
      "textarea[data-json-path]",
    ))
      if (input !== active && !this.localErrors.has(input.dataset.jsonPath))
        input.value = JSON.stringify(
          get(this.draft, JSON.parse(input.dataset.jsonPath)) ?? {},
          null,
          2,
        );
    this.toolbar();
    if (render) this.renderView();
  }
  fail(error) {
    this.error =
      typeof error === "string" ? error : error.message || String(error);
    this.toolbar();
  }
  attempt(action) {
    try {
      action();
    } catch (error) {
      this.fail(error);
    }
  }
  async run(action) {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    this.toolbar();
    const epoch = this.epoch;
    try {
      return await action(epoch);
    } catch (error) {
      if (epoch === this.epoch) {
        if (error.code === "revision_conflict") this.stale = true;
        this.fail(error);
      }
    } finally {
      if (epoch === this.epoch) {
        this.busy = false;
        this.toolbar();
      }
    }
  }
  checkLocal() {
    if (this.localErrors.size) {
      this.fail([...this.localErrors.values()].join("\n"));
      return false;
    }
    return true;
  }
  showIssues(result) {
    this.issues = result.issues || [];
    this.renderIssues();
    if (result.valid === false && !this.issues.length)
      this.fail(
        this.t("Preview contains infeasible dates. Review timeline issues."),
      );
  }
  renderIssues() {
    const node = this.shadowRoot.getElementById("issues");
    if (!node) return;
    node.replaceChildren();
    for (const issue of this.issues || [])
      node.append(
        button(
          ["routines", "settings"].includes(this.tab)
            ? issue.message
            : `${issue.severity || "error"} · ${issue.path || "$"}: ${issue.message}`,
          () => this.focusIssue(issue),
          { class: issue.severity === "warning" ? "hint" : "error" },
        ),
      );
  }
  focusIssue(issue) {
    const path = issue.model_path || [];
    const editor = this.stepEditor;
    if (editor) {
      const prefix = editor.candidatePath || [];
      if (prefix.length && prefix.every((key, i) => path[i] === key)) {
        const tail = path.slice(prefix.length);
        const field =
          tail[0] === "name"
            ? "name"
            : tail[0] === "days"
              ? "days"
              : tail[0] === "actions"
                ? tail.includes("targets")
                  ? "entities"
                  : editor.form.kind === "service"
                    ? tail.includes("data")
                      ? "data"
                      : "service"
                    : editor.form.kind === "scene"
                      ? "entities"
                      : "brightness"
                : tail.includes("relative_to")
                  ? "parent"
                  : tail.includes("fallback")
                    ? "fallback"
                    : editor.form.timing.mode === "interval"
                      ? tail.includes("latest")
                        ? "latest"
                        : "earliest"
                      : editor.form.timing.mode === "clock"
                        ? "time"
                        : editor.form.timing.offsetMode === "interval"
                          ? tail.includes("max")
                            ? "maxOffset"
                            : "minOffset"
                          : "offset";
        editor.errors[field] = issue.message;
        editor.stage =
          field === "entities"
            ? 0
            : ["name", "brightness", "service", "data"].includes(field)
              ? 1
              : 2;
        this.renderView();
        this.shadowRoot
          .querySelector('.routine-editor [aria-invalid="true"]')
          ?.focus();
      } else
        this.fail(
          this.t(
            "Finish or cancel this step to edit other configuration issues.",
          ),
        );
      return;
    }
    this.tab =
      path[0] === "groups"
        ? "groups"
        : path[0] === "routines"
          ? "advanced_routines"
          : path[0] === "lighting"
            ? "handover"
            : ["defaults", "policies", "constraints"].includes(path[0])
              ? "defaults"
              : "household";
    if (path[0] === "groups") this.selection.set('["groups"]', path[1]);
    if (path[0] === "routines") {
      this.selection.set('["routines"]', path[1]);
      if (typeof path[3] === "number")
        this.selection.set(JSON.stringify(path.slice(0, 3)), path[3]);
    }
    this.renderView();
    let target;
    for (let n = path.length; n >= 0 && !target; n--)
      target = [...this.shadowRoot.querySelectorAll("[data-path]")].find(
        (x) => x.dataset.path === JSON.stringify(path.slice(0, n)),
      );
    if (target) {
      for (let a = target.parentElement; a; a = a.parentElement)
        if (a.tagName === "DETAILS") a.open = true;
      target.scrollIntoView({ block: "center" });
      (
        target.querySelector("input,textarea,select,ha-selector") || target
      ).focus();
    }
  }
  validate() {
    if (!this.checkLocal()) return;
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
    if (this.document?.source === "file" || !this.checkLocal() || this.stale)
      return;
    const version = this.version,
      draft = copy(candidate || this.draft),
      expected = this.revision;
    const editor = this.stepEditor;
    const submittedForm = editor ? copy(editor.form) : null;
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
        if (editor && this.issues?.length)
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
      this.saved = result.program;
      this.document = { ...this.document, ...result };
      this.revision = result.revision;
      this.stale = false;
      this.document.needs_apply = false;
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
        this.raw.clear();
        this.localErrors.clear();
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
      this.document = doc;
      this.saved = doc.program;
      this.draft = copy(doc.program);
      this.revision = doc.revision;
      this.dirty = !!doc.needs_apply;
      this.stale = false;
      this.version++;
      this.validatedVersion = -1;
      this.raw.clear();
      this.localErrors.clear();
      this.issues = [];
      this.stepEditor = null;
      this.renderView();
    });
  }
  migrate(kind, old, next) {
    if (!this.checkLocal() || !next) return;
    const version = this.version;
    return this.run(async (epoch) => {
      const result = await this.ws("rename_id", {
        program: copy(this.draft),
        kind,
        old,
        new: next,
      });
      if (epoch !== this.epoch || version !== this.version) return;
      this.showIssues(result);
      if (result.valid) {
        this.draft = result.program;
        this.edited(true);
      }
    });
  }
  control(service, data = {}) {
    return this.run(async () => {
      await this._hass.callService("occupied", service, {
        config_entry_id: this._loadedEntry,
        ...data,
      });
      this.status = await this.ws("status");
      if (this.tab === "overview") this.renderOverview();
    });
  }
  renderView() {
    const root = this.shadowRoot.getElementById("view");
    if (!root) return;
    root.replaceChildren();
    for (const node of this.shadowRoot.querySelectorAll("[data-tab]"))
      node.setAttribute(
        "aria-current",
        node.dataset.tab === this.tab ? "page" : "false",
      );
    if (!this.draft) {
      root.append(button(this.t("Retry"), () => this._load()));
      return;
    }
    const secondaryNav = this.shadowRoot.getElementById("secondary-nav");
    secondaryNav.replaceChildren();
    if (!["routines", "settings"].includes(this.tab))
      secondaryNav.append(
        button(
          this.t(this.tab === "preview" ? "Back to steps" : "Back to settings"),
          () => {
            this.tab = this.tab === "preview" ? "routines" : "settings";
            this.renderView();
          },
          { class: "text-button" },
        ),
      );
    if (this.tab === "routines") {
      try {
        renderSteps(this, root);
      } catch (error) {
        root.replaceChildren();
        root.append(
          el("p", this.t("This draft needs attention in Advanced settings."), {
            class: "error",
          }),
          button(this.t("Open advanced editor"), () => {
            this.tab = "household";
            this.renderView();
          }),
        );
        this.fail(error);
      }
    } else if (this.tab === "overview") this.renderOverview();
    else if (this.tab === "timeline") {
      this.renderTimeline();
      this.loadTimeline();
    } else if (this.tab === "preview") this.renderPreview();
    else if (this.tab === "configuration") this.renderConfiguration();
    else if (this.tab === "diagnostics") this.renderDiagnostics();
    else {
      try {
        editView(this, root);
      } catch (error) {
        root.replaceChildren();
        this.fail(
          this.t(
            "The advanced draft cannot be shown in forms. Correct the JSON below or discard edits.",
          ),
        );
        const input = el("textarea", null, {
          rows: 20,
          "aria-label": this.t("Advanced full program"),
          "data-json-path": "[]",
        });
        input.value = this.raw.get("[]") ?? JSON.stringify(this.draft, null, 2);
        input.addEventListener("input", () => {
          this.raw.set("[]", input.value);
          try {
            this.localErrors.delete("[]");
            this.change([], JSON.parse(input.value));
          } catch (parseError) {
            this.localErrors.set("[]", parseError.message);
            this.edited();
          }
        });
        root.append(
          input,
          button(this.t("Refresh forms"), () => this.renderView()),
        );
      }
    }
    this.toolbar();
    this.renderIssues();
  }
  renderOverview() {
    const root = this.shadowRoot.getElementById("view");
    if (this.tab !== "overview" || !root) return;
    root.replaceChildren();
    const t = this.t,
      state = this.status;
    if (!state) return;
    const box = section(root, t("Overview")),
      controls = el("div", null, { class: "row" });
    controls.append(
      button(t(state.enabled ? "Disable" : "Enable"), () =>
        this.control(state.enabled ? "stop" : "start"),
      ),
      button(t(state.paused ? "Resume" : "Pause"), () =>
        this.control(state.paused ? "resume" : "pause"),
      ),
    );
    if (state.mode === "daily")
      controls.append(
        button(
          t(state.dry_run ? "Select live execution" : "Select dry run"),
          () => this.control("set_dry_run", { dry_run: !state.dry_run }),
        ),
      );
    for (const b of controls.children) b.disabled = this.busy;
    box.append(controls);
    const fields = [
      ["Status", state.status],
      ["Reason", state.reason],
      ["Next action", stamp(state.next_event, this.document.timezone)],
      ["Execution", state.dry_run ? t("Dry run") : t("Live")],
      [
        "Saved revision",
        state.source_revision?.slice(0, 12) || this.revision?.slice(0, 12),
      ],
      [
        "Steps",
        stepEntries(this.saved)
          .map((x) => x.name)
          .join(", ") || t("None"),
      ],
      ["Yielded targets", (state.yielded || []).join(", ") || t("None")],
    ];
    const dl = el("dl");
    for (const [label, value] of fields)
      dl.append(el("dt", t(label)), el("dd", value));
    box.append(dl);
    const labels = new Map(resources(this.saved).map((x) => [x.id, x.name])),
      active = section(root, t("Active activities"));
    for (const a of state.activities || [])
      active.append(
        el(
          "p",
          `${labels.get(a.source_id) || a.source_id} · ${a.phase} · ${t("Runtime deadline")}: ${stamp(a.deadline, this.document.timezone)} · ${a.resources.join(", ")}`,
        ),
      );
    if (!state.activities?.length) active.append(el("p", t("None")));
    const hbox = section(root, t("Lighting convergence"));
    for (const [entity, h] of Object.entries(state.handover || {})) {
      const progress = el("progress", null, {
        max: 1,
        "aria-label": entity,
        "data-start": h.start,
        "data-deadline": h.deadline,
      });
      progress.value = Math.max(
        0,
        Math.min(
          1,
          (Date.now() - Date.parse(h.start)) /
            Math.max(1, Date.parse(h.deadline) - Date.parse(h.start)),
        ),
      );
      hbox.append(
        el(
          "p",
          `${entity} · ${stamp(h.deadline, this.document.timezone)} · ${JSON.stringify(h.observed)} → ${JSON.stringify(h.target)}`,
        ),
        progress,
      );
    }
    if (!Object.keys(state.handover || {}).length)
      hbox.append(el("p", t("None")));
    const next = section(root, t("Upcoming actions"));
    for (const event of (state.events || []).slice(0, 30))
      next.append(
        el(
          "p",
          `${stamp(event.time, this.document.timezone)} · ${event.event} · ${event.id}`,
        ),
      );
    if (!state.events?.length) next.append(el("p", t("None")));
    if (state.last_error)
      root.append(el("p", state.last_error, { class: "error" }));
    root.append(
      el(
        "p",
        t(
          "Home Assistant runs the program while this panel is closed. Draft edits and previews do not control devices.",
        ),
      ),
    );
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
      if (this.tab === "timeline") this.renderTimeline();
    } catch (error) {
      if (epoch === this.epoch) this.fail(error);
    } finally {
      this._timelineLoading = false;
    }
  }
  renderTimeline() {
    const root = this.shadowRoot.getElementById("view");
    root.replaceChildren();
    const box = section(
      root,
      this.t("Actual timeline"),
      this.t(
        "This view reads saved runtime plans and dispatch outcomes. It never samples a replacement plan.",
      ),
    );
    const select = el("select", null, {
      "aria-label": this.t("Saved simulation date"),
    });
    for (const date of this.actual?.dates || [])
      select.append(el("option", date, { value: date }));
    select.value =
      this.timelineDate || this.actual?.plan?.simulation_date || "";
    select.addEventListener("change", () => {
      this.timelineDate = select.value;
      this.loadTimeline();
    });
    box.append(
      select,
      button(this.t("Refresh"), () => this.loadTimeline()),
      button(this.t("Download"), () =>
        this.download(
          "occupied-timeline.json",
          JSON.stringify(this.actual, null, 2),
        ),
      ),
    );
    if (this.actual) timeline(root, this.actual, this.saved, this.t);
  }
  renderPreview() {
    const root = this.shadowRoot.getElementById("view"),
      t = this.t;
    root.replaceChildren();
    const box = section(
      root,
      t("Preview schedule"),
      t(
        "See how your steps could play out. Previewing never controls devices or changes the running schedule.",
      ),
    );
    const advanced = details(box, t("Preview options"));
    for (const [key, label, type] of [
      ["date", "Date", "date"],
      ["days", "Days", "number"],
      ["seed", "Seed", "text"],
      ["at", "Projection instant (ISO time with offset, optional)", "text"],
    ]) {
      const field = el("label", t(label)),
        input = el("input", null, { type });
      input.value = this.previewSettings[key];
      if (key === "days") {
        input.min = 1;
        input.max = 31;
      }
      input.addEventListener("input", () => {
        this.previewSettings[key] =
          key === "days" ? Number(input.value) : input.value;
      });
      field.append(input);
      field.className = "field";
      (key === "date" ? box : advanced).append(field);
    }
    box.append(
      button(t("Run preview"), () => this.runPreview()),
      button(t("Reroll preview"), () => {
        this.previewSettings.seed = crypto.randomUUID();
        this.renderPreview();
        this.runPreview();
      }),
    );
    if (this.preview) {
      box.append(
        button(t("Download"), () =>
          this.download(
            "occupied-preview.json",
            JSON.stringify(this.preview, null, 2),
          ),
        ),
      );
      for (const plan of this.preview.plans || [])
        timeline(root, { plan }, this.previewProgram, t);
      if (this.preview.handover)
        section(root, t("Projected handover endpoints")).append(
          el("pre", JSON.stringify(this.preview.handover, null, 2)),
        );
    }
    this.toolbar();
  }
  runPreview() {
    if (!this.checkLocal()) return;
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
      if (this.tab === "preview") this.renderPreview();
    });
  }
  renderConfiguration() {
    const root = this.shadowRoot.getElementById("view"),
      t = this.t;
    const source = this.document.configuration_source || {
      mode: this.document.source || "gui",
      status: "ready",
    };
    const settings = section(
      root,
      t("Configuration source"),
      source.mode === "file"
        ? t(
            "The managed file is read only. You can edit, validate and preview a temporary draft; export it and update the file to apply those changes.",
          )
        : t(
            "GUI storage is authoritative. Importing YAML creates a draft snapshot. Selecting a managed file below changes the saved program explicitly.",
          ),
    );
    settings.append(
      el(
        "p",
        `${source.mode === "file" ? t("Managed file") : t("GUI storage")} · ${source.status || "ready"}`,
      ),
    );
    const path = el("input", null, {
      type: "text",
      "aria-label": t("Relative managed-file path"),
      placeholder: "occupied/house.yaml",
    });
    path.value = this.sourcePath ?? source.config_file ?? "occupied/house.yaml";
    path.addEventListener("input", () => {
      this.sourcePath = path.value;
    });
    const useFile = button(t("Use managed file"), () =>
      this.selectSource("file", path.value),
    );
    useFile.disabled = this.busy;
    settings.append(path, useFile);
    if (source.mode === "file") {
      const reload = button(t("Reload managed file"), () =>
        this.reloadManaged(),
      );
      const useGui = button(t("Copy saved program to GUI storage"), () =>
        this.selectSource("gui"),
      );
      reload.disabled = this.busy;
      useGui.disabled = this.busy || source.has_valid_program === false;
      settings.append(reload, useGui);
      if (source.observed_hash)
        settings.append(
          el(
            "p",
            `${t("Observed file hash")}: ${source.observed_hash.slice(0, 16)}`,
          ),
        );
      for (const issue of source.issues || [])
        settings.append(
          el(
            "p",
            `${issue.path || "$"}${issue.line ? ` · ${t("Line")} ${issue.line}` : ""}: ${issue.message}`,
            { class: "error" },
          ),
        );
    }
    const box = section(
      root,
      t("Occupied YAML import/export"),
      t(
        "Import replaces only the draft. Export normalizes the draft. Comments are not retained. Importing a local file does not select it as the managed source.",
      ),
    );
    const input = el("textarea", null, {
      rows: 18,
      "aria-label": t("Occupied YAML"),
    });
    input.value = this.yaml || "";
    input.style.width = "100%";
    input.addEventListener("input", () => {
      this.yaml = input.value;
    });
    const file = el("input", null, {
      type: "file",
      accept: ".yaml,.yml,.json",
      "aria-label": t("Choose configuration file"),
    });
    file.addEventListener("change", async () => {
      if (file.files[0]) {
        this.yaml = await file.files[0].text();
        input.value = this.yaml;
      }
    });
    box.append(
      file,
      input,
      button(t("Import as draft"), () => this.importYaml()),
      button(t("Export YAML"), () => this.exportYaml()),
      button(t("Download"), () =>
        this.download("occupied.yaml", this.yaml || "", "text/yaml"),
      ),
    );
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
      this.document = { ...this.document, ...result };
      this.saved = result.program;
      this.revision = result.revision;
      this.stale = false;
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
      const result = await this.ws("validate", { program: this.yaml || "" });
      if (epoch !== this.epoch || version !== this.version) return;
      this.showIssues(result);
      if (result.valid) {
        this.draft = result.program;
        this.raw.clear();
        this.localErrors.clear();
        this.edited(true);
      }
    });
  }
  exportYaml() {
    if (!this.checkLocal()) return;
    return this.run(async (epoch) => {
      const result = await this.ws("export", { program: copy(this.draft) });
      if (epoch !== this.epoch) return;
      this.showIssues(result);
      if (result.valid) {
        this.yaml = result.yaml;
        if (this.tab === "configuration") {
          this.shadowRoot.getElementById("view").replaceChildren();
          this.renderConfiguration();
        }
      }
    });
  }
  renderDiagnostics() {
    const root = this.shadowRoot.getElementById("view"),
      t = this.t;
    root.replaceChildren();
    const box = section(
      root,
      t("Diagnostics"),
      t(
        "Default exports contain counts and runtime status. Include household details explicitly to export entities, sampled plans, observations and outcomes. Credential fields remain redacted.",
      ),
    );
    const label = el("label"),
      input = el("input", null, { type: "checkbox" });
    input.checked = !!this.includeSensitive;
    input.addEventListener("change", () => {
      this.includeSensitive = input.checked;
    });
    label.append(
      input,
      document.createTextNode(t("Include household details")),
    );
    box.append(
      label,
      button(t("Refresh"), () =>
        this.run(async (epoch) => {
          const result = await this.ws("diagnostics", {
            include_sensitive: !!this.includeSensitive,
          });
          if (epoch !== this.epoch) return;
          this.diagnostics = result;
          this.renderDiagnostics();
        }),
      ),
    );
    if (this.diagnostics)
      box.append(
        button(t("Download"), () =>
          this.download(
            "occupied-diagnostics.json",
            JSON.stringify(this.diagnostics, null, 2),
          ),
        ),
        el("pre", JSON.stringify(this.diagnostics, null, 2)),
      );
    const outcomes = section(root, t("Recent runtime outcomes"));
    for (const item of (this.status?.outcomes || []).slice(-50).reverse())
      outcomes.append(el("pre", JSON.stringify(item)));
  }
  download(name, text, type = "application/json") {
    const url = URL.createObjectURL(new Blob([text], { type })),
      a = el("a", null, { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
if (!customElements.get("occupied-panel"))
  customElements.define("occupied-panel", OccupiedPanel);
