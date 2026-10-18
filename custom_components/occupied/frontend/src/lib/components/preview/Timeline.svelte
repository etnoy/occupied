<script lang="ts">
  import { translator } from "../../i18n/translations.js";
  import type { Snippet } from "svelte";
  import type { Plan, Program, Translate, HomeAssistant } from "../../types.js";
  import PreviewStateGraph from "./PreviewStateGraph.svelte";
  import type { HomeAssistantLocale } from "../../utils/time-format.js";
  import { formatScheduleDate } from "../../utils/time-format.js";
  import { eventDetails, groupPreviewEvents } from "../../utils/timeline.js";
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
    onOpenSource,
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
    onOpenSource?: (event: PlannedEvent) => void;
  } = $props();

  let catalog = $derived({
    entities: Object.entries(entityNames).map(([entity_id, name]) => ({
      entity_id,
      name,
    })),
  });
  let labels = $derived(
    new Map([
      ...stepEntries(program || {}, catalog, t).map(
        (resource) => [`step:${resource.id}`, resource.name] as const,
      ),
      ...randomEntries(program || {}, catalog).map(
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

  let page = $state(0);
  let hoveredEventTime = $state<string | null>(null);

  let scheduleDate = $derived(plan?.simulation_date);
  $effect(() => {
    void scheduleDate;
    hoveredEventTime = null;
    page = 0;
  });

  let events = $derived(plan?.events ?? []);
  let groups = $derived(groupPreviewEvents(events));
  let currentPage = $derived(
    Math.max(0, Math.min(page, Math.ceil(groups.length / 50) - 1)),
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
      eventTime={hoveredEventTime}
    />
    {#if plan.events.length > 0}
      <div class="event-details">
        <div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  {#each ["planned_time", "targets", "action"] as label (label)}
                    <th scope="col">{t(label)}</th>
                  {/each}
                  {#if liveSession}
                    <th scope="col">{t("result")}</th>
                  {/if}
                  <th scope="col">{t("source")}</th>
                </tr>
              </thead>
              {#each groups.slice(currentPage * 50, currentPage * 50 + 50) as group (group.key)}
                <tbody
                  onpointerenter={() => (hoveredEventTime = group.event.time)}
                  onpointerleave={() => (hoveredEventTime = null)}
                  onfocusin={() => (hoveredEventTime = group.event.time)}
                  onfocusout={() => (hoveredEventTime = null)}
                >
                  {#each group.actions as action, index (action.key)}
                    {@const event = action.event}
                    {@const results = action.events.map((event) => ({
                      event,
                      live: eventLiveResult(event, liveSession),
                    }))}
                    {@const current = results.some(({ live }) => live?.current)}
                    {@const details = eventDetails(
                      {
                        ...event,
                        action: { ...event.action, entities: action.entities },
                      },
                      eventLabel(event),
                      plan.timezone,
                      t,
                      locale,
                      entityNames,
                    )}
                    <tr
                      class:current
                      class:completed={results.every(
                        ({ live }) => live?.outcome?.status === "dispatched",
                      )}
                      aria-current={current ? "step" : undefined}
                    >
                      {#if index === 0}
                        <td class="planned-time" rowspan={group.actions.length}>
                          <svg
                            class="hover-indicator"
                            viewBox="0 0 12 12"
                            aria-hidden="true"
                          >
                            <path d="M4 2 8 6 4 10" />
                          </svg>
                          {details.time}
                        </td>
                      {/if}
                      <td>{details.targets}</td>
                      <td>
                        <span class="event-action">
                          {#if details.actionState}
                            <span
                              class="action-indicator"
                              class:on={details.actionState === "on"}
                              aria-hidden="true"
                            ></span>
                          {/if}
                          {details.action}
                        </span>
                      </td>
                      {#if liveSession}
                        <td>
                          {#each results as result, resultIndex (result.event.id || resultIndex)}
                            {#if result.live?.outcome}
                              <div>
                                {#if results.length > 1}
                                  <span
                                    >{result.event.action.entities
                                      .map(
                                        (entity) =>
                                          entityNames[entity] || entity,
                                      )
                                      .join(", ")}:
                                  </span>
                                {/if}
                                <span
                                  class={result.live.outcome.status ===
                                  "dispatched"
                                    ? "hint"
                                    : "error"}
                                  >{t(result.live.outcome.status)}</span
                                >
                                <div>{result.live.outcome.detail}</div>
                              </div>
                            {:else if result.live?.current}
                              <div>{t("next_event")}</div>
                            {/if}
                          {/each}
                        </td>
                      {/if}
                      {#if index === 0}
                        <td rowspan={group.actions.length}>
                          {#if onOpenSource}
                            <button
                              type="button"
                              class="text-button source-link"
                              disabled={loading}
                              onclick={() => onOpenSource?.(group.event)}
                              >{details.source}</button
                            >
                          {:else}
                            {details.source}
                          {/if}
                        </td>
                      {/if}
                    </tr>
                  {/each}
                </tbody>
              {/each}
            </table>
          </div>
          {#if groups.length > 50}
            <div class="row">
              <button
                type="button"
                disabled={currentPage === 0}
                onclick={() => (page = currentPage - 1)}>{t("previous")}</button
              >
              <span
                >{events.length}
                {t("events")} · {currentPage + 1}/{Math.max(
                  1,
                  Math.ceil(groups.length / 50),
                )}</span
              >
              <button
                type="button"
                disabled={(currentPage + 1) * 50 >= groups.length}
                onclick={() => (page = currentPage + 1)}>{t("next")}</button
              >
            </div>
          {/if}
        </div>
      </div>
    {/if}
    {#each plan.issues.filter((issue) => issue.severity !== "info" || ["latest_at_applied", "only_before_skipped"].includes(issue.code || "")) as issue (issue)}
      <p class={issue.severity === "error" ? "error" : "hint"}>
        {issue.code}: {issue.message}
      </p>
    {/each}
  {:else if showLoading}
    <p role="status">{t("loading_schedule")}</p>
  {/if}
</section>

<style>
  th,
  td {
    padding: 6px 9px;
  }

  tbody tr:not(:last-child) td:not([rowspan]) {
    border-bottom: 0;
  }

  td[rowspan] {
    vertical-align: top;
  }

  th:first-child,
  .planned-time {
    padding-left: 24px;
  }

  .planned-time {
    position: relative;
  }

  .hover-indicator {
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    fill: none;
    stroke: var(--info-color, #039be5);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0;
    pointer-events: none;
  }

  tbody:hover .hover-indicator,
  tbody:focus-within .hover-indicator {
    opacity: 0.7;
  }

  .source-link {
    min-height: 30px;
    padding: 3px 4px;
    margin: 0;
    text-align: left;
  }

  .event-action {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .action-indicator {
    display: inline-block;
    width: 12px;
    height: 12px;
    flex: 0 0 12px;
    box-sizing: border-box;
    border: 2px solid var(--info-color, #039be5);
    border-radius: 50%;
  }

  .action-indicator.on {
    background: var(--info-color, #039be5);
  }

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
