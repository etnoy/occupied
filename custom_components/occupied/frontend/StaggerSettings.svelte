<script lang="ts">
  import type { Stagger, Translate } from "./types.js";
  import { staggerPeriodError } from "./stagger.js";
  let {
    settings = $bindable(),
    t,
    id,
    disabled = false,
  }: {
    settings: Stagger;
    t: Translate;
    id: string;
    disabled?: boolean;
  } = $props();
  let error = $derived(staggerPeriodError(settings));
</script>

<fieldset class="stagger-settings" {disabled}>
  <label class="stagger-option">
    <input
      type="checkbox"
      checked={settings.enabled === true}
      aria-describedby={`${id}-description`}
      onchange={(event) => (settings.enabled = event.currentTarget.checked)}
    />
    <span>{t("Staggered action")}</span>
  </label>
  <p id={`${id}-description`} class="hint">
    {t(
      "Factorio style: act on one entity at each evenly spaced tick, in a random order.",
    )}
  </p>
  <label for={`${id}-period`}>{t("Time window")}</label>
  <input
    id={`${id}-period`}
    type="text"
    placeholder="2m"
    value={settings.period ?? "2m"}
    disabled={disabled || !settings.enabled}
    aria-invalid={!!error}
    aria-describedby={`${id}-period-help${error ? ` ${id}-error` : ""}`}
    oninput={(event) => (settings.period = event.currentTarget.value)}
  />
  <p id={`${id}-period-help`} class="hint">
    {t("Default: 2m. Use a duration from 1s to 30m.")}
  </p>
  {#if error}<p id={`${id}-error`} class="error" role="alert">
      {t(error)}
    </p>{/if}
</fieldset>

<style>
  .stagger-settings {
    border: 0;
    padding: 0;
    margin-top: 24px;
  }
  .stagger-option {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    min-height: 42px;
  }
  .stagger-option input {
    flex: 0 0 auto;
    accent-color: var(--primary-color, #167b94);
  }
</style>
