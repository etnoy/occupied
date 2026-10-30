# Lighting based on outdoor lux

Choose **Light level** in a Step's timing editor to react to outdoor brightness.
Use separate Steps for morning OFF and evening ON. On a sunny morning, an
above-threshold Step can run earlier; on a cloudy morning it can run later.
Each Step runs at most once per selected source date.

## Choose a sensor

Select a Home Assistant sensor with device class `illuminance` and unit `lx`.
The panel lists matching sensors with their current reading. A configured sensor
that disappears stays selected so you can repair it.

A physical outdoor sensor measures local light. Place it where controlled lamps
cannot affect its reading. For hardware-free estimates, an upstream integration
such as [Illuminance](https://github.com/pnbruckner/ha-illuminance) can combine sun
elevation and weather/cloud coverage. Install and configure it separately, and
check its compatibility with your Home Assistant version. Occupied does not
install it or fetch weather itself. Weather estimates can lag local conditions.

Watch your sensor's readings around the desired switching time, then choose
thresholds. Lux values depend on sensor placement, shade and the estimation model;
the example below is illustrative. Separate ON and OFF thresholds leave a gap
between the levels used for each direction.

## Qualification, delay and deadline

The reading must remain strictly above or below the chosen threshold for the
stability period (default three minutes). Equality, unavailable readings, and
invalid readings reset qualification. An unavailable sensor never counts as zero
lux. The optional random delay starts after qualification; the condition must
remain true during that delay. If it breaks, qualification starts over, using the
same random delay for that occurrence.

The observation window starts and ends at clock times or solar events plus
offsets. A reading already beyond the threshold at opening starts qualification
then. The end date is explicitly **Same day** or **Next day**. Windows must have
positive length, last at most 24 hours, and not overlap the next occurrence.
Unavailable solar events, including polar dates, are reported instead of replaced
with invented times.

At the deadline, **Run anyway** runs even when a functioning sensor never crossed
the threshold. **Skip** leaves devices unchanged. Stability and random delay
cannot extend the action past the deadline. Staggered actions that already
started continue under the normal Step lifecycle.

```yaml
schema_version: 1
name: Everyday lighting
steps:
  morning_off:
    timing:
      lux:
        entity_id: sensor.outdoor_illuminance
        above: 400
        for: 3m
        delay:
          min: 0s
          max: 5m
        window:
          start:
            relative_to:
              sun: sunrise
              start_offset: -60m
          end:
            relative_to:
              sun: sunrise
              start_offset: 90m
        fallback: run
    action: turn_off
    entities:
      - light.window_lights
```

An evening Step can use `below: 200` with a sunset-centered window. Stability is
limited to one hour, delay to 30 minutes. Negative delays are not supported.
Existing **No later than** and **Only run before** modifiers are replaced by the
explicit window in this timing mode.

## Recovery, dependencies and preview

Enable, pause and run conditions still control permission. Resuming during a
window starts fresh qualification; time spent disabled or offline does not count.
Restart preserves completed resolutions and never replays completed calls.
An observation window missed while inactive does not cause a catch-up command.

Steps relative to a light-level Step wait for its actual resolved time. They
require nonnegative offsets and cannot use timing caps. If the parent skips,
its dependents skip. Random-event windows cannot depend on light-level Steps in
this version. Other clock, solar and random schedules retain their behavior.

Preview shows unresolved observation windows rather than predicting weather.
Current readings do not supply future action times. Runtime status explains
sensor availability, stability checks and random delays, and records whether lux,
the deadline or a skip resolved each occurrence. Expected-state enforcement uses
actual resolved actions, not provisional deadlines.

Live preview offers two explicit simulations: threshold reached after opening,
or threshold never reached with the configured deadline policy. Its **Next event**
control runs simulated actions manually on the selected devices, under the usual
preview permissions. It does not wait for weather or consume production lux
occurrences. Ordinary automatic scheduling stays paused until resumed.

This is an additive schema version 1 feature. Existing programs need no migration;
older Occupied versions reject programs containing the new timing mode.
