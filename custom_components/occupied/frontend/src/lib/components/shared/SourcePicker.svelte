<script lang="ts">
  import type {
    HomeAssistant,
    TimeSource,
    Translate,
    PickerItem,
    HaGenericPicker,
  } from "../../types.js";
  import { isValueChangedEvent } from "../../utils/util.js";
  import { properties } from "../../actions/dom.js";
  import FieldError from "./FieldError.svelte";

  let {
    hass,
    choices,
    value,
    t,
    onChange,
    error = "",
    fieldPrefix = "",
  }: {
    hass: HomeAssistant;
    choices: TimeSource[];
    value: string;
    t: Translate;
    onChange: (value: string) => void;
    error?: string;
    fieldPrefix?: string;
  } = $props();

  let items = $derived.by(() => {
    const items: (string | PickerItem)[] = [];
    let group;
    for (const choice of choices) {
      if (group !== choice.group) {
        group = choice.group;
        items.push(group);
      }
      items.push({
        id: choice.value,
        primary: choice.name,
        secondary: choice.entity_id,
        group: choice.group,
      });
    }

    return items;
  });

  function valueRenderer(id: string) {
    const headline = document.createElement("span");
    headline.slot = "headline";
    headline.textContent =
      choices.find((choice) => choice.value === id)?.name || id;

    return headline;
  }

  function rowRenderer(item: PickerItem) {
    const row = document.createElement("ha-combo-box-item");
    const headline = document.createElement("span");
    headline.slot = "headline";
    headline.textContent = item.primary;
    row.append(headline);
    if (item.secondary) {
      const secondary = document.createElement("span");
      secondary.slot = "supporting-text";
      secondary.textContent = item.secondary;
      row.append(secondary);
    }
    const choice = choices.find((choice) => choice.value === item.id);
    if (choice?.value.startsWith("sun:")) {
      const time = document.createElement("span");
      time.slot = "end";
      time.textContent = choice.today_time || t("unavailable");
      time.title = t("today");
      time.style.cssText =
        "font-variant-numeric: tabular-nums; white-space: nowrap; text-align: right;";
      row.append(time);
    }

    return row;
  }

  function select(event: Event) {
    if (!isValueChangedEvent(event)) {
      return;
    }
    const next =
      typeof event.detail.value === "string" ? event.detail.value : "";
    if (next && choices.every((choice) => choice.value !== next)) {
      return;
    }
    const control = event.currentTarget as HaGenericPicker;
    control.value = next || undefined;
    onChange(next);
  }
</script>

<div class="field source-picker">
  {#if !customElements.get("ha-generic-picker")}
    <ha-selector
      id={`step-${fieldPrefix}anchor`}
      data-builder-field={`${fieldPrefix}anchor`}
      aria-label={t("relative_to")}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={error ? `step-error-${fieldPrefix}anchor` : undefined}
      use:properties={{
        hass,
        value: value || undefined,
        label: t("relative_to"),
        selector: {
          select: {
            options: choices.map((choice) => ({
              value: choice.value,
              label: choice.name,
            })),
            mode: "dropdown",
            custom_value: false,
          },
        },
        required: true,
        invalid: !!error,
      }}
      onvalue-changed={select}
    ></ha-selector>
  {:else}
    <!-- HA provides keyboard interaction inside its custom element. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <ha-generic-picker
      id={`step-${fieldPrefix}anchor`}
      data-builder-field={`${fieldPrefix}anchor`}
      aria-label={t("relative_to")}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={error ? `step-error-${fieldPrefix}anchor` : undefined}
      tabindex="0"
      use:properties={{
        hass,
        value: value || undefined,
        label: t("relative_to"),
        searchLabel: t("search_steps_or_time_sources"),
        placeholder: t("choose_a_step_or_event"),
        notFoundLabel: t("time_sources_no_matches"),
        getItems: () => items,
        searchKeys: ["primary", "secondary", "id", "group"],
        valueRenderer,
        rowRenderer,
        allowCustomValue: false,
        noSort: true,
        required: true,
        invalid: !!error,
        errorMessage: t(error),
      }}
      onvalue-changed={select}
    ></ha-generic-picker>
  {/if}
  <FieldError {t} key="anchor" {fieldPrefix} errors={{ anchor: error }} />
</div>
