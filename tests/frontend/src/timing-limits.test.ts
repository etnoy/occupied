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

void test("timing summaries describe limits without sampling hints", () => {
  const time = timingForm(program().steps!.bedroom.timing);
  const text = timingExplanation(time, [], translator("en"));
  assert.match(text, /Runs 1 hour 30 minutes before sunset/);
  assert.match(text, /, but no later than 18:00/);
  assert.match(
    text,
    /, but only if that is 1 hour 30 minutes after sunrise or earlier/,
  );
  assert.equal(
    text,
    "Runs 1 hour 30 minutes before sunset, but no later than 18:00, but only if that is 1 hour 30 minutes after sunrise or earlier.",
  );
  assert.doesNotMatch(text, /Add an end offset/);
  const swedish = timingExplanation(time, [], translator("sv"));
  assert.match(swedish, /, men senast 18:00/);
  assert.match(swedish, /, men bara om det är/);
  time.onlyBefore!.startOffset = "0s";
  assert.match(
    timingExplanation(time),
    /, but only if that is sunrise or earlier/,
  );
});

void test("equal clock boundaries produce only the concise editor explanation", () => {
  for (const end of [undefined, "18:00", "18:00:00"]) {
    for (const modifier of ["latest_at", "only_before"]) {
      assert.equal(
        timingExplanation(
          timingForm({
            absolute_time: { start: "18:00", end },
            [modifier]: { absolute_time: { start: "18:00:00" } },
          }),
          [],
          translator("en"),
          [],
          { locale: { language: "en", time_format: "12" } },
        ),
        "Runs at 6:00 PM.",
      );
    }
  }
});

void test("random windows and different boundaries retain their limits", () => {
  for (const [end, boundary, expected] of [
    ["18:00", "17:00", "Runs at 18:00, but no later than 17:00."],
    ["18:00", "18:00:01", "Runs at 18:00, but no later than 18:00:01."],
    [
      "19:00",
      "18:00",
      "Runs at a random time between 18:00 and 19:00, but no later than 18:00.",
    ],
  ]) {
    assert.equal(
      timingExplanation(
        timingForm({
          absolute_time: { start: "18:00", end },
          latest_at: { absolute_time: { start: boundary } },
        }),
        [],
        translator("en"),
      ),
      expected,
    );
  }
});

void test("step summaries connect the requested clock and solar limits", () => {
  assert.equal(
    timingExplanation(
      timingForm({
        absolute_time: { start: "05:30" },
        only_before: { relative_to: { sun: "sunrise", start_offset: "90m" } },
      }),
      [],
      translator("en"),
      [],
      { includeHints: false },
    ),
    "Runs at 05:30, but only if that is 1 hour 30 minutes after sunrise or earlier",
  );
  assert.equal(
    timingExplanation(
      timingForm({
        relative_to: { sun: "sunset", start_offset: "-90m" },
        latest_at: { absolute_time: { start: "18:00" } },
      }),
      [],
      translator("en"),
      [],
      { includeHints: false },
    ),
    "Runs 1 hour 30 minutes before sunset, but no later than 18:00",
  );
});
