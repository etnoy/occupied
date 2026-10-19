<script lang="ts">
  import { onMount } from "svelte";
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { ActionForm } from "../../types.js";
  import ActionPreviewCommand from "./ActionPreviewCommand.svelte";

  let {
    panel,
    commands,
    onClose,
  }: {
    panel: LoadedOccupiedPanel;
    commands: { label: string; form: ActionForm }[];
    onClose: () => void;
  } = $props();

  let dialog: HTMLDialogElement;
  let running = $state(false);

  onMount(() => dialog.showModal());
</script>

<dialog
  bind:this={dialog}
  class="step-advanced-dialog action-preview-dialog"
  aria-labelledby="action-preview-title"
  aria-describedby="action-preview-description"
  onclose={onClose}
  oncancel={(event) => {
    if (running) {
      event.preventDefault();
    }
  }}
>
  <h2 id="action-preview-title">{panel.t("preview")}</h2>
  <p id="action-preview-description" class="hint">
    {panel.t("action_preview_hint")}
  </p>
  {#each commands as command (command.label)}
    <ActionPreviewCommand {panel} {...command} bind:running />
  {/each}
  <div class="step-delete-actions">
    <button type="button" disabled={running} onclick={() => dialog.close()}
      >{panel.t("close")}</button
    >
  </div>
</dialog>

<style>
  .action-preview-dialog {
    width: 640px;
  }
</style>
