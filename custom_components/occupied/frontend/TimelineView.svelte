<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import { download } from "./util.js";

  import Timeline from "./Timeline.svelte";
  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  let data = $derived.by(() => {
    revision;
    const t = panel.t;
    return { t };
  });
  let { t } = $derived(data);
</script>

<section>
  <h2>{t("Actual timeline")}</h2>
  <p class="hint">
    {t(
      "This view reads saved runtime plans and dispatch outcomes. It never samples a replacement plan.",
    )}
  </p>
  <select
    aria-label={t("Saved simulation date")}
    value={panel.timelineDate || panel.actual?.plan?.simulation_date || ""}
    onchange={(event: Event) => {
      panel.timelineDate = (event.currentTarget as HTMLSelectElement).value;
      panel.loadTimeline();
    }}
  >
    {#each panel.actual?.dates || [] as date}
      <option value={date}>{date}</option>
    {/each}
  </select>
  <button type="button" onclick={() => panel.loadTimeline()}>
    {t("Refresh")}</button
  ><button
    type="button"
    onclick={() =>
      download("occupied-timeline.json", JSON.stringify(panel.actual, null, 2))}
  >
    {t("Download")}
  </button>
</section>
{#if panel.actual}
  <Timeline doc={panel.actual} program={panel.saved} {t} />
{/if}
