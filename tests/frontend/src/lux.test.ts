import test from "node:test";
import assert from "node:assert/strict";
import type { Timing, Program } from "@occupied/lib/types.js";
import {
  formTiming,
  timingErrors,
  buildStep,
  stepEditor,
  stepEntries,
} from "@occupied/lib/models/step-model.js";
import { timingForm, timingExplanation } from "@occupied/lib/utils/util.js";
import { translator } from "@occupied/lib/i18n/translations.js";

const timing: Timing = {
  lux: {
    entity_id: "sensor.outdoor",
    above: 400,
    for: "3m",
    delay: { min: "0s", max: "5m" },
    window: {
      start: { relative_to: { sun: "sunrise", start_offset: "-60m" } },
      end: { relative_to: { sun: "sunrise", start_offset: "90m" } },
    },
    fallback: "run",
  },
};

void test("light-level fields survive editor changes, serialization and reopening", () => {
  const program: Program = {
    schema_version: 1,
    name: "Lux",
    steps: { morning: { timing, action: "turn_off", entities: ["light.a"] } },
  };
  const editor = stepEditor(program, stepEntries(program)[0]);
  assert.deepEqual(timingErrors(program, editor.form.timing, "morning"), {});
  editor.form.name = "Morning lights";
  const saved = buildStep(program, editor);
  assert.deepEqual(saved.steps!.morning.timing, timing);
  assert.deepEqual(formTiming(timingForm(saved.steps!.morning.timing)), timing);
  assert.equal(timing.lux?.above, 400);
});

void test("threshold and duration errors attach to the relevant lux fields", () => {
  const form = timingForm(timing);
  form.lux!.entity_id = "light.a";
  form.lux!.above = NaN;
  form.lux!.for = "61m";
  form.lux!.delay = { min: "2m", max: "1m" };
  form.luxEnd!.anchor = "step:other";
  assert.deepEqual(Object.keys(timingErrors({}, form)).sort(), [
    "luxDelayMax",
    "luxEnd.anchor",
    "luxEntity",
    "luxFor",
    "luxThreshold",
  ]);
});

void test("summaries describe qualification, delay and both deadline policies", () => {
  const form = timingForm(timing);
  assert.match(timingExplanation(form), /above 400 lx for 3m/);
  assert.match(timingExplanation(form), /run at the deadline even if/);
  form.lux!.fallback = "skip";
  form.lux!.window.end_day_offset = 1;
  assert.match(timingExplanation(form), /Next day; skip if/);
  assert.match(timingExplanation(form, [], translator("sv")), /över 400 lx/);
});

void test("switching to clock timing does not emit stale lux fields", () => {
  const form = timingForm(timing);
  form.mode = "absolute";
  form.start = "07:00";
  assert.deepEqual(formTiming(form), { absolute_time: { start: "07:00" } });
});
