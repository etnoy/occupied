<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { RandomEditorContext } from "../../controllers/random-editor-controller.js";
  import StaggerSettings from "../shared/StaggerSettings.svelte";
  import {
    applyStagger,
    supportsStagger,
    staggerSettings,
    staggerPeriodError,
  } from "../../utils/stagger.js";

  let {
    panel,
    context,
    onClose,
  }: {
    panel: LoadedOccupiedPanel;
    context: RandomEditorContext;
    onClose: () => void;
  } = $props();

  let { form, t, changed } = $derived(context);

  let startStagger = $state(untrack(() => staggerSettings(form.on)));
  let endStagger = $state(untrack(() => staggerSettings(form.off)));

  let canStartStagger = $derived(supportsStagger(form.on));
  let canEndStagger = $derived(supportsStagger(form.off));
  let staggerError = $derived(
    (canStartStagger && staggerPeriodError(startStagger)) ||
      (canEndStagger && staggerPeriodError(endStagger)),
  );

  let dialog: HTMLDialogElement;

  onMount(() => {
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("input")?.focus();
  });

  function apply() {
    if (panel.busy || staggerError) {
      return;
    }
    if (canStartStagger) {
      applyStagger(form.on, startStagger);
      changed("on.stagger");
    }
    if (canEndStagger) {
      applyStagger(form.off, endStagger);
      changed("off.stagger");
    }
    dialog.close();
  }
</script>

<dialog
  bind:this={dialog}
  class="step-advanced-dialog"
  aria-labelledby="random-advanced-title"
  onclose={onClose}
>
  <h2 id="random-advanced-title">{t("advanced_settings")}</h2>
  {#if canStartStagger}
    <h3>{t("start_action")}</h3>
    <StaggerSettings
      bind:settings={startStagger}
      {t}
      id="random-start-stagger"
      disabled={panel.busy}
    />
  {/if}
  {#if canEndStagger}
    <h3>{t("end_action")}</h3>
    <StaggerSettings
      bind:settings={endStagger}
      {t}
      id="random-end-stagger"
      disabled={panel.busy}
    />
  {/if}
  <p class="hint">{t("random_settings_hint")}</p>
  <div class="step-delete-actions">
    <button type="button" onclick={() => dialog.close()}>{t("cancel")}</button>
    <button
      type="button"
      class="primary"
      disabled={panel.busy || !!staggerError}
      onclick={apply}
    >
      {t("apply")}
    </button>
  </div>
</dialog>
