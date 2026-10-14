<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { StepEditorContext } from "./step-editor-controller.js";
  import { days } from "./model.js";
  import StaggerSettings from "./StaggerSettings.svelte";
  import {
    applyStagger,
    supportsStagger,
    staggerSettings,
    staggerPeriodError,
  } from "./stagger.js";
  import { editorErrors } from "./step-model.js";

  let {
    panel,
    context,
    onClose,
  }: {
    panel: OccupiedPanel;
    context: StepEditorContext;
    onClose: () => void;
  } = $props();
  let { editor, form, t, changed } = $derived(context);
  let selectedDays = $state<string[]>([]);
  let selectedStagger = $state(untrack(() => staggerSettings(form)));
  let canStagger = $derived(supportsStagger(form));
  let staggerError = $derived(
    canStagger ? staggerPeriodError(selectedStagger) : undefined,
  );
  let dialog: HTMLDialogElement;
  const presets: [string, string[]][] = [
    ["Every day", days],
    ["Weekdays", days.slice(0, 5)],
    ["Weekends", days.slice(5)],
  ];
  const weekdayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  let dayError = $derived.by(() => {
    const errors = editorErrors(panel.draft, {
      ...editor,
      form: { ...form, days: selectedDays },
    });
    return (
      errors.days ||
      (form.timing.anchor.startsWith("step:") && form.timing.mode === "relative"
        ? errors.anchor
        : undefined)
    );
  });

  onMount(() => {
    selectedDays = [...form.days];
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("input")?.focus();
  });

  function apply() {
    if (dayError || staggerError || panel.busy) return;
    form.days = [...selectedDays];
    changed("days");
    if (canStagger) {
      applyStagger(form, selectedStagger);
      changed("stagger");
    }
    dialog.close();
  }
</script>

<dialog
  bind:this={dialog}
  class="step-advanced-dialog"
  aria-labelledby="step-advanced-title"
  aria-describedby="step-weekdays-description"
  onclose={onClose}
>
  <h2 id="step-advanced-title">{t("Advanced settings")}</h2>
  <p id="step-weekdays-description" class="hint">
    {t("Choose which days this step should run.")}
  </p>
  <fieldset
    class="step-weekdays"
    aria-describedby={dayError ? "step-weekdays-error" : undefined}
    disabled={panel.busy}
  >
    <legend>{t("Run on")}</legend>
    <div class="step-weekday-presets">
      {#each presets as [label, selection]}
        <button
          type="button"
          aria-pressed={selectedDays.length === selection.length &&
            selection.every((day) => selectedDays.includes(day))}
          onclick={() => (selectedDays = [...selection])}
        >
          {t(label)}
        </button>
      {/each}
    </div>
    <div class="step-weekday-options">
      {#each days as day, index}
        <label class="step-weekday-option">
          <input
            type="checkbox"
            value={day}
            checked={selectedDays.includes(day)}
            onchange={(event) => {
              selectedDays = days.filter((candidate) =>
                candidate === day
                  ? event.currentTarget.checked
                  : selectedDays.includes(candidate),
              );
            }}
          />
          <span>{t(weekdayNames[index])}</span>
        </label>
      {/each}
    </div>
  </fieldset>
  {#if dayError}
    <p id="step-weekdays-error" class="error" role="alert">{t(dayError)}</p>
  {/if}
  {#if canStagger}
    <StaggerSettings
      bind:settings={selectedStagger}
      {t}
      id="step-stagger"
      disabled={panel.busy}
    />
  {/if}
  <p class="hint">{t("Apply these settings, then save the step.")}</p>
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
