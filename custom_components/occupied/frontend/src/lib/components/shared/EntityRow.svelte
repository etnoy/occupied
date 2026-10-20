<script lang="ts">
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { ActionEditorContext, HaSelector } from "../../types.js";
  import { properties } from "../../actions/dom.js";
  import { entityName, isValueChangedEvent } from "../../utils/util.js";
  import {
    emptyEntitySettings,
    entitySettingsSummary,
    updateEntitySetting,
    resetEntitySettings,
  } from "../../utils/entity-settings.js";
  import FieldError from "./FieldError.svelte";

  let {
    panel,
    context,
    entity,
    readOnlyTarget = false,
    replace,
    remove,
  }: {
    panel: LoadedOccupiedPanel;
    context: ActionEditorContext;
    entity: string;
    readOnlyTarget?: boolean;
    replace: (value: string) => void;
    remove: () => void;
  } = $props();

  let { form, t, editor } = $derived(context);

  let expanded = $state(false);

  let fieldPrefix = $derived(context.fieldPrefix || "");
  let name = $derived(entityName(panel.catalog, entity));
  let settings = $derived(
    form.entitySettings?.[entity] || emptyEntitySettings(),
  );
  let capability = $derived(
    panel.catalog.entities.find((item) => item.entity_id === entity),
  );
  let brightness = $derived(
    form.action === "turn_on" &&
      entity.startsWith("light.") &&
      !!capability?.dimmable,
  );
  let transition = $derived(
    entity.startsWith("light.") && !!capability?.transition,
  );
  let field = $derived(`entitySettings.${entity}`);
  let summary = $derived(entitySettingsSummary(settings, t, form.action));
  let unsupported = $derived(
    (form.action === "turn_on" && !!settings.brightness && !brightness) ||
      (!!settings.transition && !transition),
  );
  let invalid = $derived(
    !!editor.errors[`${field}.brightness`] ||
      !!editor.errors[`${field}.transition`],
  );

  $effect(() => {
    if (invalid) {
      expanded = true;
    }
  });
</script>

<div class="entity-row" data-entity-row={entity}>
  <div class="entity-target">
    {#if readOnlyTarget}
      <span class="entity-name">{name}</span>
    {:else}
      <ha-selector
        aria-label={`${t("entity")}: ${name}`}
        data-builder-field={`${fieldPrefix}entity.${entity}`}
        use:properties={{
          hass: panel._hass,
          selector: { entity: { filter: { domain: ["light", "switch"] } } },
          value: entity,
          required: true,
          narrow: panel.hasAttribute("narrow"),
        }}
        onvalue-changed={(event: Event) => {
          if (!isValueChangedEvent(event)) {
            return;
          }
          const value = event.detail.value;
          if (typeof value === "string" && value) {
            replace(value);
          } else {
            remove();
          }
          (event.currentTarget as HaSelector).value = entity;
        }}
      ></ha-selector>
      <button
        type="button"
        aria-label={`${t("remove_entity")}: ${name}`}
        onclick={remove}
      >
        ×
      </button>
    {/if}
  </div>
  {#if brightness || transition || summary}
    <details bind:open={expanded}>
      <summary>
        {t("entity_light_settings")}
        {#if summary}<span class="hint"> · {summary}</span>{/if}
      </summary>
      <div class="entity-fields">
        {#each ["brightness", "transition"] as key (key)}
          {@const available = key === "brightness" ? brightness : transition}
          {#if available || (key === "brightness" ? form.action === "turn_on" && settings.brightness : settings.transition)}
            {@const fieldKey = `${field}.${key}`}
            {@const id = `step-${fieldPrefix}${fieldKey}`}
            <div class="field">
              <label for={id}
                >{t(
                  key === "brightness"
                    ? "entity_brightness"
                    : "entity_transition",
                )}</label
              >
              <input
                {id}
                type="number"
                min={key === "brightness" ? 0.1 : 0}
                max={key === "brightness" ? 100 : 604_800}
                step="any"
                disabled={!available}
                value={settings[key as "brightness" | "transition"]}
                placeholder={t("entity_setting_unspecified")}
                data-builder-field={`${fieldPrefix}${fieldKey}`}
                aria-invalid={editor.errors[fieldKey] ? "true" : undefined}
                aria-describedby={editor.errors[fieldKey]
                  ? `step-error-${fieldPrefix}${fieldKey}`
                  : undefined}
                oninput={(event) => {
                  updateEntitySetting(
                    form,
                    entity,
                    key as "brightness" | "transition",
                    event.currentTarget.value,
                  );
                  context.changed(fieldKey);
                }}
              />
              <FieldError
                {t}
                key={fieldKey}
                {fieldPrefix}
                errors={{ ...editor.errors }}
              />
            </div>
          {/if}
        {/each}
      </div>
      <p class="hint">{t("entity_settings_hint")}</p>
      {#if unsupported}<p class="hint">
          {t("entity_settings_unavailable")}
        </p>{/if}
      <button
        type="button"
        disabled={!summary}
        onclick={() => {
          resetEntitySettings(form, entity);
          context.changed("entities");
        }}>{t("entity_settings_reset")}</button
      >
    </details>
  {/if}
</div>

<style>
  .entity-row {
    border: 1px solid var(--divider-color, #d5dce3);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
    min-width: 0;
  }

  .entity-target {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  ha-selector {
    flex: 1;
    min-width: 0;
  }

  .entity-name {
    overflow-wrap: anywhere;
  }

  .entity-fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  summary .hint {
    font-weight: normal;
  }
</style>
