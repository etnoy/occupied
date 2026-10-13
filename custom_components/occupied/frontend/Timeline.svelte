<script lang="ts">
  import type {
    TimelineDocument,
    Program,
    Translate,
    HomeAssistant,
  } from "./types.js";
  import PreviewStateGraph from "./PreviewStateGraph.svelte";
  import type { HomeAssistantLocale } from "./time-format.js";
  import { formatScheduleDate } from "./time-format.js";
  import { timelineModel, stamp } from "./timeline.js";
  let {
    doc,
    program,
    t = (text: string) => text,
    locale,
    hass,
    entityNames = {},
    preview = false,
  }: {
    doc: TimelineDocument;
    program: Program;
    t?: Translate;
    locale?: HomeAssistantLocale;
    hass?: HomeAssistant;
    entityNames?: Record<string, string>;
    preview?: boolean;
  } = $props();
  let model = $derived(timelineModel(doc, program, t, locale));
  let query = $state("");
  let page = $state(0);
  let filtered = $derived(
    model?.events.filter(
      (event) =>
        JSON.stringify(event).toLowerCase().includes(query) ||
        (model?.labels.get(event.source_id) || "")
          .toLowerCase()
          .includes(query),
    ) ?? [],
  );
  let currentPage = $derived(
    Math.max(0, Math.min(page, Math.ceil(filtered.length / 50) - 1)),
  );
</script>

{#if model}
  {@const { plan, labels, start, width, lanes, drawn } = model}
  <section>
    <h2>{formatScheduleDate(plan.simulation_date, locale)}</h2>
    {#if preview && hass}
      <PreviewStateGraph {plan} {program} {hass} names={entityNames} {t} />
    {:else}
      <p class="hint">
        {t(
          "Markers are sampled steps; bars are planned activity/window intervals. Runtime end deadlines and handover ramps are shown separately. Times use the plan timezone.",
        )}
      </p>
      <p>
        {t("Behavior revision")}: {plan.behavior_hash.slice(0, 12)} · {t(
          "Plan revision",
        )}: {plan.source_revision?.slice(0, 12) || "—"}
      </p>
      <div
        class="timeline"
        role="img"
        aria-label={`${t("Timeline")} ${plan.simulation_date}`}
      >
        <div class="ruler">
          {#each Array.from({ length: 7 }) as _, n}
            <span style={`left:${(n / 6) * 100}%`}
              >{stamp(
                new Date(start + (width * n) / 6).toISOString(),
                plan.timezone,
                locale,
              )}</span
            >
          {/each}
        </div>
        {#each lanes as [id, marks]}
          <div class="lane">
            <span class="lane-label">{labels.get(id) || id}</span>
            <div class="track">
              {#each marks as mark}
                <!-- Focus exposes each mark’s time and source tooltip. -->
                <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                <span
                  class={mark.className}
                  tabindex="0"
                  title={mark.title}
                  style={mark.style}>{mark.text || ""}</span
                >
              {/each}
            </div>
          </div>
        {/each}
      </div>
      {#if drawn > 800}<p>
          {t(
            "Diagram limited to 800 marks; all events remain available in the table and export.",
          )}
        </p>{/if}
    {/if}
    <details open={!preview}>
      <summary>{t("Event details")} · {model.events.length}</summary>
      {#if preview}
        <p class="hint">
          {t("Behavior revision")}: {plan.behavior_hash.slice(0, 12)} · {t(
            "Plan revision",
          )}: {plan.source_revision?.slice(0, 12) || "—"}
        </p>
      {/if}
      <input
        type="search"
        placeholder={t("Filter events")}
        aria-label={t("Filter events")}
        oninput={(event) => {
          query = event.currentTarget.value.toLowerCase();
          page = 0;
        }}
      />
      <div>
        <div class="table-wrap">
          <table>
            <thead
              ><tr>
                {#each ["Planned time", "Source", "Action", "Targets", "Outcome / actual time"] as label}
                  <th scope="col">{t(label)}</th>
                {/each}
              </tr></thead
            >
            <tbody>
              {#each filtered.slice(currentPage * 50, currentPage * 50 + 50) as event}
                <tr>
                  {#each [stamp(event.time, plan.timezone, locale), `${labels.get(event.source_id) || event.source_id} · ${event.kind}`, event.action.action, event.action.targets.entities.join(", "), `${event.outcome || t("Preview only")} · ${stamp(event.actual_time || event.dispatch_time, plan.timezone, locale)}`] as value}
                    <td>{value}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="row">
          <button
            type="button"
            disabled={currentPage === 0}
            onclick={() => (page = currentPage - 1)}>{t("Previous")}</button
          >
          <span
            >{filtered.length}
            {t("events")} · {currentPage + 1}/{Math.max(
              1,
              Math.ceil(filtered.length / 50),
            )}</span
          >
          <button
            type="button"
            disabled={(currentPage + 1) * 50 >= filtered.length}
            onclick={() => (page = currentPage + 1)}>{t("Next")}</button
          >
        </div>
      </div>
    </details>
    {#each doc.issues || plan.issues || [] as issue}
      <p class={issue.severity === "warning" ? "hint" : "error"}>
        {issue.code}: {issue.message}
      </p>
    {/each}
  </section>
{:else}
  <p>
    {t(
      "No saved plan for this date. Saving or viewing a preview does not replay past actions.",
    )}
  </p>
{/if}
