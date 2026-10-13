<script lang="ts">
  let {
    key,
    errors,
    fieldPrefix = "",
  }: {
    key: string;
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
    {errors[key]}
  </p>
{/if}
