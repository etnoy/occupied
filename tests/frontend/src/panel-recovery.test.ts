import test from "node:test";
import assert from "node:assert/strict";
import {
  entityAvailability,
  PanelRecovery,
} from "@occupied/lib/services/panel-recovery.js";
import type { HomeAssistant, Program } from "@occupied/lib/types.js";

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

void test("availability tracks mapped, nested, disabled, and random targets but ignores normal state changes", () => {
  const program: Program = {
    steps: {
      mapped: { enabled: false, timing: {}, entities: { "light.a": {} } },
      nested: { timing: {}, actions: [{ entities: ["light.b"] }] },
    },
    random: {
      event: {
        start: {},
        end: {},
        on: { entities: ["switch.a"] },
        off: { entities: ["switch.b"] },
      },
    },
  };
  const states: HomeAssistant["states"] = {
    "light.a": { state: "off", attributes: {} },
    "light.b": { state: "unknown", attributes: {} },
    "switch.a": { state: "unavailable", attributes: {} },
  };
  const signature = entityAvailability(states, [program]);
  states["light.a"].state = "on";
  states["light.unrelated"] = { state: "on", attributes: {} };
  assert.equal(entityAvailability(states, [program]), signature);
  for (const entity of ["light.b", "switch.a", "switch.b"]) {
    const before = entityAvailability(states, [program]);
    states[entity] = { state: "off", attributes: {} };
    assert.notEqual(entityAvailability(states, [program]), before);
  }
});

void test("bursts coalesce and changes during a refresh get one trailing refresh", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const replies: ((success: boolean) => void)[] = [];
  const recovery = new PanelRecovery(
    () =>
      new Promise((resolve) => {
        replies.push(resolve);
      }),
    () => {},
  );
  recovery.connect({
    subscribeMessage: () => Promise.resolve(() => Promise.resolve()),
  });
  try {
    recovery.schedule();
    recovery.schedule();
    t.mock.timers.tick(250);
    assert.equal(replies.length, 1);
    recovery.schedule();
    recovery.schedule();
    replies[0](true);
    await settle();
    t.mock.timers.tick(250);
    assert.equal(replies.length, 2);
    replies[1](true);
    await settle();
    t.mock.timers.tick(60_000);
    assert.equal(replies.length, 2);
  } finally {
    recovery.dispose();
  }
});

void test("failures back off to 30 seconds and stop retrying after success", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let attempts = 0;
  let success = false;
  const recovery = new PanelRecovery(
    () => {
      attempts++;

      return success
        ? Promise.resolve(true)
        : Promise.reject(new Error("starting"));
    },
    () => {},
  );
  recovery.connect({
    subscribeMessage: () => Promise.resolve(() => Promise.resolve()),
  });
  try {
    recovery.schedule(0);
    t.mock.timers.tick(0);
    await settle();
    for (const delay of [1000, 2000, 4000, 8000, 16_000, 30_000, 30_000]) {
      const before = attempts;
      t.mock.timers.tick(delay - 1);
      assert.equal(attempts, before);
      t.mock.timers.tick(1);
      await settle();
      assert.equal(attempts, before + 1);
    }
    success = true;
    t.mock.timers.tick(30_000);
    await settle();
    const before = attempts;
    t.mock.timers.tick(120_000);
    assert.equal(attempts, before);
  } finally {
    recovery.dispose();
  }
});

void test("disconnect stops retries, same-object ready recovers, and disposal ignores late work", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const listeners = new Map<string, () => void>();
  let reconnects = 0;
  let attempts = 0;
  let resolve!: (success: boolean) => void;
  const recovery = new PanelRecovery(
    () => {
      attempts++;

      return new Promise((done) => {
        resolve = done;
      });
    },
    () => {
      reconnects++;
    },
  );
  recovery.connect({
    subscribeMessage: () => Promise.resolve(() => Promise.resolve()),
    addEventListener: (event, callback) => {
      listeners.set(event, callback);
    },
    removeEventListener: (event) => {
      listeners.delete(event);
    },
  });
  recovery.schedule();
  listeners.get("disconnected")!();
  recovery.schedule();
  t.mock.timers.tick(60_000);
  assert.equal(attempts, 0);
  listeners.get("ready")!();
  t.mock.timers.tick(0);
  assert.equal(reconnects, 1);
  assert.equal(attempts, 1);
  recovery.dispose();
  resolve(false);
  await settle();
  t.mock.timers.tick(60_000);
  assert.equal(attempts, 1);
  assert.equal(listeners.size, 0);
});
