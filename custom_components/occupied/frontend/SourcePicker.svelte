<script lang="ts">
  import type {
    HomeAssistant,
    TimeSource,
    Translate,
    PickerItem,
    HaGenericPicker,
  } from "./types.js";
  import { isValueChangedEvent } from "./util.js";
  import { properties } from "./dom.js";
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
        items.push(t(group));
      }
      items.push({
        id: choice.value,
        primary: t(choice.name),
        secondary: choice.entity_id,
        group: t(choice.group),
      });
    }

    return items;
  });

  function valueRenderer(id: string) {
    const headline = document.createElement("span");
    headline.slot = "headline";
    headline.textContent = t(
      choices.find((choice) => choice.value === id)?.name || id,
    );

    return headline;
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
  <!-- HA provides keyboard interaction inside its custom element. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <ha-generic-picker
    id={`step-${fieldPrefix}anchor`}
    data-builder-field={`${fieldPrefix}anchor`}
    aria-label={t("Relative to")}
    aria-invalid={error ? "true" : undefined}
    aria-describedby={error ? `step-error-${fieldPrefix}anchor` : undefined}
    tabindex="0"
    use:properties={{
      hass,
      value: value || undefined,
      label: t("Relative to"),
      searchLabel: t("Search steps or time sources"),
      placeholder: t("Choose a step or event"),
      notFoundLabel: t("No matching steps or time sources."),
      getItems: () => items,
      searchKeys: ["primary", "secondary", "id", "group"],
      valueRenderer,
      allowCustomValue: false,
      noSort: true,
      required: true,
      invalid: !!error,
      errorMessage: error,
    }}
    onvalue-changed={select}
  ></ha-generic-picker>
  <FieldError key="anchor" {fieldPrefix} errors={{ anchor: error }} />
</div>
