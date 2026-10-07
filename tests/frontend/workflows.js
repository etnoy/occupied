// Browser acceptance against production modules + canonical Python API fixture.
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
const wait = async (predicate) => {
  for (let n = 0; n < 100; n++) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("Timed out waiting for editor state");
};
export async function runWorkflows() {
  const results = [],
    output = document.getElementById("results");
  const check = async (name, work) => {
    try {
      await work();
      results.push({ name, passed: true });
    } catch (error) {
      results.push({ name, passed: false, error: error.stack });
    }
    output.textContent = JSON.stringify(results, null, 2);
  };
  await fixtureWS({ type: "test/reset" });
  let panel = document.querySelector("occupied-panel");
  panel.remove();
  panel = document.createElement("occupied-panel");
  document.body.prepend(panel);
  mount();
  await wait(() => panel.draft && !panel._loading);
  const view = (tab) => {
    panel.tab = tab;
    panel.renderView();
  };
  const click = (text) => {
    const node = [...panel.shadowRoot.querySelectorAll("button")].find(
      (x) => x.textContent === text,
    );
    assert(node, `Missing button: ${text}`);
    node.click();
    return node;
  };
  const input = (path, value) => {
    const node = [...panel.shadowRoot.querySelectorAll("[data-path]")]
      .find((x) => x.dataset.path === JSON.stringify(path))
      ?.querySelector("input,textarea,select,ha-selector");
    assert(node, `Missing field ${JSON.stringify(path)}`);
    node.focus();
    node.value =
      node.tagName === "HA-SELECTOR" && node.selector.entity?.multiple
        ? value.split("\n")
        : value;
    if (node.tagName === "HA-SELECTOR") {
      node.dispatchEvent(
        new CustomEvent("value-changed", {
          detail: { value: node.value },
          bubbles: true,
        }),
      );
      return node;
    }
    node.dispatchEvent(
      new Event(node.tagName === "SELECT" ? "change" : "input", {
        bubbles: true,
      }),
    );
    return node;
  };
  await check(
    "all configuration screens render and preserve a draft",
    async () => {
      for (const tab of [
        "household",
        "groups",
        "routines",
        "handover",
        "defaults",
        "dependencies",
        "configuration",
        "diagnostics",
        "preview",
        "timeline",
      ]) {
        view(tab);
        assert(
          panel.shadowRoot.getElementById("view").textContent.trim(),
          `${tab} is blank`,
        );
      }
      view("groups");
      const search = panel.shadowRoot.querySelector(
        'input[aria-label="Find entity · Entities"]',
      );
      if (search) {
        search.value = "kitchen";
        search.dispatchEvent(new Event("input"));
        click("Add entity");
        assert(
          panel.draft.groups[0].entities.includes("light.kitchen"),
          "Fallback picker did not select by friendly name/area",
        );
        const selected = [...panel.shadowRoot.querySelectorAll("li")].find(
          (x) => x.textContent.startsWith("kitchen ·"),
        );
        selected.querySelector("button").click();
        assert(
          !panel.draft.groups[0].entities.includes("light.kitchen"),
          "Fallback picker did not remove selected entity",
        );
      }
      const field = input(
        ["groups", 0, "name"],
        "Bedroom & <script>label</script>",
      );
      const node = field;
      emit({ ...panel.status, status: "active" });
      assert(
        panel.shadowRoot.activeElement === node,
        "Runtime update replaced focused field",
      );
      assert(panel.draft.groups[0].name.includes("<script>"), "Draft lost");
      assert(!panel.shadowRoot.querySelector("script"), "Unsafe HTML rendered");
    },
  );
  await check(
    "exact native state lists keep spaces and import/export semantics",
    async () => {
      view("household");
      input(
        ["activation", "conditions", 0, "state"],
        "armed\narmed away\narmed_away",
      );
      assert(
        panel.draft.activation.conditions[0].state[1] === "armed away",
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
    "validation blocks invalid fields and focuses backend issues",
    async () => {
      view("groups");
      input(["groups", 0, "entities"], "missing-dot");
      await panel.validate();
      assert(
        panel.validatedVersion !== panel.version && panel.issues.length,
        "Invalid draft accepted",
      );
      panel.focusIssue(panel.issues[0]);
      assert(panel.tab === "groups", "Issue did not select group view");
      input(["groups", 0, "entities"], "light.bedroom\nlight.hall");
      await panel.validate();
      assert(
        panel.validatedVersion === panel.version,
        "Corrected draft not valid",
      );
    },
  );
  await check(
    "identifier migration rewrites references and keeps opaque service data",
    async () => {
      const ri = panel.draft.routines.findIndex(
          (r) => r.id === "weekday_mornings",
        ),
        tv = panel.draft.routines.findIndex((r) => r.id === "evenings");
      panel.draft.routines[tv].activities[0].on_start[0].data.reference_label =
        "wake";
      await panel.migrate("step", "wake", "wake_up");
      const routine = panel.draft.routines[ri];
      assert(
        routine.steps[1].when.relative_to === "wake_up",
        "Typed dependency did not migrate",
      );
      assert(
        panel.draft.routines[tv].activities[0].on_start[0].data
          .reference_label === "wake",
        "Opaque data rewritten",
      );
      delete panel.draft.routines[tv].activities[0].on_start[0].data
        .reference_label;
      panel.edited();
    },
  );
  await check(
    "Harmony preset uses 20:00±15 minutes, 45 minutes, explicit cleanup and ownership",
    async () => {
      view("routines");
      const ri = panel.draft.routines.findIndex((r) => r.id === "evenings");
      panel.selection.set('["routines"]', ri);
      panel.renderView();
      const remote = panel.shadowRoot.querySelector(
        'select[aria-label="Remote"]',
      );
      assert(remote, "TV preset missing");
      remote.value = "remote.living_room_harmony";
      click("Use TV preset");
      const activity = panel.draft.routines[ri].activities[0];
      assert(
        activity.when.clock_range.earliest === "19:45" &&
          activity.when.clock_range.latest === "20:15",
        "Approximate start mismatch",
      );
      assert(
        activity.duration.fixed === "45m" &&
          activity.on_end[0].action === "remote.turn_off",
        "Missing duration/end action",
      );
      assert(
        activity.ownership_conditions[0].attribute === "current_activity" &&
          activity.start_conditions[0].state === "off",
        "Missing native ownership/start condition",
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
        panel.preview.plans.length === 7 && panel.preview.valid,
        "Weekly preview infeasible",
      );
      assert(
        !panel.error &&
          panel.shadowRoot.querySelectorAll(".timeline").length === 7,
        "Preview diagrams failed to render",
      );
      assert(
        panel.shadowRoot.querySelector(".marker"),
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
        !panel.error && panel.shadowRoot.querySelector(".timeline"),
        "Saved timeline failed to render",
      );
      assert(
        panel.shadowRoot
          .querySelector("tbody")
          .textContent.includes("historical_skipped"),
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
      view("household");
      input(["name"], "New household label");
      await panel.validate();
      await panel.save();
      const after = await fixtureWS({ type: "occupied/timeline" });
      assert(
        JSON.stringify(before.plan) === JSON.stringify(after.plan),
        "Metadata changed actual sampled plan",
      );
      input(["name"], "Unsaved local label");
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
        panel.draft.name === "Concurrent editor" && !panel.stale,
        "Explicit reload failed",
      );
    },
  );
  await check(
    "invalid advanced JSON persists across navigation and blocks save",
    async () => {
      view("household");
      input([], '{"schema_version":');
      assert(panel.localErrors.size, "Invalid JSON not tracked");
      view("groups");
      view("household");
      const raw = [
        ...panel.shadowRoot.querySelectorAll("textarea[data-json-path]"),
      ].find((x) => x.dataset.jsonPath === "[]");
      assert(raw.value === '{"schema_version":', "Invalid text lost");
      await panel.validate();
      assert(
        panel.error.includes("JSON"),
        "Invalid JSON did not block validation",
      );
      click("Discard edits");
      assert(!panel.localErrors.size, "Discard retained invalid JSON");
    },
  );
  await check(
    "late validation and save responses preserve edits made while waiting",
    async () => {
      view("household");
      input(["name"], "First submitted label");
      const originalWS = panel._hass.callWS;
      let release;
      panel._hass.callWS = async (msg) => {
        if (msg.type === "occupied/editor_validate")
          await new Promise((resolve) => {
            release = resolve;
          });
        return originalWS(msg);
      };
      const validation = panel.validate();
      await wait(() => release);
      input(["name"], "Edited during validation");
      release();
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
          await new Promise((resolve) => {
            release = resolve;
          });
        return originalWS(msg);
      };
      const save = panel.save();
      await wait(() => release);
      input(["name"], "Edited during save");
      release();
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
      view("household");
      input(["name"], "Temporary file draft");
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
      const save = [...panel.shadowRoot.querySelectorAll("button")].find(
        (x) => x.textContent === "Save program",
      );
      assert(save.disabled, "File save button is enabled");
      const status = await fixtureWS({ type: "test/file-error" });
      emit(status);
      assert(
        panel.shadowRoot
          .getElementById("notice")
          .textContent.includes("File error"),
        "Source error was not visible",
      );
      view("configuration");
      assert(
        panel.shadowRoot
          .getElementById("view")
          .textContent.includes("Invalid virtual file"),
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
        panel.document.source === "gui" &&
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
  await check(
    "empty GUI household can create and preview the evening template",
    async () => {
      const doc = await fixtureWS({ type: "occupied/program" });
      await fixtureWS({
        type: "occupied/save",
        program: { schema_version: 1, name: "New household" },
        expected_revision: doc.revision,
      });
      await panel.reloadSaved(true);
      view("household");
      const lights = panel.shadowRoot.querySelector(
        'textarea[aria-label="Quick start light entities"]',
      );
      lights.value = "light.living_room\nlight.hall";
      click("Add evening template");
      assert(
        panel.draft.groups.length === 1 &&
          panel.draft.routines[0].steps.length === 2 &&
          panel.draft.lighting.baseline[0].state === "off",
        "Template did not create managed baseline and steps",
      );
      await panel.validate();
      assert(panel.validatedVersion === panel.version, "New template invalid");
      view("preview");
      await panel.runPreview();
      assert(
        panel.preview.valid &&
          !panel.error &&
          panel.shadowRoot.querySelector(".marker"),
        "New template preview failed",
      );
      if (innerWidth <= 600) {
        for (const tab of [
          "household",
          "groups",
          "routines",
          "handover",
          "defaults",
          "dependencies",
          "preview",
          "configuration",
          "diagnostics",
        ]) {
          view(tab);
          assert(
            document.documentElement.scrollWidth <= innerWidth,
            `${tab} overflows mobile viewport`,
          );
        }
      }
    },
  );
  await check(
    "optional HA selector contract uses explicit values and accessible labels",
    async () => {
      if (!customElements.get("ha-selector"))
        customElements.define(
          "ha-selector",
          class extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
              this.picker = document.createElement("div");
              this.shadowRoot.append(this.picker);
            }
            set hass(value) {
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
            select(value) {
              // Native pickers update themselves and emit a composed event;
              // their parent ha-selector does not update its own value.
              this.picker.value = value;
              this.picker.dispatchEvent(
                new CustomEvent("value-changed", {
                  detail: { value },
                  bubbles: true,
                  composed: true,
                }),
              );
            }
          },
        );
      view("groups");
      const picker = panel.shadowRoot.querySelector("ha-selector");
      assert(
        picker &&
          picker.hass === panel._hass &&
          picker.selector.entity.multiple &&
          picker.label === "Entities" &&
          picker.getAttribute("aria-label"),
        "HA selector compatibility contract missing",
      );
      picker.select(["light.living_room"]);
      assert(
        panel.draft.groups[0].entities.join(",") === "light.living_room",
        "Selector did not update draft",
      );
      await panel.validate();
      assert(
        panel.validatedVersion === panel.version,
        "Selector-authored draft invalid",
      );
      panel.hass = { ...panel._hass };
      await Promise.resolve();
      assert(
        picker.picker.value.join(",") === "light.living_room",
        "HA state update cleared the selected group entity",
      );
    },
  );
  await check(
    "native window and condition selections survive HA updates and tab changes",
    async () => {
      await fixtureWS({ type: "test/reset" });
      await panel.reloadSaved(true);
      panel.status = await panel.ws("status");
      view("routines");
      click("Add routine");
      const routineIndex = panel.draft.routines.length - 1;
      click("Add window");
      const path = [
        "routines",
        routineIndex,
        "activity_windows",
        0,
        "targets",
        "entities",
      ];
      const picker = [...panel.shadowRoot.querySelectorAll("[data-path]")]
        .find((x) => x.dataset.path === JSON.stringify(path))
        .querySelector("ha-selector");
      for (const ids of [
        ["light.kitchen"],
        ["light.kitchen", "light.hall"],
        ["light.hall"],
        [],
        ["light.kitchen"],
      ]) {
        picker.select(ids);
        panel.hass = { ...panel._hass };
        emit({ ...panel.status });
        await Promise.resolve();
        assert(
          JSON.stringify(picker.picker.value) === JSON.stringify(ids) &&
            JSON.stringify(
              panel.draft.routines[routineIndex].activity_windows[0].targets
                .entities,
            ) === JSON.stringify(ids),
          "Window selection was lost after a HA update",
        );
        assert(picker.isConnected, "HA update replaced the open picker");
      }
      view("household");
      click("Add Activation conditions");
      const conditionPath = [
        "activation",
        "conditions",
        panel.draft.activation.conditions.length - 1,
        "entity_id",
      ];
      const condition = [...panel.shadowRoot.querySelectorAll("[data-path]")]
        .find((x) => x.dataset.path === JSON.stringify(conditionPath))
        .querySelector("ha-selector");
      assert(
        !condition.selector.entity.multiple,
        "Expected single entity condition",
      );
      condition.select("sensor.alarm");
      panel.hass = { ...panel._hass };
      await Promise.resolve();
      assert(
        condition.picker.value === "sensor.alarm",
        "Single entity selection was reset",
      );
      view("routines");
      const restored = [...panel.shadowRoot.querySelectorAll("[data-path]")]
        .find((x) => x.dataset.path === JSON.stringify(path))
        .querySelector("ha-selector");
      assert(
        restored.value.join(",") === "light.kitchen",
        "Tab change lost the window selection",
      );
      await panel.validate();
      assert(
        panel.validatedVersion === panel.version,
        "Window draft failed validation",
      );
      await panel.save();
      assert(
        panel.saved.routines[
          routineIndex
        ].activity_windows[0].targets.entities.join(",") === "light.kitchen",
        "Saved window lost the selection",
      );
    },
  );
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
