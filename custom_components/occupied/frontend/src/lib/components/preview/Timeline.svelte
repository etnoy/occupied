<script lang="ts">
  import { translator } from "../../i18n/translations.js";
  import type { Snippet } from "svelte";
  import type { Plan, Program, Translate, HomeAssistant } from "../../types.js";
  import PreviewStateGraph from "./PreviewStateGraph.svelte";
  import type { HomeAssistantLocale } from "../../utils/time-format.js";
  import { formatScheduleDate } from "../../utils/time-format.js";
  import {
    stamp,
    staggerTransitions,
    eventDetails,
  } from "../../utils/timeline.js";
  import { stepEntries } from "../../models/step-model.js";
  import { randomEntries } from "../../models/random-model.js";
  import type { PlannedEvent } from "../../types.js";
  import type { LivePreviewSession } from "../../types.js";
  import { eventLiveResult } from "../../utils/live-preview.js";

  let {
    plan,
    schedulePlans,
    program,
    t = translator(),
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
      ...stepEntries(program || {}, undefined, t).map(
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
        <summary>{t("event_details")} · {plan.events.length}</summary>
        <p class="hint">
          {t("behavior_revision")}: {plan.behavior_hash.slice(0, 12)} · {t(
            "plan_revision",
          )}: {plan.source_revision?.slice(0, 12) || "—"}
        </p>
        {#each staggerTransitions(plan) as transition (transition)}
          <details>
            <summary>
              {eventLabel(transition.events[0])} · {t("staggered_action")} · {transition.count}
              {t("entities")}
            </summary>
            <p class="hint">
              {stamp(transition.start, plan.timezone, locale)}–{stamp(
                transition.end,
                plan.timezone,
                locale,
              )}
              · {t("period")}: {transition.period}s · {t("tick_interval")}: {Number(
                transition.interval.toFixed(3),
              )}s
            </p>
            <ol>
              {#each transition.events as tick (tick)}
                <li value={tick.tick}>
                  {stamp(tick.time, plan.timezone, locale)} · {tick.action.entities
                    .map((entity) => entityNames[entity] || entity)
                    .join(", ")}
                  {#if tick.superseded}
                    · {t("superseded")}
                  {/if}
                </li>
              {/each}
            </ol>
          </details>
        {/each}
        <input
          type="search"
          placeholder={t("filter_events")}
          aria-label={t("filter_events")}
          oninput={(event) => {
            query = event.currentTarget.value.toLowerCase();
            page = 0;
          }}
        />
        <div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  {#each ["planned_time", "source", "action", "targets", "settings"] as label (label)}
                    <th scope="col">{t(label)}</th>
                  {/each}
                  {#if liveSession}
                    <th scope="col">{t("result")}</th>
                  {/if}
                </tr>
              </thead>
              <tbody>
                {#each filtered.slice(currentPage * 50, currentPage * 50 + 50) as event (event)}
                  {@const live = eventLiveResult(event, liveSession)}
                  {@const details = eventDetails(
                    event,
                    eventLabel(event),
                    plan.timezone,
                    t,
                    locale,
                  )}
                  <tr
                    class:current={live?.current}
                    class:completed={live?.outcome?.status === "dispatched"}
                    aria-current={live?.current ? "step" : undefined}
                  >
                    <td>{details.time}</td>
                    <td>{details.source}</td>
                    <td>{details.action}</td>
                    <td>{details.targets}</td>
                    <td>{details.settings}</td>
                    {#if liveSession}
                      <td>
                        {#if live?.outcome}
                          <span
                            class={live.outcome.status === "dispatched"
                              ? "hint"
                              : "error"}>{t(live.outcome.status)}</span
                          >
                          <div>{live.outcome.detail}</div>
                        {:else if live?.current}
                          {t("next_event")}
                        {/if}
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
              onclick={() => (page = currentPage - 1)}>{t("previous")}</button
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
              onclick={() => (page = currentPage + 1)}>{t("next")}</button
            >
          </div>
        </div>
      </details>
    {/if}
    {#each plan.issues.filter((issue) => issue.severity !== "info") as issue (issue)}
      <p class={issue.severity === "warning" ? "hint" : "error"}>
        {issue.code}: {issue.message}
      </p>
    {/each}
  {:else if showLoading}
    <p role="status">{t("loading_schedule")}</p>
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
