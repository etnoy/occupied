<script lang="ts">
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import { onMount } from "svelte";

  let { panel }: { panel: LoadedOccupiedPanel } = $props();

  let t = $derived(panel.t);

  let keepEditing: HTMLButtonElement;
  let discard: HTMLButtonElement;
  let dialog: HTMLDialogElement;

  function keydown(event: KeyboardEvent) {
    if (!(
      event.key === "Tab" &&
      (event.shiftKey ? event.target === keepEditing : event.target === discard)
    )) {
      return;
    }

    event.preventDefault();
    (event.shiftKey ? discard : keepEditing).focus();
  }

  onMount(() => {
    dialog.showModal();
    keepEditing.focus();

    return () => dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  onkeydown={keydown}
  oncancel={(event) => {
    event.preventDefault();
    panel.cancelStepExit();
  }}
  class="step-exit-dialog"
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="step-exit-title"
  aria-describedby="step-exit-description"
>
  <h2 id="step-exit-title">{t("unsaved_changes")}</h2>
  <p id="step-exit-description">
    {t(panel.randomEditor ? "random_unsaved_confirm" : "step_unsaved_confirm")}
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
      bind:this={discard}
      class="danger"
      onclick={() => panel.confirmStepExit()}
    >
      {t("discard_changes")}
    </button>
  </div>
</dialog>
