<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { Issue, Tab } from "./types.js";
  import { errorMessage } from "./util.js";
  import { stepEntries } from "./step-model.js";
  import { warningStepId } from "./step-issues.js";

  import StepEditor from "./StepEditor.svelte";
  import StepsView from "./StepsView.svelte";
  import SettingsView from "./SettingsView.svelte";
  import PreviewView from "./PreviewView.svelte";
  import UnsavedStepDialog from "./UnsavedStepDialog.svelte";
  import RandomView from "./RandomView.svelte";
  import RandomEventEditor from "./RandomEventEditor.svelte";
  let {
    panel: controller,
    updates,
  }: {
    panel: OccupiedPanel;
    updates: import("svelte/store").Readable<number>;
  } = $props();
  // A fresh read-through facade makes mutable controller state reactive without
  // proxying Home Assistant's large state object. Bind DOM methods to their host.
  let panel = $derived.by(() => {
    $updates;
    return new Proxy(controller, {
      get(target, key) {
        const value = Reflect.get(target, key, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });
  let revision = $derived($updates);
  let controllerName = $derived(
    panel.draft?.name || panel.selectedInstance?.name,
  );
  let state = $derived.by(() => {
    revision;
    const showingSteps =
      panel.tab === "steps" &&
      panel.draft &&
      panel.selectedInstance?.loaded &&
      !panel._loading &&
      (!panel.stepEditor || panel.stepEditor.existing);
    const entries = showingSteps ? stepEntries(panel.draft) : [];
    return {
      t: panel.t,
      notices: panel.notices(),
      primary: primaryTabs.some(([id]) => id === panel.tab),
      issues: panel
        .visibleIssues()
        .filter((issue) => !warningStepId(issue, entries)),
    };
  });
  let { t, notices, primary, issues } = $derived(state);
  const primaryTabs: [Tab, string][] = [
    ["steps", "Steps"],
    ["random", "Random"],
    ["preview", "Preview"],
    ["settings", "Settings"],
  ];
</script>

{#snippet toolbar()}
  <div
    id="toolbar"
    class="toolbar"
    hidden={!panel.selectedInstance?.loaded || !panel.stale}
  >
    {#if panel.stale}
      <button
        type="button"
        disabled={panel.busy}
        onclick={() => panel.reloadSaved(true)}
      >
        {t("Reload saved program")}
      </button>
    {/if}
  </div>
{/snippet}
{#snippet renderIssue(item: Issue, primary: boolean)}
  {@const className = item.severity === "warning" ? "hint" : "error"}
  {@const text = primary
    ? item.message
    : `${item.severity || "error"} · ${item.path || "$"}: ${item.message}`}
  {#if panel.activeEditor && item.severity !== "warning"}
    <button
      type="button"
      class={className}
      onclick={() => panel.focusIssue(item)}
    >
      {text}
    </button>
  {:else}
    <p class={className}>{text}</p>
  {/if}
{/snippet}
<ha-top-app-bar-fixed back-button narrow={panel.hasAttribute("narrow")}>
  <div slot="title">Occupied</div>
  <main>
    <header>
      <div>
        {#if !controllerName}
          <p id="house">{t("Loading controller…")}</p>
        {:else if controllerName !== "Occupied" && !/^Occupied [0-9a-f]{8}$/.test(controllerName)}
          <p id="house">{controllerName}</p>
        {/if}
        {#if panel.instances.length > 1}
          <label for="instance-select">{t("Controller")}</label>
          <select
            id="instance-select"
            value={panel.selectedEntry || ""}
            disabled={panel.busy}
            onchange={(event) => {
              panel.selectInstance(event.currentTarget.value);
              event.currentTarget.value = panel.selectedEntry || "";
            }}
          >
            {#each panel.instances as instance}
              <option value={instance.config_entry_id}>
                {instance.name} · {t(
                  instance.loaded ? instance.status : "Unloaded",
                )}
              </option>
            {/each}
          </select>
        {/if}
        {#if panel.selectedInstance?.source === "file"}
          <p class="hint">
            {t("Managed file")}
          </p>
        {/if}
      </div>
    </header>
    {#each panel.selectedInstance?.overlaps || [] as overlap}
      <p class="banner" role="status">
        {t("Shared devices with")}
        {overlap.name}: {overlap.entities.join(", ")}. {t(
          "Actions and cleanup can interfere between instances.",
        )}
      </p>
    {/each}
    {@render toolbar()}
    <div id="notice" class="banner" role="status" hidden={!notices}>
      {notices}
    </div>
    <div id="error" class="error" role="alert" hidden={!panel.error}>
      {panel.error}
    </div>
    <nav aria-label="Occupied">
      {#each primaryTabs as [id, label]}
        <button
          type="button"
          data-tab={id}
          aria-current={panel.tab === id ? "page" : "false"}
          disabled={!panel.selectedInstance?.loaded}
          onclick={() => panel.navigate(id)}
        >
          {t(label)}
        </button>
      {/each}
    </nav>
    <div id="secondary-nav">
      {#if !primary}
        <button
          type="button"
          class="text-button"
          onclick={() => panel.navigate("steps")}
        >
          {t("Back to steps")}
        </button>
      {/if}
    </div>
    <div id="issues">
      {#each issues as issue}
        {@render renderIssue(issue, primary)}
      {/each}
    </div>
    <div id="view">
      {#key `${panel.selectedEntry}:${panel.tab}`}
        <svelte:boundary>
          {#snippet failed(error)}
            <p class="error">{errorMessage(error)}</p>
            <p class="error">
              {t(
                "This draft cannot be shown. Discard edits or import a corrected program from Settings.",
              )}
            </p>
          {/snippet}
          {#if panel.selectedEntry && !panel.selectedInstance?.loaded}
            <p>
              {t(
                "This instance is unavailable. Check Settings → Devices & services, then retry.",
              )}
            </p>
            <button type="button" onclick={() => panel.retry()}
              >{t("Retry")}</button
            >
          {:else if panel._loading || !panel.draft}
            {#if panel.error && !panel._loading}<button
                type="button"
                onclick={() => panel.retry()}>{t("Retry")}</button
              >{/if}
          {:else if panel.stepEditor && !panel.stepEditor.existing}
            <StepEditor {panel} {revision} />
          {:else if panel.randomEditor && !panel.randomEditor.existing}
            <RandomEventEditor {panel} {revision} />
          {:else if panel.tab === "steps"}
            <StepsView {panel} {revision} />
          {:else if panel.tab === "random"}
            <RandomView {panel} {revision} />
          {:else if panel.tab === "settings"}
            <SettingsView {panel} {revision} />
          {:else if panel.tab === "preview"}
            <PreviewView {panel} {revision} />
          {/if}
        </svelte:boundary>
      {/key}
    </div>
  </main>
</ha-top-app-bar-fixed>
{#if panel.pendingStepExit}<UnsavedStepDialog {panel} />{/if}
