<script lang="ts">
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { Issue, RandomEntry } from "../../types.js";
  import { actionTargets } from "../../utils/custom-action.js";
  import { openRandom } from "../../controllers/random-editor-controller.js";
  import {
    entitySummary,
    timingSummary,
    timingExplanation,
    timingForm,
  } from "../../utils/util.js";
  import RandomEventEditor from "./RandomEventEditor.svelte";
  import WarningMessages from "../shared/WarningMessages.svelte";

  let {
    panel,
    revision,
    entry,
    depth,
    entries,
    warnings,
  }: {
    panel: LoadedOccupiedPanel;
    revision: number;
    entry: RandomEntry;
    depth: number;
    entries: Parameters<typeof timingSummary>[1];
    warnings: Issue[];
  } = $props();

  let t = $derived(panel.t);
  let editing = $derived(
    panel.randomEditor?.existing && panel.randomEditor.id === entry.id,
  );
  let disabled = $derived(
    (editing ? panel.randomEditor?.form.enabled : entry.enabled) === false,
  );
</script>

<div
  class="step-card"
  class:step-disabled={disabled}
  class:step-warning={warnings.length > 0}
  data-random-id={entry.id}
  style={`--depth:${Math.min(depth, 3)}`}
>
  <button
    type="button"
    id={`random-card-${entry.id}`}
    class="step-row"
    class:editing={editing && warnings.length === 0}
    aria-label={disabled ? `${entry.name} · ${t("disabled")}` : entry.name}
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
          <span class="step-status-badge">{t("disabled")}</span>{/if}</span
      >
      <span class="hint"
        >{entitySummary(
          panel.catalog,
          [
            ...new Set([
              ...actionTargets(entry.on),
              ...actionTargets(entry.off),
            ]),
          ],
          t,
        )}</span
      >
    </span>
    {#if warnings.length}
      <span class="step-row-warning" id={`random-warning-${entry.id}`}>
        <ha-icon icon="mdi:alert-outline" aria-hidden="true"></ha-icon>
        <span>
          <WarningMessages {warnings} {t} />
        </span>
      </span>
    {:else if !editing}
      <span class="step-row-time"
        >{timingExplanation(
          timingForm(entry.start),
          entries,
          t,
          panel.catalog.time_sources,
          {
            subject: "starts",
            includeHints: false,
            locale: panel._hass.locale,
          },
        )}, {timingExplanation(
          timingForm(entry.end),
          entries,
          t,
          panel.catalog.time_sources,
          {
            subject: "ends",
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
