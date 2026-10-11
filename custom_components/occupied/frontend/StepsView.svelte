<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import {
    startStep,
    actionSummary,
    daySummary,
    stepTree,
    stepSymbol,
  } from "./steps.js";
  import { stepEntries, timingSummary } from "./step-model.js";
  import { entityName } from "./util.js";
  import StepMenu from "./StepMenu.svelte";
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
      {t("1. Set timing   →   2. Select entities   →   3. Choose an action")}
    </p>
    <button
      type="button"
      class="primary"
      data-create-routine
      onclick={() => startStep(panel)}
    >
      {t("Create your first step")}
    </button>
  </section>
{:else}
  <div class="routine-layout">
    <div class="routine-list" aria-label={t("Your steps")}>
      {#each stepTree(entries) as { entry, depth } (entry.id)}
        <div
          class="routine-row"
          role="group"
          aria-label={entry.name}
          data-routine-id={entry.id}
          style={`--depth:${Math.min(depth, 3)}`}
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
          ><StepMenu {panel} {entry} />
        </div>
      {/each}
    </div>
  </div>
  <button
    type="button"
    class="text-button"
    onclick={() => {
      panel.navigate("preview");
      panel.runPreview();
    }}
  >
    {t("Preview schedule")}
  </button>
{/if}
