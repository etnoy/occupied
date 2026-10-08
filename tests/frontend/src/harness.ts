import type { RuntimeSnapshot } from "@occupied/types.js";
import type { FixtureResponses } from "./types.js";
import { assert } from "./types.js";

import "@occupied/occupied-panel.js";
window.calls = [];
window.deviceCalls = [];
window.subscribers = new Set();
window.fixtureWS = async <K extends keyof FixtureResponses>(
  msg: { type: K } & Record<string, unknown>,
): Promise<FixtureResponses[K]> => {
  calls.push(structuredClone(msg));
  const response = await fetch("/fixture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
  const result: unknown = await response.json();
  if (!result || typeof result !== "object")
    throw new Error("Invalid fixture response");
  if ("error" in result) throw result.error;
  return result as FixtureResponses[K];
};
window.mount = () => {
  const panel = document.querySelector("occupied-panel");
  assert(panel, "Missing panel fixture");
  panel.panel = { config: { config_entry_id: "fixture-house" } };
  panel.hass = {
    language: "en",
    callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
      const response = await fixtureWS(
        message as { type: keyof FixtureResponses } & Record<string, unknown>,
      );
      return response as T;
    },
    callService: async (...args) => {
      deviceCalls.push(args);
    },
    connection: {
      subscribeMessage: async <T>(callback: (snapshot: T) => void) => {
        const subscriber = (snapshot: RuntimeSnapshot) =>
          callback(snapshot as T);
        subscribers.add(subscriber);
        return () => {
          subscribers.delete(subscriber);
        };
      },
    },
  };
  return panel;
};
window.emit = (snapshot) =>
  subscribers.forEach((callback) => callback(snapshot));
mount();
const { runWorkflows } = await import("./workflows.js");
window.runWorkflows = runWorkflows;
