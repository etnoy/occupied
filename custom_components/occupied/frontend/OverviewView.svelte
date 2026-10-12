<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import { resources } from "./model.js";
  import { progress } from "./util.js";
  import { stepEntries } from "./step-model.js";
  import { stamp } from "./timeline.js";

  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  let data = $derived.by(() => {
    revision;
    const t = panel.t,
      locale = panel._hass.locale,
      state = panel.status;

    const labels = new Map(
      resources(panel.saved).map((resource) => [resource.id, resource.name]),
    );
    const fields = [
      ["Status", state.status],
      ["Reason", state.reason],
      ["Next action", stamp(state.next_event, panel.document.timezone, locale)],
      ["Execution", state.dry_run ? t("Dry run") : t("Live")],
      [
        "Saved revision",
        state.source_revision?.slice(0, 12) || panel.revision?.slice(0, 12),
      ],
      [
        "Steps",
        stepEntries(panel.saved)
          .map((step) => step.name)
          .join(", ") || t("None"),
      ],
      ["Yielded targets", (state.yielded || []).join(", ") || t("None")],
    ];
    return { t, state, labels, fields, locale };
  });
  let { t, state, labels, fields, locale } = $derived(data);
</script>

{#if state}
  <section>
    <h2>{t("Overview")}</h2>
    <div class="row">
      <button
        type="button"
        disabled={panel.busy}
        onclick={() => panel.control(state.enabled ? "stop" : "start")}
      >
        {t(state.enabled ? "Disable" : "Enable")}
      </button>
      <button
        type="button"
        disabled={panel.busy}
        onclick={() => panel.control(state.paused ? "resume" : "pause")}
      >
        {t(state.paused ? "Resume" : "Pause")}
      </button>
      {#if state.mode === "daily"}
        <button
          type="button"
          disabled={panel.busy}
          onclick={() =>
            panel.control("set_dry_run", { dry_run: !state.dry_run })}
        >
          {t(state.dry_run ? "Select live execution" : "Select dry run")}
        </button>
      {/if}
    </div>
    <dl>
      {#each fields as [label, value]}
        <dt>{t(label || "")}</dt>
        <dd>{value}</dd>
      {/each}
    </dl>
  </section>
  <section>
    <h2>{t("Active activities")}</h2>
    {#if state.activities?.length}
      {#each state.activities as activity}
        <p>
          {labels.get(activity.source_id) || activity.source_id} ·
          {activity.phase} · {t("Runtime deadline")}:
          {stamp(activity.deadline, panel.document.timezone, locale)} ·
          {activity.resources.join(", ")}
        </p>
      {/each}
    {:else}
      <p>{t("None")}</p>
    {/if}
  </section>
  <section>
    <h2>{t("Lighting convergence")}</h2>
    {#each Object.entries(state.handover || {}) as [entity, handover]}
      <p>
        {entity} · {stamp(handover.deadline, panel.document.timezone, locale)} ·
        {JSON.stringify(handover.observed)} →
        {JSON.stringify(handover.target)}
      </p>
      <progress
        max="1"
        aria-label={entity}
        data-start={handover.start}
        data-deadline={handover.deadline}
        value={progress(handover.start, handover.deadline)}
      ></progress>
    {/each}
    {#if !Object.keys(state.handover || {}).length}
      <p>{t("None")}</p>
    {/if}
  </section>
  <section>
    <h2>{t("Upcoming actions")}</h2>
    {#if state.events?.length}
      {#each state.events.slice(0, 30) as event}
        <p>
          {stamp(event.time, panel.document.timezone, locale)} · {event.event}
          · {event.id}
        </p>
      {/each}
    {:else}
      <p>{t("None")}</p>
    {/if}
  </section>
  {#if state.last_error}
    <p class="error">{state.last_error}</p>
  {/if}
  <p>
    {t(
      "Home Assistant runs the program while this panel is closed. Draft edits and previews do not control devices.",
    )}
  </p>
{/if}
