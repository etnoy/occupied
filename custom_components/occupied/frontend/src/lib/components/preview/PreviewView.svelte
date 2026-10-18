<script lang="ts">
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";

  import type { PlannedEvent } from "../../types.js";
  import { openStep } from "../../controllers/steps.js";
  import { openRandom } from "../../controllers/random-editor-controller.js";
  import { stepEntries } from "../../models/step-model.js";
  import { randomEntries } from "../../models/random-model.js";

  import Timeline from "./Timeline.svelte";
  import LivePreviewControls from "./LivePreviewControls.svelte";
  import { properties } from "../../actions/dom.js";
  import { formatPreviewDate } from "../../utils/time-format.js";
  import { calendarDayPlan } from "../../utils/timeline.js";

  let { panel, revision }: { panel: LoadedOccupiedPanel; revision: number } =
    $props();

  let showLoading = $state(false);
  let clock = $state(0);

  let today = $derived.by(() => {
    void clock;
    void revision;

    return panel.today;
  });
  $effect(() => {
    const timer = globalThis.setInterval(() => {
      clock++;
    }, 30_000);

    return () => globalThis.clearInterval(timer);
  });

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

  let t = $derived(panel.t);
  let preview = $derived(panel.preview);
  let previewDate = $derived(panel.previewDate);
  let liveVisible = $derived(panel.liveVisible);
  let livePlan = $derived(panel.livePlan);
  let liveProgram = $derived(panel.liveProgram);
  let previewProgram = $derived(panel.previewProgram);
  let draft = $derived(panel.draft);
  let schedulePlans = $derived(
    liveVisible && livePlan ? [livePlan] : preview?.plans,
  );
  let program = $derived(
    liveVisible && liveProgram ? liveProgram : (previewProgram ?? draft),
  );
  let plan = $derived(
    liveVisible && livePlan
      ? livePlan
      : calendarDayPlan(
          preview?.plans || [],
          preview?.plans.at(-1)?.simulation_date || previewDate,
        ),
  );
  let date = $derived(plan?.simulation_date || panel.previewDate || today);

  function openSource(event: PlannedEvent) {
    if (event.kind.startsWith("random_")) {
      const entry = randomEntries(panel.draft, panel.catalog).find(
        (entry) => entry.id === event.source_id,
      );
      if (entry) {
        openRandom(panel, entry);
      }
    } else {
      const entry = stepEntries(panel.draft, panel.catalog, panel.t).find(
        (entry) => entry.id === event.source_id,
      );
      if (entry) {
        openStep(panel, entry);
      }
    }
  }

  const previousIcon =
    "M15.41,16.59L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.59Z";
  const nextIcon =
    "M8.59,16.59L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.59Z";
  const refreshIcon =
    "M17.65,6.35C16.2,4.9 14.21,4 12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18C8.69,18 6,15.31 6,12C6,8.69 8.69,6 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z";

  let entities = $derived(panel.catalog.entities);
  let entityNames = $derived(
    Object.fromEntries(
      entities.map((entity) => [entity.entity_id, entity.name]),
    ),
  );
</script>

{#snippet dayHeading()}
  <div class="schedule-heading">
    <div class="schedule-title">
      <h2 aria-live="polite">
        {formatPreviewDate(date, today, panel._hass.locale, t)}
      </h2>
      {#if !panel.liveRunning}
        <button
          type="button"
          class="refresh-button"
          title={t("refresh_preview")}
          aria-label={t("refresh_preview")}
          disabled={panel.busy || panel.liveBusy}
          onclick={() => panel.refreshPreviewSchedule()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={refreshIcon} />
          </svg>
        </button>
      {/if}
    </div>
    {#if showLoading && plan}
      <span class="hint" role="status">{t("loading_schedule")}</span>
    {/if}
    <div class="day-navigation" role="group" aria-label={t("schedule_day")}>
      <!-- HA supplies a keyboard-accessible button inside its shadow root. -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <ha-icon-button
        title={t("previous_day")}
        use:properties={{
          path: previousIcon,
          label: t("previous_day"),
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
          date === today}
        onclick={() => panel.selectPreviewDate(today)}>{t("today")}</button
      >
      <!-- HA supplies a keyboard-accessible button inside its shadow root. -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <ha-icon-button
        title={t("next_day")}
        use:properties={{
          path: nextIcon,
          label: t("next_day"),
          disabled: panel.busy || panel.liveRunning || panel.liveBusy,
        }}
        onclick={() => panel.movePreviewDay(1)}
      ></ha-icon-button>
    </div>
  </div>
{/snippet}

<Timeline
  {plan}
  {schedulePlans}
  {program}
  liveSession={panel.liveVisible ? panel.liveSession : null}
  {t}
  locale={panel._hass.locale}
  hass={panel._hass}
  {entityNames}
  onOpenSource={openSource}
  heading={dayHeading}
  loading={panel.busy}
  {showLoading}
/>
<LivePreviewControls {panel} />

<style>
  .schedule-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin-bottom: 20px;
  }

  h2 {
    margin: 0;
    line-height: 1.25;
  }

  .schedule-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .refresh-button {
    display: grid;
    place-items: center;
    flex: 0 0 36px;
    width: 36px;
    min-height: 36px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
  }

  .refresh-button:hover:not(:disabled) {
    background: var(--secondary-background-color, #eee);
  }

  .refresh-button svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
  }

  .day-navigation {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  .day-navigation button {
    margin: 0;
  }
</style>
