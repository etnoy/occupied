<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import { startStep, openStep, actionSummary, stepTree } from "./steps.js";
  import { stepEntries } from "./step-model.js";
  import { entityName, timingSummary } from "./util.js";
  import StepEditor from "./StepEditor.svelte";
  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  let data = $derived.by(() => {
    revision;
    return {
      t: panel.t,
      entries: stepEntries(panel.draft, panel.catalog, panel.t),
    };
  });
  let { t, entries } = $derived(data);
</script>

{#if !entries.length}
  <section class="step-empty">
    <button
      type="button"
      class="primary"
      data-create-step
      disabled={panel.busy}
      onclick={() => startStep(panel)}
    >
      {t("Create your first step")}
    </button>
  </section>
{:else}
  <div class="step-layout">
    <div class="step-list" aria-label={t("Steps")}>
      {#each stepTree(entries) as { entry, depth } (entry.id)}
        {@const editing =
          panel.stepEditor?.existing && panel.stepEditor.id === entry.id}
        {@const stepDisabled = editing
          ? panel.stepEditor?.form.enabled === false
          : entry.enabled === false}
        {@const expanded =
          editing || (!panel.stepEditor && panel.selectedStep === entry.id)}
        <div
          class="step-card"
          class:step-disabled={stepDisabled}
          data-step-id={entry.id}
          style={`--depth:${Math.min(depth, 3)}`}
        >
          <button
            type="button"
            id={`step-card-${entry.id}`}
            class="step-row"
            class:editing
            aria-label={stepDisabled
              ? `${entry.name} · ${t("Disabled")}`
              : entry.name}
            disabled={panel.busy}
            aria-expanded={expanded}
            aria-controls={`step-editor-${entry.id}`}
            onclick={() => openStep(panel, entry)}
          >
            <span class="step-row-content">
              <span class="step-row-heading">
                <strong>{entry.name}</strong>
                {#if stepDisabled}
                  <span class="step-status-badge">{t("Disabled")}</span>
                {/if}
              </span>
              <span class="hint"
                >{actionSummary(entry, t)} ·
                {entry.entities
                  .map((id) => entityName(panel.catalog, id))
                  .join(", ")}</span
              >
            </span>
            {#if !editing}
              <span class="step-row-time">
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
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  <button
    type="button"
    class="primary"
    data-create-step
    disabled={panel.busy}
    onclick={() => startStep(panel)}
  >
    {t("Create step")}
  </button>
{/if}
