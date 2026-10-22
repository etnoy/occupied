<script lang="ts">
  import { flushSync } from "svelte";
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { ActionEditorContext, HaSelector } from "../../types.js";
  import { properties } from "../../actions/dom.js";
  import { entityName, isValueChangedEvent } from "../../utils/util.js";
  import {
    canSetBrightness,
    emptyEntitySettings,
    updateEntityColor,
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

  let menuOpen = $state(false);
  let trigger = $state<HTMLButtonElement>();
  let menu = $state<HTMLDivElement>();
  let row: HTMLDivElement;

  type SettingKey = "brightness" | "transition" | "rgbColor" | "colorTemp";

  let unresolved = $derived.by(() => {
    void context;
    const state = panel._hass.states?.[entity]?.state;

    return state == null || state === "unknown" || state === "unavailable";
  });
  let conflict = $derived.by(() => {
    void context;

    return (
      (panel.runConditionForm
        ? panel.runConditionForm.enabled &&
          panel.runConditionForm.offEntities.includes(entity)
        : panel.draft.run_condition?.off_entities?.includes(entity)) ?? false
    );
  });

  let fieldPrefix = $derived(context.fieldPrefix || "");
  let name = $derived(entityName(panel.catalog, entity));
  let settings = $derived(
    form.entitySettings?.[entity] || emptyEntitySettings(),
  );
  let brightness = $derived(canSetBrightness(entity, form.action));
  let brightnessState = $derived({
    entity_id: entity,
    state: "on",
    attributes: {
      brightness:
        settings.rawBrightness ??
        Math.max(
          1,
          Math.min(
            255,
            Math.round(((Number(settings.brightness) || 0) * 255) / 100),
          ),
        ),
      ...(settings.rgbColor && { rgb_color: settings.rgbColor }),
    },
  });
  let field = $derived(`entitySettings.${entity}`);
  let light = $derived(entity.startsWith("light."));
  let menuId = $derived(`entity-properties-${fieldPrefix}${entity}`);
  let fields = $derived([
    {
      key: "brightness" as const,
      label: t("entity_brightness"),
      available: brightness,
      value: settings.brightness,
      initial: "100",
      selector: { number: { min: 1, max: 100, step: 1, mode: "slider" } },
    },
    {
      key: "rgbColor" as const,
      label: t("entity_color"),
      available: brightness,
      value: settings.rgbColor,
      initial: [255, 255, 255],
      selector: { color_rgb: {} },
    },
    {
      key: "colorTemp" as const,
      label: t("entity_color_temp"),
      available: brightness,
      value: settings.colorTemp,
      initial: "3000",
      selector: { number: { min: 1, max: 100_000, step: 1, mode: "box" } },
    },
    {
      key: "transition" as const,
      label: t("entity_transition"),
      available: light,
      value: settings.transition,
      initial: "1",
      selector: { number: { min: 0, max: 604_800, step: 0.1, mode: "box" } },
    },
  ]);

  function setValue(key: SettingKey, value?: string | number[]) {
    if (key === "rgbColor") {
      updateEntityColor(form, entity, Array.isArray(value) ? value : undefined);
    } else {
      updateEntitySetting(
        form,
        entity,
        key,
        typeof value === "string" ? value : "",
      );
    }
    context.changed(`${field}.${key}`);
  }

  function closeMenu() {
    menu?.hidePopover();
    menuOpen = false;
    trigger?.focus();
  }

  function positionMenu() {
    if (!menu?.matches(":popover-open") || !trigger) {
      return;
    }
    const anchor = trigger.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(16, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 16))}px`;
    menu.style.top = `${Math.max(16, Math.min(anchor.bottom + 8, window.innerHeight - bounds.height - 16))}px`;
  }

  function openMenu(last = false) {
    if (!menu) {
      return;
    }
    menu.showPopover();
    menuOpen = true;
    positionMenu();
    const items = [
      ...menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    ];
    (last ? items.at(-1) : items[0])?.focus({ preventScroll: true });
  }

  function menuKeydown(event: KeyboardEvent) {
    if (!menu) {
      return;
    }
    const items = [
      ...menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    ];
    const index = items.indexOf(
      panel.shadowRoot.activeElement as HTMLButtonElement,
    );
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      let next =
        (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
        items.length;
      if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = items.length - 1;
      }
      items[next]?.focus();
    } else if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") {
        event.preventDefault();
      }
      closeMenu();
    }
  }
</script>

<svelte:window onresize={positionMenu} onscroll={positionMenu} />

<div
  bind:this={row}
  class="entity-row"
  class:entity-warning={unresolved || conflict}
  aria-invalid={conflict ? "true" : undefined}
  data-entity-row={entity}
>
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
        class="icon-button"
        aria-label={`${t("remove_entity")}: ${name}`}
        onclick={remove}
      >
        ×
      </button>
    {/if}
    {#if light}
      <button
        bind:this={trigger}
        type="button"
        class="icon-button property-menu-trigger"
        aria-label={`${t("entity_add_property")}: ${name}`}
        title={t("entity_add_property")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onclick={() => (menuOpen ? closeMenu() : openMenu())}
        onkeydown={(event) => {
          if (!(event.key === "ArrowDown" || event.key === "ArrowUp")) {
            return;
          }

          event.preventDefault();
          openMenu(event.key === "ArrowUp");
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
          />
        </svg>
      </button>
      <div
        bind:this={menu}
        id={menuId}
        class="step-actions-menu"
        popover="auto"
        role="menu"
        tabindex="-1"
        aria-label={t("entity_add_property")}
        ontoggle={(event) => (menuOpen = event.newState === "open")}
        onkeydown={menuKeydown}
      >
        {#each fields.filter((item) => item.available) as item (item.key)}
          <button
            type="button"
            role="menuitem"
            tabindex="-1"
            disabled={!!item.value}
            onclick={() => {
              closeMenu();
              flushSync(() => setValue(item.key, item.initial));
              (
                row.querySelector(
                  `[data-property="${CSS.escape(item.key)}"] ha-selector`,
                ) as HTMLElement
              )?.focus();
            }}>{item.label}</button
          >
        {/each}
      </div>
    {/if}
  </div>
  {#each fields.filter((item) => item.available && !!item.value) as item (item.key)}
    {@const fieldKey = `${field}.${item.key}`}
    <div class="entity-property" data-property={item.key}>
      <div class="field">
        <div class="property-control" role="group" aria-label={item.label}>
          {#if item.key === "brightness"}
            <state-badge
              aria-hidden="true"
              use:properties={{
                hass: panel._hass,
                stateObj: brightnessState,
                stateColor: true,
                overrideIcon: "mdi:lightbulb",
              }}
            ></state-badge>
          {/if}
          <!-- HA selectors manage their native inputs inside the custom element. -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <ha-selector
            tabindex="0"
            aria-label={item.label}
            data-builder-field={`${fieldPrefix}${fieldKey}`}
            aria-invalid={editor.errors[fieldKey] ? "true" : undefined}
            aria-describedby={editor.errors[fieldKey]
              ? `step-error-${fieldPrefix}${fieldKey}`
              : undefined}
            use:properties={{
              hass: panel._hass,
              label: ["brightness", "rgbColor"].includes(item.key)
                ? undefined
                : item.label,
              required: false,
              selector: item.selector,
              value: item.key === "rgbColor" ? item.value : Number(item.value),
            }}
            onvalue-changed={(event: Event) => {
              if (!isValueChangedEvent(event)) {
                return;
              }
              const value = event.detail.value;
              if (item.key === "rgbColor") {
                if (
                  Array.isArray(value) &&
                  value.length === 3 &&
                  value.every((channel) => typeof channel === "number")
                ) {
                  setValue(item.key, value);
                }
              } else if (value == null || typeof value === "number") {
                setValue(item.key, value == null ? "" : String(value));
              }
            }}
          ></ha-selector>
        </div>
        <FieldError
          {t}
          key={fieldKey}
          {fieldPrefix}
          errors={{ ...editor.errors }}
        />
      </div>
      <button
        type="button"
        class="icon-button remove-property"
        aria-label={t("entity_remove_property").replace(
          "{property}",
          () => item.label,
        )}
        title={t("entity_remove_property").replace(
          "{property}",
          () => item.label,
        )}
        onclick={() => {
          setValue(item.key);
          trigger?.focus();
        }}>×</button
      >
    </div>
  {/each}
</div>

<style>
  .entity-row {
    margin-bottom: 16px;
    min-width: 0;
  }

  .entity-row.entity-warning {
    background: color-mix(
      in srgb,
      var(--warning-color, #ffa600) 10%,
      var(--card-background-color, #fff)
    );
  }

  .entity-target,
  .entity-property {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 36px 36px;
    align-items: center;
    gap: 8px;
  }

  ha-selector,
  .entity-name,
  .field {
    min-width: 0;
  }

  .entity-name {
    overflow-wrap: anywhere;
  }

  .entity-property {
    margin-top: 8px;
  }

  .entity-property .field {
    margin: 0;
    max-width: none;
  }

  .property-control {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .property-control state-badge {
    flex: 0 0 24px;
    width: 24px;
    height: 24px;
  }

  .property-control ha-selector {
    flex: 1;
  }

  /* HA’s RGB selector adds this spacing as an inner input margin. */
  .entity-property[data-property="rgbColor"] ha-selector {
    --ha-space-1: 0px;
  }

  .property-menu-trigger {
    grid-column: 3;
  }

  .entity-row .icon-button {
    width: 36px;
    height: 36px;
    padding: 4px;
    border: 0;
    background: transparent;
  }

  ha-selector {
    display: block;
  }
</style>
