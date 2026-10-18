<script lang="ts">
  import { untrack } from "svelte";
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import { createRandomEditorContext } from "../../controllers/random-editor-controller.js";
  import EditorField from "../shared/EditorField.svelte";
  import TimingEditor from "../shared/TimingEditor.svelte";
  import RandomActions from "./RandomActions.svelte";
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

  let advancedOpen = $state(false);
  let advancedButton: HTMLButtonElement;
  let advancedTrigger = $state<HTMLButtonElement>();
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

    advancedTrigger = advancedButton;
    advancedOpen = true;
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
  <p class="hint">
    {t("random_create_hint")}
  </p>
  <div class="editor-sections">
    <TimingEditor
      {panel}
      context={context.timing("start")}
      heading="window_starts"
      clockLabel="window_start"
      windowEndLabel="latest_window_start_optional"
      addWindowEndLabel="randomize_window_start"
      explanationSubject="window_starts"
    />
    <TimingEditor
      {panel}
      context={context.timing("end")}
      heading="window_ends"
      clockLabel="window_end"
      windowEndLabel="latest_window_end_optional"
      addWindowEndLabel="randomize_window_end"
      explanationSubject="window_ends"
      modes={[
        ["absolute", "absolute_time"],
        ["duration", "duration"],
      ]}
    />
  </div>
  <button
    bind:this={advancedButton}
    type="button"
    class="random-advanced-button"
    class:error={!!editor.errors.days}
    aria-haspopup="dialog"
    aria-expanded={advancedOpen}
    aria-describedby={editor.errors.days ? "step-error-days" : undefined}
    data-builder-field="days"
    data-random-advanced
    disabled={panel.busy}
    onclick={(event) => {
      advancedTrigger = event.currentTarget;
      advancedOpen = true;
    }}>{t("advanced_settings")}</button
  >
  <FieldError {t} key="days" errors={{ ...editor.errors }} />
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
      {#if ["entities", "cover"].includes(form.on.kind) && form.on.kind === form.off.kind}
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
    <RandomActions {panel} {context} bind:advancedOpen bind:advancedTrigger />
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

<style>
  .random-advanced-button {
    margin-top: 16px;
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
