import test from "node:test";
import assert from "node:assert/strict";
import { loadHaControls } from "@occupied/lib/services/ha-controls.js";

for (const genericPicker of [true, false]) {
  void test(`loads native controls with generic picker available: ${genericPicker}`, async () => {
    const constructor = class {} as unknown as CustomElementConstructor;
    const defined = new Set([
      "partial-panel-resolver",
      "ha-selector",
      ...(genericPicker ? ["ha-generic-picker"] : []),
      "ha-code-editor",
      "state-history-chart-timeline",
    ]);
    const pending = new Map<
      string,
      (value: CustomElementConstructor) => void
    >();
    const loaded: string[] = [];
    const register = (name: string) => {
      defined.add(name);
      pending.get(name)?.(constructor);
    };
    const registry = {
      get: (name: string) => (defined.has(name) ? constructor : undefined),
      whenDefined: (name: string) =>
        defined.has(name)
          ? Promise.resolve(constructor)
          : new Promise<CustomElementConstructor>((resolve) => {
              pending.set(name, resolve);
            }),
    } as unknown as CustomElementRegistry;
    const route = (name: string, define?: string) => ({
      load: () => {
        loaded.push(name);
        if (define) {
          register(define);
        }
        if (name === "history") {
          register("ha-top-app-bar-fixed");
        }

        return Promise.resolve();
      },
    });
    const documentStub = {
      createElement: (name: string) =>
        name === "partial-panel-resolver"
          ? {
              _getRoutes: () => ({
                routes: {
                  config: route("config", "ha-panel-config"),
                  history: route("history", "state-history-chart-timeline"),
                },
              }),
            }
          : {
              routerOptions: {
                routes: {
                  automation: route("automation"),
                  integrations: route("integrations"),
                },
              },
            },
    } as unknown as Document;
    const originalRegistry = Object.getOwnPropertyDescriptor(
      globalThis,
      "customElements",
    );
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      "document",
    );
    Object.defineProperties(globalThis, {
      customElements: { configurable: true, value: registry },
      document: { configurable: true, value: documentStub },
    });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        loadHaControls(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            reject(new Error("Native controls never finished loading"));
          }, 500);
        }),
      ]);
      assert.ok(defined.has("ha-top-app-bar-fixed"));
      assert.deepEqual(loaded, [
        "config",
        "automation",
        "integrations",
        "history",
      ]);
      await loadHaControls();
      assert.equal(
        loaded.length,
        4,
        "defined controls avoid further route loads",
      );
    } finally {
      clearTimeout(timeout);
      for (const [name, descriptor] of [
        ["customElements", originalRegistry],
        ["document", originalDocument],
      ] as const) {
        if (descriptor) {
          Object.defineProperty(globalThis, name, descriptor);
        } else {
          Reflect.deleteProperty(globalThis, name);
        }
      }
    }
  });
}
