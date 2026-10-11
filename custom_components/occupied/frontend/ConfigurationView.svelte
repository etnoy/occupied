<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import { download } from "./util.js";

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
  <p>
    {t(source.mode === "file" ? "Managed file" : "GUI storage")} ·
    {source.status || "ready"}
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
  <h2>{t("Occupied YAML import/export")}</h2>
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
        panel.yaml = await file.text();
        panel.flush();
      }
    }}
  />
  <textarea
    rows="18"
    aria-label={t("Occupied YAML")}
    style="width:100%"
    value={panel.yaml}
    oninput={(event: Event) =>
      (panel.yaml = (event.currentTarget as HTMLTextAreaElement).value)}
  ></textarea>
  <button type="button" onclick={() => panel.importYaml()}>
    {t("Import as draft")}</button
  ><button type="button" onclick={() => panel.exportYaml()}>
    {t("Export YAML")}</button
  ><button
    type="button"
    onclick={() => download("occupied.yaml", panel.yaml, "text/yaml")}
  >
    {t("Download")}
  </button>
</section>
