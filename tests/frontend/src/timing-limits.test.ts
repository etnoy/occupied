import test from "node:test";
import assert from "node:assert/strict";
import type { Program } from "@occupied/lib/types.js";
import { translator } from "@occupied/lib/i18n/translations.js";
import {
  buildStep,
  editorErrors,
  formTiming,
  stepEditor,
  stepEntries,
} from "@occupied/lib/models/step-model.js";
import { timingExplanation, timingForm } from "@occupied/lib/utils/util.js";

const program = (): Program => ({
  schema_version: 1,
  name: "Lighting",
  steps: {
    bedroom: {
      timing: {
        relative_to: { sun: "sunset", start_offset: "-90m" },
        latest_at: { absolute_time: { start: "18:00" } },
        only_before: { relative_to: { sun: "sunrise", start_offset: "90m" } },
      },
      action: "turn_on",
      entities: ["light.a"],
    },
  },
});

void test("clock and solar modifiers survive unrelated editor changes and reopening", () => {
  const p = program();
  const editor = stepEditor(p, stepEntries(p)[0]);
  assert.deepEqual(editorErrors(p, editor), {});
  editor.form.name = "Renamed bedroom";
  editor.form.days = ["mon"];
  const changed = buildStep(p, editor);
  assert.deepEqual(changed.steps!.bedroom.timing, p.steps!.bedroom.timing);
  assert.deepEqual(
    formTiming(stepEditor(changed, stepEntries(changed)[0]).form.timing),
    p.steps!.bedroom.timing,
  );
  editor.form.timing.mode = "absolute";
  editor.form.timing.start = "05:30";
  assert.deepEqual(buildStep(p, editor).steps!.bedroom.timing, {
    absolute_time: { start: "05:30" },
    latest_at: p.steps!.bedroom.timing.latest_at,
    only_before: p.steps!.bedroom.timing.only_before,
  });
});

void test("modifier validation reports nested fields and permits fixed solar sources only", () => {
  const p = program(),
    editor = stepEditor(p, stepEntries(p)[0]);
  editor.form.timing.latestAt!.start = "25:00";
  editor.form.timing.onlyBefore!.startOffset = "invalid";
  assert.deepEqual(Object.keys(editorErrors(p, editor)).sort(), [
    "latestAt.start",
    "onlyBefore.startOffset",
  ]);
  editor.form.timing.onlyBefore!.anchor = "step:bedroom";
  assert.equal(
    editorErrors(p, editor)["onlyBefore.anchor"],
    "time_source_required_error",
  );
  delete editor.form.timing.latestAt;
  delete editor.form.timing.onlyBefore;
  assert.deepEqual(editorErrors(p, editor), {});
  assert.equal(buildStep(p, editor).steps!.bedroom.timing.latest_at, undefined);
});

void test("timing summaries describe cap, strict gate, source and sampling order", () => {
  const time = timingForm(program().steps!.bedroom.timing);
  const text = timingExplanation(time, [], translator("en"));
  assert.match(text, /Runs 1 hour 30 minutes before sunset/);
  assert.match(text, /No later than 18:00/);
  assert.match(
    text,
    /Only runs strictly before 1 hour 30 minutes after sunrise; equality skips/,
  );
  assert.match(text, /Sample once, then apply the limit and condition/);
  assert.match(text, /without resampling/);
  assert.doesNotMatch(text, /Add an end offset/);
  const swedish = timingExplanation(time, [], translator("sv"));
  assert.match(swedish, /Senast 18:00/);
  assert.match(swedish, /Kör endast strikt före/);
  time.onlyBefore!.startOffset = "0s";
  assert.match(timingExplanation(time), /Only runs strictly before sunrise;/);
});
