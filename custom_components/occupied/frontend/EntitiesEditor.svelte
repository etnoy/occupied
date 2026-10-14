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
    label = "Entities",
  }: {
    panel: OccupiedPanel;
    context: ActionEditorContext;
    label?: string;
  } = $props();
  let { editor, form, t, changed } = $derived(context);
  let fieldPrefix = $derived(context.fieldPrefix || "");
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
                    form.kind === "scene"
                      ? ["scene"]
                      : form.kind === "cover"
                        ? ["cover"]
                        : ["light", "switch"],
                },
              }),
        },
      },
      value: form.kind === "scene" ? form.entities[0] || "" : form.entities,
      required: true,
      narrow: panel.hasAttribute("narrow"),
    }}
  ></ha-selector>
  <FieldError key="entities" {fieldPrefix} errors={{ ...editor.errors }} />
  {#if form.kind === "entities" && form.entities.some((id) => !/^(light|switch)\./.test(id))}
    <p class="hint">
      {t(
        "This selection includes a custom entity. Select lights or switches for this step.",
      )}
    </p>
  {/if}
</div>
