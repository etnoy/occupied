<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import { startStep, openStep, actionSummary, stepTree } from "./steps.js";
  import { stepEntries } from "./step-model.js";
  import { warningStepId } from "./step-issues.js";
  import { entityName, timingSummary } from "./util.js";
  import StepEditor from "./StepEditor.svelte";
  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  let data = $derived.by(() => {
    revision;
    const entries = stepEntries(panel.draft, panel.catalog, panel.t);
    return {
      t: panel.t,
      entries,
      issues: panel.visibleIssues().map((issue) => ({
        issue,
        stepId: warningStepId(issue, entries),
      })),
    };
  });
  let { t, entries, issues } = $derived(data);
</script>

{#if !entries.length}
  <section class="step-empty">
    <h2>{t("Scheduled activity")}</h2>
    <p class="hint">
      {t(
        "Run actions at specific times, around sunrise or sunset, or relative to other steps. Choose which devices to control and what they should do.",
      )}
    </p>
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
        {@const warnings = issues
          .filter(({ stepId }) => stepId === entry.id)
          .map(({ issue }) => issue)}
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
          class:step-warning={warnings.length > 0}
          data-step-id={entry.id}
          style={`--depth:${Math.min(depth, 3)}`}
        >
          <button
            type="button"
            id={`step-card-${entry.id}`}
            class="step-row"
            class:editing={editing && !warnings.length}
            aria-label={stepDisabled
              ? `${entry.name} · ${t("Disabled")}`
              : entry.name}
            disabled={panel.busy}
            aria-expanded={expanded}
            aria-controls={`step-editor-${entry.id}`}
            aria-describedby={warnings.length
              ? `step-warning-${entry.id}`
              : undefined}
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
            {#if warnings.length}
              <span class="step-row-warning" id={`step-warning-${entry.id}`}>
                <ha-icon icon="mdi:alert-outline" aria-hidden="true"></ha-icon>
                <span>
                  {#each warnings as warning}
                    <span class="step-warning-message">{warning.message}</span>
                  {/each}
                </span>
              </span>
            {:else if !editing}
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
