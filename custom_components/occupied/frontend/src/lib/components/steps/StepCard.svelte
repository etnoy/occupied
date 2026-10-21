<script lang="ts">
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { Issue, StepEntry } from "../../types.js";
  import { actionTargets } from "../../utils/custom-action.js";
  import { openStep, actionSummary } from "../../controllers/steps.js";
  import { entitySummary, timingSummary } from "../../utils/util.js";
  import StepEditor from "./StepEditor.svelte";
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
    entry: StepEntry;
    depth: number;
    entries: Parameters<typeof timingSummary>[1];
    warnings: Issue[];
  } = $props();

  let t = $derived(panel.t);
  let editing = $derived(
    panel.stepEditor?.existing && panel.stepEditor.id === entry.id,
  );
  let stepDisabled = $derived(
    (editing ? panel.stepEditor?.form.enabled : entry.enabled) === false,
  );
  let expanded = $derived(
    editing || (!panel.activeEditor && panel.selectedStep === entry.id),
  );
</script>

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
        <ha-icon icon="mdi:alert-outline" aria-hidden="true"></ha-icon>
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
