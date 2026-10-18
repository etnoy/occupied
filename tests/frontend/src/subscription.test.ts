import test from "node:test";
import assert from "node:assert/strict";
import { PanelSubscription } from "@occupied/lib/services/subscription.js";
import type { HomeAssistant } from "@occupied/lib/types.js";

void test("disposing pending subscriptions rejects old snapshots and releases late handles", async () => {
  const callbacks: ((value: unknown) => void)[] = [];
  const completions: ((unsubscribe: () => Promise<void>) => void)[] = [];
  const errors: unknown[] = [];
  const values: unknown[] = [];
  const connection: HomeAssistant["connection"] = {
    subscribeMessage: <T>(callback: (value: T) => void) => {
      callbacks.push((value) => callback(value as T));

      return new Promise<() => Promise<void>>((resolve) => {
        completions.push(resolve);
      });
    },
  };
  const subscription = new PanelSubscription<unknown>(
    () => true,
    (error) => {
      errors.push(error);
    },
  );
  const receive = (value: unknown) => {
    values.push(value);
  };
  const first = subscription.subscribe(connection, {}, receive);
  await subscription.subscribe(connection, {}, receive);
  assert.equal(
    callbacks.length,
    1,
    "pending subscriptions cannot be duplicated",
  );
  subscription.dispose();
  const second = subscription.subscribe(connection, {}, receive);
  let oldDisposals = 0;
  callbacks[0]("old");
  callbacks[1]("current");
  completions[0](() => {
    oldDisposals++;

    return Promise.resolve();
  });
  await first;
  assert.equal(oldDisposals, 1);
  assert.equal(
    subscription.active,
    true,
    "late completion cannot clear a new request",
  );
  let currentDisposals = 0;
  completions[1](() => {
    currentDisposals++;

    return Promise.resolve();
  });
  await second;
  subscription.dispose();
  callbacks[1]("disposed");
  assert.deepEqual(values, ["current"]);
  assert.equal(currentDisposals, 1);
  assert.deepEqual(errors, []);
});

void test("a subscription failure can be retried and detached callbacks stay inactive", async () => {
  let connected = true;
  let attempts = 0;
  let callback: ((value: string) => void) | undefined;
  const errors: unknown[] = [];
  const values: string[] = [];
  const failure = new Error("offline");
  const connection: HomeAssistant["connection"] = {
    subscribeMessage: <T>(onValue: (value: T) => void) => {
      attempts++;
      if (attempts === 1) {
        return Promise.reject(failure);
      }
      callback = (value) => onValue(value as T);

      return Promise.resolve(() => Promise.resolve());
    },
  };
  const subscription = new PanelSubscription<string>(
    () => connected,
    (error) => {
      errors.push(error);
    },
  );
  const receive = (value: string) => {
    values.push(value);
  };
  await subscription.subscribe(connection, {}, receive);
  assert.equal(subscription.active, false);
  assert.deepEqual(errors, [failure]);
  await subscription.subscribe(connection, {}, receive);
  callback!("connected");
  connected = false;
  callback!("detached");
  assert.deepEqual(values, ["connected"]);
  subscription.dispose();
});

for (const when of ["active", "pending"]) {
  void test(`rejected ${when} unsubscribe is contained after disposal`, async () => {
    const errors: unknown[] = [];
    const unhandled: unknown[] = [];
    const onRejection = (error: unknown) => {
      unhandled.push(error);
    };
    process.on("unhandledRejection", onRejection);
    let resolve!: (unsubscribe: () => Promise<void>) => void;
    let releases = 0;
    const connection: HomeAssistant["connection"] = {
      subscribeMessage: () =>
        new Promise<() => Promise<void>>((done) => {
          resolve = done;
        }),
    };
    const subscription = new PanelSubscription<unknown>(
      () => true,
      (error) => {
        errors.push(error);
      },
    );
    try {
      const pending = subscription.subscribe(connection, {}, () => {});
      if (when === "pending") {
        subscription.dispose();
      }
      resolve(() => {
        releases++;

        return Promise.reject(new Error("socket already closed"));
      });
      await pending;
      if (when === "active") {
        subscription.dispose();
      }
      await new Promise<void>((done) => setImmediate(done));
      assert.equal(releases, 1);
      assert.equal(subscription.active, false);
      assert.deepEqual(errors, []);
      assert.deepEqual(unhandled, []);
    } finally {
      process.off("unhandledRejection", onRejection);
    }
  });
}
