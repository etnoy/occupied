<script lang="ts">
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { TimingEditorContext } from "../../types.js";
  import EditorField from "./EditorField.svelte";
  import FieldError from "./FieldError.svelte";
  import SourcePicker from "./SourcePicker.svelte";
  import TimingBoundaryEditor from "./TimingBoundaryEditor.svelte";

  import { stepEntries, timeSourceChoices } from "../../models/step-model.js";
  import { durationSeconds, timingExplanation } from "../../utils/util.js";
  import { randomEntries } from "../../models/random-model.js";

  let {
    panel,
    context,
    heading = "timing",
    clockLabel = "start_time_window",
    windowEndLabel = "end_of_window_optional",
    addWindowEndLabel = "add_end_of_window",
    rangeEdge,
    showExplanation = true,
    explanationSubject = "runs",
    modes = [
      ["absolute", "absolute_time"],
      ["relative", "relative_to"],
    ],
  }: {
    panel: LoadedOccupiedPanel;
    context: TimingEditorContext;
    heading?: string;
    clockLabel?: string;
    windowEndLabel?: string;
    addWindowEndLabel?: string;
    rangeEdge?: "start" | "end";
    showExplanation?: boolean;
    explanationSubject?: "runs" | "window_starts" | "window_ends";
    modes?: [string, string][];
  } = $props();

  let { editor, form, time, t, refresh, changed } = $derived(context);
  let fieldPrefix = $derived(context.fieldPrefix || "");
  let endTimeVisible = $derived(
    !!(time.end || editor.showEndTime || editor.errors.end),
  );

  let showMaxDuration = $state(false);

  let maxDurationVisible = $derived(
    showMaxDuration ||
      (!!time.maxDuration &&
        time.maxDuration !== time.minDuration &&
        durationSeconds(time.maxDuration) !==
          durationSeconds(time.minDuration || "")) ||
      !!editor.errors.maxDuration,
  );
  let choices = $derived.by(() => {
    void context;
    let choices = timeSourceChoices(
      panel.draft,
      context.stepId,
      panel.catalog,
      t,
      context.randomId,
    );
    if (
      time.anchor &&
      choices.every((choice) => choice.value !== time.anchor)
    ) {
      choices = [
        ...choices,
        {
          value: time.anchor,
          name: time.anchor,
          group: t("unavailable_sources"),
        },
      ];
    }

    return choices;
  });
</script>

<div data-editor-section="time">
  <svelte:element
    this={rangeEdge ? "h4" : "h3"}
    id={`step-${fieldPrefix}timing-heading`}
  >
    {t(heading)}
  </svelte:element>
  <fieldset
    class="timing-options"
    aria-labelledby={`step-${fieldPrefix}timing-heading`}
  >
    <div class="timing-option-row">
      {#each modes as [value, label] (value)}
        <label class="timing-option"
          ><input
            type="radio"
            name={`step-${fieldPrefix}timing-mode`}
            {value}
            data-builder-field={`${fieldPrefix}mode`}
            checked={time.mode === value}
            onchange={(event: Event) => {
              if (!(event.currentTarget as HTMLInputElement).checked) {
                return;
              }
              time.mode = value;
              if (value === "relative" && !time.anchor) {
                time.anchor = "sun:sunrise";
              }
              if (value === "duration") {
                time.minDuration ||= "1h";
                time.maxDuration ||= time.minDuration;
              }
              changed("mode");
              panel.shadowRoot
                .querySelector<HTMLElement>(
                  `[data-builder-field="${CSS.escape(fieldPrefix)}mode"]:checked`,
                )
                ?.focus();
            }}
          /><span>{t(label)}</span></label
        >
      {/each}
    </div>
    <FieldError {t} key="mode" {fieldPrefix} errors={{ ...editor.errors }} />
  </fieldset>
  {#if time.mode === "absolute"}
    <div class:time-controls-inline={!!rangeEdge}>
      <EditorField
        {panel}
        {context}
        key="start"
        label={rangeEdge
          ? `${rangeEdge}_${endTimeVisible ? "between" : "at"}`
          : clockLabel}
        accessibleLabel={rangeEdge && endTimeVisible ? clockLabel : undefined}
        value={time.start}
        update={(value) => (time.start = value)}
        options={{ type: "time", step: 1, externalLabel: !!rangeEdge }}
      ></EditorField>
      {#if !endTimeVisible}
        <button
          type="button"
          class:text-button={!rangeEdge}
          disabled={panel.busy}
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
      {#if endTimeVisible}
        <EditorField
          {panel}
          {context}
          key="end"
          label={rangeEdge ? "and" : windowEndLabel}
          accessibleLabel={rangeEdge ? windowEndLabel : undefined}
          value={time.end}
          update={(value) => {
            time.end = value;
            if (!value) {
              editor.showEndTime = false;
            }
          }}
          options={{
            type: "time",
            step: 1,
            optional: true,
            externalLabel: !!rangeEdge,
          }}
        ></EditorField>
      {/if}
    </div>
  {:else if time.mode === "duration"}
    <EditorField
      {panel}
      {context}
      key="minDuration"
      label={maxDurationVisible ? "minimum_window_duration" : "window_duration"}
      value={time.minDuration || ""}
      update={(value) => {
        if (!maxDurationVisible) {
          time.maxDuration = value;
        }
        time.minDuration = value;
      }}
      options={{ placeholder: "1h" }}
    />
    {#if maxDurationVisible}
      <EditorField
        {panel}
        {context}
        key="maxDuration"
        label="maximum_window_duration"
        value={time.maxDuration || ""}
        update={(value) => {
          time.maxDuration = value;
          if (!value) {
            showMaxDuration = false;
          }
        }}
        options={{ placeholder: "2h", optional: true }}
      >
        {#snippet trailing()}
          <button
            type="button"
            class="text-button"
            disabled={panel.busy}
            onclick={() => {
              time.maxDuration = "";
              showMaxDuration = false;
              changed("maxDuration");
              refresh("minDuration");
            }}>{t("remove_maximum_window_duration")}</button
          >
        {/snippet}
      </EditorField>
    {:else}
      <button
        type="button"
        class="text-button"
        disabled={panel.busy}
        onclick={() => {
          time.maxDuration = time.minDuration;
          showMaxDuration = true;
          changed("maxDuration");
          refresh("maxDuration");
        }}>{t("add_randomness")}</button
      >
    {/if}
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
            if (parent) {
              form.days = [...parent.days];
            }
          }
          if (!editor.existing && value.startsWith("random:")) {
            const parent = randomEntries(panel.draft).find(
              (entry) => entry.id === value.slice(7),
            );
            if (parent) {
              form.days = [...parent.days];
            }
          }
          changed("anchor");
          const picker = panel.shadowRoot.querySelector<HTMLElement>(
            `[data-builder-field="${CSS.escape(fieldPrefix)}anchor"]`,
          );
          if (picker && panel.shadowRoot.activeElement !== picker) {
            picker.focus();
          }
        },
      }}
    />
    {#if time.anchor.startsWith("random:")}
      <p class="hint">
        {t("random_relative_start_hint")}
      </p>
    {/if}
    {#if time.anchor.startsWith("entity:")}
      <p class="hint">
        {t("ha_time_source_hint")}
      </p>
    {/if}
    <EditorField
      {panel}
      {context}
      key="startOffset"
      label="start_offset"
      value={time.startOffset}
      update={(value) => (time.startOffset = value)}
      options={{ placeholder: context.t("offset_example") }}
    ></EditorField>
    {#if time.endOffset || editor.showEndOffset || editor.errors.endOffset}
      <EditorField
        {panel}
        {context}
        key="endOffset"
        label="end_offset_optional"
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
            {t("remove_end_offset")}
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
        {t("add_end_offset")}
      </button>
    {/if}
  {:else}
    <p class="hint">
      {t("random_relative_end_hint")}
    </p>
  {/if}
  {#if context.stepId !== undefined}
    {#each [["latestAt", "no_later_than"], ["onlyBefore", "only_run_before"]] as [modifier, label] (modifier)}
      {@const key = modifier as "latestAt" | "onlyBefore"}
      <fieldset class="timing-options">
        <legend>{t(label)}</legend>
        <label class="timing-option">
          <input
            type="checkbox"
            data-builder-field={key}
            checked={Boolean(time[key])}
            onchange={(event) => {
              time[key] = event.currentTarget.checked
                ? {
                    mode: "absolute",
                    start: "18:00",
                    anchor: "sun:sunrise",
                    startOffset: "0s",
                  }
                : undefined;
              for (const field of Object.keys(editor.errors)) {
                if (field.startsWith(`${key}.`)) {
                  delete editor.errors[field];
                }
              }
              changed(key);
            }}
          />
          <span>{t("enabled")}</span>
        </label>
        {#if time[key]}
          <TimingBoundaryEditor {panel} {context} modifier={key} />
        {/if}
      </fieldset>
    {/each}
    {#if time.latestAt || time.onlyBefore}
      <p class="hint">{t("timing_limits_source_date_hint")}</p>
    {/if}
  {/if}
  {#if showExplanation}
    <p class="hint" data-timing-explanation aria-live="polite">
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
          includeHints: explanationSubject === "runs",
        },
      )}
    </p>
  {/if}
  {#if panel.document?.source === "file"}
    <p class="hint">
      {t("managed_file_draft_hint")}
    </p>
  {/if}
</div>

<style>
  h4 {
    font-size: 18px;
    margin: 16px 0 8px;
  }

  .time-controls-inline {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 16px;
    margin: 18px 0;
  }

  .time-controls-inline :global(.field) {
    margin: 0;
  }

  .time-controls-inline > button {
    flex: 0 0 auto;
    margin-bottom: 7px;
  }
</style>
