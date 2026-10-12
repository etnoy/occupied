<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { Issue, Tab } from "./types.js";
  import { errorMessage } from "./util.js";
  import { resources } from "./model.js";

  import StepEditor from "./StepEditor.svelte";
  import StepsView from "./StepsView.svelte";
  import SettingsView from "./SettingsView.svelte";
  import OverviewView from "./OverviewView.svelte";
  import PreviewView from "./PreviewView.svelte";
  import ConfigurationView from "./ConfigurationView.svelte";
  import DiagnosticsView from "./DiagnosticsView.svelte";
  import TimelineView from "./TimelineView.svelte";
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
  let state = $derived.by(() => {
    revision;
    return {
      t: panel.t,
      notices: panel.notices(),
      primary: primaryTabs.some(([id]) => id === panel.tab),
    };
  });
  let { t, notices, primary } = $derived(state);
  const primaryTabs: [Tab, string][] = [
    ["routines", "Your steps"],
    ["settings", "Settings"],
  ];
</script>

{#snippet runtimeControls()}
  {#if panel.status}
    {@const state = panel.status}
    {@const label = state.paused
      ? "Paused"
      : !state.enabled
        ? "Off"
        : state.active
          ? "Running"
          : "Waiting"}
    {@const schedulable = resources(panel.saved).some((resource) =>
      ["step", "activity", "window"].includes(resource.kind),
    )}
    <span id="badge" class="badge" aria-live="polite" title={state.reason || ""}
      >{t(label)}{#if state.dry_run}
        {` · ${t("Dry run")}`}
      {:else}
        {""}
      {/if}</span
    >
    <button
      type="button"
      class="text-button"
      disabled={panel.busy ||
        !!panel.stepEditor ||
        (!state.enabled && !schedulable)}
      onclick={() => panel.control(state.enabled ? "stop" : "start")}
    >
      {t(state.enabled ? "Turn off simulation" : "Turn on simulation")}
    </button>
  {/if}
{/snippet}
{#snippet toolbar()}
  {@const unsaved = panel.dirty && !panel.stepEditor}
  <div id="toolbar" class="toolbar" hidden={!unsaved && !panel.stale}>
    {#if unsaved}
      <button
        type="button"
        class="primary"
        disabled={panel.busy ||
          panel.document?.source === "file" ||
          panel.stale}
        onclick={() => panel.save()}
      >
        {t("Save changes")}
      </button>
      <button
        type="button"
        disabled={panel.busy || !panel.draft}
        onclick={() => panel.discardEdits()}
      >
        {t("Discard edits")}
      </button>
    {/if}
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
  {#if panel.stepEditor}
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
<main>
  <header>
    <div>
      <h1>Occupied</h1>
      <p id="house">{panel.draft?.name || t("Loading household…")}</p>
    </div>
    <div id="runtime" class="row">{@render runtimeControls()}</div>
  </header>
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
        disabled={!!panel.stepEditor}
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
        onclick={() =>
          panel.navigate(panel.tab === "preview" ? "routines" : "settings")}
      >
        {t(panel.tab === "preview" ? "Back to steps" : "Back to settings")}
      </button>
    {/if}
  </div>
  <div id="issues">
    {#each panel.issues as issue}
      {@render renderIssue(issue, primary)}
    {/each}
  </div>
  <div id="view">
    {#key panel.tab}
      <svelte:boundary>
        {#snippet failed(error)}
          <p class="error">{errorMessage(error)}</p>
          <p class="error">
            {t(
              "This draft cannot be shown. Discard edits or import a corrected program from Settings.",
            )}
          </p>
        {/snippet}
        {#if !panel.draft}
          {#if panel.error && !panel._loading}<button
              type="button"
              onclick={() => panel.retry()}>{t("Retry")}</button
            >{/if}
        {:else if panel.stepEditor && !panel.stepEditor.existing}
          <StepEditor {panel} {revision} />
        {:else if panel.tab === "routines"}
          <StepsView {panel} {revision} />
        {:else if panel.tab === "settings"}
          <SettingsView {panel} {revision} />
        {:else if panel.tab === "overview"}
          <OverviewView {panel} {revision} />
        {:else if panel.tab === "preview"}
          <PreviewView {panel} {revision} />
        {:else if panel.tab === "configuration"}
          <ConfigurationView {panel} {revision} />
        {:else if panel.tab === "diagnostics"}
          <DiagnosticsView {panel} {revision} />
        {:else if panel.tab === "timeline"}
          <TimelineView {panel} revision={panel.viewRevision} />
        {/if}
      </svelte:boundary>
    {/key}
  </div>
</main>
