<script lang="ts">
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { EditorContext, TimingEditorContext } from "../../types.js";
  import { solarEvents } from "../../models/step-model.js";
  import EditorField from "./EditorField.svelte";

  let {
    panel,
    context,
    modifier,
  }: {
    panel: LoadedOccupiedPanel;
    context: TimingEditorContext;
    modifier: "latestAt" | "onlyBefore";
  } = $props();

  // The panel mutates forms in place; a fresh facade propagates each context update.
  let boundary = $derived(new Proxy(context.time[modifier]!, {}));

  let fields: EditorContext = $derived({
    editor: {
      ...context.editor,
      errors: Object.fromEntries(
        Object.entries(context.editor.errors)
          .filter(([key]) => key.startsWith(`${modifier}.`))
          .map(([key, value]) => [key.slice(modifier.length + 1), value]),
      ),
    },
    t: context.t,
    fieldPrefix: `${modifier}.`,
    changed: (key) => context.changed(`${modifier}.${key}`),
  });
</script>

{#if boundary.mode === "absolute"}
  <EditorField
    {panel}
    context={fields}
    key="start"
    label="boundary_clock"
    value={boundary.start}
    update={(value) => (boundary.start = value)}
    options={{ type: "time", step: 1, hideLabel: true }}
  />
{:else}
  <EditorField
    {panel}
    context={fields}
    key="anchor"
    label="solar_events"
    value={boundary.anchor}
    update={(value) => (boundary.anchor = value)}
    options={{ choices: solarEvents.map((event) => [`sun:${event}`, event]) }}
  />
  <EditorField
    {panel}
    context={fields}
    key="startOffset"
    label="start_offset"
    value={boundary.startOffset}
    update={(value) => (boundary.startOffset = value)}
    options={{ placeholder: context.t("signed_offset_example") }}
  />
{/if}
