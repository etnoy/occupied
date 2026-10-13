<script lang="ts">
  import { onMount } from "svelte";
  import type { OccupiedPanel } from "./occupied-panel.js";
  import { deleteRandom } from "./random-editor-controller.js";
  let { panel, onClose }: { panel: OccupiedPanel; onClose: () => void } =
    $props();
  let dialog: HTMLDialogElement;
  onMount(() => {
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("button")?.focus();
  });
</script>

<dialog
  bind:this={dialog}
  class="step-delete-dialog"
  aria-labelledby="random-delete-title"
  onclose={onClose}
>
  <h2 id="random-delete-title">{panel.t("Delete random event?")}</h2>
  <p>
    {panel.t("This removes the random event and all its future occurrences.")}
  </p>
  <div class="step-delete-actions">
    <button type="button" disabled={panel.busy} onclick={() => dialog.close()}
      >{panel.t("Cancel")}</button
    >
    <button
      type="button"
      class="danger"
      disabled={panel.busy || panel.stale}
      onclick={async () => {
        await deleteRandom(panel);
        if (!panel.error && !panel.randomEditor) dialog.close();
      }}>{panel.t("Delete random event")}</button
    >
  </div>
</dialog>
