<script lang="ts">
  import type { OccupiedPanel } from "../../../occupied-panel.js";
  import type { StepEntry } from "../../types.js";
  import { reference } from "../../actions/dom.js";
  import { deleteStep } from "../../controllers/steps.js";
  import { dependentNames } from "../../models/step-model.js";

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
    if (node) {
      dialog = node as HTMLDialogElement;
    }
  }}
  class="step-delete-dialog"
  aria-labelledby="step-delete-title"
  aria-describedby="step-delete-description"
  onclose={onClose}
>
  <h2 id="step-delete-title">{t("delete_step_confirm")}</h2>
  <div id="step-delete-description">
    <p>{entry.name}</p>
    {#if dependents.length}
      <p>{t("used_by")}:</p>
      <ul>
        {#each dependents as name, index (index)}
          <li>{name}</li>
        {/each}
      </ul>
      <p class="hint">
        {t("delete_dependents_hint")}
      </p>
    {:else}
      <p class="hint">
        {t(
          panel.document.source === "file"
            ? "delete_step_file_hint"
            : "delete_step_hint",
        )}
      </p>
    {/if}
  </div>
  <div class="step-delete-actions">
    <button type="button" onclick={() => dialog.close()}>
      {t("cancel")}
    </button>
    <button
      type="button"
      class="danger"
      disabled={dependents.length > 0 || panel.busy || panel.stale}
      onclick={async () => {
        try {
          if (await deleteStep(panel, entry.id)) {
            dialog.close();
          }
        } catch (error) {
          panel.fail(error);
        }
      }}
    >
      {t("delete_step")}
    </button>
  </div>
</dialog>
