import test from "node:test";
import assert from "node:assert/strict";
import type { Program } from "@occupied/lib/types.js";
import {
  buildRandom,
  randomEditor,
} from "@occupied/lib/models/random-model.js";
import { randomExplanation } from "@occupied/lib/utils/random-explanation.js";
import { translator } from "@occupied/lib/i18n/translations.js";

const program: Program = {
  schema_version: 1,
  name: "House",
  steps: {
    evening: {
      name: "Evening",
      timing: { absolute_time: { start: "18:00" } },
      action: "turn_on",
      entities: ["light.living"],
    },
  },
};
const catalog = {
  entities: [
    { entity_id: "light.living", name: "Living room lamp" },
    { entity_id: "light.hall", name: "Hallway lamp" },
    { entity_id: "scene.bedtime", name: "Bedtime" },
  ],
};

void test("random explanation describes weekdays, fixed counts, durations, and shared entities", () => {
  const { form } = randomEditor(program);
  form.days = ["mon", "tue", "wed", "thu", "fri"];
  form.on.entities = ["light.living"];
  form.off.entities = ["light.hall"];
  assert.equal(
    randomExplanation(form, program, catalog),
    "Window starts on weekdays at 18:00. Window ends at 23:00. " +
      "3 events start at random times during each active period. " +
      "Each event lasts between 5 minutes and 15 minutes. " +
      "When each event starts, turn on Living room lamp. " +
      "When each event ends, turn off Living room lamp. " +
      "Events may overlap, but all finish before the window closes.",
  );
  form.sameEntities = false;
  assert.match(
    randomExplanation(form, program, catalog),
    /turn off Hallway lamp/,
  );
});

void test("overnight ranges explain both actions and the effective maximum duration", () => {
  const { form } = randomEditor(program);
  form.enabled = false;
  form.start.start = "23:00";
  form.end.start = "01:00";
  form.minCount = "2";
  form.maxCount = "6";
  form.minDuration = "10m";
  form.maxDuration = "3h";
  form.sameEntities = false;
  form.on.kind = "scene";
  form.on.entities = ["scene.bedtime"];
  form.off.kind = "service";
  form.off.service = "light.turn_off";
  form.off.entities = ["light.hall"];
  const text = randomExplanation(form, program, catalog);
  assert.match(text, /^This random event is disabled\./);
  assert.match(text, /Window ends at 01:00 the next day/);
  assert.match(text, /Between 2 and 6 events start at random times/);
  assert.match(text, /Each event lasts between 10 minutes and 2 hours/);
  assert.match(text, /When each event starts, activate Bedtime/);
  assert.match(
    text,
    /When each event ends, run light\.turn_off for Hallway lamp/,
  );
});

void test("randomized and relative boundaries use named time sources and offsets", () => {
  const { form } = randomEditor(program);
  form.start.mode = "relative";
  form.start.anchor = "step:evening";
  form.start.startOffset = "-10m";
  form.start.endOffset = "30m";
  form.end.mode = "relative";
  form.end.anchor = "sun:sunset";
  form.end.startOffset = "2h";
  const text = randomExplanation(form, program, catalog);
  assert.match(
    text,
    /Window starts at a random time between 10 minutes before and 30 minutes after Evening/,
  );
  assert.match(text, /Window ends 2 hours after sunset/);
});

void test("single events and fixed durations use singular descriptions", () => {
  const { form } = randomEditor(program);
  form.minCount = form.maxCount = "1";
  form.minDuration = form.maxDuration = "1m30s";
  const text = randomExplanation(form, program, catalog);
  assert.match(text, /One event starts at a random time/);
  assert.match(text, /Each event lasts 1 minute 30 seconds/);
  assert.match(text, /The event finishes before the window closes/);
  assert.doesNotMatch(text, /overlap|When each event/);
});

void test("zero minimum counts explain skipped windows and their dependents", () => {
  const { form } = randomEditor(program);
  form.minCount = "0";
  form.maxCount = "1";
  const text = randomExplanation(form, program, catalog);
  assert.match(text, /Between 0 and 1 events/);
  assert.match(
    text,
    /A window may have no events; dependent random events skip that window/,
  );
  assert.match(text, /The event finishes before the window closes/);
  assert.doesNotMatch(text, /Choose valid event counts/);
  const swedish = randomExplanation(form, program, catalog, translator("sv"));
  assert.match(swedish, /Mellan 0 och 1 händelser/);
  assert.match(
    swedish,
    /beroende slumpmässiga händelser hoppar över det tidsfönstret/,
  );
});

void test("fixed zero counts describe no activity without duration or action promises", () => {
  const { form } = randomEditor(program);
  form.minCount = form.maxCount = "0";
  form.on.entities = ["light.living"];
  form.minDuration = form.maxDuration = "6h";
  const text = randomExplanation(form, program, catalog);
  assert.match(text, /No events run because the event count is zero/);
  assert.match(text, /Dependent random events also skip this window/);
  assert.doesNotMatch(
    text,
    /Each event lasts|When each event|overlap|minimum duration|Choose valid/,
  );
  const swedish = randomExplanation(form, program, catalog, translator("sv"));
  assert.match(swedish, /antalet händelser är noll/);
  assert.match(swedish, /Beroende slumpmässiga händelser hoppar också över/);
  form.minCount = " ";
  form.minDuration = form.maxDuration = "5m";
  assert.match(
    randomExplanation(form, program, catalog),
    /Choose valid event counts/,
  );
});

void test("unfinished and invalid fields produce helpful prompts without invented values", () => {
  const { form } = randomEditor(program);
  form.minCount = "";
  form.maxCount = "1.5";
  form.minDuration = "bad";
  const text = randomExplanation(form, program, catalog);
  assert.match(text, /Choose valid event counts/);
  assert.match(text, /Choose valid durations/);
  assert.doesNotMatch(text, /NaN|Between 0 and|Each event lasts/);
  form.minDuration = form.maxDuration = "6h";
  assert.match(
    randomExplanation(form, program, catalog),
    /No events can run because the minimum duration is longer than the window/,
  );
});

void test("the complete explanation uses the selected language", () => {
  const { form } = randomEditor(program);
  form.minCount = "2";
  form.maxCount = "6";
  form.on.entities = ["light.living"];
  const text = randomExplanation(form, program, catalog, translator("sv"));
  assert.match(text, /Tidsfönstret börjar kl\. 18:00/);
  assert.match(text, /Mellan 2 och 6 händelser/);
  assert.match(text, /mellan 5 minuter och 15 minuter/);
  assert.match(text, /När varje händelse slutar, slå av Living room lamp/);
  assert.doesNotMatch(
    text,
    /\{min\}|\{max\}|\{action\}|Each event|Window starts/,
  );
});

void test("the explanation describes duration windows and starts after another window closes", () => {
  const parent = randomEditor(program);
  parent.form.name = "Evening activity";
  parent.form.on.entities = ["light.living"];
  const next = buildRandom(program, parent);
  const { form } = randomEditor(next);
  Object.assign(form.start, {
    mode: "relative",
    anchor: `random:${parent.id}`,
    startOffset: "10m",
  });
  Object.assign(form.end, {
    mode: "duration",
    minDuration: "1h",
    maxDuration: "2h",
  });
  const text = randomExplanation(form, next, catalog);
  assert.match(
    text,
    /Window starts 10 minutes after the end of Evening activity/,
  );
  assert.match(
    text,
    /Window closes between 1 hour and 2 hours after it starts/,
  );
  assert.doesNotMatch(text, /\.\./);
  form.minDuration = "3h";
  form.maxDuration = "4h";
  const infeasible = randomExplanation(form, next, catalog);
  assert.match(
    infeasible,
    /No events can run because the minimum duration is longer than the window/,
  );
  assert.match(
    infeasible,
    /Duration limits take priority over the event count/,
  );
  assert.doesNotMatch(infeasible, /3 events start at random times/);
});
