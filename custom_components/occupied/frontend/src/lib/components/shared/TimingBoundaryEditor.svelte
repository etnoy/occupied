<script lang="ts">
  import type { OccupiedPanel } from "../../../occupied-panel.js";
  import type { EditorContext, TimingEditorContext } from "../../types.js";
  import { solarEvents } from "../../models/step-model.js";
  import EditorField from "./EditorField.svelte";

  let {
    panel,
    context,
    modifier,
  }: {
    panel: OccupiedPanel;
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

<EditorField
  {panel}
  context={fields}
  key="mode"
  label="boundary_source"
  value={boundary.mode}
  update={(value) => {
    boundary.mode = value;
    boundary.anchor ||= "sun:sunrise";
  }}
  options={{
    choices: [
      ["absolute", "absolute_time"],
      ["relative", "solar_events"],
    ],
  }}
/>
{#if boundary.mode === "absolute"}
  <EditorField
    {panel}
    context={fields}
    key="start"
    label="boundary_clock"
    value={boundary.start}
    update={(value) => (boundary.start = value)}
    options={{ type: "time", step: 1 }}
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
    options={{ placeholder: "-30m or 90m" }}
  />
{/if}
