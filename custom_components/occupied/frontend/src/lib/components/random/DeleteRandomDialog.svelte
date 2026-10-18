<script lang="ts">
  import { onMount } from "svelte";
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import { deleteRandom } from "../../controllers/random-editor-controller.js";
  import { randomReferences } from "../../models/model.js";
  import { randomEntries } from "../../models/random-model.js";

  let { panel, onClose }: { panel: LoadedOccupiedPanel; onClose: () => void } =
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
  <h2 id="random-delete-title">{panel.t("delete_random_event_confirm")}</h2>
  <p>
    {panel.t("delete_random_event_hint")}
  </p>
  {#if dependents.length}
    <p>{panel.t("used_by")}:</p>
    <ul>
      {#each dependents as entry (entry.id)}
        <li>{entry.name}</li>
      {/each}
    </ul>
    <p class="hint">{panel.t("delete_dependents_hint")}</p>
  {/if}
  <div class="step-delete-actions">
    <button type="button" disabled={panel.busy} onclick={() => dialog.close()}
      >{panel.t("cancel")}</button
    >
    <button
      type="button"
      class="danger"
      disabled={panel.busy || panel.stale || dependents.length > 0}
      onclick={async () => {
        await deleteRandom(panel);
        if (!panel.error && !panel.randomEditor) {
          dialog.close();
        }
      }}>{panel.t("delete_random_event")}</button
    >
  </div>
</dialog>
