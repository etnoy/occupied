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

<section class="step-editor random-editor">
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
        ["duration", "duration"],
      ]}
    />
  </div>
  <h3>{t("frequency_and_duration")}</h3>
  <div class="random-frequency">
    <div>
      <EditorField
        {panel}
        {context}
        key="minCount"
        label="minimum_events_per_window"
        value={form.minCount}
        update={(value) => {
          if (!maxCountVisible) {
            form.maxCount = value;
          }
          form.minCount = value;
        }}
        options={{ type: "number", min: 0, max: 1000, step: 1 }}
      />
      {#if !maxCountVisible}
        <button
          type="button"
          class="text-button"
          disabled={panel.busy}
          onclick={() => {
            showMaxCount = true;
            changed("maxCount");
            focusEditor(panel, "maxCount");
          }}>{t("add_maximum_events")}</button
        >
      {/if}
    </div>
    <div>
      {#if maxCountVisible}
        <EditorField
          {panel}
          {context}
          key="maxCount"
          label="maximum_events_per_window"
          value={form.maxCount}
          update={(value) => (form.maxCount = value)}
          options={{ type: "number", min: 0, max: 1000, step: 1 }}
        >
          {#snippet trailing()}
            <button
              type="button"
              class="text-button"
              disabled={panel.busy}
              onclick={() => {
                form.maxCount = form.minCount;
                showMaxCount = false;
                changed("maxCount");
                focusEditor(panel, "minCount");
              }}>{t("remove_maximum_events")}</button
            >
          {/snippet}
        </EditorField>
      {/if}
    </div>
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
    {randomExplanation(form, panel.draft, panel.catalog, t, panel._hass.locale)}
  </p>
  <p class="hint">
    {t("duration_hint")}
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
  <div class="builder-footer">
    <button type="button" disabled={panel.busy} onclick={cancel}
      >{t("cancel")}</button
    >
    <RandomActions {panel} {context} />
    <button
      type="button"
      class="primary"
      data-random-submit
      disabled={panel.busy || panel.stale}
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

  .same-entities {
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
