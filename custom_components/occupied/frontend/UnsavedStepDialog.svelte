<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import { onMount } from "svelte";

  let { panel }: { panel: OccupiedPanel } = $props();
  let t = $derived(panel.t);
  let keepEditing: HTMLButtonElement;

  onMount(() => keepEditing.focus());
</script>

<div class="step-exit-overlay">
  <dialog
    open
    class="step-exit-dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="step-exit-title"
    aria-describedby="step-exit-description"
  >
    <h2 id="step-exit-title">{t("Unsaved changes")}</h2>
    <p id="step-exit-description">
      {t(
        panel.randomEditor
          ? "This random event has unsaved changes. Discard them and continue?"
          : "This step has unsaved changes. Discard them and continue?",
      )}
    </p>
    <div class="step-delete-actions">
      <button
        bind:this={keepEditing}
        type="button"
        onclick={() => panel.cancelStepExit()}
      >
        {t("Keep editing")}
      </button>
      <button
        type="button"
        class="danger"
        onclick={() => panel.confirmStepExit()}
      >
        {t("Discard changes")}
      </button>
    </div>
  </dialog>
</div>
