<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import { stepEntries } from "./step-model.js";
  import StepActions from "./StepActions.svelte";
  import EditorField from "./EditorField.svelte";
  import FieldError from "./FieldError.svelte";

  import TimingEditor from "./TimingEditor.svelte";
  import ActionEditor from "./ActionEditor.svelte";
  import { createStepEditorContext } from "./step-editor-controller.js";

  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();

  let context = $derived.by(() => {
    void revision;

    return createStepEditorContext(panel);
  });
  let { editor, form, t, editing, submit, cancel } = $derived(context);
</script>

<section class="step-editor">
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
        placeholder: editing ? undefined : t("Optional title"),
      }}
    ></EditorField>
  </div>
  <div class="editor-sections">
    <TimingEditor {panel} {context} />
    <ActionEditor {panel} {context} />
  </div>
  <FieldError key="days" errors={{ ...editor.errors }} />
  <div class="builder-footer">
    <button type="button" disabled={panel.busy} onclick={cancel}>
      {t("Cancel")}
    </button>
    {#if editing}
      {@const entry = stepEntries(panel.draft, panel.catalog, panel.t).find(
        (item) => item.id === editor.id,
      )}
      {#if entry}
        <StepActions {panel} {entry} {context} />{/if}
    {:else}
      <StepActions {panel} {context} />
    {/if}
    <button
      type="button"
      class="primary"
      data-step-submit
      disabled={panel.busy || panel.stale}
      onclick={submit}
    >
      {t(panel.document?.source === "file" ? "Add to draft" : "Save step")}
    </button>
  </div>
</section>
