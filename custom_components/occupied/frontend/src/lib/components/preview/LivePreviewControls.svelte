<script lang="ts">
  import type { OccupiedPanel } from "../../../occupied-panel.js";
  import {
    lastGroupResult,
    liveSessionStatus,
  } from "../../utils/live-preview.js";
  import { stamp } from "../../utils/timeline.js";

  let { panel }: { panel: OccupiedPanel } = $props();

  let t = $derived(panel.t);
  let session = $derived(panel.liveVisible ? panel.liveSession : null);
  let running = $derived(panel.liveRunning);
  let executing = $derived(panel.liveBusy || session?.state === "executing");
  let lastResult = $derived(session ? lastGroupResult(session) : "");
  let canStart = $derived(
    panel.liveReady &&
      !panel.busy &&
      !panel.liveBusy &&
      !running &&
      (session
        ? !session.storage_failed
        : !!panel.preview?.valid && !!panel.preview?.plans[0]?.events.length),
  );
  let currentOutcomes = $derived(
    Object.values(session?.outcomes || {}).filter(
      (outcome) => outcome.group_id === session?.last_group_id,
    ),
  );
</script>

{#snippet actionControls()}
  <div class="live-actions" aria-label={t("live_preview_controls")}>
    {#if running}
      <button
        type="button"
        class="primary"
        disabled={!panel.liveReady ||
          !panel.liveCanAdvance ||
          executing ||
          panel.liveStopping ||
          session?.state !== "ready"}
        onclick={() => panel.nextLiveEvent()}
      >
        {t(executing ? "running" : "next_event")}
      </button>
      <button
        type="button"
        disabled={panel.liveStopping || session?.state === "stopping"}
        onclick={() => panel.stopLivePreview()}
        >{t(panel.liveStopping ? "stopping" : "stop")}</button
      >
    {:else}
      <button
        type="button"
        class="primary"
        disabled={!canStart}
        onclick={() => panel.startLivePreview()}
        >{t(session ? "run_again" : "start_live_preview")}</button
      >
      {#if panel.schedulingPaused}
        <button
          type="button"
          disabled={panel.busy || panel.liveBusy || !panel.liveReady}
          onclick={() => panel.resumeScheduling()}
          >{t("resume_scheduling")}</button
        >
      {/if}
      <button
        type="button"
        disabled={panel.busy || panel.liveBusy}
        onclick={() => panel.refreshPreviewSchedule()}
        >{t("refresh_preview")}</button
      >
    {/if}
  </div>
{/snippet}

{#if session}
  {@render actionControls()}
{/if}

<section class="live-card" aria-label={t("live_preview")}>
  <h2>{t("live_preview")}</h2>
  <p><strong>{t("controls_real_devices")}</strong></p>
  <p class="hint">
    {t(session ? "live_preview_paused_hint" : "live_preview_controls_hint")}
  </p>
  {#if session}
    <div role="status" aria-live="polite" aria-atomic="true">
      <strong>{t(liveSessionStatus(session))}</strong>
      <p>
        {session.date} · {t("live_preview_progress")
          .replace("{done}", () => String(session.cursor))
          .replace("{total}", () => String(session.total))}
      </p>
      {#if session.simulated_time && panel.livePlan}
        <p>
          {t("simulated_time")}: {stamp(
            session.simulated_time,
            panel.livePlan.timezone,
            panel._hass.locale,
          )}
        </p>
      {/if}
      {#if lastResult}
        <p>{t("last_result")}: {t(lastResult)}</p>
      {/if}
    </div>
    {#if session.state === "interrupted"}
      <p class="error">
        {session.detail}
      </p>
    {/if}
    {#if session.earlier_revision}
      <p class="hint">
        {t("live_preview_revision_hint")}
      </p>
    {/if}
    {#if !panel.liveCanAdvance && running}
      <p class="hint">
        {t("live_preview_owner_hint")}
      </p>
    {/if}
    {#if session.next_group && running}
      <p><strong>{t("next_event")}: {session.next_group.title}</strong></p>
      {#each session.next_group.calls as call (call.id)}
        <p class="call">
          {call.action.action} · {call.action.entities.join(", ")}
          {#if call.tick}
            · {t("tick_progress")
              .replace("{tick}", () => String(call.tick))
              .replace("{count}", () => String(call.tick_count))}
          {/if}
        </p>
      {/each}
    {/if}
    {#each currentOutcomes.filter((outcome) => outcome.status !== "dispatched") as outcome (outcome)}
      <p class="error">{outcome.action?.action || ""}: {outcome.detail}</p>
    {/each}
  {:else}
    <p class="hint">
      {t("live_preview_start_hint")}
    </p>
  {/if}
  {#if !panel.liveReady}
    <p role="status" class="hint">
      {t("recovering_live_preview")}
    </p>
  {/if}
</section>

{#if !session}
  {@render actionControls()}
{/if}

<style>
  .live-card {
    border: 1px solid var(--divider-color, #ddd);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
  }

  h2 {
    margin: 0;
  }

  p {
    margin: 8px 0;
  }

  .call {
    overflow-wrap: anywhere;
  }

  .live-actions {
    position: sticky;
    top: 64px;
    z-index: 2;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    margin-bottom: 16px;
    background: var(--card-background-color, white);
    border: 1px solid var(--divider-color, #ddd);
    border-radius: 12px;
  }

  .live-actions button {
    min-height: 48px;
    margin: 0;
  }

  .primary {
    flex: 1;
  }

  @media (max-width: 600px) {
    .live-actions {
      top: calc(56px + env(safe-area-inset-top, 0px));
      padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
    }
  }
</style>
