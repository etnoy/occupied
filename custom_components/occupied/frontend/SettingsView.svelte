<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";

  import { properties } from "./dom.js";
  import { download, isValueChangedEvent } from "./util.js";

  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();
  let data = $derived.by(() => {
    revision;
    return { t: panel.t };
  });
  let { t } = $derived(data);
  let autoExportStarted = false;

  $effect(() => {
    revision;
    if (!autoExportStarted && !panel.busy) {
      // Export flushes controller updates synchronously. Start it after this
      // render batch, and cancel if the view disappears or becomes busy first.
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled) return;
        autoExportStarted = true;
        void panel.exportYaml();
      });
      return () => {
        cancelled = true;
      };
    }
  });
</script>

<section>
  <h2>{t("YAML")}</h2>
  <p class="hint">
    {t(
      "Edit the YAML and save to validate and apply your changes. Invalid code is kept in the editor.",
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
  <button
    type="button"
    class="primary"
    disabled={panel.busy ||
      panel.stale ||
      panel.document.source === "file" ||
      !panel.yaml}
    onclick={() => panel.saveYaml()}
  >
    {t("Save changes")}</button
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
