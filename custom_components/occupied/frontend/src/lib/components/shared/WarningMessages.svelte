<script lang="ts">
  import type { Issue, Translate } from "../../types.js";

  let { warnings, t }: { warnings: Issue[]; t: Translate } = $props();

  let unresolved = $derived(
    warnings.filter((warning) => warning.code === "entity_unavailable"),
  );
  let visible = $derived(
    warnings.filter(
      (warning) =>
        warning.code !== "entity_unavailable" ||
        unresolved.indexOf(warning) < 2,
    ),
  );
</script>

{#each visible as warning (warning)}
  <span class="step-warning-message">{warning.message}</span>
{/each}
{#if unresolved.length > 2}
  <span class="step-warning-message"
    >{t("warnings_more").replace("{count}", () =>
      String(unresolved.length - 2),
    )}</span
  >
{/if}
