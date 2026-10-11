<script lang="ts">
  let { key, errors }: { key: string; errors: Record<string, string> } =
    $props();
</script>

{#if errors[key]}
  <p
    class="error"
    id={`routine-error-${key}`}
    data-builder-error={key}
    role="alert"
  >
    {errors[key]}
  </p>
{/if}
