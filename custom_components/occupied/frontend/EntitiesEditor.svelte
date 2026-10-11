<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { StepEditorContext } from "./step-editor-controller.js";
  import EditorField from "./EditorField.svelte";
  import FieldError from "./FieldError.svelte";
  import { properties } from "./dom.js";
  import type { HaSelector } from "./types.js";
  import { isValueChangedEvent } from "./util.js";
  let { panel, context }: { panel: OccupiedPanel; context: StepEditorContext } =
    $props();
  let { editor, form, t, editing, changed } = $derived(context);
  let data = $derived.by(() => {
    context;
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
    return { selected, filtered };
  });
  let { selected, filtered } = $derived(data);
</script>

<div data-editor-section="entities">
  <EditorField
    {panel}
    {context}
    key="kind"
    label="Step type"
    value={form.kind}
    update={(value) => {
      form.kind = value;
      form.entities = [];
    }}
    options={{
      choices: [
        ["entities", "Lights and switches"],
        ["service", "Entity service action"],
        ["scene", "Home Assistant scene"],
      ],
      render: true,
    }}
  ></EditorField>
  <h3>{t(editing ? "Entities" : "Which entities should take part?")}</h3>
  <p class="hint">
    {t(
      form.kind === "scene"
        ? "Select a scene to activate."
        : "Select one or more entities. Search by name or room.",
    )}
  </p>
  {#if !customElements.get("ha-selector")}
    <input
      type="search"
      class="entity-search"
      placeholder={t("Search entities or rooms")}
      aria-label={t("Search entities or rooms")}
      value={editor.search || ""}
      oninput={(event: Event) => {
        editor.search = (event.currentTarget as HTMLInputElement).value;
        panel.flush();
      }}
    />
  {/if}
  <p class="selection-count" aria-live="polite">
    {`${form.entities.length} ${t("selected")}`}
  </p>
  {#if customElements.get("ha-selector")}
    <ha-selector
      class="entity-native-selector"
      data-builder-field="entities"
      aria-label={t("Entities")}
      aria-invalid={editor.errors.entities ? "true" : undefined}
      onvalue-changed={(event: Event) => {
        if (!isValueChangedEvent(event)) return;
        (event.currentTarget as HaSelector).value = event.detail.value;
        form.entities = Array.isArray(event.detail.value)
          ? event.detail.value
          : event.detail.value
            ? [event.detail.value]
            : [];
        changed("entities");
      }}
      use:properties={{
        hass: panel._hass,
        selector: {
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
        },
        value: form.kind === "scene" ? form.entities[0] || "" : form.entities,
        label: t("Entities"),
        required: true,
        narrow: panel.hasAttribute("narrow"),
      }}
    ></ha-selector>
  {:else}
    <!-- aria-invalid identifies this fallback group for field-error focus. -->
    <!-- svelte-ignore a11y_role_supports_aria_props -->
    <div
      class="entity-picker"
      data-builder-field="entities"
      role="group"
      aria-label={t("Entities")}
      tabindex="-1"
      aria-invalid={editor.errors.entities ? "true" : undefined}
    >
      {#each filtered as entity (entity.entity_id)}
        <label class="entity-option"
          ><input
            type="checkbox"
            value={entity.entity_id}
            checked={selected.has(entity.entity_id)}
            onchange={(event: Event) => {
              form.entities = (event.currentTarget as HTMLInputElement).checked
                ? form.kind === "scene"
                  ? [entity.entity_id]
                  : [...new Set([...form.entities, entity.entity_id])]
                : form.entities.filter((id) => id !== entity.entity_id);
              changed("entities");
            }}
          /><span
            ><strong>{entity.name || entity.entity_id}</strong><small
              >{[
                entity.area,
                entity.entity_id,
                entity.state === "unavailable" ? t("Unavailable") : "",
              ]
                .filter(Boolean)
                .join(" · ")}</small
            ></span
          ></label
        >
      {/each}
      {#if !filtered.length}
        <p class="hint">{t("No matching entities.")}</p>
      {/if}
    </div>
  {/if}<FieldError key="entities" errors={{ ...editor.errors }} />
  {#if form.kind === "entities" && form.entities.some((id) => !/^(light|switch)\./.test(id))}
    <p class="hint">
      {t(
        "This selection includes a custom entity. Select lights or switches for this step.",
      )}
    </p>
  {/if}
</div>
