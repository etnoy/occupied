<script lang="ts">
  import { actionTargets } from "./custom-action.js";
  import type { OccupiedPanel } from "./occupied-panel.js";
  import { randomEntries, countSummary } from "./random-model.js";
  import { openRandom } from "./random-editor-controller.js";
  import { stepEntries } from "./step-model.js";
  import {
    entityName,
    timingSummary,
    timingExplanation,
    timingForm,
  } from "./util.js";
  import RandomEventEditor from "./RandomEventEditor.svelte";

  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();

  let data = $derived.by(() => {
    void revision;

    return {
      t: panel.t,
      entries: randomEntries(panel.draft, panel.catalog),
      steps: [
        ...stepEntries(panel.draft, panel.catalog, panel.t),
        ...randomEntries(panel.draft, panel.catalog).map((entry) => ({
          id: `random:${entry.id}`,
          name: entry.name,
        })),
      ],
    };
  });
  let { t, entries, steps } = $derived(data);
</script>

{#if entries.length === 0}
  <section class="step-empty">
    <h2>{t("Random activity")}</h2>
    <p class="hint">
      {t(
        "Run actions at random times within a window. Choose how often they run and how long each occurrence lasts.",
      )}
    </p>
    <button
      type="button"
      class="primary"
      data-create-random
      disabled={panel.busy}
      onclick={() => openRandom(panel)}
      >{t("Create your first random event")}</button
    >
  </section>
{:else}
  <p class="hint">
    {t(
      "Run actions at random times within a window. Choose how often they run and how long each occurrence lasts.",
    )}
  </p>
  <div class="step-list" aria-label={t("Random events")}>
    {#each entries as entry (entry.id)}
      {@const editing =
        panel.randomEditor?.existing && panel.randomEditor.id === entry.id}
      {@const disabled =
        (editing ? panel.randomEditor?.form.enabled : entry.enabled) === false}
      <div
        class="step-card"
        class:step-disabled={disabled}
        data-random-id={entry.id}
        style="--depth:0"
      >
        <button
          type="button"
          id={`random-card-${entry.id}`}
          class="step-row"
          class:editing
          aria-label={disabled
            ? `${entry.name} · ${t("Disabled")}`
            : entry.name}
          aria-expanded={editing}
          aria-controls={`random-editor-${entry.id}`}
          disabled={panel.busy}
          onclick={() => openRandom(panel, entry)}
        >
          <span class="step-row-content">
            <span class="step-row-heading"
              ><strong>{entry.name}</strong>{#if disabled}
                <span class="step-status-badge">{t("Disabled")}</span
                >{/if}</span
            >
            <span class="hint"
              >{countSummary(entry.count)}
              {t("times per window")} · {entry.min_duration ||
                "5m"}–{entry.max_duration || "15m"} · {actionTargets(entry.on)
                .map((id) => entityName(panel.catalog, id))
                .join(", ")}</span
            >
          </span>
          {#if !editing}
            <span class="step-row-time"
              >{timingSummary(
                { timing: entry.start },
                steps,
                t,
                panel.catalog.time_sources,
                panel._hass.locale,
              )} → {timingExplanation(
                timingForm(entry.end),
                steps,
                t,
                panel.catalog.time_sources,
                {
                  subject: "Window ends",
                  includeHints: false,
                  locale: panel._hass.locale,
                },
              )}</span
            >{/if}
        </button>
        <div id={`random-editor-${entry.id}`}>
          {#if editing}
            <RandomEventEditor {panel} {revision} />{/if}
        </div>
      </div>
    {/each}
  </div>
  <button
    type="button"
    class="primary"
    data-create-random
    disabled={panel.busy}
    onclick={() => openRandom(panel)}>{t("Create random event")}</button
  >
{/if}
