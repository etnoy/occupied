import type { OccupiedPanel } from "./occupied-panel.js";
import type { HaSelector, SourcePickerState } from "./types.js";
import { entityName, isValueChangedEvent, required } from "./util.js";
import { html, nothing, ifDefined, live, repeat, ref } from "./lit.js";
import { sourcePicker } from "./source-picker.js";
import {
  stepEntries,
  editorErrors,
  offsetErrors,
  buildStep,
  timingExplanation,
  timeSourceChoices,
} from "./step-model.js";

interface FieldOptions {
  type?: string;
  optional?: boolean;
  choices?: [string, string][];
  multiline?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  /** Move focus back to this field after the change renders. */
  render?: boolean;
  hideLabel?: boolean;
  trailing?: unknown;
}

export function focusEditor(panel: OccupiedPanel, key?: string) {
  const target = key
    ? panel.shadowRoot.querySelector<HTMLElement>(
        `[data-builder-field="${key}"]`,
      )
    : panel.shadowRoot.querySelector<HTMLElement>(
        '.routine-editor [aria-invalid="true"]',
      ) || panel.shadowRoot.querySelector<HTMLElement>(".routine-editor h2");
  target?.focus();
}

export function stepEditorView(panel: OccupiedPanel) {
  const editor = panel.stepEditor!,
    form = editor.form,
    time = form.timing,
    t = panel.t,
    editing = editor.existing;
  const refresh = (key?: string) => {
    panel.flush();
    focusEditor(panel, key);
  };
  const changed = (key: string) => {
    editor.changed = true;
    panel.version++;
    panel.validatedVersion = -1;
    delete editor.errors[key];
    if (["startOffset", "endOffset"].includes(key)) {
      const errors = offsetErrors(time);
      for (const offset of ["startOffset", "endOffset"]) {
        if (errors[offset]) editor.errors[offset] = errors[offset];
        else delete editor.errors[offset];
      }
    }
    // Lit updates the existing inputs and HA selectors; typing retains focus.
    panel.flush();
  };
  const error = (key: string) =>
    editor.errors[key]
      ? html`<p
          class="error"
          id=${`routine-error-${key}`}
          data-builder-error=${key}
          role="alert"
        >
          ${editor.errors[key]}
        </p>`
      : nothing;
  const field = (
    key: string,
    label: string,
    value: string | number,
    update: (value: string) => void,
    options: FieldOptions = {},
  ) => {
    const id = `routine-${key}`,
      invalid = ifDefined(editor.errors[key] ? "true" : undefined),
      described = ifDefined(
        editor.errors[key] ? `routine-error-${key}` : undefined,
      );
    const nativeTime =
      options.type === "time" &&
      customElements.get("ha-selector") &&
      customElements.get("ha-selector-time") &&
      customElements.get("ha-time-input");
    const input = (event: Event) => {
      const control = event.currentTarget as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | HaSelector;
      if (nativeTime) {
        if (!isValueChangedEvent(event)) return;
        control.value = event.detail.value || "";
      }
      update(String(control.value ?? ""));
      changed(key);
      if (options.render) focusEditor(panel, key);
    };
    return html`<div class="field">
      ${!nativeTime && !options.hideLabel
        ? html`<div class=${options.trailing ? "field-label-row" : ""}>
            <label for=${id}>${t(label)}</label>${options.trailing || nothing}
          </div>`
        : nothing}
      ${nativeTime
        ? html`<ha-selector
            id=${id}
            data-builder-field=${key}
            aria-label=${t(label)}
            aria-invalid=${invalid}
            aria-describedby=${described}
            .hass=${panel._hass}
            .selector=${{ time: {} }}
            .label=${t(label)}
            .required=${!options.optional}
            .value=${value || undefined}
            tabindex="0"
            @value-changed=${input}
          ></ha-selector>`
        : options.choices
          ? html`<select
              id=${id}
              data-builder-field=${key}
              aria-invalid=${invalid}
              aria-describedby=${described}
              .value=${live(String(value))}
              @change=${input}
            >
              ${options.choices.map(
                ([v, name]) => html`<option value=${v}>${t(name)}</option>`,
              )}
            </select>`
          : options.multiline
            ? html`<textarea
                id=${id}
                data-builder-field=${key}
                aria-label=${ifDefined(
                  options.hideLabel ? t(label) : undefined,
                )}
                aria-invalid=${invalid}
                aria-describedby=${described}
                .value=${live(String(value))}
                @input=${input}
              ></textarea>`
            : html`<input
                id=${id}
                data-builder-field=${key}
                type=${options.type || "text"}
                aria-label=${ifDefined(
                  options.hideLabel ? t(label) : undefined,
                )}
                aria-invalid=${invalid}
                aria-describedby=${described}
                min=${ifDefined(options.min)}
                max=${ifDefined(options.max)}
                step=${ifDefined(options.step)}
                placeholder=${ifDefined(options.placeholder)}
                .value=${live(String(value))}
                @input=${input}
                ${ref((node) => {
                  if (node && ["startOffset", "endOffset"].includes(key))
                    (node as HTMLInputElement).setCustomValidity(
                      editor.errors[key] || "",
                    );
                })}
              />`}
      ${error(key)}
    </div>`;
  };
  const timing = () => {
    let choices = timeSourceChoices(panel.draft, editor.id, panel.catalog);
    if (time.anchor && !choices.some((choice) => choice.value === time.anchor))
      choices = [
        ...choices,
        { value: time.anchor, name: time.anchor, group: "Unavailable sources" },
      ];
    return html`<div data-editor-section="time">
      <h3 id="routine-timing-heading">
        ${t(editing ? "Timing" : "When should it happen?")}
      </h3>
      <fieldset class="timing-options" aria-labelledby="routine-timing-heading">
        <div class="timing-option-row">
          ${[
            ["absolute", "Absolute time"],
            ["relative", "Relative to"],
          ].map(
            ([value, label]) =>
              html`<label class="timing-option"
                ><input
                  type="radio"
                  name="step-timing-mode"
                  value=${value}
                  data-builder-field="mode"
                  .checked=${time.mode === value}
                  @change=${(event: Event) => {
                    if (!(event.currentTarget as HTMLInputElement).checked)
                      return;
                    time.mode = value;
                    if (value === "relative" && !time.anchor)
                      time.anchor = "sun:sunrise";
                    changed("mode");
                    panel.shadowRoot
                      .querySelector<HTMLElement>(
                        '[data-builder-field="mode"]:checked',
                      )
                      ?.focus();
                  }}
                /><span>${t(label)}</span></label
              >`,
          )}
        </div>
        ${error("mode")}
      </fieldset>
      ${time.mode === "absolute"
        ? html` ${field(
            "start",
            "Start time window",
            time.start,
            (value) => (time.start = value),
            { type: "time", step: 1 },
          )}
          ${time.end || editor.showEndTime || editor.errors.end
            ? html` ${field(
                  "end",
                  "End of window (optional)",
                  time.end,
                  (value) => (time.end = value),
                  { type: "time", step: 1, optional: true },
                )}
                <button
                  type="button"
                  class="text-button"
                  @click=${() => {
                    time.end = "";
                    editor.showEndTime = false;
                    changed("end");
                    focusEditor(panel, "start");
                  }}
                >
                  ${t("Remove end of window")}
                </button>`
            : html`<button
                type="button"
                class="text-button"
                @click=${() => {
                  time.end = time.start;
                  editor.showEndTime = true;
                  changed("end");
                  focusEditor(panel, "end");
                }}
              >
                ${t("Add end of window")}
              </button>`}`
        : html` ${sourcePicker({
            hass: panel._hass,
            choices,
            value: time.anchor,
            t,
            error: editor.errors.anchor,
            onChange: (value) => {
              time.anchor = value;
              if (!editor.existing && value.startsWith("step:")) {
                const parent = stepEntries(panel.draft).find(
                  (step) => step.id === value.slice(5),
                );
                if (parent) form.days = [...parent.days];
              }
              changed("anchor");
              const picker = panel.shadowRoot.querySelector<
                HTMLElement & SourcePickerState
              >('[data-builder-field="anchor"]');
              if (picker && panel.shadowRoot.activeElement !== picker) {
                picker.suppressNextOpen = true;
                picker.focus();
              }
            },
          })}
          ${time.anchor.startsWith("entity:")
            ? html`<p class="hint">
                ${t(
                  "Uses the time currently reported by Home Assistant. Time-only helpers repeat daily; dated sources run only on their reported date.",
                )}
              </p>`
            : nothing}
          ${field(
            "startOffset",
            "Start offset",
            time.startOffset,
            (value) => (time.startOffset = value),
            { placeholder: "30m or 1h" },
          )}
          ${time.endOffset || editor.showEndOffset || editor.errors.endOffset
            ? field(
                "endOffset",
                "End offset (optional)",
                time.endOffset,
                (value) => (time.endOffset = value),
                {
                  trailing: html`<button
                    type="button"
                    class="text-button"
                    @click=${() => {
                      time.endOffset = "";
                      editor.showEndOffset = false;
                      changed("endOffset");
                      focusEditor(panel, "startOffset");
                    }}
                  >
                    ${t("Remove end offset")}
                  </button>`,
                },
              )
            : html`<button
                type="button"
                class="text-button"
                @click=${() => {
                  editor.showEndOffset = true;
                  refresh("endOffset");
                }}
              >
                ${t("Add end offset")}
              </button>`}
          ${time.anchor.startsWith("sun:")
            ? html`<details
                .open=${!!time.fallback || !!editor.errors.fallback}
              >
                <summary>${t("If the sun event is unavailable")}</summary>
                ${field(
                  "fallback",
                  "Fallback time (optional)",
                  time.fallback,
                  (value) => (time.fallback = value),
                  { type: "time", optional: true },
                )}
              </details>`
            : nothing}`}
      <p class="hint" data-timing-explanation aria-live="polite">
        ${timingExplanation(
          time,
          stepEntries(panel.draft),
          t,
          panel.catalog.time_sources,
        )}
      </p>
      ${panel.document?.source === "file"
        ? html`<p class="hint">
            ${t(
              "This program is managed by a file. Add changes to your draft, then export them from Settings.",
            )}
          </p>`
        : nothing}
    </div>`;
  };
  const entities = () => {
    const selected = new Set(form.entities);
    const catalog = panel.catalog.entities.filter(
      (entity) =>
        form.kind === "service" ||
        (form.kind === "scene" ? /^scene\./ : /^(light|switch)\./).test(
          entity.entity_id,
        ),
    );
    for (const id of form.entities)
      if (!catalog.some((entity) => entity.entity_id === id))
        catalog.push({ entity_id: id, name: id, state: "unavailable" });
    catalog.sort(
      (a, b) =>
        Number(selected.has(b.entity_id)) - Number(selected.has(a.entity_id)),
    );
    const query = (editor.search || "").toLowerCase();
    const filtered = catalog.filter((entity) =>
      `${entity.name} ${entity.area || ""} ${entity.entity_id}`
        .toLowerCase()
        .includes(query),
    );
    return html`<div data-editor-section="entities">
      ${field(
        "kind",
        "Step type",
        form.kind,
        (value) => {
          form.kind = value;
          form.entities = [];
        },
        {
          choices: [
            ["entities", "Lights and switches"],
            ["service", "Entity service action"],
            ["scene", "Home Assistant scene"],
          ],
          render: true,
        },
      )}
      <h3>${t(editing ? "Entities" : "Which entities should take part?")}</h3>
      <p class="hint">
        ${t(
          form.kind === "scene"
            ? "Select a scene to activate."
            : "Select one or more entities. Search by name or room.",
        )}
      </p>
      ${!customElements.get("ha-selector")
        ? html`<input
            type="search"
            class="entity-search"
            placeholder=${t("Search entities or rooms")}
            aria-label=${t("Search entities or rooms")}
            .value=${live(editor.search || "")}
            @input=${(event: Event) => {
              editor.search = (event.currentTarget as HTMLInputElement).value;
              panel.flush();
            }}
          />`
        : nothing}
      <p class="selection-count" aria-live="polite">
        ${form.entities.length} ${t("selected")}
      </p>
      ${customElements.get("ha-selector")
        ? html`<ha-selector
            class="entity-native-selector"
            data-builder-field="entities"
            aria-label=${t("Entities")}
            aria-invalid=${ifDefined(
              editor.errors.entities ? "true" : undefined,
            )}
            .hass=${panel._hass}
            .selector=${{
              entity: {
                multiple: form.kind !== "scene",
                ...(form.kind === "service"
                  ? {}
                  : {
                      filter: {
                        domain:
                          form.kind === "scene"
                            ? ["scene"]
                            : ["light", "switch"],
                      },
                    }),
              },
            }}
            .value=${form.kind === "scene"
              ? form.entities[0] || ""
              : form.entities}
            .label=${t("Entities")}
            .required=${true}
            .narrow=${panel.hasAttribute("narrow")}
            @value-changed=${(event: Event) => {
              if (!isValueChangedEvent(event)) return;
              (event.currentTarget as HaSelector).value = event.detail.value;
              form.entities = Array.isArray(event.detail.value)
                ? event.detail.value
                : event.detail.value
                  ? [event.detail.value]
                  : [];
              changed("entities");
            }}
          ></ha-selector>`
        : html`<div
            class="entity-picker"
            data-builder-field="entities"
            role="group"
            aria-label=${t("Entities")}
            tabindex="-1"
            aria-invalid=${ifDefined(
              editor.errors.entities ? "true" : undefined,
            )}
          >
            ${repeat(
              filtered,
              (entity) => entity.entity_id,
              (entity) =>
                html`<label class="entity-option"
                  ><input
                    type="checkbox"
                    value=${entity.entity_id}
                    .checked=${selected.has(entity.entity_id)}
                    @change=${(event: Event) => {
                      form.entities = (event.currentTarget as HTMLInputElement)
                        .checked
                        ? form.kind === "scene"
                          ? [entity.entity_id]
                          : [...new Set([...form.entities, entity.entity_id])]
                        : form.entities.filter((id) => id !== entity.entity_id);
                      changed("entities");
                    }}
                  /><span
                    ><strong>${entity.name || entity.entity_id}</strong
                    ><small
                      >${[
                        entity.area,
                        entity.entity_id,
                        entity.state === "unavailable" ? t("Unavailable") : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}</small
                    ></span
                  ></label
                >`,
            )}
            ${!filtered.length
              ? html`<p class="hint">${t("No matching entities.")}</p>`
              : nothing}
          </div>`}${error("entities")}
      ${form.kind === "entities" &&
      form.entities.some((id) => !/^(light|switch)\./.test(id))
        ? html`<p class="hint">
            ${t(
              "This selection includes a custom entity. Select lights or switches for this step.",
            )}
          </p>`
        : nothing}
    </div>`;
  };
  const action = () =>
    html`<div data-editor-section="action">
      <h3>${t(editing ? "Action" : "What should happen?")}</h3>
      <p class="hint">
        ${form.entities.map((id) => entityName(panel.catalog, id)).join(", ")}
      </p>
      ${form.kind === "scene"
        ? html`<p>${t("Activate scene")}</p>`
        : form.kind === "service"
          ? html` ${field(
              "service",
              "Service (domain.service)",
              form.service,
              (value) => (form.service = value),
            )}
            ${field(
              "data",
              "Service data (JSON)",
              form.data,
              (value) => (form.data = value),
              { multiline: true },
            )}`
          : field(
              "action",
              "Action",
              form.action,
              (value) => (form.action = value),
              {
                choices: [
                  ["turn_on", "Turn on"],
                  ["turn_off", "Turn off"],
                ],
                render: true,
              },
            )}
      ${form.kind === "entities" &&
      form.action === "turn_on" &&
      form.entities.some(
        (id) =>
          panel.catalog.entities.find((entity) => entity.entity_id === id)
            ?.dimmable,
      )
        ? html` ${field(
              "brightness",
              "Brightness (%)",
              form.brightness,
              (value) => (form.brightness = value),
              { type: "number", min: 1, max: 100 },
            )}
            <p class="hint">
              ${t(
                "Leave blank to use the default brightness. Applies to dimmable lights.",
              )}
            </p>`
        : nothing}
    </div>`;
  const submit = async () => {
    if (
      !editing &&
      editor.stage === 2 &&
      !form.name.trim() &&
      form.entities.length
    ) {
      const target = `${entityName(panel.catalog, form.entities[0])}${form.entities.length > 1 ? ` +${form.entities.length - 1}` : ""}`;
      form.name =
        form.kind === "entities"
          ? `${target} ${t(form.action === "turn_off" ? "off" : "on")}`
          : target;
    }
    editor.errors = editorErrors(
      panel.draft,
      editor,
      editing ? 2 : editor.stage,
    );
    if (Object.keys(editor.errors).length) return refresh();
    if (!editing && editor.stage < 2) {
      editor.stage++;
      return refresh();
    }
    try {
      const candidate = buildStep(panel.draft, editor);
      editor.candidatePath = required(
        stepEntries(candidate).find((entry) => entry.id === editor.id),
      ).path;
      if (panel.document?.source === "file") {
        panel.change([], candidate);
        panel.selectedStep = editor.id;
        panel.stepEditor = null;
        panel.renderView();
      } else await panel.save(candidate);
    } catch (error) {
      panel.fail(error);
    }
  };
  return html`<section
    class=${editing ? "routine-editor editing" : "routine-editor"}
  >
    <h2 tabindex="-1">${t(editing ? "Edit step" : "Create step")}</h2>
    ${!editing
      ? html`<ol class="builder-steps" aria-label=${t("Step setup")}>
          ${["Timing", "Entities", "Action"].map(
            (label, index) =>
              html`<li
                aria-current=${index === editor.stage ? "step" : "false"}
                class=${index < editor.stage ? "complete" : ""}
              >
                ${index + 1}. ${t(label)}
              </li>`,
          )}
        </ol>`
      : nothing}
    ${editing || editor.stage === 0
      ? html`<div class="step-name-editor">
          ${field(
            "name",
            "Step name",
            form.name,
            (value) => (form.name = value),
            {
              hideLabel: true,
              placeholder: editing
                ? undefined
                : t("Optional, leave blank for auto-generated"),
            },
          )}
        </div>`
      : nothing}
    <div class="editor-sections">
      ${editing || editor.stage === 0 ? timing() : nothing}${editing ||
      editor.stage === 1
        ? entities()
        : nothing}${editing || editor.stage === 2 ? action() : nothing}
    </div>
    <div class="builder-footer">
      <button
        type="button"
        .disabled=${panel.busy}
        @click=${() => {
          panel.stepEditor = null;
          panel.error = "";
          panel.issues = [];
          panel.version++;
          panel.renderView();
        }}
      >
        ${t("Cancel")}
      </button>
      ${!editing && editor.stage > 0
        ? html`<button
            type="button"
            .disabled=${panel.busy}
            @click=${() => {
              editor.stage--;
              refresh();
            }}
          >
            ${t("Back")}
          </button>`
        : nothing}
      <button
        type="button"
        class="primary"
        data-routine-submit
        .disabled=${panel.busy || panel.stale}
        @click=${submit}
      >
        ${t(
          !editing && editor.stage < 2
            ? "Continue"
            : panel.document?.source === "file"
              ? "Add to draft"
              : "Save step",
        )}
      </button>
    </div>
  </section>`;
}
