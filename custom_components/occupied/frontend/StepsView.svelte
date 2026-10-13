<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import { startStep, openStep, actionSummary, stepTree } from "./steps.js";
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

{#if entries.length}
  <div class="page-heading">
    <button
      type="button"
      class="primary"
      data-create-routine
      disabled={panel.busy}
      onclick={() => startStep(panel)}
    >
      {t("Create step")}
    </button>
  </div>
{/if}
{#if !entries.length}
  <section class="routine-empty">
    <button
      type="button"
      class="primary"
      data-create-routine
      disabled={panel.busy}
      onclick={() => startStep(panel)}
    >
      {t("Create your first step")}
    </button>
  </section>
{:else}
  <div class="routine-layout">
    <div class="routine-list" aria-label={t("Your steps")}>
      {#each stepTree(entries) as { entry, depth } (entry.id)}
        {@const editing =
          panel.stepEditor?.existing && panel.stepEditor.id === entry.id}
        {@const expanded =
          editing ||
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
            class:editing
            aria-label={entry.name}
            disabled={panel.busy}
            aria-expanded={expanded}
            aria-controls={`step-editor-${entry.id}`}
            onclick={() => openStep(panel, entry)}
          >
            <span class="routine-row-content"
              ><strong>{entry.name}</strong><span class="hint"
                >{actionSummary(entry, t)} ·
                {entry.entities
                  .map((id) => entityName(panel.catalog, id))
                  .join(", ")}</span
              ></span
            >
            {#if !editing}
              <span class="routine-row-time">
                {timingSummary(
                  entry,
                  entries,
                  t,
                  panel.catalog.time_sources,
                  panel._hass.locale,
                )}
              </span>
            {/if}
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
    disabled={panel.busy}
    onclick={() => {
      panel.navigate("preview");
      panel.runPreview();
    }}
  >
    {t("Preview schedule")}
  </button>
{/if}
