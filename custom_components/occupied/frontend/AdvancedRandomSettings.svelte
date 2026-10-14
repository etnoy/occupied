<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { RandomEditorContext } from "./random-editor-controller.js";
  import { days } from "./model.js";
  import StaggerSettings from "./StaggerSettings.svelte";
  import {
    applyStagger,
    supportsStagger,
    staggerSettings,
    staggerPeriodError,
  } from "./stagger.js";
  import FieldError from "./FieldError.svelte";

  let {
    panel,
    context,
    onClose,
  }: {
    panel: OccupiedPanel;
    context: RandomEditorContext;
    onClose: () => void;
  } = $props();

  let { form, t, changed } = $derived(context);

  let selectedDays = $state(untrack(() => [...form.days]));
  let startStagger = $state(untrack(() => staggerSettings(form.on)));
  let endStagger = $state(untrack(() => staggerSettings(form.off)));

  let canStartStagger = $derived(supportsStagger(form.on));
  let canEndStagger = $derived(supportsStagger(form.off));
  let staggerError = $derived(
    (canStartStagger && staggerPeriodError(startStagger)) ||
      (canEndStagger && staggerPeriodError(endStagger)),
  );

  let dialog: HTMLDialogElement;

  const presets: [string, string[]][] = [
    ["Every day", days],
    ["Weekdays", days.slice(0, 5)],
    ["Weekends", days.slice(5)],
  ];
  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  let dayError = $derived(
    selectedDays.length > 0 ? undefined : t("Choose at least one day."),
  );

  onMount(() => {
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("input")?.focus();
  });

  function apply() {
    if (panel.busy || dayError || staggerError) {
      return;
    }
    form.days = [...selectedDays];
    changed("days");
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
  aria-describedby="random-weekdays-description"
  onclose={onClose}
>
  <h2 id="random-advanced-title">{t("Advanced settings")}</h2>
  <p id="random-weekdays-description" class="hint">
    {t("Choose which days this random event should run.")}
  </p>
  <fieldset
    class="step-weekdays"
    aria-describedby={dayError ? "step-error-days" : undefined}
    disabled={panel.busy}
  >
    <legend>{t("Run on")}</legend>
    <div class="step-weekday-presets">
      {#each presets as [label, selection] (label)}
        <button
          type="button"
          aria-pressed={selectedDays.length === selection.length &&
            selection.every((day) => selectedDays.includes(day))}
          onclick={() => (selectedDays = [...selection])}>{t(label)}</button
        >
      {/each}
    </div>
    <div class="step-weekday-options">
      {#each days as day, index (day)}
        <label class="step-weekday-option">
          <input
            type="checkbox"
            checked={selectedDays.includes(day)}
            onchange={(event) => {
              const checked = event.currentTarget.checked;
              selectedDays = days.filter((candidate) =>
                candidate === day ? checked : selectedDays.includes(candidate),
              );
            }}
          /><span>{t(weekdays[index])}</span>
        </label>
      {/each}
    </div>
  </fieldset>
  <FieldError key="days" errors={dayError ? { days: dayError } : {}} />
  {#if canStartStagger}
    <h3>{t("Start action")}</h3>
    <StaggerSettings
      bind:settings={startStagger}
      {t}
      id="random-start-stagger"
      disabled={panel.busy}
    />
  {/if}
  {#if canEndStagger}
    <h3>{t("End action")}</h3>
    <StaggerSettings
      bind:settings={endStagger}
      {t}
      id="random-end-stagger"
      disabled={panel.busy}
    />
  {/if}
  <p class="hint">{t("Apply these settings, then save the random event.")}</p>
  <div class="step-delete-actions">
    <button type="button" onclick={() => dialog.close()}>{t("Cancel")}</button>
    <button
      type="button"
      class="primary"
      disabled={panel.busy || !!dayError || !!staggerError}
      onclick={apply}
    >
      {t("Apply")}
    </button>
  </div>
</dialog>
