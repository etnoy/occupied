<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import { lastGroupResult } from "./live-preview.js";
  import { stamp } from "./timeline.js";
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
  <div class="live-actions" aria-label={t("Live preview controls")}>
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
        {t(executing ? "Running…" : "Next event")}
      </button>
      <button
        type="button"
        disabled={panel.liveStopping || session?.state === "stopping"}
        onclick={() => panel.stopLivePreview()}
        >{t(panel.liveStopping ? "Stopping…" : "Stop")}</button
      >
    {:else}
      <button
        type="button"
        class="primary"
        disabled={!canStart}
        onclick={() => panel.startLivePreview()}
        >{t(session ? "Run again" : "Start live preview")}</button
      >
      {#if panel.schedulingPaused}
        <button
          type="button"
          disabled={panel.busy || panel.liveBusy || !panel.liveReady}
          onclick={() => panel.resumeScheduling()}
          >{t("Resume scheduling")}</button
        >
      {/if}
      <button
        type="button"
        disabled={panel.busy || panel.liveBusy}
        onclick={() => panel.refreshPreviewSchedule()}
        >{t("Refresh Preview")}</button
      >
    {/if}
  </div>
{/snippet}

{#if session}
  {@render actionControls()}
{/if}

<section class="live-card" aria-label={t("Live preview")}>
  <h2>{t("Live preview")}</h2>
  <p><strong>{t("Controls real devices")}</strong></p>
  <p class="hint">
    {t(
      session
        ? "Scheduling stays paused until you choose Resume scheduling."
        : "Normal scheduling pauses until you choose Resume scheduling. Each press runs one event immediately, even with management disabled or dry run selected.",
    )}
  </p>
  {#if session}
    <div role="status" aria-live="polite" aria-atomic="true">
      <strong
        >{t(
          session.state === "completed"
            ? "Day complete"
            : session.state === "ready" && session.cursor === 0
              ? "Ready to start"
              : session.state === "executing"
                ? "Running…"
                : session.state === "stopping"
                  ? "Stopping…"
                  : session.state === "stopped"
                    ? "Stopped"
                    : session.state === "interrupted"
                      ? "Interrupted"
                      : "Ready for next event",
        )}</strong
      >
      <p>
        {session.date} · {t("{done} of {total} events")
          .replace("{done}", String(session.cursor))
          .replace("{total}", String(session.total))}
      </p>
      {#if session.simulated_time && panel.livePlan}
        <p>
          {t("Simulated time")}: {stamp(
            session.simulated_time,
            panel.livePlan.timezone,
            panel._hass.locale,
          )}
        </p>
      {/if}
      {#if lastResult}<p>{t("Last result")}: {t(lastResult)}</p>{/if}
    </div>
    {#if session.state === "interrupted"}<p class="error">
        {session.detail}
      </p>{/if}
    {#if session.earlier_revision}
      <p class="hint">
        {t(
          "This session uses an earlier program revision. Its actions are frozen.",
        )}
      </p>
    {/if}
    {#if !panel.liveCanAdvance && running}
      <p class="hint">
        {t(
          "Only the account that started this session can advance. You can stop it.",
        )}
      </p>
    {/if}
    {#if session.next_group && running}
      <p><strong>{t("Next event")}: {session.next_group.title}</strong></p>
      {#each session.next_group.calls as call}
        <p class="call">
          {call.action.action} · {call.action.entities.join(", ")}
        </p>
      {/each}
    {/if}
    {#each currentOutcomes.filter((outcome) => outcome.status !== "dispatched") as outcome}
      <p class="error">{outcome.action?.action || ""}: {outcome.detail}</p>
    {/each}
  {:else}
    <p class="hint">
      {t(
        "Starting prepares the session. Devices run only when you press Next event.",
      )}
    </p>
  {/if}
  {#if !panel.liveReady}<p role="status" class="hint">
      {t("Recovering live preview…")}
    </p>{/if}
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
