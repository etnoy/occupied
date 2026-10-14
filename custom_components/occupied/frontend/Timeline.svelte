<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Plan, Program, Translate, HomeAssistant } from "./types.js";
  import PreviewStateGraph from "./PreviewStateGraph.svelte";
  import type { HomeAssistantLocale } from "./time-format.js";
  import { formatScheduleDate } from "./time-format.js";
  import { stamp, staggerTransitions } from "./timeline.js";
  import { stepEntries } from "./step-model.js";
  import { randomEntries } from "./random-model.js";
  import type { PlannedEvent } from "./types.js";
  import type { LivePreviewSession } from "./types.js";
  import { eventLiveResult } from "./live-preview.js";
  let {
    plan,
    schedulePlans,
    program,
    t = (text: string) => text,
    locale,
    hass,
    entityNames = {},
    heading,
    loading = false,
    showLoading = loading,
    liveSession = null,
  }: {
    plan?: Plan;
    schedulePlans?: Plan[];
    program: Program;
    t?: Translate;
    locale?: HomeAssistantLocale;
    hass: HomeAssistant;
    entityNames?: Record<string, string>;
    heading?: Snippet;
    loading?: boolean;
    showLoading?: boolean;
    liveSession?: LivePreviewSession | null;
  } = $props();
  let labels = $derived(
    new Map([
      ...stepEntries(program || {}).map(
        (resource) => [`step:${resource.id}`, resource.name] as const,
      ),
      ...randomEntries(program || {}).map(
        (resource) => [`random:${resource.id}`, resource.name] as const,
      ),
    ]),
  );
  function eventLabel(event: PlannedEvent) {
    return (
      labels.get(
        `${event.kind.startsWith("random_") ? "random" : "step"}:${event.source_id}`,
      ) || event.source_id
    );
  }
  let query = $state("");
  let page = $state(0);
  let filtered = $derived(
    plan?.events.filter(
      (event) =>
        JSON.stringify(event).toLowerCase().includes(query) ||
        eventLabel(event).toLowerCase().includes(query),
    ) ?? [],
  );
  let currentPage = $derived(
    Math.max(0, Math.min(page, Math.ceil(filtered.length / 50) - 1)),
  );
</script>

<section aria-busy={loading}>
  {#if heading}
    {@render heading()}
  {:else if plan}
    <h2>{formatScheduleDate(plan.simulation_date, locale)}</h2>
  {/if}
  {#if plan}
    <PreviewStateGraph
      {plan}
      {schedulePlans}
      {program}
      {hass}
      names={entityNames}
      {t}
    />
    {#if plan.events.length > 0}
      <details>
        <summary>{t("Event details")} · {plan.events.length}</summary>
        <p class="hint">
          {t("Behavior revision")}: {plan.behavior_hash.slice(0, 12)} · {t(
            "Plan revision",
          )}: {plan.source_revision?.slice(0, 12) || "—"}
        </p>
        {#each staggerTransitions(plan) as transition}
          <details>
            <summary>
              {eventLabel(transition.events[0])} · {t("Turn-on transition")} · {transition.count}
              {t("entities")}
            </summary>
            <p class="hint">
              {stamp(transition.start, plan.timezone, locale)}–{stamp(
                transition.end,
                plan.timezone,
                locale,
              )}
              · {t("Period")}: {transition.period}s · {t("Tick interval")}: {Number(
                transition.interval.toFixed(3),
              )}s
            </p>
            <ol>
              {#each transition.events as tick}
                <li value={tick.tick}>
                  {stamp(tick.time, plan.timezone, locale)} · {tick.action.entities
                    .map((entity) => entityNames[entity] || entity)
                    .join(", ")}
                  {#if tick.superseded}
                    · {t("Superseded")}{/if}
                </li>
              {/each}
            </ol>
          </details>
        {/each}
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
                  {#each ["Planned time", "Source", "Action", "Targets", "Settings"] as label}
                    <th scope="col">{t(label)}</th>
                  {/each}
                  {#if liveSession}<th scope="col">{t("Result")}</th>{/if}
                </tr></thead
              >
              <tbody>
                {#each filtered.slice(currentPage * 50, currentPage * 50 + 50) as event}
                  {@const live = eventLiveResult(event, liveSession)}
                  <tr
                    class:current={live?.current}
                    class:completed={live?.outcome?.status === "dispatched"}
                    aria-current={live?.current ? "step" : undefined}
                  >
                    {#each [stamp(event.time, plan.timezone, locale), `${eventLabel(event)} · ${t(event.kind === "random_start" ? "Random start" : event.kind === "random_end" ? "Random end" : event.kind)}`, `${event.action.action}${event.tick ? ` · ${t("Tick {tick} of {count}").replace("{tick}", String(event.tick)).replace("{count}", String(event.tick_count))} · ${event.period_seconds}s` : ""}${event.superseded ? ` · ${t("Superseded")}` : ""}`, event.action.entities.join(", "), Object.keys(event.action.data || {}).length ? JSON.stringify(event.action.data) : "—"] as value}
                      <td>{value}</td>
                    {/each}
                    {#if liveSession}
                      <td>
                        {#if live?.outcome}
                          <span
                            class={live.outcome.status === "dispatched"
                              ? "hint"
                              : "error"}>{t(live.outcome.status)}</span
                          >
                          <div>{live.outcome.detail}</div>
                        {:else if live?.current}{t("Next event")}{/if}
                      </td>
                    {/if}
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
    {/if}
    {#each plan.issues.filter((issue) => issue.severity !== "info") as issue}
      <p class={issue.severity === "warning" ? "hint" : "error"}>
        {issue.code}: {issue.message}
      </p>
    {/each}
  {:else if showLoading}
    <p role="status">{t("Loading schedule…")}</p>
  {/if}
</section>

<style>
  tr.current {
    background: var(--secondary-background-color, #eef4ff);
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: -2px;
  }
  tr.completed {
    background: color-mix(
      in srgb,
      var(--success-color, #4caf50) 12%,
      transparent
    );
  }
</style>
