<script lang="ts">
  let { title, description }: { title: string; description: string } = $props();
</script>

<div class="activity-intro">
  <h2>{title}</h2>
  <p class="hint">{description}</p>
</div>
