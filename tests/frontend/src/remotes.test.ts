import test from "node:test";
import assert from "node:assert/strict";
import {
  actionForm,
  actionErrors,
  buildAction,
} from "@occupied/lib/models/step-model.js";
import { changeActionKind } from "@occupied/lib/utils/action-kind.js";
import {
  randomEditor,
  randomEntries,
  buildRandom,
} from "@occupied/lib/models/random-model.js";
import { randomExplanation } from "@occupied/lib/utils/random-explanation.js";
import type { Action, Program } from "@occupied/lib/types.js";

void test("native remote commands round-trip through dedicated controls", () => {
  for (const source of [
    {
      action: "remote.turn_on",
      entities: ["remote.tv"],
      data: { activity: "TV" },
    },
    { action: "remote.turn_on", entities: ["remote.tv"] },
    { action: "remote.turn_off", entities: ["remote.tv"] },
  ]) {
    const form = actionForm(source);
    assert.equal(form.kind, "remote");
    assert.deepEqual(actionErrors(form), {});
    assert.deepEqual(buildAction(form), source);
  }
});

void test("nonstandard remote payloads and mixed targets remain generic services", () => {
  const sources: Action[] = [
    {
      action: "remote.turn_on",
      entities: ["remote.tv"],
      data: { activity: "TV", extra: true },
    },
    {
      action: "remote.turn_on",
      entities: ["remote.tv"],
      data: { activity: 123 },
    },
    {
      action: "remote.turn_off",
      entities: ["remote.tv"],
      data: { activity: "TV" },
    },
    { action: "remote.turn_on", entities: ["remote.tv", "light.a"] },
    { action: "remote.send_command", entities: ["remote.tv"] },
  ];
  for (const source of sources) {
    assert.equal(actionForm(source).kind, "service");
  }
});

void test("remote kind switching uses phase defaults and validates domain and command", () => {
  const form = randomEditor({}).form.off;
  changeActionKind(form, "remote", () => false);
  assert.equal(form.service, "remote.turn_off");
  form.entities = ["light.a"];
  assert.equal(actionErrors(form).entities, "remote_entities_error");
  form.entities = ["remote.tv"];
  form.service = "remote.send_command";
  assert.equal(actionErrors(form).service, "remote_command_error");
});

void test("random remote phases share entities and explain activity and power off", () => {
  const p: Program = {
    random: {
      tv: {
        start: { absolute_time: { start: "18:00" } },
        end: { absolute_time: { start: "23:00" } },
        on: {
          action: "remote.turn_on",
          entities: ["remote.tv"],
          data: { activity: "TV" },
        },
        off: { action: "remote.turn_off", entities: ["remote.tv"] },
      },
    },
  };
  const editor = randomEditor(p, randomEntries(p)[0]);
  assert.equal(editor.form.sameEntities, true);
  assert.deepEqual(buildRandom(p, editor).random!.tv.on, p.random!.tv.on);
  assert.deepEqual(buildRandom(p, editor).random!.tv.off, p.random!.tv.off);
  const explanation = randomExplanation(editor.form, p, { entities: [] });
  assert.match(explanation, /start activity TV on remote.tv/);
  assert.match(explanation, /turn off remote.tv/);
});

void test("activity suggestions contain only activities common to every remote", async () => {
  const { remoteActivities } = await import("@occupied/lib/utils/remote.js");
  const catalog = {
    entities: [
      { entity_id: "remote.a", name: "A", activity_list: ["TV", "Wii", "TV"] },
      { entity_id: "remote.b", name: "B", activity_list: ["tv", "Radio"] },
    ],
  };
  assert.deepEqual(remoteActivities(catalog, ["remote.a", "remote.b"]), ["TV"]);
  assert.deepEqual(
    remoteActivities(catalog, ["remote.a", "remote.missing"]),
    [],
  );
  assert.deepEqual(remoteActivities(catalog, []), []);
});

void test("switching from a service keeps only compatible remote entities", () => {
  const form = actionForm({
    action: "script.turn_on",
    entities: ["remote.tv", "cover.blind", "remote.other", "light.a"],
  });
  changeActionKind(form, "remote", () => false);
  assert.deepEqual(form.entities, ["remote.tv", "remote.other"]);
});
