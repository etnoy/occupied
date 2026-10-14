<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { ActionEditorContext } from "./types.js";
  import FieldError from "./FieldError.svelte";
  import { properties } from "./dom.js";
  import type { HaSelector } from "./types.js";
  import { isValueChangedEvent } from "./util.js";

  let {
    panel,
    context,
    label = "entities_label",
  }: {
    panel: OccupiedPanel;
    context: ActionEditorContext;
    label?: string;
  } = $props();

  let { editor, form, t, changed } = $derived(context);
  let fieldPrefix = $derived(context.fieldPrefix || "");
  let domains = $derived.by(() => {
    if (form.kind === "scene") {
      return ["scene"];
    }
    if (form.kind === "cover") {
      return ["cover"];
    }

    return ["light", "switch"];
  });
</script>

<div data-editor-section="entities">
  <h4>{t(label)}</h4>
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
  <FieldError {t} key="entities" {fieldPrefix} errors={{ ...editor.errors }} />
  {#if form.kind === "entities" && form.entities.some((id) => !/^(light|switch)\./.test(id))}
    <p class="hint">
      {t("custom_entity_hint")}
    </p>
  {/if}
</div>
