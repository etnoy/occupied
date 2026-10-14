<script lang="ts">
  import type { Translate } from "./types.js";

  let {
    key,
    t,
    errors,
    fieldPrefix = "",
  }: {
    key: string;
    t: Translate;
    errors: Record<string, string>;
    fieldPrefix?: string;
  } = $props();
</script>

{#if errors[key]}
  <p
    class="error"
    id={`step-error-${fieldPrefix}${key}`}
    data-builder-error={`${fieldPrefix}${key}`}
    role="alert"
  >
    {t(errors[key])}
  </p>
{/if}
