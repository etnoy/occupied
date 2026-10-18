import test from "node:test";
import assert from "node:assert/strict";
import {
  en,
  sv,
  translator,
  type TranslationKey,
} from "@occupied/lib/i18n/translations.js";
import {
  actionErrors,
  stepEditor,
  timeSourceChoices,
} from "@occupied/lib/models/step-model.js";
import { randomEditor } from "@occupied/lib/models/random-model.js";
import { randomExplanation } from "@occupied/lib/utils/random-explanation.js";

const placeholders = (text: string) =>
  [...text.matchAll(/\{\w+\}/g)].map(([placeholder]) => placeholder).sort();

void test("shorthand keys resolve to English by default and for unsupported languages", () => {
  for (const language of [undefined, "en", "en-US", "de"]) {
    assert.equal(
      translator(language)("cover_schedule_hint"),
      "Covers run only at scheduled times. Enabling late skips past cover actions.",
    );
  }
});

void test("Swedish language variants use translations with English fallback", () => {
  for (const language of ["sv", "sv-SE"]) {
    const t = translator(language);
    assert.equal(t("cover_position_error"), "Välj ett heltal från 0 till 100.");
    assert.equal(t("service_data"), "Service data (JSON)");
  }
});

void test("external messages and unknown names pass through unchanged", () => {
  for (const language of ["en", "sv"]) {
    const t = translator(language);
    for (const text of [
      "Backend validation failed.",
      "Living room",
      "toString",
      "constructor",
      "__proto__",
      "",
    ]) {
      assert.equal(t(text), text);
    }
  }
});

void test("translation dictionaries use shorthand keys and preserve interpolation tokens", () => {
  for (const key of Object.keys(en) as TranslationKey[]) {
    assert.match(key, /^[a-z][a-z0-9_]*$/);
    const localized = sv[key];
    if (localized !== undefined) {
      assert.deepEqual(placeholders(localized), placeholders(en[key]), key);
    }
  }
});

void test("catalog source labels are localized while authored names remain unchanged", () => {
  const choices = timeSourceChoices(
    {
      steps: {
        first: {
          name: "action",
          timing: { absolute_time: { start: "18:00" } },
        },
      },
    },
    undefined,
    {
      time_sources: [
        { value: "sun:dawn", name: "Dawn", group: "Solar events" },
        {
          value: "entity:calendar.work:start_time",
          name: "action",
          group: "Calendars",
        },
        {
          value: "entity:sensor.alarm",
          name: "Alarm",
          group: "Home Assistant times",
        },
      ],
    },
    translator("sv"),
  );
  assert.equal(choices[0].name, "action");
  assert.equal(choices[0].group, "Steg");
  assert.equal(choices[1].name, "Gryning");
  assert.equal(choices[1].group, "Solhändelser");
  assert.equal(choices[2].name, "action");
  assert.equal(choices[2].group, "Kalendrar");
  assert.equal(choices[3].group, "Home Assistant-tider");
});

void test("validation errors resolve from keys to readable localized messages", () => {
  const { form } = stepEditor({});
  Object.assign(form, {
    kind: "cover",
    service: "cover.set_cover_position",
    entities: ["cover.blind"],
    position: "101",
  });
  const error = actionErrors(form).position;
  assert.equal(error, "cover_position_error");
  assert.equal(translator()(error), "Choose a whole number from 0 to 100.");
  assert.equal(translator("sv")(error), "Välj ett heltal från 0 till 100.");
});

void test("cover summaries interpolate valid positions and omit invalid position actions", () => {
  const { form } = randomEditor({});
  Object.assign(form.on, {
    kind: "cover",
    service: "cover.set_cover_position",
    entities: ["cover.blind"],
    position: "50",
  });
  const catalog = { entities: [{ entity_id: "cover.blind", name: "Bedroom" }] };
  assert.match(
    randomExplanation(form, {}, catalog),
    /set the position of Bedroom to 50%/,
  );
  assert.match(
    randomExplanation(form, {}, catalog, translator("sv")),
    /ställ in positionen för Bedroom till 50%/,
  );
  for (const position of ["", "101", "1.5"]) {
    form.on.position = position;
    assert.doesNotMatch(
      randomExplanation(form, {}, catalog),
      /When each event starts/,
    );
  }
});

void test("runtime outcomes have readable English labels", () => {
  for (const language of [undefined, "en", "de"]) {
    const t = translator(language);
    for (const [key, label] of Object.entries({
      entity_disabled: "Entity disabled",
      service_missing: "Service not registered",
      dispatched: "Dispatched",
      failed: "Failed",
      pending: "Pending",
      uncertain: "Uncertain",
      cancelled: "Cancelled",
    })) {
      assert.equal(t(key), label);
    }
  }
});
