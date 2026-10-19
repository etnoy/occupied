<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { Action, ActionForm, WebSocketResponses } from "../../types.js";
  import { copy } from "../../models/model.js";
  import { actionErrors, buildAction } from "../../models/step-model.js";
  import {
    actionYaml,
    prepareCustomAction,
  } from "../../utils/custom-action.js";

  let {
    panel,
    form,
    label,
    running = $bindable(false),
  }: {
    panel: LoadedOccupiedPanel;
    form: ActionForm;
    label: string;
    running?: boolean;
  } = $props();

  let result = $state<WebSocketResponses["action_preview"]>();
  let error = $state("");
  let loading = $state(true);
  let testing = $state(false);
  let action: Action;
  let current = true;
  const epoch = untrack(() => panel.epoch);

  function fail(reason: unknown) {
    error = panel.t(reason instanceof Error ? reason.message : String(reason));
  }

  async function load() {
    try {
      const snapshot = copy({ ...form });
      const errors = Object.values(actionErrors(snapshot));
      if (errors.length > 0) {
        throw new Error(errors.map((key) => panel.t(key)).join("\n"));
      }
      await prepareCustomAction(panel, snapshot);
      if (!current || panel.epoch !== epoch) {
        return;
      }
      action = buildAction(snapshot);
      result = await panel.ws("action_preview", { action });
    } catch (error_) {
      fail(error_);
    } finally {
      loading = false;
    }
  }

  function dispose() {
    current = false;
  }

  onMount(() => {
    void load();

    return dispose;
  });

  async function test() {
    if (running || !result?.valid || panel.epoch !== epoch) {
      return;
    }
    running = true;
    testing = true;
    error = "";
    result = { ...result, outcomes: [] };
    try {
      result = await panel.ws("action_preview", { action, execute: true });
    } catch (error_) {
      fail(error_);
    } finally {
      testing = false;
      running = false;
    }
  }
</script>

<section class="preview-command">
  <h3>{panel.t(label)}</h3>
  {#if loading}
    <p role="status">{panel.t("loading")}</p>
  {:else if result?.valid}
    {#each result.calls as call, index (index)}
      <pre><code>{actionYaml(call)}</code></pre>
      {#if result.outcomes[index]}
        {@const outcome = result.outcomes[index]}
        <p
          class:error={outcome.status !== "dispatched"}
          role={outcome.status === "dispatched" ? "status" : "alert"}
        >
          {panel.t(`action_test_${outcome.status}`)}
          {outcome.detail || ""}
        </p>
      {/if}
    {/each}
    <button
      type="button"
      disabled={running || panel.busy}
      onclick={test}
      aria-label={`${panel.t("test_action")}: ${panel.t(label)}`}
      >{panel.t(testing ? "running" : "test_action")}</button
    >
  {:else if result}
    <p class="error" role="alert">
      {result.issues.map((issue) => issue.message).join("\n")}
    </p>
  {/if}
  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}
</section>

<style>
  .preview-command {
    border-top: 1px solid var(--divider-color, #d5dce3);
    padding-block: 8px 16px;
  }

  pre {
    padding: 12px;
    border-radius: 8px;
    background: var(--secondary-background-color, #f0f3f5);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
