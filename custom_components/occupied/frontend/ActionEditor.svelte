<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { ActionEditorContext } from "./types.js";
  import EditorField from "./EditorField.svelte";
  import EntitiesEditor from "./EntitiesEditor.svelte";
  import { coverActions } from "./cover.js";

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
      if (
        kind === "cover" &&
        !coverActions.some(([action]) => action === form.service)
      ) {
        form.service = "cover.open_cover";
      }
    }}
    options={{
      hideLabel: true,
      choices: [
        ["turn_on", "Turn on lights/switches"],
        ["turn_off", "Turn off lights/switches"],
        ["cover", "Control covers"],
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
  {#if form.kind === "cover"}
    <EditorField
      {panel}
      {context}
      key="service"
      label="Cover action"
      value={form.service}
      update={(value) => (form.service = value)}
      options={{ choices: coverActions, render: true }}
    />
    {#if form.service === "cover.set_cover_position"}
      <EditorField
        {panel}
        {context}
        key="position"
        label="Position (%)"
        value={form.position}
        update={(value) => (form.position = value)}
        options={{ type: "number", min: 0, max: 100, step: 1 }}
      />
    {:else if form.service === "cover.set_cover_tilt_position"}
      <EditorField
        {panel}
        {context}
        key="tiltPosition"
        label="Tilt position (%)"
        value={form.tiltPosition}
        update={(value) => (form.tiltPosition = value)}
        options={{ type: "number", min: 0, max: 100, step: 1 }}
      />
    {/if}
    <p class="hint">
      {t(
        "0% is closed; 100% is open. Device support determines which cover actions are available.",
      )}
    </p>
    <p class="hint">
      {t(
        "Covers run only at scheduled times. Enabling late skips past cover actions.",
      )}
    </p>
  {/if}
  {#if form.kind === "scene" || form.kind === "service"}
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
