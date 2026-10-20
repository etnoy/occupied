<script lang="ts">
  import { actionTargets } from "../../utils/custom-action.js";
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import { randomEntries, countSummary } from "../../models/random-model.js";
  import { openRandom } from "../../controllers/random-editor-controller.js";
  import { stepEntries } from "../../models/step-model.js";
  import { warningRandomId } from "../../utils/step-issues.js";
  import {
    entitySummary,
    timingSummary,
    timingExplanation,
    timingForm,
  } from "../../utils/util.js";
  import RandomEventEditor from "./RandomEventEditor.svelte";
  import ActivityIntro from "../shared/ActivityIntro.svelte";

  let { panel, revision }: { panel: LoadedOccupiedPanel; revision: number } =
    $props();

  let data = $derived.by(() => {
    void revision;
    const entries = randomEntries(panel.draft, panel.catalog);

    return {
      t: panel.t,
      entries,
      issues: panel.visibleIssues().map((issue) => ({
        issue,
        randomId: warningRandomId(issue, entries),
      })),
      steps: [
        ...stepEntries(panel.draft, panel.catalog, panel.t),
        ...randomEntries(panel.draft, panel.catalog).map((entry) => ({
          id: `random:${entry.id}`,
          name: entry.name,
        })),
      ],
    };
  });
  let { t, entries, steps, issues } = $derived(data);
</script>

{#if entries.length === 0}
  <section class="step-empty">
    <h2>{t("random_activity")}</h2>
    <p class="hint">
      {t("random_activity_hint")}
    </p>
    <button
      type="button"
      class="primary"
      data-create-random
      disabled={panel.busy}
      onclick={() => openRandom(panel)}
      >{t("create_your_first_random_event")}</button
    >
  </section>
{:else}
  <ActivityIntro
    title={t("random_activity")}
    description={t("random_activity_hint")}
  />
  <div class="step-list" aria-label={t("random_events")}>
    {#each entries as entry (entry.id)}
      {@const warnings = issues
        .filter(({ randomId }) => randomId === entry.id)
        .map(({ issue }) => issue)}
      {@const editing =
        panel.randomEditor?.existing && panel.randomEditor.id === entry.id}
      {@const disabled =
        (editing ? panel.randomEditor?.form.enabled : entry.enabled) === false}
      <div
        class="step-card"
        class:step-disabled={disabled}
        class:step-warning={warnings.length > 0}
        data-random-id={entry.id}
        style="--depth:0"
      >
        <button
          type="button"
          id={`random-card-${entry.id}`}
          class="step-row"
          class:editing={editing && warnings.length === 0}
          aria-label={disabled
            ? `${entry.name} · ${t("disabled")}`
            : entry.name}
          aria-expanded={editing}
          aria-controls={`random-editor-${entry.id}`}
          aria-describedby={warnings.length > 0
            ? `random-warning-${entry.id}`
            : undefined}
          disabled={panel.busy}
          onclick={() => openRandom(panel, entry)}
        >
          <span class="step-row-content">
            <span class="step-row-heading"
              ><strong>{entry.name}</strong>{#if disabled}
                <span class="step-status-badge">{t("disabled")}</span
                >{/if}</span
            >
            <span class="hint"
              >{countSummary(entry.count)}
              {t("times_per_window")} · {entry.min_duration ||
                "5m"}–{entry.max_duration || "15m"} · {entitySummary(
                panel.catalog,
                actionTargets(entry.on),
                t,
              )}</span
            >
          </span>
          {#if warnings.length}
            <span class="step-row-warning" id={`random-warning-${entry.id}`}>
              <ha-icon icon="mdi:alert-outline" aria-hidden="true"></ha-icon>
              <span>
                {#each warnings as warning (warning)}
                  <span class="step-warning-message">{warning.message}</span>
                {/each}
              </span>
            </span>
          {:else if !editing}
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
                  subject: "window_ends",
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
    onclick={() => openRandom(panel)}>{t("create_random_event")}</button
  >
{/if}
