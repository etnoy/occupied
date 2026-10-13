<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import { days } from "./model.js";
  import { createRandomEditorContext } from "./random-editor-controller.js";
  import EditorField from "./EditorField.svelte";
  import TimingEditor from "./TimingEditor.svelte";
  import ActionEditor from "./ActionEditor.svelte";
  import FieldError from "./FieldError.svelte";
  import DeleteRandomDialog from "./DeleteRandomDialog.svelte";
  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  let context = $derived.by(() => {
    revision;
    return createRandomEditorContext(panel);
  });
  let { editor, form, t, changed, submit, cancel } = $derived(context);
  let deleteOpen = $state(false);
  let deleteTrigger = $state<HTMLButtonElement>();
  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const presets: [string, string[]][] = [
    ["Every day", days],
    ["Weekdays", days.slice(0, 5)],
    ["Weekends", days.slice(5)],
  ];
</script>

<section class="step-editor random-editor">
  <div class="step-name-editor">
    <EditorField
      {panel}
      {context}
      key="name"
      label="Random event name"
      value={form.name}
      update={(value) => (form.name = value)}
      options={{ hideLabel: true, placeholder: t("Optional title") }}
    />
  </div>
  <p class="hint">
    {t(
      "Choose a window, a duration, and actions for the start and end of each occurrence.",
    )}
  </p>
  <div class="editor-sections">
    <TimingEditor
      {panel}
      context={context.timing("start")}
      heading="Window starts"
      clockLabel="Window start"
      windowEndLabel="Latest window start (optional)"
      addWindowEndLabel="Randomize window start"
      showExplanation={false}
    />
    <TimingEditor
      {panel}
      context={context.timing("end")}
      heading="Window ends"
      clockLabel="Window end"
      windowEndLabel="Latest window end (optional)"
      addWindowEndLabel="Randomize window end"
      showExplanation={false}
    />
  </div>
  <h3>{t("Frequency and duration")}</h3>
  <div class="random-frequency">
    <EditorField
      {panel}
      {context}
      key="count"
      label="Times per window"
      value={form.count}
      update={(value) => (form.count = value)}
      options={{ type: "number", min: 1, max: 1000, step: 1 }}
    />
    <EditorField
      {panel}
      {context}
      key="minDuration"
      label="Minimum duration"
      value={form.minDuration}
      update={(value) => (form.minDuration = value)}
      options={{ placeholder: "5m" }}
    />
    <EditorField
      {panel}
      {context}
      key="maxDuration"
      label="Maximum duration"
      value={form.maxDuration}
      update={(value) => (form.maxDuration = value)}
      options={{ placeholder: "15m" }}
    />
  </div>
  <p class="hint">
    {t(
      "Use durations like 5m, 30s, or 1h. Occurrences may overlap; every end action stays inside the window.",
    )}
  </p>
  <div class="editor-sections">
    <ActionEditor
      {panel}
      context={context.action("on")}
      heading="At the start"
      kindLabel="Start action"
      entityLabel="Start entities"
    />
    <div>
      <ActionEditor
        {panel}
        context={context.action("off")}
        heading="At the end"
        kindLabel="End action"
        entityLabel="End entities"
        hideEntities={form.sameEntities}
      />
      {#if form.on.kind === "entities" && form.off.kind === "entities"}
        <label class="same-entities"
          ><input
            type="checkbox"
            checked={form.sameEntities}
            onchange={(event) => {
              form.sameEntities = event.currentTarget.checked;
              changed("sameEntities");
            }}
          />{t("Use the same entities")}</label
        >
      {/if}
    </div>
  </div>
  <details class="random-settings" open={!!editor.errors.days}>
    <summary>{t("Advanced settings")}</summary>
    <label
      ><input
        type="checkbox"
        checked={form.enabled}
        onchange={(event) => {
          form.enabled = event.currentTarget.checked;
          changed("enabled");
        }}
      />{t("Enabled")}</label
    >
    <fieldset class="step-weekdays">
      <legend>{t("Run on")}</legend>
      <div class="step-weekday-presets">
        {#each presets as [label, selection]}<button
            type="button"
            aria-pressed={form.days.length === selection.length &&
              selection.every((day) => form.days.includes(day))}
            onclick={() => {
              form.days = [...selection];
              changed("days");
            }}>{t(label)}</button
          >{/each}
      </div>
      <div class="step-weekday-options">
        {#each days as day, index}<label class="step-weekday-option"
            ><input
              type="checkbox"
              checked={form.days.includes(day)}
              onchange={(event) => {
                form.days = days.filter((candidate) =>
                  candidate === day
                    ? event.currentTarget.checked
                    : form.days.includes(candidate),
                );
                changed("days");
              }}
            /><span>{t(weekdays[index])}</span></label
          >{/each}
      </div>
    </fieldset>
    <FieldError key="days" errors={{ ...editor.errors }} />
  </details>
  <div class="builder-footer">
    <button type="button" disabled={panel.busy} onclick={cancel}
      >{t("Cancel")}</button
    >
    {#if editor.existing}<button
        bind:this={deleteTrigger}
        type="button"
        class="danger"
        disabled={panel.busy || panel.stale}
        onclick={() => (deleteOpen = true)}>{t("Delete random event")}</button
      >{/if}
    <button
      type="button"
      class="primary"
      data-random-submit
      disabled={panel.busy || panel.stale}
      onclick={submit}
      >{t(
        panel.document?.source === "file"
          ? "Add to draft"
          : "Save random event",
      )}</button
    >
  </div>
</section>
{#if deleteOpen}<DeleteRandomDialog
    {panel}
    onClose={() => {
      deleteOpen = false;
      if (deleteTrigger?.isConnected) deleteTrigger.focus();
    }}
  />{/if}

<style>
  .random-frequency {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  .same-entities {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
  }
  .random-settings {
    margin-top: 24px;
  }
  .random-settings > label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
  }
  @media (max-width: 600px) {
    .random-frequency {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }
</style>
