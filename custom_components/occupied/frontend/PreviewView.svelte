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
  let selectedDate = $state("");
  let plans = $derived(panel.preview?.plans || []);
  let selectedPlan = $derived(
    plans.find((plan) => plan.simulation_date === selectedDate) || plans[0],
  );
  let entityNames = $derived(
    Object.fromEntries(
      panel.catalog.entities.map((entity) => [entity.entity_id, entity.name]),
    ),
  );
</script>

{#snippet previewField(
  key: "date" | "days" | "seed" | "at",
  label: string,
  type: string,
)}<label class="field"
    >{t(label)}<input
      {type}
      min={key === "days" ? 1 : undefined}
      max={key === "days" ? 31 : undefined}
      value={String(panel.previewSettings[key] ?? "")}
      oninput={(event: Event) => {
        const value = (event.currentTarget as HTMLInputElement).value;
        if (key === "days") panel.previewSettings.days = Number(value);
        else panel.previewSettings[key] = value;
      }}
    /></label
  >{/snippet}
<section>
  <h2>{t("Preview schedule")}</h2>
  <p class="hint">
    {t(
      "See how your steps could play out. Previewing never controls devices or changes the running schedule.",
    )}
  </p>
  <div class="preview-controls">
    {@render previewField("date", "Date", "date")}
    <button
      type="button"
      disabled={panel.busy}
      onclick={() => panel.runPreview()}
    >
      {t("Run preview")}</button
    ><button
      type="button"
      disabled={panel.busy}
      onclick={() => {
        panel.previewSettings.seed = crypto.randomUUID();
        panel.runPreview();
      }}
    >
      {t("Reroll preview")}
    </button>
  </div>
  <details>
    <summary>{t("Preview options")}</summary>
    {@render previewField("days", "Days", "number")}{@render previewField(
      "seed",
      "Seed",
      "text",
    )}{@render previewField(
      "at",
      "Projection instant (ISO time with offset, optional)",
      "text",
    )}
  </details>
  {#if panel.preview}
    <details>
      <summary>{t("Export preview")}</summary>
      <button
        type="button"
        onclick={() =>
          download(
            "occupied-preview.json",
            JSON.stringify(panel.preview, null, 2),
          )}
      >
        {t("Download")}
      </button>
    </details>
  {/if}
</section>
{#if plans.length > 1}
  <label class="field">
    {t("Schedule date")}
    <select
      value={selectedPlan?.simulation_date}
      onchange={(event) => (selectedDate = event.currentTarget.value)}
    >
      {#each plans as plan}
        <option value={plan.simulation_date}
          >{plan.simulation_date}{plan.issues.some(
            (issue) => issue.severity === "error",
          )
            ? ` · ${t("Needs attention")}`
            : ""}</option
        >
      {/each}
    </select>
  </label>
{/if}
{#if selectedPlan}
  <Timeline
    doc={{ plan: selectedPlan }}
    program={panel.previewProgram}
    {t}
    locale={panel._hass.locale}
    hass={panel._hass}
    {entityNames}
    preview
  />
{/if}
{#if panel.preview?.handover}
  <section>
    <details>
      <summary>{t("Projected handover endpoints")}</summary>
      <pre>{JSON.stringify(panel.preview.handover, null, 2)}</pre>
    </details>
  </section>
{/if}

<style>
  .preview-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 8px;
    margin: 16px 0;
  }
  .preview-controls :global(.field) {
    flex: 0 1 220px;
    margin: 0;
  }
  .preview-controls button {
    margin: 0;
  }
</style>
