<script lang="ts">
  import { canShareEntities } from "../../models/random-model.js";
  import { flushSync, untrack } from "svelte";
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import { createRandomEditorContext } from "../../controllers/random-editor-controller.js";
  import EditorField from "../shared/EditorField.svelte";
  import TimingEditor from "../shared/TimingEditor.svelte";
  import RandomActions from "./RandomActions.svelte";
  import RandomWeekdaysDialog from "./RandomWeekdaysDialog.svelte";
  import ActionEditor from "../shared/ActionEditor.svelte";
  import FieldError from "../shared/FieldError.svelte";
  import { focusEditor } from "../../controllers/step-editor-controller.js";
  import { randomExplanation } from "../../utils/random-explanation.js";

  let { panel, revision }: { panel: LoadedOccupiedPanel; revision: number } =
    $props();

  let context = $derived.by(() => {
    void revision;

    return createRandomEditorContext(panel);
  });
  let { editor, form, t, changed, submit, cancel } = $derived(context);

  let actionExplanation = $derived(
    randomExplanation(
      form,
      panel.draft,
      panel.catalog,
      t,
      panel._hass.locale,
      "actions",
    ),
  );

  let weekdaysOpen = $state(false);
  let weekdaysButton: HTMLButtonElement;
  let showMaxCount = $state(
    untrack(() => Number(form.minCount) !== Number(form.maxCount)),
  );

  let maxCountVisible = $derived(
    showMaxCount ||
      Number(form.minCount) !== Number(form.maxCount) ||
      !!editor.errors.maxCount,
  );

  async function save() {
    await submit();
    if (!panel.randomEditor?.errors.days) {
      return;
    }

    weekdaysOpen = true;
  }

  function closeWeekdays() {
    flushSync(() => (weekdaysOpen = false));
    if (weekdaysButton.isConnected) {
      weekdaysButton.focus();
    }
  }
</script>

<section
  class="step-editor random-editor"
  class:entity-conflict={panel
    .offEntityConflicts()
    .some(
      (issue) =>
        issue.model_path?.[0] === "random" && issue.model_path[1] === editor.id,
    )}
>
  <div class="step-name-editor">
    <EditorField
      {panel}
      {context}
      key="name"
      label="random_event_name"
      value={form.name}
      update={(value) => (form.name = value)}
      options={{ hideLabel: true, placeholder: t("optional_title") }}
    />
  </div>
  <div class="active-period-header">
    <h3>{t("active_period")}</h3>
    <button
      bind:this={weekdaysButton}
      type="button"
      class:error={!!editor.errors.days}
      aria-haspopup="dialog"
      aria-expanded={weekdaysOpen}
      aria-describedby={editor.errors.days ? "step-error-days" : undefined}
      data-builder-field="days"
      data-random-weekdays
      disabled={panel.busy}
      onclick={() => (weekdaysOpen = true)}>{t("weekdays")}</button
    >
  </div>
  <FieldError {t} key="days" errors={{ ...editor.errors }} />
  <p class="hint">{t("active_period_hint")}</p>
  <div class="editor-sections">
    <TimingEditor
      {panel}
      context={context.timing("start")}
      heading="period_start"
      clockLabel="earliest_start"
      windowEndLabel="latest_start"
      addWindowEndLabel="randomize_window_start"
      rangeEdge="start"
      showExplanation={false}
    />
    <TimingEditor
      {panel}
      context={context.timing("end")}
      heading="period_end"
      clockLabel="earliest_end"
      windowEndLabel="latest_end"
      addWindowEndLabel="randomize_window_end"
      rangeEdge="end"
      showExplanation={false}
      modes={[
        ["absolute", "absolute_time"],
        ["relative", "relative_to"],
        ["duration", "duration"],
      ]}
    />
  </div>
  <p class="hint" data-random-period-explanation aria-live="polite">
    {randomExplanation(
      form,
      panel.draft,
      panel.catalog,
      t,
      panel._hass.locale,
      "active-period",
    )}
  </p>
  <h3>{t("frequency_and_duration")}</h3>
  <div class="random-counts" class:with-maximum={maxCountVisible}>
    <label class="minimum-count-label" for="step-minCount">
      {t(
        maxCountVisible
          ? "minimum_events_per_window"
          : "events_per_active_period",
      )}
    </label>
    <div class="minimum-count-control count-control">
      <EditorField
        {panel}
        {context}
        key="minCount"
        label={maxCountVisible
          ? "minimum_events_per_window"
          : "events_per_active_period"}
        value={form.minCount}
        update={(value) => {
          if (!maxCountVisible) {
            form.maxCount = value;
          }
          form.minCount = value;
        }}
        options={{
          type: "number",
          min: 0,
          max: 1000,
          step: 1,
          hideLabel: true,
        }}
      />
    </div>
    {#if !maxCountVisible}
      <button
        type="button"
        class="randomize-count"
        disabled={panel.busy}
        onclick={() => {
          showMaxCount = true;
          changed("maxCount");
          focusEditor(panel, "maxCount");
        }}>{t("add_randomness")}</button
      >
    {:else}
      <label class="maximum-count-label" for="step-maxCount">
        {t("maximum_events_per_window")}
      </label>
      <div class="maximum-count-control count-control">
        <EditorField
          {panel}
          {context}
          key="maxCount"
          label="maximum_events_per_window"
          value={form.maxCount}
          update={(value) => (form.maxCount = value)}
          options={{
            type: "number",
            min: Number.isSafeInteger(Number(form.minCount))
              ? Math.max(0, Number(form.minCount))
              : 0,
            max: 1000,
            step: 1,
            hideLabel: true,
          }}
        />
        <button
          type="button"
          class="icon-button"
          aria-label={t("remove_maximum_events")}
          title={t("remove_maximum_events")}
          disabled={panel.busy}
          onclick={() => {
            form.maxCount = form.minCount;
            showMaxCount = false;
            delete editor.errors.maxCount;
            changed("minCount");
            focusEditor(panel, "minCount");
          }}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path
              d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12Z"
            />
          </svg>
        </button>
      </div>
    {/if}
  </div>
  <div class="random-frequency">
    <EditorField
      {panel}
      {context}
      key="minDuration"
      label="minimum_duration"
      value={form.minDuration}
      update={(value) => (form.minDuration = value)}
      options={{ placeholder: "5m" }}
    />
    <EditorField
      {panel}
      {context}
      key="maxDuration"
      label="maximum_duration"
      value={form.maxDuration}
      update={(value) => (form.maxDuration = value)}
      options={{ placeholder: "15m" }}
    />
  </div>
  <p class="hint" data-random-explanation aria-live="polite">
    {randomExplanation(
      form,
      panel.draft,
      panel.catalog,
      t,
      panel._hass.locale,
      "frequency",
    )}
  </p>
  <div class="editor-sections">
    <ActionEditor
      {panel}
      context={context.action("on")}
      heading="when_event_starts"
      kindLabel="start_action"
      entityLabel="start_entities"
    />
    <div>
      <ActionEditor
        {panel}
        context={context.action("off")}
        heading="when_event_ends"
        kindLabel="end_action"
        entityLabel="end_entities"
        hideEntities={form.sameEntities}
      />
      {#if canShareEntities(form.on, form.off)}
        <label class="same-entities">
          <input
            type="checkbox"
            checked={form.sameEntities}
            onchange={(event) => {
              form.sameEntities = event.currentTarget.checked;
              changed("sameEntities");
            }}
          />{t("use_the_same_entities")}
        </label>
      {/if}
    </div>
  </div>
  {#if actionExplanation}
    <p class="hint" data-random-actions-explanation aria-live="polite">
      {actionExplanation}
    </p>
  {/if}
  <div class="builder-footer">
    <button type="button" disabled={panel.busy} onclick={cancel}
      >{t("cancel")}</button
    >
    <RandomActions {panel} {context} />
    <button
      type="button"
      class="primary"
      data-random-submit
      disabled={panel.busy ||
        panel.stale ||
        !!editor.errors.minCount ||
        !!editor.errors.maxCount}
      onclick={save}
      >{t(
        panel.document?.source === "file"
          ? "add_to_draft"
          : "save_random_event",
      )}</button
    >
  </div>
</section>

{#if weekdaysOpen}
  <RandomWeekdaysDialog {panel} {context} onClose={closeWeekdays} />
{/if}

<style>
  .active-period-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .active-period-header h3 {
    margin: 0;
  }

  .random-frequency {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .random-counts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      "minimum-label ."
      "minimum-control randomness";
    gap: 5px 16px;
    margin: 14px 0;
  }

  .random-counts.with-maximum {
    grid-template-areas:
      "minimum-label maximum-label"
      "minimum-control maximum-control";
  }

  .minimum-count-label {
    grid-area: minimum-label;
  }

  .maximum-count-label {
    grid-area: maximum-label;
  }

  .minimum-count-control {
    grid-area: minimum-control;
  }

  .maximum-count-control {
    grid-area: maximum-control;
  }

  .count-control {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
  }

  .count-control :global(.field) {
    flex: 1;
    min-width: 0;
    margin: 0;
  }

  .randomize-count {
    grid-area: randomness;
    justify-self: start;
    align-self: start;
    max-width: 100%;
  }

  .same-entities {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
  }

  @media (max-width: 600px) {
    .random-counts {
      grid-template-columns: minmax(96px, 1fr) minmax(0, max-content);
      grid-template-areas:
        "minimum-label minimum-label"
        "minimum-control randomness";
    }

    .random-counts.with-maximum {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        "minimum-label"
        "minimum-control"
        "maximum-label"
        "maximum-control";
    }

    .with-maximum .minimum-count-control {
      margin-bottom: 12px;
    }

    .random-frequency {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }
</style>
