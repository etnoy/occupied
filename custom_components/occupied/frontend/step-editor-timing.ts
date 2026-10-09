import type { StepEditorContext } from "./step-editor-controller.js";
import { focusEditor } from "./step-editor-controller.js";
import type { SourcePickerState } from "./types.js";
import { html, nothing } from "./lit.js";
import { sourcePicker } from "./source-picker.js";
import {
  stepEntries,
  timingExplanation,
  timeSourceChoices,
} from "./step-model.js";

export function timingSection(context: StepEditorContext) {
  const {
    panel,
    editor,
    form,
    time,
    t,
    editing,
    refresh,
    changed,
    field,
    error,
  } = context;
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
          ? html`<details .open=${!!time.fallback || !!editor.errors.fallback}>
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
}
