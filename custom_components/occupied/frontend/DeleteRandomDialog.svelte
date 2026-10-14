<script lang="ts">
  import { onMount } from "svelte";
  import type { OccupiedPanel } from "./occupied-panel.js";
  import { deleteRandom } from "./random-editor-controller.js";
  import { randomReferences } from "./model.js";
  import { randomEntries } from "./random-model.js";
  let { panel, onClose }: { panel: OccupiedPanel; onClose: () => void } =
    $props();
  let dialog: HTMLDialogElement;
  let dependents = $derived(
    randomEntries(panel.draft, panel.catalog).filter((entry) =>
      randomReferences(panel.draft, panel.randomEditor?.id || "").some(
        (path) => path[1] === entry.id,
      ),
    ),
  );
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
  {#if dependents.length}
    <p>{panel.t("Used by")}:</p>
    <ul>
      {#each dependents as entry}<li>{entry.name}</li>{/each}
    </ul>
    <p class="hint">{panel.t("Change those relationships before deleting.")}</p>
  {/if}
  <div class="step-delete-actions">
    <button type="button" disabled={panel.busy} onclick={() => dialog.close()}
      >{panel.t("Cancel")}</button
    >
    <button
      type="button"
      class="danger"
      disabled={panel.busy || panel.stale || !!dependents.length}
      onclick={async () => {
        await deleteRandom(panel);
        if (!panel.error && !panel.randomEditor) dialog.close();
      }}>{panel.t("Delete random event")}</button
    >
  </div>
</dialog>
