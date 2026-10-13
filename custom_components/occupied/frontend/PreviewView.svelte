<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import Timeline from "./Timeline.svelte";
  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  let data = $derived.by(() => {
    revision;
    const t = panel.t;
    return { t };
  });
  let { t } = $derived(data);
  let plan = $derived(panel.preview?.plans[0]);
  let entityNames = $derived(
    Object.fromEntries(
      panel.catalog.entities.map((entity) => [entity.entity_id, entity.name]),
    ),
  );
</script>

{#if plan}
  <Timeline
    doc={{ plan }}
    program={panel.previewProgram}
    {t}
    locale={panel._hass.locale}
    hass={panel._hass}
    {entityNames}
    preview
  />
{:else if panel.busy}
  <p role="status">{t("Loading schedule…")}</p>
{/if}
