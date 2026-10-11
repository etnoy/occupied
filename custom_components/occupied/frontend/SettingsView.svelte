<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  const tools: [Tab, string][] = [
    ["configuration", "Import, export and managed files"],
    ["timeline", "Execution history"],
    ["diagnostics", "Diagnostics"],
  ];
  import type { Tab } from "./types.js";
  let data = $derived.by(() => {
    revision;
    const t = panel.t,
      dryRun = !!panel.status?.dry_run;
    return { t, dryRun };
  });
  let { t, dryRun } = $derived(data);
</script>

<section>
  <h2>{t("Simulation")}</h2>
  <p class="hint">
    {#if dryRun}
      {t("Dry run is on. Devices are not controlled.")}
    {:else}
      {t("Live mode controls devices when the simulation is on.")}
    {/if}
  </p>
  <button
    type="button"
    disabled={panel.busy}
    onclick={() => panel.control("set_dry_run", { dry_run: !dryRun })}
  >
    {t(dryRun ? "Use live mode" : "Use dry run")}
  </button>
  <button type="button" onclick={() => panel.navigate("overview")}>
    {t("Runtime details")}
  </button>
</section>
<section>
  <h2>{t("Tools")}</h2>
  {#each tools as [tab, label]}
    <button type="button" onclick={() => panel.navigate(tab)}>
      {t(label)}
    </button>
  {/each}
</section>
