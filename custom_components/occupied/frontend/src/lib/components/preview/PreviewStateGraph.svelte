<script lang="ts">
  import { onMount } from "svelte";
  import type { HomeAssistant, Plan, Program, Translate } from "../../types.js";
  import { timelineNow, type NowPosition } from "../../actions/timeline-now.js";
  import { timelineTooltip } from "../../actions/timeline-tooltip.js";
  import { properties } from "../../actions/dom.js";
  import { loadHaHistoryChart } from "../../services/ha-controls.js";
  import {
    calendarStateHistory,
    previewStateHistory,
  } from "../../utils/timeline.js";

  let {
    plan,
    schedulePlans,
    program,
    hass,
    names = {},
    t,
    eventTime = null,
  }: {
    plan: Plan;
    schedulePlans?: Plan[];
    program: Program;
    hass: HomeAssistant;
    names?: Record<string, string>;
    t: Translate;
    eventTime?: string | null;
  } = $props();

  let ready = $state(false);
  let failed = $state(false);
  let narrow = $state(false);
  let nowPosition = $state<NowPosition | null>(null);

  function updateNowPosition(position: NowPosition | null) {
    if (
      position?.x !== nowPosition?.x ||
      position?.alignRight !== nowPosition?.alignRight
    ) {
      nowPosition = position;
    }
  }

  let data = $derived(
    schedulePlans
      ? calendarStateHistory(schedulePlans, plan, program, names, t)
      : previewStateHistory(plan, program, names, t),
  );
  // Keep native axis labels/tooltips in the sampled plan's zone, even when
  // HA's display timezone differs. This is a view-only copy of the HA object.
  let chartHass = $derived({
    ...hass,
    config: { ...hass.config, time_zone: plan.timezone },
    locale: { ...hass.locale, time_zone: "server" },
  });

  onMount(() => {
    let disposed = false;
    const media = globalThis.matchMedia("(max-width: 600px)");
    const updateNarrow = () => {
      narrow = media.matches;
    };
    updateNarrow();
    media.addEventListener("change", updateNarrow);
    void loadHaHistoryChart()
      .then(() => {
        if (!disposed) {
          ready = true;
        }
      })
      .catch(() => {
        if (!disposed) {
          failed = true;
        }
      });

    return () => {
      disposed = true;
      media.removeEventListener("change", updateNarrow);
    };
  });
</script>

{#if data.length === 0}
  <p class="hint">
    {t(
      plan.events.length === 0
        ? "schedule_empty_hint"
        : "preview_devices_empty_hint",
    )}
  </p>
{/if}
{#if data.some((entity) => entity.entity_id.startsWith("cover."))}
  <p class="hint">
    {t("preview_covers_hint")}
  </p>
{/if}
{#if failed && data.length > 0}
  <p class="hint">
    {t("preview_graph_error")}
  </p>
{:else if ready}
  <div class="preview-graph" class:empty={data.length === 0}>
    {#if nowPosition}
      <span
        class="now-label"
        style:left={`${nowPosition.x}px`}
        aria-hidden="true">{t("preview_now")}</span
      >
    {/if}
    <state-history-chart-timeline
      hidden={data.length === 0}
      aria-label={t("planned_device_states")}
      use:timelineTooltip={data}
      use:timelineNow={{
        label: t("preview_now"),
        eventTime,
        startTime: plan.start,
        endTime: plan.end,
        onNowPosition: updateNowPosition,
      }}
      use:properties={{
        hass: chartHass,
        data,
        names,
        startTime: new Date(plan.start),
        endTime: new Date(plan.end),
        showNames: true,
        narrow,
        // Let HA measure the entity names instead of reserving its maximum width.
        paddingYAxis: 0,
        clickForMoreInfo: false,
      }}
    ></state-history-chart-timeline>
  </div>
{:else if data.length > 0}
  <p role="status">{t("loading_graph")}</p>
{/if}

<style>
  .preview-graph {
    position: relative;
    padding-top: 18px;
  }

  .preview-graph.empty {
    display: none;
  }

  .now-label {
    position: absolute;
    top: 0;
    color: var(--secondary-text-color, #727272);
    font-size: 12px;
    line-height: 16px;
    transform: translateX(-50%);
    pointer-events: none;
  }

  state-history-chart-timeline {
    display: block;
    width: 100%;
  }

  state-history-chart-timeline[hidden] {
    display: none;
  }
</style>
