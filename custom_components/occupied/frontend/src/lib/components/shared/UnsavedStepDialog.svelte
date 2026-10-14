<script lang="ts">
  import type { OccupiedPanel } from "../../../occupied-panel.js";
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
    <h2 id="step-exit-title">{t("unsaved_changes")}</h2>
    <p id="step-exit-description">
      {t(
        panel.randomEditor ? "random_unsaved_confirm" : "step_unsaved_confirm",
      )}
    </p>
    <div class="step-delete-actions">
      <button
        bind:this={keepEditing}
        type="button"
        onclick={() => panel.cancelStepExit()}
      >
        {t("keep_editing")}
      </button>
      <button
        type="button"
        class="danger"
        onclick={() => panel.confirmStepExit()}
      >
        {t("discard_changes")}
      </button>
    </div>
  </dialog>
</div>
