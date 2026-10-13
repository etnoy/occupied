<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { ActionEditorContext } from "./types.js";
  import EditorField from "./EditorField.svelte";
  import EntitiesEditor from "./EntitiesEditor.svelte";

  let {
    panel,
    context,
    heading = "Action",
    kindLabel = "Step type",
    entityLabel = "Entities",
    hideEntities = false,
  }: {
    panel: OccupiedPanel;
    context: ActionEditorContext;
    heading?: string;
    kindLabel?: string;
    entityLabel?: string;
    hideEntities?: boolean;
  } = $props();
  let { form, t } = $derived(context);
</script>

<div data-editor-section="action">
  <h3>{t(heading)}</h3>
  <EditorField
    {panel}
    {context}
    key="kind"
    label={kindLabel}
    value={form.kind === "entities" ? form.action : form.kind}
    update={(value) => {
      const kind =
        value === "turn_on" || value === "turn_off" ? "entities" : value;
      if (form.kind !== kind) form.entities = [];
      form.kind = kind;
      if (kind === "entities") form.action = value;
    }}
    options={{
      hideLabel: true,
      choices: [
        ["turn_on", "Turn on lights/switches"],
        ["turn_off", "Turn off lights/switches"],
        ["service", "Entity service action"],
        ["scene", "Activate Home Assistant scene"],
      ],
      render: true,
    }}
  ></EditorField>
  {#if !hideEntities}<EntitiesEditor
      {panel}
      {context}
      label={entityLabel}
    />{/if}
  {#if form.kind === "service"}
    <EditorField
      {panel}
      {context}
      key="service"
      label="Service (domain.service)"
      value={form.service}
      update={(value) => (form.service = value)}
    ></EditorField>
  {/if}
  {#if form.kind !== "entities"}
    <EditorField
      {panel}
      {context}
      key="data"
      label="Service data (JSON)"
      value={form.data}
      update={(value) => (form.data = value)}
      options={{ multiline: true }}
    ></EditorField>
  {/if}
</div>
