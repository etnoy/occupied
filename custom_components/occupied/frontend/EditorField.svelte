<script lang="ts">
  import type { Snippet } from "svelte";
  import type { OccupiedPanel } from "./occupied-panel.js";
  import type { StepEditorContext } from "./step-editor-controller.js";
  import type { HaSelector } from "./types.js";
  import { isValueChangedEvent } from "./util.js";
  import { focusEditor } from "./step-editor-controller.js";
  import { properties, validity } from "./dom.js";
  import FieldError from "./FieldError.svelte";

  interface FieldOptions {
    type?: string;
    optional?: boolean;
    choices?: [string, string][];
    multiline?: boolean;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    render?: boolean;
    hideLabel?: boolean;
  }
  let {
    panel,
    context,
    key,
    label,
    value,
    update,
    options = {},
    trailing,
  }: {
    panel: OccupiedPanel;
    context: StepEditorContext;
    key: string;
    label: string;
    value: string | number;
    update: (value: string) => void;
    options?: FieldOptions;
    trailing?: Snippet;
  } = $props();
  let { editor, t, changed } = $derived(context);
  let id = $derived(`routine-${key}`);
  let invalid = $derived(editor.errors[key] ? true : undefined);
  let described = $derived(
    editor.errors[key] ? `routine-error-${key}` : undefined,
  );
  let nativeTime = $derived(
    options.type === "time" &&
      customElements.get("ha-selector") &&
      customElements.get("ha-selector-time") &&
      customElements.get("ha-time-input"),
  );

  function input(event: Event) {
    const control = event.currentTarget as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | HaSelector;
    if (nativeTime) {
      if (!isValueChangedEvent(event)) return;
      control.value = event.detail.value || "";
    }
    update(String(control.value ?? ""));
    changed(key);
    if (options.render) focusEditor(panel, key);
  }
</script>

<div class="field">
  {#if !nativeTime && !options.hideLabel}
    <div class={trailing ? "field-label-row" : ""}>
      <label for={id}>{t(label)}</label>
      {@render trailing?.()}
    </div>
  {/if}
  {#if nativeTime}
    <!-- HA provides keyboard interaction inside its custom element. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <ha-selector
      {id}
      data-builder-field={key}
      aria-label={t(label)}
      aria-invalid={invalid}
      aria-describedby={described}
      tabindex="0"
      use:properties={{
        hass: panel._hass,
        selector: { time: {} },
        label: t(label),
        required: !options.optional,
        value: value || undefined,
      }}
      onvalue-changed={input}
    ></ha-selector>
  {:else if options.choices}
    <select
      {id}
      data-builder-field={key}
      aria-invalid={invalid}
      aria-describedby={described}
      value={String(value)}
      onchange={input}
    >
      {#each options.choices as [v, name]}
        <option value={v}>{t(name)}</option>
      {/each}
    </select>
  {:else if options.multiline}
    <textarea
      {id}
      data-builder-field={key}
      aria-label={options.hideLabel ? t(label) : undefined}
      aria-invalid={invalid}
      aria-describedby={described}
      value={String(value)}
      oninput={input}></textarea>
  {:else}
    <input
      {id}
      data-builder-field={key}
      type={options.type || "text"}
      aria-label={options.hideLabel ? t(label) : undefined}
      aria-invalid={invalid}
      aria-describedby={described}
      min={options.min}
      max={options.max}
      step={options.step}
      placeholder={options.placeholder}
      value={String(value)}
      oninput={input}
      use:validity={["startOffset", "endOffset"].includes(key)
        ? editor.errors[key] || ""
        : ""}
    />
  {/if}
  <FieldError {key} errors={{ ...editor.errors }} />
</div>
