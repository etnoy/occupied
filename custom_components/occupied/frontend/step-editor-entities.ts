import type { StepEditorContext } from "./step-editor-controller.js";
import type { HaSelector } from "./types.js";
import { html, nothing, ifDefined, live, repeat } from "./lit.js";
import { isValueChangedEvent } from "./util.js";

export function entitiesSection(context: StepEditorContext) {
  const { panel, editor, form, t, editing, changed, field, error } = context;
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
          aria-invalid=${ifDefined(editor.errors.entities ? "true" : undefined)}
          .hass=${panel._hass}
          .selector=${{
            entity: {
              multiple: form.kind !== "scene",
              ...(form.kind === "service"
                ? {}
                : {
                    filter: {
                      domain:
                        form.kind === "scene" ? ["scene"] : ["light", "switch"],
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
          aria-invalid=${ifDefined(editor.errors.entities ? "true" : undefined)}
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
}
