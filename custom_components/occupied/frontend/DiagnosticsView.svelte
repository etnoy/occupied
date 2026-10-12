<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import { download } from "./util.js";

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
  <h2>{t("Diagnostics")}</h2>
  <p class="hint">
    {t(
      "Default exports contain counts and runtime status. Include controller details explicitly to export entities, sampled plans, observations and outcomes. Credential fields remain redacted.",
    )}
  </p>
  <label
    ><input
      type="checkbox"
      checked={panel.includeSensitive}
      onchange={(event: Event) =>
        (panel.includeSensitive = (
          event.currentTarget as HTMLInputElement
        ).checked)}
    />{t("Include controller details")}</label
  >
  <button type="button" onclick={() => panel.loadDiagnostics()}>
    {t("Refresh")}
  </button>
  {#if panel.diagnostics}
    <button
      type="button"
      onclick={() =>
        download(
          "occupied-diagnostics.json",
          JSON.stringify(panel.diagnostics, null, 2),
        )}
    >
      {t("Download")}
    </button>
    <pre>{JSON.stringify(panel.diagnostics, null, 2)}</pre>
  {/if}
</section>
<section>
  <h2>{t("Recent runtime outcomes")}</h2>
  {#each (panel.status?.outcomes || []).slice(-50).reverse() as item}
    <pre>{JSON.stringify(item)}</pre>
  {/each}
</section>
