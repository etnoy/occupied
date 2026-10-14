<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import Timeline from "./Timeline.svelte";
  import LivePreviewControls from "./LivePreviewControls.svelte";
  import { properties } from "./dom.js";
  import { formatPreviewDate } from "./time-format.js";
  import { calendarDayPlan } from "./timeline.js";

  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();

  let showLoading = $state(false);

  $effect(() => {
    void revision;
    if (!panel.busy) {
      showLoading = false;

      return;
    }
    showLoading = false;
    const timeout = globalThis.setTimeout(() => {
      showLoading = true;
    }, 250);

    return () => globalThis.clearTimeout(timeout);
  });

  let data = $derived.by(() => {
    void revision;
    const t = panel.t;

    return { t };
  });
  let { t } = $derived(data);
  let plan = $derived(
    panel.liveVisible && panel.livePlan
      ? panel.livePlan
      : calendarDayPlan(
          panel.preview?.plans || [],
          panel.preview?.plans.at(-1)?.simulation_date || panel.previewDate,
        ),
  );
  let date = $derived(
    plan?.simulation_date ||
      panel.previewDate ||
      panel.document.simulation_date,
  );

  const previousIcon =
    "M15.41,16.59L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.59Z";
  const nextIcon =
    "M8.59,16.59L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.59Z";

  let entityNames = $derived(
    Object.fromEntries(
      panel.catalog.entities.map((entity) => [entity.entity_id, entity.name]),
    ),
  );
</script>

{#snippet dayHeading()}
  <div class="schedule-heading">
    <h2 aria-live="polite">
      {formatPreviewDate(
        date,
        panel.document.simulation_date,
        panel._hass.locale,
        t,
      )}
    </h2>
    {#if showLoading && plan}
      <span class="hint" role="status">{t("Loading schedule…")}</span>
    {/if}
    <div class="day-navigation" role="group" aria-label={t("Schedule day")}>
      <!-- HA supplies a keyboard-accessible button inside its shadow root. -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <ha-icon-button
        title={t("Previous day")}
        use:properties={{
          path: previousIcon,
          label: t("Previous day"),
          disabled: panel.busy || panel.liveRunning || panel.liveBusy,
        }}
        onclick={() => panel.movePreviewDay(-1)}
      ></ha-icon-button>
      <button
        type="button"
        class="text-button"
        disabled={panel.busy ||
          panel.liveRunning ||
          panel.liveBusy ||
          date === panel.document.simulation_date}
        onclick={() => panel.selectPreviewDate(panel.document.simulation_date)}
        >{t("Today")}</button
      >
      <!-- HA supplies a keyboard-accessible button inside its shadow root. -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <ha-icon-button
        title={t("Next day")}
        use:properties={{
          path: nextIcon,
          label: t("Next day"),
          disabled: panel.busy || panel.liveRunning || panel.liveBusy,
        }}
        onclick={() => panel.movePreviewDay(1)}
      ></ha-icon-button>
    </div>
  </div>
{/snippet}

<LivePreviewControls {panel} />
<Timeline
  {plan}
  schedulePlans={panel.liveVisible && panel.livePlan
    ? [panel.livePlan]
    : panel.preview?.plans}
  program={panel.liveVisible && panel.liveProgram
    ? panel.liveProgram
    : panel.previewProgram}
  liveSession={panel.liveVisible ? panel.liveSession : null}
  {t}
  locale={panel._hass.locale}
  hass={panel._hass}
  {entityNames}
  heading={dayHeading}
  loading={panel.busy}
  {showLoading}
/>

<style>
  .schedule-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
    margin-bottom: 20px;
  }

  h2 {
    margin: 0;
  }

  .day-navigation {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .day-navigation button {
    margin: 0;
  }
</style>
