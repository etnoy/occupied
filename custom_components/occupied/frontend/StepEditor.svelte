<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

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
  let { editor, form, t, editing, submit, cancel, back } = $derived(context);
</script>

<section class={editing ? "routine-editor editing" : "routine-editor"}>
  <h2 tabindex="-1">{t(editing ? "Edit step" : "Create step")}</h2>
  {#if !editing}
    <ol class="builder-steps" aria-label={t("Step setup")}>
      {#each ["Timing", "Entities", "Action"] as label, index}
        <li
          aria-current={index === editor.stage ? "step" : "false"}
          class={index < editor.stage ? "complete" : ""}
        >
          {index + 1}. {t(label)}
        </li>
      {/each}
    </ol>
  {/if}
  {#if editing || editor.stage === 0}
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
            : t("Optional, leave blank for auto-generated"),
        }}
      ></EditorField>
    </div>
  {/if}
  <div class="editor-sections">
    {#if editing || editor.stage === 0}
      <TimingEditor {panel} {context} />
    {/if}{#if editing || editor.stage === 1}
      <EntitiesEditor {panel} {context} />
    {/if}{#if editing || editor.stage === 2}
      <ActionEditor {panel} {context} />
    {/if}
  </div>
  <div class="builder-footer">
    <button type="button" disabled={panel.busy} onclick={cancel}>
      {t("Cancel")}
    </button>
    {#if !editing && editor.stage > 0}
      <button type="button" disabled={panel.busy} onclick={back}>
        {t("Back")}
      </button>
    {/if}
    <button
      type="button"
      class="primary"
      data-routine-submit
      disabled={panel.busy || panel.stale}
      onclick={submit}
    >
      {t(
        !editing && editor.stage < 2
          ? "Continue"
          : panel.document?.source === "file"
            ? "Add to draft"
            : "Save step",
      )}
    </button>
  </div>
</section>
