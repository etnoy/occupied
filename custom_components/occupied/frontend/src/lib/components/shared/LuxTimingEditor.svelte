<script lang="ts">
  import type { LoadedOccupiedPanel } from "../../../occupied-panel.js";
  import type { TimingEditorContext } from "../../types.js";
  import EditorField from "./EditorField.svelte";
  import TimingBoundaryEditor from "./TimingBoundaryEditor.svelte";

  let {
    panel,
    context,
  }: { panel: LoadedOccupiedPanel; context: TimingEditorContext } = $props();

  let time = $derived(context.time);
  let spec = $derived(time.lux!);
  let direction = $derived(spec.above === undefined ? "below" : "above");
  let sensors = $derived.by(() => {
    void context;
    const available: [string, string][] = panel.catalog.entities
      .filter(
        (entity) =>
          entity.entity_id.startsWith("sensor.") &&
          entity.device_class === "illuminance" &&
          entity.unit_of_measurement === "lx",
      )
      .map((entity) => [
        entity.entity_id,
        `${entity.name} · ${entity.state} lx`,
      ]);
    if (spec.entity_id && available.every(([id]) => id !== spec.entity_id)) {
      available.push([spec.entity_id, spec.entity_id]);
    }

    return [["", context.t("lux_choose_sensor")], ...available] as [
      string,
      string,
    ][];
  });
</script>

<p class="hint">{context.t("lux_hint")}</p>
<EditorField
  {panel}
  {context}
  key="luxEntity"
  label="lux_sensor"
  value={spec.entity_id}
  update={(value) => (spec.entity_id = value)}
  options={{ choices: sensors }}
/>
<EditorField
  {panel}
  {context}
  key="luxDirection"
  label="lux_direction"
  value={direction}
  update={(value) => {
    const threshold = spec.above ?? spec.below ?? 400;
    delete spec.above;
    delete spec.below;
    if (value === "above") {
      spec.above = threshold;
    } else {
      spec.below = threshold;
    }
  }}
  options={{
    choices: [
      ["above", "lux_above"],
      ["below", "lux_below"],
    ],
  }}
/>
<EditorField
  {panel}
  {context}
  key="luxThreshold"
  label="lux_threshold"
  value={spec.above ?? spec.below ?? ""}
  update={(value) => {
    const threshold = value.trim() ? Number(value) : NaN;
    if (direction === "above") {
      spec.above = threshold;
    } else {
      spec.below = threshold;
    }
  }}
  options={{ type: "number", min: 0, step: 0.1 }}
/>
<EditorField
  {panel}
  {context}
  key="luxFor"
  label="lux_stability"
  value={spec.for || "3m"}
  update={(value) => (spec.for = value)}
/>
<EditorField
  {panel}
  {context}
  key="luxDelayMin"
  label="lux_delay_min"
  value={spec.delay?.min || "0s"}
  update={(value) => (spec.delay = { ...spec.delay, min: value })}
/>
<EditorField
  {panel}
  {context}
  key="luxDelayMax"
  label="lux_delay_max"
  value={spec.delay?.max || spec.delay?.min || "0s"}
  update={(value) =>
    (spec.delay = { min: spec.delay?.min || "0s", max: value })}
/>
{#each [["luxStart", "lux_window_start"], ["luxEnd", "lux_window_end"]] as [modifier, label] (modifier)}
  {@const key = modifier as "luxStart" | "luxEnd"}
  <div class="timing-options">
    <EditorField
      {panel}
      {context}
      key={`${key}.mode`}
      {label}
      value={time[key]!.mode}
      update={(value) => {
        time[key]!.mode = value;
      }}
      options={{
        choices: [
          ["absolute", "absolute_time"],
          ["relative", "solar_events"],
        ],
      }}
    />
    <TimingBoundaryEditor {panel} {context} modifier={key} />
  </div>
{/each}
<EditorField
  {panel}
  {context}
  key="luxEndDay"
  label="lux_end_day"
  value={String(spec.window.end_day_offset || 0)}
  update={(value) => (spec.window.end_day_offset = value === "1" ? 1 : 0)}
  options={{
    choices: [
      ["0", "lux_same_day"],
      ["1", "lux_next_day"],
    ],
  }}
/>
<EditorField
  {panel}
  {context}
  key="luxFallback"
  label="lux_fallback"
  value={spec.fallback || "run"}
  update={(value) => (spec.fallback = value === "skip" ? "skip" : "run")}
  options={{
    choices: [
      ["run", "lux_run_anyway"],
      ["skip", "lux_skip"],
    ],
  }}
/>
<p class="hint">{context.t("lux_fallback_hint")}</p>
