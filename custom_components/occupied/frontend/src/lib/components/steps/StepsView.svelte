<script lang="ts">
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import { startStep, stepTree } from "../../controllers/steps.js";
  import { openRandom } from "../../controllers/random-editor-controller.js";
  import { stepEntries } from "../../models/step-model.js";
  import { randomEntries } from "../../models/random-model.js";
  import { warningStepId, warningRandomId } from "../../utils/step-issues.js";
  import StepCard from "./StepCard.svelte";
  import RandomCard from "../random/RandomCard.svelte";

  let { panel, revision }: { panel: LoadedOccupiedPanel; revision: number } =
    $props();

  let data = $derived.by(() => {
    void revision;
    const steps = stepEntries(panel.draft, panel.catalog, panel.t);
    const random = randomEntries(panel.draft, panel.catalog);
    const entries = [
      ...steps.map((entry) => ({ kind: "step" as const, ...entry })),
      ...random.map((entry) => ({
        kind: "random" as const,
        ...entry,
        id: `random:${entry.id}`,
        randomEntry: entry,
        timing: entry.start,
      })),
    ];

    return {
      t: panel.t,
      entries,
      tree: stepTree(entries, panel.catalog.time_sources),
      issues: panel.visibleIssues().map((issue) => ({
        issue,
        stepId: warningStepId(issue, steps),
        randomId: warningRandomId(issue, random),
      })),
    };
  });
  let { t, entries, tree, issues } = $derived(data);
</script>

{#snippet addButtons(empty: boolean)}
  <div class="activity-add-buttons">
    <button
      type="button"
      class="primary"
      data-create-step
      disabled={panel.busy}
      onclick={() => startStep(panel)}
    >
      {t(empty ? "create_your_first_step" : "create_step")}
    </button>
    <button
      type="button"
      data-create-random
      disabled={panel.busy}
      onclick={() => openRandom(panel)}
    >
      {t("create_random_event")}
    </button>
  </div>
{/snippet}

{#if entries.length === 0}
  <section class="step-empty">
    <h2>{t("activity")}</h2>
    <p class="hint">{t("activity_hint")}</p>
    {@render addButtons(true)}
  </section>
{:else}
  <div class="step-layout">
    <div class="step-list" aria-label={t("activity")}>
      {#each tree as { entry, depth, branches } (entry.id)}
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
          {#if entry.kind === "random"}
            <RandomCard
              {panel}
              {revision}
              entry={entry.randomEntry}
              {depth}
              {entries}
              warnings={issues
                .filter(({ randomId }) => randomId === entry.randomEntry.id)
                .map(({ issue }) => issue)}
            />
          {:else}
            <StepCard
              {panel}
              {revision}
              {entry}
              {depth}
              {entries}
              warnings={issues
                .filter(({ stepId }) => stepId === entry.id)
                .map(({ issue }) => issue)}
            />
          {/if}
        </div>
      {/each}
    </div>
  </div>
  {@render addButtons(false)}
{/if}
