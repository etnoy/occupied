<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import { stepEntries } from "./step-model.js";
  import StepActions from "./StepActions.svelte";
  import EditorField from "./EditorField.svelte";

  import TimingEditor from "./TimingEditor.svelte";
  import EntitiesEditor from "./EntitiesEditor.svelte";
  import ActionEditor from "./ActionEditor.svelte";
  import { createStepEditorContext } from "./step-editor-controller.js";
  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  let context = $derived.by(() => {
    revision;
    return createStepEditorContext(panel);
  });
  let { editor, form, t, editing, submit, cancel } = $derived(context);
</script>

<section class="routine-editor">
  {#if !editing}<h2 tabindex="-1">{t("Create step")}</h2>{/if}
  <div class="step-name-editor">
    <EditorField
      {panel}
      {context}
      key="name"
      label="Step name"
      value={form.name}
      update={(value) => (form.name = value)}
      options={{
        hideLabel: true,
        placeholder: editing
          ? undefined
          : t("Optional title"),
      }}
    ></EditorField>
  </div>
  <div class="editor-sections">
    <TimingEditor {panel} {context} />
    <EntitiesEditor {panel} {context} />
    <ActionEditor {panel} {context} />
  </div>
  <div class="builder-footer">
    <button type="button" disabled={panel.busy} onclick={cancel}>
      {t("Cancel")}
    </button>
    {#if editing}
      {@const entry = stepEntries(panel.draft).find(
        (item) => item.id === editor.id,
      )}
      {#if entry}<StepActions {panel} {entry} />{/if}
    {/if}
    <button
      type="button"
      class="primary"
      data-routine-submit
      disabled={panel.busy || panel.stale}
      onclick={submit}
    >
      {t(panel.document?.source === "file" ? "Add to draft" : "Save step")}
    </button>
  </div>
</section>
