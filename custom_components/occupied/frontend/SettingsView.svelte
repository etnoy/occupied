<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import { properties } from "./dom.js";
  import { download, isValueChangedEvent } from "./util.js";

  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  let data = $derived.by(() => {
    revision;
    const t = panel.t,
      source = panel.document.configuration_source || {
        mode: panel.document.source || "gui",
        status: "ready",
      };
    return { t, source };
  });
  let { t, source } = $derived(data);
  let autoExportStarted = false;

  $effect(() => {
    revision;
    if (!autoExportStarted && !panel.busy) {
      autoExportStarted = true;
      void panel.exportYaml();
    }
  });
</script>

<section>
  <h2>{t("Configuration source")}</h2>
  <p class="hint">
    {t(
      source.mode === "file"
        ? "The managed file is read only. You can edit, validate and preview a temporary draft; export it and update the file to apply those changes."
        : "GUI storage is authoritative. Importing YAML creates a draft snapshot. Selecting a managed file below changes the saved program explicitly.",
    )}
  </p>
  <input
    type="text"
    aria-label={t("Relative managed-file path")}
    placeholder="occupied/house.yaml"
    value={panel.sourcePath ?? source.config_file ?? "occupied/house.yaml"}
    oninput={(event: Event) =>
      (panel.sourcePath = (event.currentTarget as HTMLInputElement).value)}
  />
  <button
    type="button"
    disabled={panel.busy}
    onclick={() =>
      panel.selectSource(
        "file",
        panel.sourcePath ?? source.config_file ?? "occupied/house.yaml",
      )}
  >
    {t("Use managed file")}
  </button>
  {#if source.mode === "file"}
    <button
      type="button"
      disabled={panel.busy}
      onclick={() => panel.reloadManaged()}
    >
      {t("Reload managed file")}
    </button>
    <button
      type="button"
      disabled={panel.busy || source.has_valid_program === false}
      onclick={() => panel.selectSource("gui")}
    >
      {t("Copy saved program to GUI storage")}
    </button>
    {#if source.observed_hash}
      <p>
        {t("Observed file hash")}:
        {source.observed_hash.slice(0, 16)}
      </p>
    {/if}
    {#each source.issues || [] as issue}
      <p class="error">
        {issue.path || "$"}{#if issue.line}
          {` · ${t("Line")} ${issue.line}`}
        {:else}
          {""}
        {/if}:
        {issue.message}
      </p>
    {/each}
  {/if}
</section>
<section>
  <h2>{t("YAML")}</h2>
  <p class="hint">
    {t(
      "Import replaces only the draft. Export normalizes the draft. Comments are not retained. Importing a local file does not select it as the managed source.",
    )}
  </p>
  <input
    type="file"
    accept=".yaml,.yml,.json"
    aria-label={t("Choose configuration file")}
    onchange={async (event: Event) => {
      const file = (event.currentTarget as HTMLInputElement).files?.[0];
      if (file) {
        const epoch = panel.epoch;
        const yaml = await file.text();
        if (epoch !== panel.epoch) return;
        panel.yaml = yaml;
        panel.flush();
      }
    }}
  />
  <ha-code-editor
    role="group"
    aria-label={t("Occupied YAML")}
    dir="ltr"
    use:properties={{ mode: "yaml", value: panel.yaml, linewrap: true }}
    onvalue-changed={(event: Event) => {
      if (!isValueChangedEvent(event) || typeof event.detail.value !== "string")
        return;
      panel.yaml = event.detail.value;
      panel.flush();
    }}
  ></ha-code-editor>
  <button type="button" onclick={() => panel.importYaml()}>
    {t("Import as draft")}</button
  ><button
    type="button"
    disabled={panel.busy || !panel.yaml}
    onclick={() => download("occupied.yaml", panel.yaml, "text/yaml")}
  >
    {t("Download")}
  </button>
</section>

<style>
  ha-code-editor {
    display: block;
    width: 100%;
    margin: 8px 0;
    --code-mirror-height: 420px;
    --code-mirror-max-height: 60vh;
  }
</style>
