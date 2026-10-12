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
  let { editor, form, t, changed } = $derived(context);
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
  <h3>{t("Entities")}</h3>
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
      required: true,
      narrow: panel.hasAttribute("narrow"),
    }}
  ></ha-selector>
  <FieldError key="entities" errors={{ ...editor.errors }} />
  {#if form.kind === "entities" && form.entities.some((id) => !/^(light|switch)\./.test(id))}
    <p class="hint">
      {t(
        "This selection includes a custom entity. Select lights or switches for this step.",
      )}
    </p>
  {/if}
</div>
