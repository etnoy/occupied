import type { StepEditorContext } from "./step-editor-controller.js";
import { html, nothing } from "./lit.js";
import { entityName } from "./util.js";

export function actionSection(context: StepEditorContext) {
  const { panel, form, t, editing, field } = context;
  return html`<div data-editor-section="action">
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
}
