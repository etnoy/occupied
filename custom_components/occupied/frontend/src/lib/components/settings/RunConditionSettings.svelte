<script lang="ts">
  import type { OccupiedPanel } from "../../../occupied-panel.js";
  import { properties } from "../../actions/dom.js";
  import { runConditionStateOptions } from "../../models/run-condition.js";
  import { isValueChangedEvent } from "../../utils/util.js";
  import FieldError from "../shared/FieldError.svelte";

  let { panel, revision }: { panel: OccupiedPanel; revision: number } =
    $props();

  let data = $derived.by(() => {
    void revision;

    return {
      t: panel.t,
      form: panel.runConditionForm,
      errors: panel.runConditionErrors,
      snapshot: panel.runtimeSnapshot,
    };
  });
  let { t, form, errors, snapshot } = $derived(data);
  let current = $derived(
    panel.catalog.entities.find((item) => item.entity_id === form?.entityId),
  );

  let now = $state(Date.now());

  let deadline = $derived(snapshot.run_condition?.activation_deadline);
  let remaining = $derived(
    deadline ? Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000)) : 0,
  );

  $effect(() => {
    if (panel.runConditionForm) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        panel.openRunCondition();
      }
    });

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (!deadline) {
      return;
    }

    const timer = setInterval(() => {
      now = Date.now();
    }, 1000);

    return () => clearInterval(timer);
  });
</script>

{#if form}
  <section>
    <h2>{t("run_condition")}</h2>
    <p class="hint">{t("run_condition_hint")}</p>
    <label>
      <input
        type="checkbox"
        checked={form.enabled}
        disabled={panel.busy || panel.yamlDirty}
        onchange={(event) => {
          form!.enabled = event.currentTarget.checked;
          panel.updateRunCondition();
        }}
      />
      {t("run_condition_enable")}
    </label>
    {#if form.enabled}
      <fieldset disabled={panel.busy || panel.yamlDirty}>
        <legend>{t("run_condition")}</legend>
        <label for="run-condition-entity">{t("run_condition_entity")}</label>
        <ha-selector
          id="run-condition-entity"
          aria-label={t("run_condition_entity")}
          use:properties={{
            hass: panel._hass,
            selector: { entity: {} },
            value: form.entityId,
            disabled: panel.busy || panel.yamlDirty,
          }}
          onvalue-changed={(event: Event) => {
            if (!isValueChangedEvent(event)) {
              return;
            }

            form!.entityId =
              typeof event.detail.value === "string" ? event.detail.value : "";
            panel.updateRunCondition();
          }}
        ></ha-selector>
        <FieldError {t} {errors} key="entityId" fieldPrefix="run-condition-" />
        <label for="run-condition-states">{t("run_condition_states")}</label>
        <ha-selector
          id="run-condition-states"
          aria-label={t("run_condition_states")}
          use:properties={{
            hass: panel._hass,
            selector: {
              select: {
                multiple: true,
                custom_value: true,
                options: runConditionStateOptions(
                  form.entityId,
                  form.states,
                  current?.state,
                ),
              },
            },
            value: form.states,
            disabled: panel.busy || panel.yamlDirty,
          }}
          onvalue-changed={(event: Event) => {
            if (
              !(isValueChangedEvent(event) && Array.isArray(event.detail.value))
            ) {
              return;
            }

            form!.states = event.detail.value as string[];
            panel.updateRunCondition();
          }}
        ></ha-selector>
        <FieldError {t} {errors} key="states" fieldPrefix="run-condition-" />
        <label>
          <input
            type="checkbox"
            checked={form.enforceState}
            onchange={(event) => {
              form!.enforceState = event.currentTarget.checked;
              panel.updateRunCondition();
            }}
          />
          {t("run_condition_enforce")}
        </label>
        <p class="hint">{t("run_condition_enforce_hint")}</p>
        <label for="run-condition-delay">{t("run_condition_delay")}</label>
        <input
          id="run-condition-delay"
          type="text"
          value={form.startDelay}
          disabled={!form.enforceState}
          aria-invalid={!!errors.startDelay}
          oninput={(event) => {
            form!.startDelay = event.currentTarget.value;
            panel.updateRunCondition();
          }}
        />
        <FieldError
          {t}
          {errors}
          key="startDelay"
          fieldPrefix="run-condition-"
        />
        <p class="hint">{t("run_condition_delay_hint")}</p>
      </fieldset>
    {/if}
    {#if panel.yamlDirty}
      <p class="hint">{t("run_condition_yaml_hint")}</p>
    {/if}
    <div class="actions">
      <button
        type="button"
        class="primary"
        disabled={panel.busy ||
          panel.stale ||
          panel.yamlDirty ||
          !panel.hasRunConditionChanges}
        onclick={() => panel.saveRunCondition()}
        >{t(
          panel.document.source === "file" ? "add_to_draft" : "save_changes",
        )}</button
      >
      <button
        type="button"
        disabled={panel.busy || !panel.hasRunConditionChanges}
        onclick={() => panel.openRunCondition()}>{t("discard_changes")}</button
      >
    </div>
    {#if snapshot.run_condition}
      <p role="status">{snapshot.reason}</p>
      {#if deadline}
        <p>
          {t("run_condition_countdown").replace("{seconds}", () =>
            String(remaining),
          )}
        </p>
      {/if}
    {/if}
    {#if snapshot.reconciliation && Object.keys(snapshot.reconciliation.results).length > 0}
      <details>
        <summary
          >{t("run_condition_results")} · {t(
            snapshot.reconciliation.phase,
          )}</summary
        >
        {#if snapshot.reconciliation.counts}
          <p class="counts">
            {#each Object.entries(snapshot.reconciliation.counts) as [kind, count] (kind)}
              <span>{t(`run_condition_count_${kind}`)}: {count} </span>
            {/each}
          </p>
        {/if}
        <ul>
          {#each Object.entries(snapshot.reconciliation.results) as [entity, result] (entity)}
            <li>
              {entity}: {t(result.status)}{result.reason
                ? ` · ${result.reason}`
                : ""}
            </li>
          {/each}
        </ul>
      </details>
    {/if}
  </section>
{/if}

<style>
  fieldset {
    margin: 12px 0;
  }
  label {
    display: block;
    margin: 12px 0 6px;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
</style>
