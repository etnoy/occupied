<script lang="ts">
  import { untrack } from "svelte";
  import type { OccupiedPanel } from "./occupied-panel.js";
  import { createRandomEditorContext } from "./random-editor-controller.js";
  import EditorField from "./EditorField.svelte";
  import TimingEditor from "./TimingEditor.svelte";
  import RandomActions from "./RandomActions.svelte";
  import ActionEditor from "./ActionEditor.svelte";
  import FieldError from "./FieldError.svelte";
  import { focusEditor } from "./step-editor-controller.js";
  import { randomExplanation } from "./random-explanation.js";
  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  let context = $derived.by(() => {
    revision;
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
    if (panel.randomEditor?.errors.days) {
      advancedTrigger = advancedButton;
      advancedOpen = true;
    }
  }
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
      explanationSubject="Window starts"
    />
    <TimingEditor
      {panel}
      context={context.timing("end")}
      heading="Window ends"
      clockLabel="Window end"
      windowEndLabel="Latest window end (optional)"
      addWindowEndLabel="Randomize window end"
      explanationSubject="Window ends"
      modes={[
        ["absolute", "Absolute time"],
        ["duration", "Duration"],
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
    }}>{t("Advanced settings")}</button
  >
  <FieldError key="days" errors={{ ...editor.errors }} />
  <h3>{t("Frequency and duration")}</h3>
  <div class="random-frequency">
    <div>
      <EditorField
        {panel}
        {context}
        key="minCount"
        label="Minimum events per window"
        value={form.minCount}
        update={(value) => {
          if (!maxCountVisible) form.maxCount = value;
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
          }}>{t("Add maximum events")}</button
        >
      {/if}
    </div>
    <div>
      {#if maxCountVisible}
        <EditorField
          {panel}
          {context}
          key="maxCount"
          label="Maximum events per window"
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
              }}>{t("Remove maximum events")}</button
            >
          {/snippet}
        </EditorField>
      {/if}
    </div>
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
  <p class="hint" data-random-explanation aria-live="polite">
    {randomExplanation(form, panel.draft, panel.catalog, t, panel._hass.locale)}
  </p>
  <p class="hint">
    {t("Use durations like 5m, 30s, or 1h.")}
  </p>
  <div class="editor-sections">
    <ActionEditor
      {panel}
      context={context.action("on")}
      heading="When event starts"
      kindLabel="Start action"
      entityLabel="Start entities"
    />
    <div>
      <ActionEditor
        {panel}
        context={context.action("off")}
        heading="When event ends"
        kindLabel="End action"
        entityLabel="End entities"
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
          />{t("Use the same entities")}
        </label>
      {/if}
    </div>
  </div>
  <div class="builder-footer">
    <button type="button" disabled={panel.busy} onclick={cancel}
      >{t("Cancel")}</button
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
          ? "Add to draft"
          : "Save random event",
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
