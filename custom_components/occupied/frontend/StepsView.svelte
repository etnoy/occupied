<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import {
    startStep,
    openStep,
    actionSummary,
    daySummary,
    stepTree,
    stepSymbol,
  } from "./steps.js";
  import { stepEntries, timingSummary, simpleStep } from "./step-model.js";
  import { entityName } from "./util.js";
  import StepEditor from "./StepEditor.svelte";
  import StepActions from "./StepActions.svelte";
  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  let data = $derived.by(() => {
    revision;
    return { t: panel.t, entries: stepEntries(panel.draft) };
  });
  let { t, entries } = $derived(data);
</script>

<div class="page-heading">
  <div>
    <h2>{t("Your steps")}</h2>
    <p class="hint">
      {t("Choose what happens, when it happens, and what follows.")}
    </p>
  </div>
  {#if entries.length}
    <button
      type="button"
      class="primary"
      data-create-routine
      disabled={!!panel.stepEditor}
      onclick={() => startStep(panel)}
    >
      {t("Create step")}
    </button>
  {/if}
</div>
{#if !entries.length}
  <section class="routine-empty">
    <h2>{t("A little activity. A lived-in home.")}</h2>
    <p class="hint">
      {t(
        "Start with an entity action or a scene, then add whatever should happen next.",
      )}
    </p>
    <p class="empty-steps">
      {t("Set timing, select entities, and choose an action.")}
    </p>
    <button
      type="button"
      class="primary"
      data-create-routine
      disabled={!!panel.stepEditor}
      onclick={() => startStep(panel)}
    >
      {t("Create your first step")}
    </button>
  </section>
{:else}
  <div class="routine-layout">
    <div class="routine-list" aria-label={t("Your steps")}>
      {#each stepTree(entries) as { entry, depth } (entry.id)}
        {@const expanded =
          (panel.stepEditor?.existing && panel.stepEditor.id === entry.id) ||
          (!panel.stepEditor &&
            !simpleStep(entry) &&
            panel.selectedStep === entry.id)}
        <div
          class="routine-card"
          data-routine-id={entry.id}
          style={`--depth:${Math.min(depth, 3)}`}
        >
          <button
            type="button"
            id={`step-card-${entry.id}`}
            class="routine-row"
            aria-label={entry.name}
            disabled={panel.busy ||
              (!!panel.stepEditor && panel.stepEditor.id === entry.id)}
            aria-expanded={expanded}
            aria-controls={`step-editor-${entry.id}`}
            onclick={() => openStep(panel, entry)}
          >
            <span class="routine-symbol" aria-hidden="true"
              >{stepSymbol(entry)}</span
            >
            <span class="routine-row-content"
              ><strong>{entry.name}</strong><span class="hint"
                >{actionSummary(entry, t)} ·
                {entry.entities
                  .map((id) => entityName(panel.catalog, id))
                  .join(", ")}</span
              ></span
            >
            <span class="routine-row-time"
              ><span
                >{timingSummary(
                  entry,
                  entries,
                  t,
                  panel.catalog.time_sources,
                )}</span
              ><small>{daySummary(entry.days, t)}</small></span
            >
          </button>
          {#if expanded}
            <div id={`step-editor-${entry.id}`}>
              {#if panel.stepEditor}
                <StepEditor {panel} {revision} />
              {:else}
                <section class="routine-editor">
                  <p class="hint">
                    {t(
                      "Custom actions cannot be edited with the simple step editor.",
                    )}
                  </p>
                  <StepActions {panel} {entry} />
                </section>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  <button
    type="button"
    class="text-button"
    disabled={!!panel.stepEditor}
    onclick={() => {
      panel.navigate("preview");
      panel.runPreview();
    }}
  >
    {t("Preview schedule")}
  </button>
{/if}
