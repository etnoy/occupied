<script lang="ts">
  import { flushSync } from "svelte";
  import type {
    HomeAssistant,
    TimeSource,
    Translate,
    PickerItem,
    SourcePickerState,
  } from "./types.js";
  import { isValueChangedEvent } from "./util.js";
  import { properties, reference } from "./dom.js";
  import FieldError from "./FieldError.svelte";

  let {
    hass,
    choices,
    value,
    t,
    onChange,
    error = "",
  }: {
    hass: HomeAssistant;
    choices: TimeSource[];
    value: string;
    t: Translate;
    onChange: (value: string) => void;
    error?: string;
  } = $props();
  const native = !!customElements.get("ha-generic-picker");
  let picker: HTMLInputElement & SourcePickerState;
  let results = $state<HTMLElement>();
  let matches = $state<TimeSource[]>([]);
  let active = $state(-1);
  let open = $state(false);
  let text = $derived(
    matches.length
      ? `${matches.length} ${t("matching sources")}`
      : t("No matching steps or time sources."),
  );
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
    if (!isValueChangedEvent(event)) return;
    const next =
      typeof event.detail.value === "string" ? event.detail.value : "";
    if (next && !choices.some((choice) => choice.value === next)) return;
    const control = event.currentTarget as HTMLElement &
      SourcePickerState & { value: unknown };
    control.selectedValue = next;
    control.value = next || undefined;
    onChange(next);
  }
  function show(query = "") {
    flushSync(() => {
      matches = choices.filter((choice) =>
        `${t(choice.name)} ${t(choice.group)} ${choice.entity_id || ""} ${choice.value}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      );
      active = -1;
      open = true;
    });
  }
  function close() {
    flushSync(() => {
      open = false;
      active = -1;
    });
    picker.value = t(
      choices.find((choice) => choice.value === picker.selectedValue)?.name ||
        picker.selectedValue ||
        "",
    );
  }
  function keydown(event: KeyboardEvent) {
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      if (!open) show();
      if (!matches.length) return;
      flushSync(
        () =>
          (active =
            (active + (event.key === "ArrowDown" ? 1 : -1) + matches.length) %
            matches.length),
      );
      results
        ?.querySelector(`#source-option-${active}`)
        ?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && matches[active]) {
        const next = matches[active].value;
        close();
        onChange(next);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }
</script>

<div class="field source-picker">
  {#if native}
    <!-- HA provides keyboard interaction inside its custom element. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <ha-generic-picker
      id="routine-anchor"
      data-builder-field="anchor"
      aria-label={t("Relative to")}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={error ? "routine-error-anchor" : undefined}
      tabindex="0"
      use:properties={{
        hass,
        sourceChoices: choices,
        selectedValue: value,
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
  {:else}
    <label for="routine-anchor">{t("Relative to")}</label>
    <input
      use:reference={(node) => (picker = node as typeof picker)}
      id="routine-anchor"
      type="search"
      data-builder-field="anchor"
      aria-label={t("Relative to")}
      placeholder={t("Search steps or time sources")}
      role="combobox"
      aria-autocomplete="list"
      aria-controls="relative-source-results"
      aria-expanded={open}
      aria-activedescendant={open && active >= 0
        ? `source-option-${active}`
        : undefined}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={error ? "routine-error-anchor" : undefined}
      use:properties={{
        sourceChoices: choices,
        selectedValue: value,
        invalid: !!error,
        errorMessage: error,
      }}
      value={t(
        choices.find((choice) => choice.value === value)?.name || value || "",
      )}
      onvalue-changed={select}
      onfocus={() => {
        if (picker.suppressNextOpen) picker.suppressNextOpen = false;
        else show();
      }}
      oninput={() => show(picker.value)}
      onblur={close}
      onkeydown={keydown}
    />
    <div
      bind:this={results}
      id="relative-source-results"
      class="source-results"
      role="listbox"
      aria-label={t("Steps and time sources")}
      hidden={!open}
    >
      {#each matches as choice, index}
        {#if index === 0 || matches[index - 1].group !== choice.group}
          <div class="source-group" role="presentation">{t(choice.group)}</div>
        {/if}
        <!-- Keyboard selection stays on the combobox using aria-activedescendant. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          id={`source-option-${index}`}
          role="option"
          tabindex="-1"
          aria-selected={index === active}
          data-source-value={choice.value}
          onpointerdown={(event) => event.preventDefault()}
          onclick={() => {
            close();
            onChange(choice.value);
          }}
        >
          <strong>{t(choice.name)}</strong>
          {#if choice.entity_id}<small>{choice.entity_id}</small>{/if}
        </div>
      {/each}
      {#if !matches.length}<p class="hint">{text}</p>{/if}
    </div>
    <small aria-live="polite" data-source-status>{open ? text : ""}</small>
  {/if}
  <FieldError key="anchor" errors={{ anchor: error }} />
</div>
