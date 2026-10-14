<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { TimingEditorContext } from "./types.js";
  import EditorField from "./EditorField.svelte";
  import FieldError from "./FieldError.svelte";

  import { stepEntries, timeSourceChoices } from "./step-model.js";
  import { timingExplanation } from "./util.js";
  import { randomEntries } from "./random-model.js";
  let {
    panel,
    context,
    heading = "Timing",
    clockLabel = "Start time window",
    windowEndLabel = "End of window (optional)",
    addWindowEndLabel = "Add end of window",
    showExplanation = true,
    explanationSubject = "Runs",
    modes = [
      ["absolute", "Absolute time"],
      ["relative", "Relative to"],
    ],
  }: {
    panel: OccupiedPanel;
    context: TimingEditorContext;
    heading?: string;
    clockLabel?: string;
    windowEndLabel?: string;
    addWindowEndLabel?: string;
    showExplanation?: boolean;
    explanationSubject?: "Runs" | "Window starts" | "Window ends";
    modes?: [string, string][];
  } = $props();
  let { editor, form, time, t, refresh, changed } = $derived(context);
  import SourcePicker from "./SourcePicker.svelte";
  let fieldPrefix = $derived(context.fieldPrefix || "");
  let choices = $derived.by(() => {
    context;
    let choices = timeSourceChoices(
      panel.draft,
      context.stepId,
      panel.catalog,
      t,
      context.randomId,
    );
    if (time.anchor && !choices.some((choice) => choice.value === time.anchor))
      choices = [
        ...choices,
        { value: time.anchor, name: time.anchor, group: "Unavailable sources" },
      ];
    return choices;
  });
</script>

<div data-editor-section="time">
  <h3 id={`step-${fieldPrefix}timing-heading`}>
    {t(heading)}
  </h3>
  <fieldset
    class="timing-options"
    aria-labelledby={`step-${fieldPrefix}timing-heading`}
  >
    <div class="timing-option-row">
      {#each modes as [value, label]}
        <label class="timing-option"
          ><input
            type="radio"
            name={`step-${fieldPrefix}timing-mode`}
            {value}
            data-builder-field={`${fieldPrefix}mode`}
            checked={time.mode === value}
            onchange={(event: Event) => {
              if (!(event.currentTarget as HTMLInputElement).checked) return;
              time.mode = value;
              if (value === "relative" && !time.anchor)
                time.anchor = "sun:sunrise";
              if (value === "duration") {
                time.minDuration ||= "1h";
                time.maxDuration ||= time.minDuration;
              }
              changed("mode");
              panel.shadowRoot
                .querySelector<HTMLElement>(
                  `[data-builder-field="${fieldPrefix}mode"]:checked`,
                )
                ?.focus();
            }}
          /><span>{t(label)}</span></label
        >
      {/each}
    </div>
    <FieldError key="mode" {fieldPrefix} errors={{ ...editor.errors }} />
  </fieldset>
  {#if time.mode === "absolute"}
    <EditorField
      {panel}
      {context}
      key="start"
      label={clockLabel}
      value={time.start}
      update={(value) => (time.start = value)}
      options={{ type: "time", step: 1 }}
    ></EditorField>
    {#if time.end || editor.showEndTime || editor.errors.end}
      <EditorField
        {panel}
        {context}
        key="end"
        label={windowEndLabel}
        value={time.end}
        update={(value) => {
          time.end = value;
          if (!value) editor.showEndTime = false;
        }}
        options={{ type: "time", step: 1, optional: true }}
      ></EditorField>
    {:else}
      <button
        type="button"
        class="text-button"
        onclick={() => {
          time.end = time.start;
          editor.showEndTime = true;
          changed("end");
          refresh("end");
        }}
      >
        {t(addWindowEndLabel)}
      </button>
    {/if}
  {:else if time.mode === "duration"}
    <EditorField
      {panel}
      {context}
      key="minDuration"
      label="Minimum window duration"
      value={time.minDuration || ""}
      update={(value) => (time.minDuration = value)}
      options={{ placeholder: "1h" }}
    />
    <EditorField
      {panel}
      {context}
      key="maxDuration"
      label="Maximum window duration"
      value={time.maxDuration || ""}
      update={(value) => (time.maxDuration = value)}
      options={{ placeholder: "2h", optional: true }}
    />
  {:else if modes.some(([mode]) => mode === "relative")}
    <SourcePicker
      {...{
        hass: panel._hass,
        choices,
        value: time.anchor,
        t,
        error: editor.errors.anchor,
        fieldPrefix,
        onChange: (value) => {
          time.anchor = value;
          if (!editor.existing && value.startsWith("step:")) {
            const parent = stepEntries(
              panel.draft,
              panel.catalog,
              panel.t,
            ).find((step) => step.id === value.slice(5));
            if (parent) form.days = [...parent.days];
          }
          if (!editor.existing && value.startsWith("random:")) {
            const parent = randomEntries(panel.draft).find(
              (entry) => entry.id === value.slice(7),
            );
            if (parent) form.days = [...parent.days];
          }
          changed("anchor");
          const picker = panel.shadowRoot.querySelector<HTMLElement>(
            `[data-builder-field="${fieldPrefix}anchor"]`,
          );
          if (picker && panel.shadowRoot.activeElement !== picker) {
            picker.focus();
          }
        },
      }}
    />
    {#if time.anchor.startsWith("random:")}
      <p class="hint">
        {t("This start follows the selected window's closing time.")}
      </p>
    {/if}
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
              refresh("startOffset");
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
  {:else}
    <p class="hint">
      {t(
        "Choose Absolute time or Duration to replace this saved relative window end.",
      )}
    </p>
  {/if}
  {#if showExplanation}<p
      class="hint"
      data-timing-explanation
      aria-live="polite"
    >
      {timingExplanation(
        time,
        [
          ...stepEntries(panel.draft, panel.catalog, panel.t),
          ...randomEntries(panel.draft, panel.catalog).map((entry) => ({
            id: `random:${entry.id}`,
            name: entry.name,
          })),
        ],
        t,
        panel.catalog.time_sources,
        {
          locale: panel._hass.locale,
          days: form.days,
          subject: explanationSubject,
          includeHints: explanationSubject === "Runs",
        },
      )}
    </p>{/if}
  {#if panel.document?.source === "file"}
    <p class="hint">
      {t(
        "This program is managed by a file. Add changes to your draft, then export them from Settings.",
      )}
    </p>
  {/if}
</div>
