<script lang="ts">
  import { actionTargets } from "../../utils/custom-action.js";
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";

  import {
    startStep,
    openStep,
    actionSummary,
    stepTree,
  } from "../../controllers/steps.js";
  import { stepEntries } from "../../models/step-model.js";
  import { randomEntries } from "../../models/random-model.js";
  import { warningStepId } from "../../utils/step-issues.js";
  import { entitySummary, timingSummary } from "../../utils/util.js";
  import StepEditor from "./StepEditor.svelte";
  import ActivityIntro from "../shared/ActivityIntro.svelte";
  import WarningMessages from "../shared/WarningMessages.svelte";

  let { panel, revision }: { panel: LoadedOccupiedPanel; revision: number } =
    $props();

  let data = $derived.by(() => {
    void revision;
    const entries = stepEntries(panel.draft, panel.catalog, panel.t);
    const relatedEntries = randomEntries(panel.draft, panel.catalog).map(
      (entry) => ({ ...entry, id: `random:${entry.id}` }),
    );

    return {
      t: panel.t,
      entries,
      relatedEntries,
      issues: panel.visibleIssues().map((issue) => ({
        issue,
        stepId: warningStepId(issue, entries),
      })),
    };
  });
  let { t, entries, relatedEntries, issues } = $derived(data);
</script>

{#if entries.length === 0}
  <section class="step-empty">
    <h2>{t("scheduled_activity")}</h2>
    <p class="hint">
      {t("steps_hint")}
    </p>
    <button
      type="button"
      class="primary"
      data-create-step
      disabled={panel.busy}
      onclick={() => startStep(panel)}
    >
      {t("create_your_first_step")}
    </button>
  </section>
{:else}
  <ActivityIntro
    title={t("scheduled_activity")}
    description={t("steps_hint")}
  />
  <div class="step-layout">
    <div class="step-list" aria-label={t("steps")}>
      {#each stepTree(entries, panel.catalog.time_sources, relatedEntries) as { entry, depth, branches } (entry.id)}
        {@const warnings = issues
          .filter(({ stepId }) => stepId === entry.id)
          .map(({ issue }) => issue)}
        {@const editing =
          panel.stepEditor?.existing && panel.stepEditor.id === entry.id}
        {@const stepDisabled =
          (editing ? panel.stepEditor?.form.enabled : entry.enabled) === false}
        {@const expanded =
          editing || (!panel.stepEditor && panel.selectedStep === entry.id)}
        <div class="step-tree-item">
          <span class="step-tree-connectors" aria-hidden="true">
            {#each branches.slice(0, 3) as continues, level (level)}
              {#if continues || level === depth - 1}
                <span
                  class="step-tree-line"
                  class:step-tree-branch={level === depth - 1}
                  class:step-tree-last={!continues}
                  style={`--level:${level}`}
                ></span>
              {/if}
            {/each}
          </span>
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
              class:editing={editing && warnings.length === 0}
              disabled={panel.busy}
              aria-expanded={expanded}
              aria-controls={`step-editor-${entry.id}`}
              aria-describedby={warnings.length > 0
                ? `step-warning-${entry.id}`
                : undefined}
              onclick={() => openStep(panel, entry)}
            >
              <span class="step-row-content">
                <span class="step-row-heading">
                  <strong>{entry.name}</strong>
                  {#if stepDisabled}
                    <span class="step-status-badge">{t("disabled")}</span>
                  {/if}
                </span>
                <span class="hint"
                  >{actionSummary(entry, t)} ·
                  {entitySummary(panel.catalog, actionTargets(entry), t)}</span
                >
              </span>
              {#if warnings.length}
                <span class="step-row-warning" id={`step-warning-${entry.id}`}>
                  <ha-icon icon="mdi:alert-outline" aria-hidden="true"
                  ></ha-icon>
                  <span>
                    <WarningMessages {warnings} {t} />
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
    {t("create_step")}
  </button>
{/if}
