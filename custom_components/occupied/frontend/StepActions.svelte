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
  {#if entry.kind === "steps"}
    <button
      type="button"
      disabled={panel.busy || !!panel.stepEditor?.changed}
      title={panel.stepEditor?.changed
        ? panel.t("Save or cancel your changes before adding a related step.")
        : undefined}
      onclick={() => startStep(panel, null, entry)}
    >
      {panel.t("Add related step")}
    </button>
  {/if}
  <button
    bind:this={trigger}
    type="button"
    class="danger"
    disabled={panel.busy}
    onclick={() => flushSync(() => (deleteOpen = true))}
  >
    {panel.t("Delete step")}
  </button>
</div>
{#if deleteOpen}
  <DeleteStepDialog {panel} {entry} onClose={closeDeleteDialog} />
{/if}
