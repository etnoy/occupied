import type { OccupiedPanel } from "@occupied/occupied-panel.js";
import type { HomeAssistant, Tab } from "@occupied/types.js";
import { errorMessage, required } from "@occupied/util.js";
import {
  assert,
  fireValueChanged,
  type TestSelector,
  type WorkflowResult,
  type Check,
} from "./types.js";
// Browser acceptance against production modules + canonical Python API fixture.
import { runRoutineWorkflows } from "./routine-workflows.js";
const wait = async (predicate: () => unknown) => {
  for (let n = 0; n < 100; n++) {
    if (predicate()) return;
    await new Promise<void>((r) => setTimeout(r, 20));
  }
  throw new Error("Timed out waiting for editor state");
};
export async function runWorkflows() {
  const results: WorkflowResult[] = [],
    output = document.getElementById("results");
  const check: Check = async (name, work) => {
    try {
      await work();
      results.push({ name, passed: true });
    } catch (error) {
      results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.stack : errorMessage(error),
      });
    }
    required(output).textContent = JSON.stringify(results, null, 2);
  };
  await fixtureWS({ type: "test/reset" });
  let panel = required(document.querySelector<OccupiedPanel>("occupied-panel"));
  panel.remove();
  panel = document.createElement("occupied-panel");
  document.body.prepend(panel);
  mount();
  await wait(() => panel.draft && !panel._loading);
  const view = (tab: Tab) => panel.navigate(tab);
  const root = required(panel.shadowRoot);
  const click = (text: string) => {
    const node = [...root.querySelectorAll<HTMLButtonElement>("button")].find(
      (x) => x.textContent.trim() === text,
    );
    assert(node, `Missing button: ${text}`);
    node.click();
    return node;
  };
  const rename = (name: string) => panel.change(["name"], name);
  await check(
    "all screens render, fit the viewport and escape draft text",
    async () => {
      for (const tab of [
        "routines",
        "settings",
        "overview",
        "configuration",
        "diagnostics",
        "preview",
        "timeline",
      ] as Tab[]) {
        view(tab);
        assert(
          required(root.getElementById("view")).textContent.trim(),
          `${tab} is blank`,
        );
        assert(
          document.documentElement.scrollWidth <= innerWidth,
          `${tab} overflows the viewport`,
        );
      }
      view("settings");
      const tab = (): Tab => panel.tab;
      click("Execution history");
      assert(tab() === "timeline", "Settings did not open a tool page");
      click("Back to settings");
      assert(tab() === "settings", "Tool page did not return to settings");
      const label = "Bedroom & <script>label</script>";
      rename(label);
      assert(
        required(root.getElementById("house")).textContent === label,
        "Draft name was not shown as text",
      );
      assert(!root.querySelector("script"), "Unsafe HTML rendered");
    },
  );
  await check(
    "exact native state lists keep spaces through export and import",
    async () => {
      panel.change(
        ["activation", "conditions", 0, "state"],
        ["armed", "armed away", "armed_away"],
      );
      assert(
        required(required(panel.draft.activation).conditions[0].state)[1] ===
          "armed away",
        "State split at whitespace",
      );
      const original = structuredClone(panel.draft);
      await panel.exportYaml();
      assert(panel.yaml.includes("armed away"), "Export lost exact state");
      await panel.importYaml();
      assert(
        JSON.stringify(panel.draft) === JSON.stringify(original),
        "Canonical export/reimport changed normalized fields",
      );
    },
  );
  await check(
    "validation reports invalid drafts and accepts corrections",
    async () => {
      panel.change(["groups", 0, "entities"], ["missing-dot"]);
      await panel.validate();
      assert(
        panel.validatedVersion !== panel.version && panel.issues.length,
        "Invalid draft accepted",
      );
      assert(
        !root.querySelector("#issues button"),
        "Issues outside the step editor offer a focus action",
      );
      panel.change(["groups", 0, "entities"], ["light.bedroom", "light.hall"]);
      await panel.validate();
      assert(
        panel.validatedVersion === panel.version,
        "Corrected draft not valid",
      );
    },
  );
  await check(
    "preview and reroll are isolated from runtime plans and permission",
    async () => {
      const before = await fixtureWS({ type: "occupied/timeline" });
      view("preview");
      panel.previewSettings.seed = "browser-acceptance";
      await panel.runPreview();
      assert(
        required(panel.preview).plans.length === 7 &&
          required(panel.preview).valid,
        "Weekly preview infeasible",
      );
      assert(
        !panel.error &&
          required(panel.shadowRoot).querySelectorAll<HTMLElement>(".timeline")
            .length === 7,
        "Preview diagrams failed to render",
      );
      assert(
        required(panel.shadowRoot).querySelector<HTMLElement>(".marker"),
        "Step times missing from preview diagram",
      );
      panel.previewSettings.seed = "reroll-only";
      await panel.runPreview();
      const after = await fixtureWS({ type: "occupied/timeline" });
      assert(
        JSON.stringify(before) === JSON.stringify(after),
        "Preview changed actual plan or status",
      );
      assert(deviceCalls.length === 0, "Draft/preview called devices");
      view("timeline");
      await panel.loadTimeline();
      assert(
        !panel.error &&
          required(panel.shadowRoot).querySelector<HTMLElement>(".timeline"),
        "Saved timeline failed to render",
      );
      assert(
        required(
          required(panel.shadowRoot).querySelector<HTMLElement>("tbody"),
        ).textContent.includes("historical_skipped"),
        "Saved dispatch outcomes missing",
      );
    },
  );
  await check(
    "metadata save preserves saved plan, stale save preserves edits",
    async () => {
      await panel.validate();
      assert(
        panel.validatedVersion === panel.version,
        "Draft not valid before save",
      );
      await panel.save();
      assert(!panel.dirty, "Save did not clear draft");
      const before = await fixtureWS({ type: "occupied/timeline" });
      rename("New household label");
      await panel.validate();
      await panel.save();
      const after = await fixtureWS({ type: "occupied/timeline" });
      assert(
        JSON.stringify(before.plan) === JSON.stringify(after.plan),
        "Metadata changed actual sampled plan",
      );
      rename("Unsaved local label");
      await panel.validate();
      const saved = await fixtureWS({ type: "occupied/program" });
      await fixtureWS({
        type: "occupied/save",
        program: { ...saved.program, name: "Concurrent editor" },
        expected_revision: saved.revision,
      });
      await panel.save();
      assert(
        panel.stale && panel.draft.name === "Unsaved local label",
        "Conflict overwrote draft",
      );
      await panel.reloadSaved(true);
      assert(
        String(panel.draft.name) === "Concurrent editor" && !panel.stale,
        "Explicit reload failed",
      );
    },
  );
  await check(
    "late validation and save responses preserve edits made while waiting",
    async () => {
      rename("First submitted label");
      const originalWS = panel._hass.callWS;
      let release: (() => void) | undefined;
      const releaseGate = () => required(release)();
      panel._hass.callWS = async (msg) => {
        if (msg.type === "occupied/editor_validate")
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        return originalWS(msg);
      };
      const validation = panel.validate();
      await wait(() => release);
      rename("Edited during validation");
      releaseGate();
      await validation;
      assert(
        panel.validatedVersion !== panel.version,
        "Old validation enabled saving new edits",
      );
      panel._hass.callWS = originalWS;
      await panel.validate();
      release = undefined;
      panel._hass.callWS = async (msg) => {
        if (msg.type === "occupied/save")
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        return originalWS(msg);
      };
      const save = panel.save();
      await wait(() => release);
      rename("Edited during save");
      releaseGate();
      await save;
      panel._hass.callWS = originalWS;
      assert(
        panel.dirty &&
          panel.draft.name === "Edited during save" &&
          panel.saved.name === "Edited during validation",
        "Save response overwrote newer draft edits",
      );
      await panel.reloadSaved(true);
    },
  );
  await check(
    "managed file authority, reload errors and explicit GUI copy preserve drafts",
    async () => {
      rename("Temporary file draft");
      await panel.selectSource("file", "occupied/house.yaml");
      assert(
        panel.document.source === "file" &&
          panel.draft.name === "Temporary file draft",
        "Source change lost the draft",
      );
      await panel.validate();
      const saves = calls.filter((x) => x.type === "occupied/save").length;
      await panel.save();
      assert(
        calls.filter((x) => x.type === "occupied/save").length === saves,
        "File draft was applied",
      );
      const save = [...root.querySelectorAll<HTMLButtonElement>("button")].find(
        (x) => x.textContent.trim() === "Save changes",
      );
      assert(required(save).disabled, "File save button is enabled");
      const status = await fixtureWS({ type: "test/file-error" });
      emit(status);
      assert(
        required(
          required(panel.shadowRoot).getElementById("notice"),
        ).textContent.includes("File error"),
        "Source error was not visible",
      );
      view("configuration");
      assert(
        required(
          required(panel.shadowRoot).getElementById("view"),
        ).textContent.includes("Invalid virtual file"),
        "File issue was not displayed",
      );
      await panel.reloadManaged();
      assert(
        panel.draft.name === "Temporary file draft" && panel.dirty,
        "Reload discarded the draft",
      );
      await panel.exportYaml();
      assert(
        panel.yaml.includes("Temporary file draft"),
        "File draft could not be exported",
      );
      await panel.selectSource("gui");
      assert(
        String(panel.document.source) === "gui" &&
          panel.draft.name === "Temporary file draft",
        "GUI copy applied or lost draft edits",
      );
      await panel.validate();
      await panel.save();
      assert(
        !panel.dirty && panel.saved.name === "Temporary file draft",
        "Explicit GUI save failed",
      );
    },
  );
  // Routine workflows drive HA's entity selector through this stand-in.
  if (!customElements.get("ha-selector"))
    customElements.define(
      "ha-selector",
      class extends HTMLElement implements TestSelector {
        declare shadowRoot: ShadowRoot;
        picker: HTMLElement & { value: unknown };
        _hass?: HomeAssistant;
        value: unknown;
        selector = {};
        label = "";
        required = false;
        narrow = false;
        constructor() {
          super();
          this.attachShadow({ mode: "open" });
          this.picker = Object.assign(document.createElement("div"), {
            value: undefined as unknown,
          });
          required(this.shadowRoot).append(this.picker);
        }
        set hass(value: HomeAssistant | undefined) {
          this._hass = value;
          // HA forwards the outer selector's value to its inner picker
          // whenever a state update causes the selector to render.
          queueMicrotask(() => {
            this.picker.value = this.value;
          });
        }
        get hass() {
          return this._hass;
        }
        select(value: unknown) {
          // Native pickers update themselves and emit a composed event;
          // their parent ha-selector does not update its own value.
          this.picker.value = value;
          fireValueChanged(this.picker, value);
        }
      },
    );
  // Start the routine workflows from the fixture program and live status.
  await fixtureWS({ type: "test/reset" });
  await panel.reloadSaved(true);
  panel.status = await panel.ws("status");
  await runRoutineWorkflows(panel, check);
  await check(
    "disconnect unsubscribes and leaves virtual runtime independent",
    async () => {
      assert(subscribers.size === 1, "Duplicate or missing subscription");
      panel.remove();
      await wait(() => !subscribers.size);
      assert(deviceCalls.length === 0, "Editor issued device calls");
      document.body.prepend(panel);
      await wait(() => panel.draft && !panel._loading);
    },
  );
  window.workflowResults = results;
  return results;
}
