<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Plan, Program, Translate, HomeAssistant } from "./types.js";
  import PreviewStateGraph from "./PreviewStateGraph.svelte";
  import type { HomeAssistantLocale } from "./time-format.js";
  import { formatScheduleDate } from "./time-format.js";
  import { stamp } from "./timeline.js";
  import { stepEntries } from "./step-model.js";
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
  } = $props();
  let labels = $derived(
    new Map(
      stepEntries(program || {}).map((resource) => [
        resource.id,
        resource.name,
      ]),
    ),
  );
  let query = $state("");
  let page = $state(0);
  let filtered = $derived(
    plan?.events.filter(
      (event) =>
        JSON.stringify(event).toLowerCase().includes(query) ||
        (labels.get(event.source_id) || "").toLowerCase().includes(query),
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
                  {#each ["Planned time", "Source", "Action", "Targets"] as label}
                    <th scope="col">{t(label)}</th>
                  {/each}
                </tr></thead
              >
              <tbody>
                {#each filtered.slice(currentPage * 50, currentPage * 50 + 50) as event}
                  <tr>
                    {#each [stamp(event.time, plan.timezone, locale), `${labels.get(event.source_id) || event.source_id} · ${event.kind}`, event.action.action, event.action.entities.join(", ")] as value}
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
