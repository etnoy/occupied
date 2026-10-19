import test from "node:test";
import assert from "node:assert/strict";
import {
  serviceOptions,
  serviceExample,
} from "@occupied/lib/utils/services.js";
import type { Catalog } from "@occupied/lib/types.js";

const catalog = {
  entities: [],
  services: {
    remote: {
      turn_on: {
        name: "Turn on",
        target: { entity: [{ domain: "remote" }] },
        fields: {
          activity: {
            required: true,
            example: "TV",
            description: "Activity to start",
          },
        },
      },
      send_command: { target: { entity: [{ domain: ["remote"] }] } },
    },
    light: { turn_on: { target: { entity: [{ domain: "light" }] } } },
    script: { both: { target: { entity: [{ domain: ["light", "remote"] }] } } },
  },
} as Catalog;

void test("service suggestions match every target domain and retain custom values", () => {
  assert.deepEqual(
    serviceOptions(catalog, ["remote.tv"]).map((option) => option.value),
    [
      "homeassistant.toggle",
      "homeassistant.turn_off",
      "homeassistant.turn_on",
      "remote.send_command",
      "remote.turn_on",
      "script.both",
    ],
  );
  assert.deepEqual(
    serviceOptions(catalog, ["remote.tv", "light.a"], "unknown.custom").map(
      (option) => option.value,
    ),
    [
      "homeassistant.toggle",
      "homeassistant.turn_off",
      "homeassistant.turn_on",
      "script.both",
      "unknown.custom",
    ],
  );
});

void test("service examples fill required fields with examples only", () => {
  assert.deepEqual(serviceExample(catalog.services.remote.turn_on), {
    activity: "TV",
  });
  assert.deepEqual(
    serviceExample({
      fields: {
        optional: { example: "x" },
        missing: { required: true },
        zero: { required: true, example: 0 },
        disabled: { required: true, example: false },
      },
    }),
    { zero: 0, disabled: false },
  );
});
