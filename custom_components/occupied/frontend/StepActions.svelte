<script lang="ts">
  import { flushSync } from "svelte";
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { StepEntry } from "./types.js";
  import { startStep } from "./steps.js";
  import DeleteStepDialog from "./DeleteStepDialog.svelte";

  let { panel, entry }: { panel: OccupiedPanel; entry: StepEntry } = $props();
  let deleteOpen = $state(false);
  let trigger: HTMLButtonElement;
  function closeDeleteDialog() {
    flushSync(() => (deleteOpen = false));
    if (trigger.isConnected) trigger.focus();
  }
</script>

<div class="step-editor-actions">
  {#if panel.stepEditor?.id === entry.id}
    <button
      type="button"
      aria-pressed={panel.stepEditor.form.enabled}
      disabled={panel.busy}
      onclick={() => {
        const editor = panel.stepEditor;
        if (!editor || editor.id !== entry.id) return;
        editor.form.enabled = !editor.form.enabled;
        editor.changed = true;
        panel.version++;
        panel.flush();
      }}
    >
      {panel.t(panel.stepEditor.form.enabled ? "Enabled" : "Disabled")}
    </button>
  {/if}
  {#if entry.kind === "steps"}
    <button
      type="button"
      disabled={panel.busy}
      onclick={() => startStep(panel, null, entry)}
    >
      {panel.t("Add related step")}
    </button>
  {/if}
  <button
    bind:this={trigger}
    type="button"
    class="danger icon-button"
    aria-label={panel.t("Delete step")}
    title={panel.t("Delete step")}
    disabled={panel.busy}
    onclick={() => flushSync(() => (deleteOpen = true))}
  >
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M9 3h6v2h5v2h-1v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4V5h5V3Zm-2 4v12h10V7H7Zm2 2h2v8H9V9Zm4 0h2v8h-2V9Z"
      />
    </svg>
  </button>
</div>
{#if deleteOpen}
  <DeleteStepDialog {panel} {entry} onClose={closeDeleteDialog} />
{/if}
