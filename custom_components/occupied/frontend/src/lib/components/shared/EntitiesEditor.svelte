<script lang="ts">
  import { flushSync } from "svelte";
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { ActionEditorContext } from "../../types.js";
  import FieldError from "./FieldError.svelte";
  import { properties } from "../../actions/dom.js";
  import type { HaSelector } from "../../types.js";
  import { isValueChangedEvent } from "../../utils/util.js";
  import { setActionEntities } from "../../utils/entity-settings.js";
  import EntityRow from "./EntityRow.svelte";
  import { focusEditor } from "../../controllers/step-editor-controller.js";

  let {
    panel,
    context,
    label = "entities_label",
    readOnlyTargets = false,
  }: {
    panel: LoadedOccupiedPanel;
    context: ActionEditorContext;
    label?: string;
    readOnlyTargets?: boolean;
  } = $props();

  let { editor, form, t, changed } = $derived(context);
  let fieldPrefix = $derived(context.fieldPrefix || "");

  let adding = $state(false);

  let domains = $derived.by(() => {
    if (form.kind === "scene") {
      return ["scene"];
    }

    return ["cover", "remote"].includes(form.kind)
      ? [form.kind]
      : ["light", "switch"];
  });
</script>

<div data-editor-section="entities">
  <h4>{t(label)}</h4>
  {#if form.kind === "entities"}
    {#each form.entities as entity (entity)}
      <EntityRow
        {panel}
        {context}
        {entity}
        readOnlyTarget={readOnlyTargets}
        replace={(value) => {
          if (value === entity || form.entities.includes(value)) {
            return;
          }
          setActionEntities(
            form,
            form.entities.map((id) => (id === entity ? value : id)),
          );
          changed("entities");
        }}
        remove={() => {
          setActionEntities(
            form,
            form.entities.filter((id) => id !== entity),
          );
          changed("entities");
        }}
      />
    {/each}
    {#if !readOnlyTargets}
      {#if adding || form.entities.length === 0}
        <!-- HA's picker supplies keyboard navigation inside the custom element. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <ha-selector
          tabindex="0"
          aria-label={t("add_entity")}
          data-builder-field={`${fieldPrefix}entities`}
          aria-invalid={editor.errors.entities ? "true" : undefined}
          aria-describedby={editor.errors.entities
            ? `step-error-${fieldPrefix}entities`
            : undefined}
          use:properties={{
            hass: panel._hass,
            selector: {
              entity: {
                filter: { domain: ["light", "switch"] },
                exclude_entities: form.entities,
              },
            },
            value: "",
            label: t("add_entity"),
            narrow: panel.hasAttribute("narrow"),
          }}
          onvalue-changed={(event: Event) => {
            if (
              !isValueChangedEvent(event) ||
              typeof event.detail.value !== "string" ||
              !event.detail.value
            ) {
              return;
            }
            setActionEntities(form, [...form.entities, event.detail.value]);
            (event.currentTarget as HaSelector).value = "";
            adding = false;
            changed("entities");
          }}
        ></ha-selector>
      {:else}
        <button
          type="button"
          onclick={() => {
            flushSync(() => (adding = true));
            focusEditor(panel, `${fieldPrefix}entities`);
          }}>{t("add_entity")}</button
        >
      {/if}
    {/if}
  {:else}
    <ha-selector
      class="entity-native-selector"
      data-builder-field={`${fieldPrefix}entities`}
      aria-label={t(label)}
      aria-invalid={editor.errors.entities ? "true" : undefined}
      aria-describedby={editor.errors.entities
        ? `step-error-${fieldPrefix}entities`
        : undefined}
      onvalue-changed={(event: Event) => {
        if (!isValueChangedEvent(event)) {
          return;
        }
        (event.currentTarget as HaSelector).value = event.detail.value;
        const value = event.detail.value;
        if (Array.isArray(value)) {
          form.entities = value;
        } else {
          form.entities = typeof value === "string" && value ? [value] : [];
        }
        changed("entities");
      }}
      use:properties={{
        hass: panel._hass,
        selector: {
          entity: {
            multiple: form.kind !== "scene",
            ...(form.kind !== "service" && {
              filter: { domain: domains },
            }),
          },
        },
        value: form.kind === "scene" ? form.entities[0] || "" : form.entities,
        required: true,
        narrow: panel.hasAttribute("narrow"),
      }}
    ></ha-selector>
  {/if}
  <FieldError {t} key="entities" {fieldPrefix} errors={{ ...editor.errors }} />
  {#if form.kind === "entities" && form.entities.some((id) => !/^(light|switch)\./.test(id))}
    <p class="hint">
      {t("custom_entity_hint")}
    </p>
  {/if}
</div>
