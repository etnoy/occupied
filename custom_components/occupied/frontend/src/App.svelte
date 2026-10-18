<script lang="ts">
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { Issue, Tab } from "./lib/types.js";
  import { errorMessage } from "./lib/utils/util.js";
  import { stepEntries } from "./lib/models/step-model.js";
  import { warningStepId } from "./lib/utils/step-issues.js";

  import StepEditor from "./lib/components/steps/StepEditor.svelte";
  import StepsView from "./lib/components/steps/StepsView.svelte";
  import SettingsView from "./lib/components/settings/SettingsView.svelte";
  import PreviewView from "./lib/components/preview/PreviewView.svelte";
  import UnsavedStepDialog from "./lib/components/shared/UnsavedStepDialog.svelte";
  import RandomView from "./lib/components/random/RandomView.svelte";
  import RandomEventEditor from "./lib/components/random/RandomEventEditor.svelte";

  let {
    panel: controller,
    updates,
  }: {
    panel: OccupiedPanel;
    updates: import("svelte/store").Readable<number>;
  } = $props();

  const methods: Record<
    PropertyKey,
    { target: OccupiedPanel; value: unknown; bound: unknown } | undefined
  > = {};

  // A fresh read-through facade makes mutable controller state reactive without
  // proxying Home Assistant's large state object. Bind DOM methods to their host.
  let panel = $derived.by(() => {
    void $updates;

    return new Proxy(controller, {
      get(target, key) {
        const value = Reflect.get(target, key, target);

        if (typeof value === "function") {
          const previous = methods[key];
          if (previous?.target === target && previous.value === value) {
            return previous.bound;
          }
          const bound = value.bind(target);
          methods[key] = { target, value, bound };

          return bound;
        }

        return value;
      },
    });
  });
  let revision = $derived($updates);
  let state = $derived.by(() => {
    void revision;
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
    ["steps", "steps"],
    ["random", "random"],
    ["preview", "preview"],
    ["settings", "settings"],
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
        {t("reload_saved_program")}
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
    {#if panel.selectedInstance?.source === "file"}
      <header>
        <p class="hint">{t("managed_file")}</p>
      </header>
    {/if}
    {#each panel.selectedInstance?.overlaps || [] as overlap (overlap.config_entry_id)}
      <p class="banner" role="status">
        {t("shared_devices_with")}
        {overlap.name}: {overlap.entities.join(", ")}. {t(
          "instance_overlap_hint",
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
    <nav aria-label={t("occupied")}>
      {#each primaryTabs as [id, label] (id)}
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
          {t("back_to_steps")}
        </button>
      {/if}
    </div>
    <div id="issues">
      {#each issues as issue (issue)}
        {@render renderIssue(issue, primary)}
      {/each}
    </div>
    <div id="view">
      {#key `${panel.selectedEntry}:${panel.tab}`}
        <svelte:boundary>
          {#snippet failed(error)}
            <p class="error">{t(errorMessage(error))}</p>
            <p class="error">
              {t("draft_invalid_hint")}
            </p>
          {/snippet}
          {#if panel.selectedEntry && !panel.selectedInstance?.loaded}
            <p>
              {t("instance_unavailable_hint")}
            </p>
            <button type="button" onclick={() => panel.retry()}
              >{t("retry")}</button
            >
          {:else if panel._loading || !panel.draft}
            {#if panel.error && !panel._loading}
              <button type="button" onclick={() => panel.retry()}
                >{t("retry")}</button
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
{#if panel.pendingStepExit}
  <UnsavedStepDialog {panel} />{/if}
