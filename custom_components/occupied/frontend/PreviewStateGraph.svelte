<script lang="ts">
  import { onMount } from "svelte";
  import type { HomeAssistant, Plan, Program, Translate } from "./types.js";
  import { properties } from "./dom.js";
  import { loadHaHistoryChart } from "./ha-controls.js";
  import { calendarStateHistory, previewStateHistory } from "./timeline.js";

  let {
    plan,
    schedulePlans,
    program,
    hass,
    names = {},
    t,
  }: {
    plan: Plan;
    schedulePlans?: Plan[];
    program: Program;
    hass: HomeAssistant;
    names?: Record<string, string>;
    t: Translate;
  } = $props();

  let ready = $state(false);
  let failed = $state(false);
  let narrow = $state(false);

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
        ? "No steps are scheduled for this date."
        : "No light, switch, or cover actions on this date. Other actions are listed in Event details.",
    )}
  </p>
{/if}
{#if data.some((entity) => entity.entity_id.startsWith("cover."))}
  <p class="hint">
    {t(
      "Cover strips show planned position and tilt targets. Travel time and positions after stop actions are unknown.",
    )}
  </p>
{/if}
{#if failed && data.length > 0}
  <p class="hint">
    {t(
      "The Home Assistant graph could not load. Planned actions are available in Event details.",
    )}
  </p>
{:else if ready}
  <state-history-chart-timeline
    hidden={data.length === 0}
    aria-label={t("Planned device states")}
    use:properties={{
      hass: chartHass,
      data,
      names,
      startTime: new Date(plan.start),
      endTime: new Date(plan.end),
      showNames: true,
      narrow,
      // Reserve HA's maximum label width before the chart's first render.
      // Its deferred measurement can then update without moving the plot.
      paddingYAxis: narrow ? 105 : 185,
      clickForMoreInfo: false,
    }}
  ></state-history-chart-timeline>
{:else if data.length > 0}
  <p role="status">{t("Loading graph…")}</p>
{/if}

<style>
  state-history-chart-timeline {
    display: block;
    width: 100%;
  }

  state-history-chart-timeline[hidden] {
    display: none;
  }
</style>
