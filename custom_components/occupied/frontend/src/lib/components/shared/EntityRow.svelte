<script lang="ts">
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { ActionEditorContext, HaSelector } from "../../types.js";
  import { properties } from "../../actions/dom.js";
  import { entityName, isValueChangedEvent } from "../../utils/util.js";
  import {
    canSetBrightness,
    emptyEntitySettings,
    entitySettingsSummary,
    updateEntitySetting,
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
  let brightness = $derived(canSetBrightness(entity, form.action));
  let field = $derived(`entitySettings.${entity}`);
  let summary = $derived(entitySettingsSummary(settings, t, form.action));
  let invalid = $derived(!!editor.errors[`${field}.brightness`]);

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
  {#if brightness}
    {@const fieldKey = `${field}.brightness`}
    <details bind:open={expanded}>
      <summary>
        {t("entity_light_settings")}
        {#if summary}<span class="hint"> · {summary}</span>{/if}
      </summary>
      <div class="entity-fields">
        <div class="field">
          <ha-selector
            aria-label={t("entity_brightness")}
            data-builder-field={`${fieldPrefix}${fieldKey}`}
            aria-invalid={editor.errors[fieldKey] ? "true" : undefined}
            aria-describedby={editor.errors[fieldKey]
              ? `step-error-${fieldPrefix}${fieldKey}`
              : undefined}
            use:properties={{
              hass: panel._hass,
              label: t("entity_brightness"),
              required: false,
              selector: {
                number: {
                  min: 1,
                  max: 100,
                  step: 1,
                  mode: "slider",
                },
              },
              value: settings.brightness.trim()
                ? Number(settings.brightness)
                : undefined,
            }}
            onvalue-changed={(event: Event) => {
              if (!isValueChangedEvent(event)) {
                return;
              }
              const value = event.detail.value;
              if (
                value !== undefined &&
                value !== null &&
                typeof value !== "number"
              ) {
                return;
              }
              updateEntitySetting(
                form,
                entity,
                "brightness",
                value == null ? "" : String(value),
              );
              context.changed(fieldKey);
            }}
          ></ha-selector>
          <FieldError
            {t}
            key={fieldKey}
            {fieldPrefix}
            errors={{ ...editor.errors }}
          />
        </div>
      </div>
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
    max-width: 520px;
    margin-top: 12px;
  }

  ha-selector {
    display: block;
  }

  summary .hint {
    font-weight: normal;
  }
</style>
