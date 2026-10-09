import type { OccupiedPanel } from "./occupied-panel.js";
import { html, nothing } from "./lit.js";
import { createStepEditorContext } from "./step-editor-controller.js";
import { timingSection } from "./step-editor-timing.js";
import { entitiesSection } from "./step-editor-entities.js";
import { actionSection } from "./step-editor-action.js";

export { focusEditor } from "./step-editor-controller.js";

export function stepEditorView(panel: OccupiedPanel) {
  const context = createStepEditorContext(panel);
  const { editor, form, t, editing, field, submit, cancel, back } = context;
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
      ${editing || editor.stage === 0
        ? timingSection(context)
        : nothing}${editing || editor.stage === 1
        ? entitiesSection(context)
        : nothing}${editing || editor.stage === 2
        ? actionSection(context)
        : nothing}
    </div>
    <div class="builder-footer">
      <button type="button" .disabled=${panel.busy} @click=${cancel}>
        ${t("Cancel")}
      </button>
      ${!editing && editor.stage > 0
        ? html`<button type="button" .disabled=${panel.busy} @click=${back}>
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
