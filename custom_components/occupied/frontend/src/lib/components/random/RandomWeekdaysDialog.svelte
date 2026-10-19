<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { RandomEditorContext } from "../../controllers/random-editor-controller.js";
  import { days } from "../../models/model.js";

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

  let selectedDays = $state(untrack(() => [...form.days]));

  let dayError = $derived(
    selectedDays.length > 0 ? undefined : t("days_required_error"),
  );
  let dialog: HTMLDialogElement;

  const presets: [string, string[]][] = [
    ["every_day_label", days],
    ["weekdays", days.slice(0, 5)],
    ["weekends", days.slice(5)],
  ];
  const weekdays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  onMount(() => {
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("input")?.focus();
  });

  function apply() {
    if (panel.busy || dayError) {
      return;
    }
    form.days = [...selectedDays];
    changed("days");
    dialog.close();
  }
</script>

<dialog
  bind:this={dialog}
  class="step-advanced-dialog"
  aria-labelledby="random-weekdays-title"
  aria-describedby="random-weekdays-description"
  onclose={onClose}
>
  <h2 id="random-weekdays-title">{t("weekdays")}</h2>
  <p id="random-weekdays-description" class="hint">
    {t("random_days_hint")}
  </p>
  <fieldset
    class="step-weekdays"
    aria-describedby={dayError ? "random-weekdays-error" : undefined}
    disabled={panel.busy}
  >
    <legend>{t("run_on")}</legend>
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
  {#if dayError}
    <p id="random-weekdays-error" class="error" role="alert">{dayError}</p>
  {/if}
  <div class="step-delete-actions">
    <button type="button" onclick={() => dialog.close()}>{t("cancel")}</button>
    <button
      type="button"
      class="primary"
      disabled={panel.busy || !!dayError}
      onclick={apply}>{t("apply")}</button
    >
  </div>
</dialog>
