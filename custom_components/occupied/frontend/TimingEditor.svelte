<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { StepEditorContext } from "./step-editor-controller.js";
  import EditorField from "./EditorField.svelte";
  import FieldError from "./FieldError.svelte";

  import {
    stepEntries,
    timingExplanation,
    timeSourceChoices,
  } from "./step-model.js";
  let { panel, context }: { panel: OccupiedPanel; context: StepEditorContext } =
    $props();
  let { editor, form, time, t, refresh, changed } = $derived(context);
  import SourcePicker from "./SourcePicker.svelte";
  import { focusEditor } from "./step-editor-controller.js";
  let choices = $derived.by(() => {
    context;
    let choices = timeSourceChoices(panel.draft, editor.id, panel.catalog);
    if (time.anchor && !choices.some((choice) => choice.value === time.anchor))
      choices = [
        ...choices,
        { value: time.anchor, name: time.anchor, group: "Unavailable sources" },
      ];
    return choices;
  });
</script>

<div data-editor-section="time">
  <h3 id="routine-timing-heading">
    {t("Timing")}
  </h3>
  <fieldset class="timing-options" aria-labelledby="routine-timing-heading">
    <div class="timing-option-row">
      {#each [["absolute", "Absolute time"], ["relative", "Relative to"]] as [value, label]}
        <label class="timing-option"
          ><input
            type="radio"
            name="step-timing-mode"
            {value}
            data-builder-field="mode"
            checked={time.mode === value}
            onchange={(event: Event) => {
              if (!(event.currentTarget as HTMLInputElement).checked) return;
              time.mode = value;
              if (value === "relative" && !time.anchor)
                time.anchor = "sun:sunrise";
              changed("mode");
              panel.shadowRoot
                .querySelector<HTMLElement>(
                  '[data-builder-field="mode"]:checked',
                )
                ?.focus();
            }}
          /><span>{t(label)}</span></label
        >
      {/each}
    </div>
    <FieldError key="mode" errors={{ ...editor.errors }} />
  </fieldset>
  {#if time.mode === "absolute"}
    <EditorField
      {panel}
      {context}
      key="start"
      label="Start time window"
      value={time.start}
      update={(value) => (time.start = value)}
      options={{ type: "time", step: 1 }}
    ></EditorField>
    {#if time.end || editor.showEndTime || editor.errors.end}
      <EditorField
        {panel}
        {context}
        key="end"
        label="End of window (optional)"
        value={time.end}
        update={(value) => (time.end = value)}
        options={{ type: "time", step: 1, optional: true }}
      ></EditorField>
      <button
        type="button"
        class="text-button"
        onclick={() => {
          time.end = "";
          editor.showEndTime = false;
          changed("end");
          focusEditor(panel, "start");
        }}
      >
        {t("Remove end of window")}
      </button>
    {:else}
      <button
        type="button"
        class="text-button"
        onclick={() => {
          time.end = time.start;
          editor.showEndTime = true;
          changed("end");
          focusEditor(panel, "end");
        }}
      >
        {t("Add end of window")}
      </button>
    {/if}
  {:else}
    <SourcePicker
      {...{
        hass: panel._hass,
        choices,
        value: time.anchor,
        t,
        error: editor.errors.anchor,
        onChange: (value) => {
          time.anchor = value;
          if (!editor.existing && value.startsWith("step:")) {
            const parent = stepEntries(panel.draft).find(
              (step) => step.id === value.slice(5),
            );
            if (parent) form.days = [...parent.days];
          }
          changed("anchor");
          const picker = panel.shadowRoot.querySelector<HTMLElement>(
            '[data-builder-field="anchor"]',
          );
          if (picker && panel.shadowRoot.activeElement !== picker) {
            picker.focus();
          }
        },
      }}
    />
    {#if time.anchor.startsWith("entity:")}
      <p class="hint">
        {t(
          "Uses the time currently reported by Home Assistant. Time-only helpers repeat daily; dated sources run only on their reported date.",
        )}
      </p>
    {/if}
    <EditorField
      {panel}
      {context}
      key="startOffset"
      label="Start offset"
      value={time.startOffset}
      update={(value) => (time.startOffset = value)}
      options={{ placeholder: "30m or 1h" }}
    ></EditorField>
    {#if time.endOffset || editor.showEndOffset || editor.errors.endOffset}
      <EditorField
        {panel}
        {context}
        key="endOffset"
        label="End offset (optional)"
        value={time.endOffset}
        update={(value) => (time.endOffset = value)}
        options={{}}
        >{#snippet trailing()}<button
            type="button"
            class="text-button"
            onclick={() => {
              time.endOffset = "";
              editor.showEndOffset = false;
              changed("endOffset");
              focusEditor(panel, "startOffset");
            }}
          >
            {t("Remove end offset")}
          </button>{/snippet}</EditorField
      >
    {:else}
      <button
        type="button"
        class="text-button"
        onclick={() => {
          editor.showEndOffset = true;
          refresh("endOffset");
        }}
      >
        {t("Add end offset")}
      </button>
    {/if}
  {/if}
  <p class="hint" data-timing-explanation aria-live="polite">
    {timingExplanation(
      time,
      stepEntries(panel.draft),
      t,
      panel.catalog.time_sources,
    )}
  </p>
  {#if panel.document?.source === "file"}
    <p class="hint">
      {t(
        "This program is managed by a file. Add changes to your draft, then export them from Settings.",
      )}
    </p>
  {/if}
</div>
