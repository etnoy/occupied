import type { OccupiedPanel } from "./occupied-panel.js";
import { html, nothing, ifDefined, live } from "./lit.js";
import { resources } from "./model.js";
import { download, progress } from "./util.js";
import { stepEntries } from "./step-model.js";
import { timeline, stamp } from "./timeline.js";

export function overviewView(panel: OccupiedPanel) {
  const t = panel.t,
    state = panel.status;
  if (!state) return html``;
  const labels = new Map(
    resources(panel.saved).map((resource) => [resource.id, resource.name]),
  );
  const fields = [
    ["Status", state.status],
    ["Reason", state.reason],
    ["Next action", stamp(state.next_event, panel.document.timezone)],
    ["Execution", state.dry_run ? t("Dry run") : t("Live")],
    [
      "Saved revision",
      state.source_revision?.slice(0, 12) || panel.revision?.slice(0, 12),
    ],
    [
      "Steps",
      stepEntries(panel.saved)
        .map((step) => step.name)
        .join(", ") || t("None"),
    ],
    ["Yielded targets", (state.yielded || []).join(", ") || t("None")],
  ];
  return html`<section>
      <h2>${t("Overview")}</h2>
      <div class="row">
        <button
          type="button"
          .disabled=${panel.busy}
          @click=${() => panel.control(state.enabled ? "stop" : "start")}
        >
          ${t(state.enabled ? "Disable" : "Enable")}
        </button>
        <button
          type="button"
          .disabled=${panel.busy}
          @click=${() => panel.control(state.paused ? "resume" : "pause")}
        >
          ${t(state.paused ? "Resume" : "Pause")}
        </button>
        ${state.mode === "daily"
          ? html`<button
              type="button"
              .disabled=${panel.busy}
              @click=${() =>
                panel.control("set_dry_run", { dry_run: !state.dry_run })}
            >
              ${t(state.dry_run ? "Select live execution" : "Select dry run")}
            </button>`
          : nothing}
      </div>
      <dl>
        ${fields.map(
          ([label, value]) =>
            html`<dt>${t(label || "")}</dt>
              <dd>${value}</dd>`,
        )}
      </dl>
    </section>
    <section>
      <h2>${t("Active activities")}</h2>
      ${state.activities?.length
        ? state.activities.map(
            (activity) =>
              html`<p>
                ${labels.get(activity.source_id) || activity.source_id} ·
                ${activity.phase} · ${t("Runtime deadline")}:
                ${stamp(activity.deadline, panel.document.timezone)} ·
                ${activity.resources.join(", ")}
              </p>`,
          )
        : html`<p>${t("None")}</p>`}
    </section>
    <section>
      <h2>${t("Lighting convergence")}</h2>
      ${Object.entries(state.handover || {}).map(
        ([entity, handover]) =>
          html` <p>
              ${entity} · ${stamp(handover.deadline, panel.document.timezone)} ·
              ${JSON.stringify(handover.observed)} →
              ${JSON.stringify(handover.target)}
            </p>
            <progress
              max="1"
              aria-label=${entity}
              data-start=${handover.start}
              data-deadline=${handover.deadline}
              .value=${progress(handover.start, handover.deadline)}
            ></progress>`,
      )}
      ${!Object.keys(state.handover || {}).length
        ? html`<p>${t("None")}</p>`
        : nothing}
    </section>
    <section>
      <h2>${t("Upcoming actions")}</h2>
      ${state.events?.length
        ? state.events
            .slice(0, 30)
            .map(
              (event) =>
                html`<p>
                  ${stamp(event.time, panel.document.timezone)} · ${event.event}
                  · ${event.id}
                </p>`,
            )
        : html`<p>${t("None")}</p>`}
    </section>
    ${state.last_error
      ? html`<p class="error">${state.last_error}</p>`
      : nothing}
    <p>
      ${t(
        "Home Assistant runs the program while this panel is closed. Draft edits and previews do not control devices.",
      )}
    </p>`;
}
export function timelineView(panel: OccupiedPanel) {
  const t = panel.t;
  return html`<section>
      <h2>${t("Actual timeline")}</h2>
      <p class="hint">
        ${t(
          "This view reads saved runtime plans and dispatch outcomes. It never samples a replacement plan.",
        )}
      </p>
      <select
        aria-label=${t("Saved simulation date")}
        .value=${panel.timelineDate ||
        panel.actual?.plan?.simulation_date ||
        ""}
        @change=${(event: Event) => {
          panel.timelineDate = (event.currentTarget as HTMLSelectElement).value;
          panel.loadTimeline();
        }}
      >
        ${(panel.actual?.dates || []).map(
          (date) => html`<option value=${date}>${date}</option>`,
        )}
      </select>
      <button type="button" @click=${() => panel.loadTimeline()}>
        ${t("Refresh")}</button
      ><button
        type="button"
        @click=${() =>
          download(
            "occupied-timeline.json",
            JSON.stringify(panel.actual, null, 2),
          )}
      >
        ${t("Download")}
      </button>
    </section>
    ${panel.actual ? timeline(panel.actual, panel.saved, t) : nothing}`;
}
export function previewView(panel: OccupiedPanel) {
  const t = panel.t;
  const field = (
    key: "date" | "days" | "seed" | "at",
    label: string,
    type: string,
  ) =>
    html`<label class="field"
      >${t(label)}<input
        type=${type}
        min=${ifDefined(key === "days" ? 1 : undefined)}
        max=${ifDefined(key === "days" ? 31 : undefined)}
        .value=${live(String(panel.previewSettings[key] ?? ""))}
        @input=${(event: Event) => {
          const value = (event.currentTarget as HTMLInputElement).value;
          if (key === "days") panel.previewSettings.days = Number(value);
          else panel.previewSettings[key] = value;
        }}
    /></label>`;
  return html`<section>
      <h2>${t("Preview schedule")}</h2>
      <p class="hint">
        ${t(
          "See how your steps could play out. Previewing never controls devices or changes the running schedule.",
        )}
      </p>
      ${field("date", "Date", "date")}
      <details>
        <summary>${t("Preview options")}</summary>
        ${field("days", "Days", "number")}${field(
          "seed",
          "Seed",
          "text",
        )}${field(
          "at",
          "Projection instant (ISO time with offset, optional)",
          "text",
        )}
      </details>
      <button type="button" @click=${() => panel.runPreview()}>
        ${t("Run preview")}</button
      ><button
        type="button"
        @click=${() => {
          panel.previewSettings.seed = crypto.randomUUID();
          panel.runPreview();
        }}
      >
        ${t("Reroll preview")}
      </button>
      ${panel.preview
        ? html`<button
            type="button"
            @click=${() =>
              download(
                "occupied-preview.json",
                JSON.stringify(panel.preview, null, 2),
              )}
          >
            ${t("Download")}
          </button>`
        : nothing}
    </section>
    ${(panel.preview?.plans || []).map((plan) =>
      timeline({ plan }, panel.previewProgram, t),
    )}
    ${panel.preview?.handover
      ? html`<section>
          <h2>${t("Projected handover endpoints")}</h2>
          <pre>${JSON.stringify(panel.preview.handover, null, 2)}</pre>
        </section>`
      : nothing}`;
}
export function configurationView(panel: OccupiedPanel) {
  const t = panel.t,
    source = panel.document.configuration_source || {
      mode: panel.document.source || "gui",
      status: "ready",
    };
  return html`<section>
      <h2>${t("Configuration source")}</h2>
      <p class="hint">
        ${t(
          source.mode === "file"
            ? "The managed file is read only. You can edit, validate and preview a temporary draft; export it and update the file to apply those changes."
            : "GUI storage is authoritative. Importing YAML creates a draft snapshot. Selecting a managed file below changes the saved program explicitly.",
        )}
      </p>
      <p>
        ${t(source.mode === "file" ? "Managed file" : "GUI storage")} ·
        ${source.status || "ready"}
      </p>
      <input
        type="text"
        aria-label=${t("Relative managed-file path")}
        placeholder="occupied/house.yaml"
        .value=${live(
          panel.sourcePath ?? source.config_file ?? "occupied/house.yaml",
        )}
        @input=${(event: Event) =>
          (panel.sourcePath = (event.currentTarget as HTMLInputElement).value)}
      />
      <button
        type="button"
        .disabled=${panel.busy}
        @click=${() =>
          panel.selectSource(
            "file",
            panel.sourcePath ?? source.config_file ?? "occupied/house.yaml",
          )}
      >
        ${t("Use managed file")}
      </button>
      ${source.mode === "file"
        ? html`<button
              type="button"
              .disabled=${panel.busy}
              @click=${() => panel.reloadManaged()}
            >
              ${t("Reload managed file")}
            </button>
            <button
              type="button"
              .disabled=${panel.busy || source.has_valid_program === false}
              @click=${() => panel.selectSource("gui")}
            >
              ${t("Copy saved program to GUI storage")}
            </button>
            ${source.observed_hash
              ? html`<p>
                  ${t("Observed file hash")}:
                  ${source.observed_hash.slice(0, 16)}
                </p>`
              : nothing}
            ${(source.issues || []).map(
              (issue) =>
                html`<p class="error">
                  ${issue.path || "$"}${issue.line
                    ? ` · ${t("Line")} ${issue.line}`
                    : ""}:
                  ${issue.message}
                </p>`,
            )}`
        : nothing}
    </section>
    <section>
      <h2>${t("Occupied YAML import/export")}</h2>
      <p class="hint">
        ${t(
          "Import replaces only the draft. Export normalizes the draft. Comments are not retained. Importing a local file does not select it as the managed source.",
        )}
      </p>
      <input
        type="file"
        accept=".yaml,.yml,.json"
        aria-label=${t("Choose configuration file")}
        @change=${async (event: Event) => {
          const file = (event.currentTarget as HTMLInputElement).files?.[0];
          if (file) {
            panel.yaml = await file.text();
            panel.flush();
          }
        }}
      />
      <textarea
        rows="18"
        aria-label=${t("Occupied YAML")}
        style="width:100%"
        .value=${live(panel.yaml)}
        @input=${(event: Event) =>
          (panel.yaml = (event.currentTarget as HTMLTextAreaElement).value)}
      ></textarea>
      <button type="button" @click=${() => panel.importYaml()}>
        ${t("Import as draft")}</button
      ><button type="button" @click=${() => panel.exportYaml()}>
        ${t("Export YAML")}</button
      ><button
        type="button"
        @click=${() => download("occupied.yaml", panel.yaml, "text/yaml")}
      >
        ${t("Download")}
      </button>
    </section>`;
}
export function diagnosticsView(panel: OccupiedPanel) {
  const t = panel.t;
  return html`<section>
      <h2>${t("Diagnostics")}</h2>
      <p class="hint">
        ${t(
          "Default exports contain counts and runtime status. Include household details explicitly to export entities, sampled plans, observations and outcomes. Credential fields remain redacted.",
        )}
      </p>
      <label
        ><input
          type="checkbox"
          .checked=${panel.includeSensitive}
          @change=${(event: Event) =>
            (panel.includeSensitive = (
              event.currentTarget as HTMLInputElement
            ).checked)}
        />${t("Include household details")}</label
      >
      <button type="button" @click=${() => panel.loadDiagnostics()}>
        ${t("Refresh")}
      </button>
      ${panel.diagnostics
        ? html`<button
              type="button"
              @click=${() =>
                download(
                  "occupied-diagnostics.json",
                  JSON.stringify(panel.diagnostics, null, 2),
                )}
            >
              ${t("Download")}
            </button>
            <pre>${JSON.stringify(panel.diagnostics, null, 2)}</pre>`
        : nothing}
    </section>
    <section>
      <h2>${t("Recent runtime outcomes")}</h2>
      ${(panel.status?.outcomes || [])
        .slice(-50)
        .reverse()
        .map((item) => html`<pre>${JSON.stringify(item)}</pre>`)}
    </section>`;
}
