<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import { hasProgram } from "./lib/panel-state.js";
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { Issue, Tab } from "./lib/types.js";
  import { errorMessage } from "./lib/utils/util.js";
  import { stepEntries } from "./lib/models/step-model.js";
  import { randomEntries } from "./lib/models/random-model.js";
  import { warningStepId, warningRandomId } from "./lib/utils/step-issues.js";

  import StepEditor from "./lib/components/steps/StepEditor.svelte";
  import StepsView from "./lib/components/steps/StepsView.svelte";
  import SettingsView from "./lib/components/settings/SettingsView.svelte";
  import PreviewView from "./lib/components/preview/PreviewView.svelte";
  import UnsavedStepDialog from "./lib/components/shared/UnsavedStepDialog.svelte";
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
    const showingCards =
      hasProgram(panel) &&
      (!panel.stepEditor || panel.stepEditor.existing) &&
      (!panel.randomEditor || panel.randomEditor.existing);
    const entries =
      showingCards && panel.tab === "steps" ? stepEntries(panel.draft) : [];
    const random =
      showingCards && panel.tab === "steps" ? randomEntries(panel.draft) : [];
    const visibleIssues = panel.visibleIssues();
    const issueTabs = new SvelteSet<Tab>();
    for (const issue of visibleIssues) {
      if (issue.severity === "info") {
        continue;
      }
      const section = issue.model_path
        ? issue.model_path[0]
        : issue.path?.match(/^\$\.(steps|random)(?:\.|\[|$)/)?.[1];
      issueTabs.add(
        section === "steps" || section === "random" ? "steps" : "settings",
      );
    }
    for (const [tab, errors] of [
      ["steps", panel.stepEditor?.errors],
      ["steps", panel.randomEditor?.errors],
      ["settings", panel.runConditionErrors],
    ] as const) {
      if (errors && Object.keys(errors).length > 0) {
        issueTabs.add(tab);
      }
    }
    const previewPlans =
      panel.liveVisible && panel.livePlan
        ? [panel.livePlan]
        : panel.preview?.plans;
    if (
      (!(panel.liveVisible && panel.livePlan) &&
        panel.preview?.valid === false) ||
      previewPlans?.some((plan) =>
        plan.issues.some((issue) => issue.severity !== "info"),
      )
    ) {
      issueTabs.add("preview");
    }

    return {
      t: panel.t,
      notices: panel.notices(),
      primary: primaryTabs.some(([id]) => id === panel.tab),
      issueTabs,
      issues: visibleIssues.filter(
        (issue) =>
          (!(
            issue.code === "off_entity_conflict" && panel.tab === "settings"
          ) ||
            panel.yamlDirty) &&
          !warningStepId(issue, entries) &&
          !warningRandomId(issue, random),
      ),
    };
  });
  let { t, notices, primary, issues, issueTabs } = $derived(state);

  const primaryTabs: [Tab, string][] = [
    ["steps", "activity"],
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
  {@const severityClass = item.severity === "warning" ? "hint" : "error"}
  {@const className =
    item.code === "off_entity_conflict"
      ? "entity-conflict-message"
      : severityClass}
  {@const text = primary
    ? item.message
    : `${t(`issue_${item.severity || "error"}`)} · ${item.path || "$"}: ${item.message}`}
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
    <nav aria-label={t("occupied")}>
      {#each primaryTabs as [id, label] (id)}
        <button
          type="button"
          data-tab={id}
          class:tab-warning={issueTabs.has(id)}
          aria-current={panel.tab === id ? "page" : "false"}
          disabled={panel.starting ||
            !panel.selectedInstance?.loaded ||
            (panel.recovering && id !== "settings")}
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
          {#if !hasProgram(panel) && panel.starting}
            <p role="status" aria-live="polite">
              {t("waiting_for_home_assistant")}
            </p>
          {:else if !hasProgram(panel) && panel.selectedEntry && !panel.selectedInstance?.loaded}
            <p>
              {t("instance_unavailable_hint")}
            </p>
          {:else if !hasProgram(panel)}
            <!-- Initial loads recover automatically; keep an existing view mounted. -->
          {:else if panel.recovering && panel.tab !== "settings"}
            <button type="button" onclick={() => panel.navigate("settings")}
              >{t("settings")}</button
            >
          {:else if panel.stepEditor && !panel.stepEditor.existing}
            <StepEditor {panel} {revision} />
          {:else if panel.randomEditor && !panel.randomEditor.existing}
            <RandomEventEditor {panel} {revision} />
          {:else if panel.tab === "steps"}
            <StepsView {panel} {revision} />
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
{#if panel.pendingStepExit && hasProgram(panel)}
  <UnsavedStepDialog {panel} />{/if}
