<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { StepEntry } from "./types.js";
  import { reference } from "./dom.js";
  import { copy, removeStep } from "./model.js";

  import { stepEntries, dependentNames } from "./step-model.js";

  import { onMount } from "svelte";
  let {
    panel,
    entry,
    onClose,
  }: {
    panel: OccupiedPanel;
    entry: StepEntry;
    onClose: () => void;
  } = $props();
  let t = $derived(panel.t);
  let dependents = $derived(dependentNames(panel.draft, entry.id));
  let dialog: HTMLDialogElement;
  onMount(() => {
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("button")?.focus();
  });
</script>

<dialog
  use:reference={(node) => {
    if (node) dialog = node as HTMLDialogElement;
  }}
  class="step-delete-dialog"
  aria-labelledby="step-delete-title"
  aria-describedby="step-delete-description"
  onclose={onClose}
>
  <h2 id="step-delete-title">{t("Delete step?")}</h2>
  <div id="step-delete-description">
    <p>{entry.name}</p>
    {#if dependents.length}
      <p>{t("Used by")}:</p>
      <ul>
        {#each dependents as name}
          <li>{name}</li>
        {/each}
      </ul>
      <p class="hint">
        {t("Change those relationships before deleting.")}
      </p>
    {:else}
      <p class="hint">
        {t("This step will be removed when you save changes.")}
      </p>
    {/if}
  </div>
  <div class="step-delete-actions">
    <button type="button" onclick={() => dialog.close()}>
      {t("Cancel")}
    </button>
    <button
      type="button"
      class="danger"
      disabled={dependents.length > 0}
      onclick={() =>
        panel.attempt(() => {
          const current = stepEntries(panel.draft, panel.catalog, panel.t).find(
            (step) => step.id === entry.id,
          );
          if (!current) return dialog.close();
          const next = copy(panel.draft);
          removeStep(next, current.path);
          dialog.close();
          panel.selectedStep = null;
          panel.stepEditor = null;
          panel.change([], next, true);
        })}
    >
      {t("Delete step")}
    </button>
  </div>
</dialog>
