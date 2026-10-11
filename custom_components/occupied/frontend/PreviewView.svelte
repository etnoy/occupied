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
  {@render previewField("date", "Date", "date")}
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
  <button type="button" onclick={() => panel.runPreview()}>
    {t("Run preview")}</button
  ><button
    type="button"
    onclick={() => {
      panel.previewSettings.seed = crypto.randomUUID();
      panel.runPreview();
    }}
  >
    {t("Reroll preview")}
  </button>
  {#if panel.preview}
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
  {/if}
</section>
{#each panel.preview?.plans || [] as plan}
  <Timeline doc={{ plan }} program={panel.previewProgram} {t} />
{/each}
{#if panel.preview?.handover}
  <section>
    <h2>{t("Projected handover endpoints")}</h2>
    <pre>{JSON.stringify(panel.preview.handover, null, 2)}</pre>
  </section>
{/if}
