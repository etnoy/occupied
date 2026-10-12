<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { StepEditorContext } from "./step-editor-controller.js";
  import EditorField from "./EditorField.svelte";

  let { panel, context }: { panel: OccupiedPanel; context: StepEditorContext } =
    $props();
  let { form, t } = $derived(context);
</script>

<div data-editor-section="action">
  <h3>{t("Action")}</h3>
  {#if form.kind === "scene"}
    <p>{t("Activate scene")}</p>
  {:else if form.kind === "service"}
    <EditorField
      {panel}
      {context}
      key="service"
      label="Service (domain.service)"
      value={form.service}
      update={(value) => (form.service = value)}
    ></EditorField>
    <EditorField
      {panel}
      {context}
      key="data"
      label="Service data (JSON)"
      value={form.data}
      update={(value) => (form.data = value)}
      options={{ multiline: true }}
    ></EditorField>
  {:else}
    <EditorField
      {panel}
      {context}
      key="action"
      label="Action"
      value={form.action}
      update={(value) => (form.action = value)}
      options={{
        choices: [
          ["turn_on", "Turn on"],
          ["turn_off", "Turn off"],
        ],
        render: true,
      }}
    ></EditorField>
  {/if}
  {#if form.kind === "entities" && form.action === "turn_on" && form.entities.some((id) => panel.catalog.entities.find((entity) => entity.entity_id === id)?.dimmable)}
    <EditorField
      {panel}
      {context}
      key="brightness"
      label="Brightness (%)"
      value={form.brightness}
      update={(value) => (form.brightness = value)}
      options={{ type: "number", min: 1, max: 100 }}
    ></EditorField>
    <p class="hint">
      {t(
        "Leave blank to use the default brightness. Applies to dimmable lights.",
      )}
    </p>
  {/if}
</div>
