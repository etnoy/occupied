// Exercise the builder through its rendered controls and the real pure planner.
import { routineEntries } from "../../custom_components/occupied/frontend/routine-model.js";

export async function runRoutineWorkflows(panel, check) {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const wait = async (predicate) => {
    for (let n = 0; n < 150; n++) {
      if (predicate()) return;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error("Timed out waiting for routine builder");
  };
  const root = panel.shadowRoot;
  const click = (label) => {
    const node = [...root.querySelectorAll("button")].find(
      (b) => b.textContent === label,
    );
    assert(node && !node.disabled, `Missing or disabled button: ${label}`);
    node.click();
  };
  const field = (key, value) => {
    const node = root.querySelector(`[data-builder-field="${key}"]`);
    assert(node, `Missing builder field: ${key}`);
    node.value = value;
    node.dispatchEvent(
      new Event(node.tagName === "SELECT" ? "change" : "input", {
        bubbles: true,
      }),
    );
    return node;
  };
  const choose = (ids) => {
    const selector = root.querySelector(
      '[data-editor-section="entities"] ha-selector',
    );
    if (selector?.select) {
      selector.select(ids);
      return;
    }
    for (const node of root.querySelectorAll(
      '.entity-picker input[type="checkbox"]',
    )) {
      const checked = ids.includes(node.value);
      if (node.checked !== checked) {
        node.checked = checked;
        node.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  };
  const home = () => {
    panel.tab = "routines";
    panel.renderView();
  };
  const select = (id) => {
    root.querySelector(`[data-routine-id="${id}"]`).click();
  };
  const save = async () => {
    click("Save routine");
    await wait(() => !panel.busy);
    assert(
      !panel.routineEditor,
      `Routine did not save: ${panel.error} ${JSON.stringify(panel.issues)}`,
    );
  };
  const fit = () =>
    assert(
      document.documentElement.scrollWidth <= innerWidth,
      "Builder overflows viewport",
    );
  let parentId, childId, endId;
  await check(
    "guided entity-first creation validates and saves without separate validation",
    async () => {
      const doc = await fixtureWS({ type: "occupied/program" });
      await fixtureWS({
        type: "occupied/save",
        program: { schema_version: 1, name: "Home" },
        expected_revision: doc.revision,
      });
      await panel.reloadSaved(true);
      home();
      assert(
        root.querySelectorAll("nav button").length === 2,
        "Primary navigation is not simplified",
      );
      assert(
        !root.textContent.includes("Validate draft"),
        "Separate validation remains in normal flow",
      );
      click("Create your first routine");
      fit();
      click("Continue");
      assert(
        root.textContent.includes("Select at least one"),
        "Empty selection did not explain the problem",
      );
      choose(["light.living_room", "switch.floor_lamp"]);
      click("Continue");
      fit();
      field("name", "Evening lights");
      field("brightness", "60");
      click("Continue");
      fit();
      field("time", "18:00");
      field("variation", "15");
      const before = calls.length;
      await save();
      const entry = routineEntries(panel.saved)[0];
      parentId = entry.id;
      assert(
        entry.entities.length === 2 && entry.actions.length === 2,
        "Mixed domain selection was lost",
      );
      assert(
        entry.actions[0].data.brightness_pct === 60 &&
          Object.keys(entry.actions[1].data).length === 0,
        "Light settings leaked into switch service data",
      );
      assert(
        entry.when.clock_range.earliest === "17:45" &&
          entry.when.clock_range.latest === "18:15",
        "Clock variation not stored",
      );
      assert(
        panel.saved.groups.length === 0 &&
          panel.saved.lighting.baseline.length === 1,
        "Creation required a group or omitted the managed baseline",
      );
      assert(
        calls
          .slice(before)
          .some((c) => c.type === "occupied/editor_validate") &&
          calls.slice(before).some((c) => c.type === "occupied/save"),
        "Save did not validate and persist",
      );
    },
  );
  await check(
    "three related routines preview using their parent's sampled times",
    async () => {
      select(parentId);
      click("Add related routine");
      assert(
        panel.routineEditor.form.entities.length === 2,
        "Parent entities not prefilled",
      );
      choose(["light.kitchen"]);
      click("Continue");
      field("name", "Kitchen lights");
      click("Continue");
      assert(
        root.querySelector('[data-builder-field="mode"]').value === "relative",
        "Related timing not selected",
      );
      field("offset", "30");
      await save();
      childId = panel.selectedRoutine;
      select(childId);
      click("Add related routine");
      choose(["light.kitchen", "light.living_room", "switch.floor_lamp"]);
      click("Continue");
      field("action", "turn_off");
      field("name", "Lights out");
      click("Continue");
      field("offset", "120");
      await save();
      endId = panel.selectedRoutine;
      assert(
        routineEntries(panel.saved).length === 3,
        "Extra user-facing routines created",
      );
      assert(
        root.textContent.includes("30 min after Evening lights") &&
          root.textContent.includes("120 min after Kitchen lights"),
        "Relationships missing from list",
      );
      click("Preview schedule");
      await wait(() => !panel.busy && panel.preview);
      assert(
        panel.preview.valid,
        `Related routine preview infeasible: ${JSON.stringify(panel.preview)}`,
      );
      for (const plan of panel.preview.plans) {
        assert(
          Date.parse(plan.steps[childId]) - Date.parse(plan.steps[parentId]) ===
            30 * 60000,
          "Child did not follow sampled parent time",
        );
        assert(
          Date.parse(plan.steps[endId]) - Date.parse(plan.steps[childId]) ===
            120 * 60000,
          "Grandchild timing not chained",
        );
      }
      fit();
      click("Back to routines");
    },
  );
  await check(
    "relationships prevent cycles and parent deletion while rename retains stable references",
    async () => {
      select(parentId);
      const remove = [...root.querySelectorAll("button")].find(
        (b) => b.textContent === "Delete",
      );
      assert(
        remove.disabled && root.textContent.includes("Used by: Kitchen lights"),
        "Dependent delete was not explained",
      );
      click("Edit routine");
      const entityPicker = root.querySelector(
        '[data-editor-section="entities"] [data-builder-field="entities"]',
      );
      assert(
        root.querySelectorAll("[data-editor-section]").length === 3 &&
          entityPicker?.tagName === "HA-SELECTOR" &&
          entityPicker.value.length > 0 &&
          entityPicker.selector.entity.filter.domain.join(",") ===
            "light,switch" &&
          root.querySelector('[data-builder-field="action"]') &&
          root.querySelector('[data-builder-field="time"]'),
        "Existing routine does not show entities, action and timing together",
      );
      assert(
        !root.querySelector(".builder-steps") &&
          ![...root.querySelectorAll("button")].some((b) =>
            ["Continue", "Back"].includes(b.textContent),
          ),
        "Existing routine still requires wizard navigation",
      );
      fit();
      choose(["light.living_room", "switch.floor_lamp", "light.hall"]);
      field("brightness", "55");
      field("time", "18:20");
      field("name", "Evening glow");
      field("mode", "relative");
      const parents = [
        ...root.querySelector('[data-builder-field="parent"]').options,
      ].map((o) => o.value);
      assert(
        !parents.includes(parentId) &&
          !parents.includes(childId) &&
          !parents.includes(endId),
        "Cycle-producing parents offered",
      );
      field("mode", "clock");
      field("days", "weekdays");
      click("Save routine");
      assert(
        panel.routineEditor &&
          root.textContent.includes("Kitchen lights depends"),
        "Downstream day conflict not shown inline",
      );
      field("days", "all");
      await save();
      const edited = routineEntries(panel.saved).find((e) => e.id === parentId);
      assert(
        edited.entities.includes("light.hall") &&
          edited.actions[0].data.brightness_pct === 55 &&
          edited.when.clock_range.earliest === "18:05",
        "Single-page save lost edits made across multiple sections",
      );
      assert(
        routineEntries(panel.saved)[1].when.relative_to === parentId,
        "Rename broke stable anchor",
      );
      assert(
        root.textContent.includes("after Evening glow"),
        "Child summary did not reflect renamed parent",
      );
    },
  );
  await check(
    "sun offsets and midnight schedules remain feasible through the real planner",
    async () => {
      select(parentId);
      click("Edit routine");
      field("mode", "sun");
      field("direction", "before");
      field("offset", "30");
      field("variation", "10");
      await save();
      assert(
        routineEntries(panel.saved)[0].when.sun_range.offset_range.min ===
          "-40m",
        "Before-sunset offset sign was lost",
      );
      await panel.runPreview();
      assert(panel.preview.valid, "Sun timing failed planner validation");
      select(parentId);
      click("Edit routine");
      field("mode", "clock");
      field("time", "00:05");
      field("variation", "15");
      await save();
      await panel.runPreview();
      assert(
        panel.preview.valid &&
          routineEntries(panel.saved)[0].when.clock_range.cross_midnight,
        "Overnight routine chain failed",
      );
    },
  );
  await check(
    "backend errors point into the routine form and do not submit an invalid save",
    async () => {
      select(parentId);
      click("Edit routine");
      const original = panel._hass.callWS,
        saveCount = calls.filter((c) => c.type === "occupied/save").length;
      panel._hass.callWS = async (message) =>
        message.type === "occupied/editor_validate"
          ? {
              valid: false,
              issues: [
                {
                  severity: "error",
                  model_path: [
                    "routines",
                    0,
                    "steps",
                    0,
                    "when",
                    "clock_range",
                  ],
                  message: "Choose a feasible time.",
                },
              ],
            }
          : original(message);
      try {
        click("Save routine");
        await wait(() => !panel.busy);
        assert(
          root.querySelector(
            '[data-builder-field="time"][aria-invalid="true"]',
          ),
          "Backend error did not reach the time field",
        );
        assert(
          root.textContent.includes("Choose a feasible time."),
          "Backend explanation missing",
        );
        assert(
          calls.filter((c) => c.type === "occupied/save").length === saveCount,
          "Invalid candidate was saved",
        );
      } finally {
        panel._hass.callWS = original;
      }
      click("Cancel");
      assert(
        !panel.routineEditor && !panel.dirty,
        "Cancel did not discard the existing routine's pending edits",
      );
    },
  );
  await check(
    "in-flight validation and save preserve newer routine edits without duplicating routines",
    async () => {
      select(parentId);
      click("Edit routine");
      field("time", "20:00");
      const original = panel._hass.callWS;
      let release,
        gate = "occupied/editor_validate";
      panel._hass.callWS = async (message) => {
        if (message.type === gate)
          await new Promise((r) => {
            release = r;
          });
        return original(message);
      };
      try {
        const saves = calls.filter((c) => c.type === "occupied/save").length;
        click("Save routine");
        await wait(() => release);
        field("time", "21:00");
        release();
        await wait(() => !panel.busy);
        assert(
          panel.routineEditor.form.timing.time === "21:00" &&
            calls.filter((c) => c.type === "occupied/save").length === saves,
          "Stale validation saved or overwrote new edits",
        );
        gate = "occupied/save";
        release = undefined;
        click("Save routine");
        await wait(() => release);
        field("time", "00:05"); // Revert to the value from before editing.
        release();
        await wait(() => !panel.busy);
        assert(
          panel.routineEditor.form.timing.time === "00:05" &&
            panel.saved.routines[0].steps[0].when.clock_range.earliest ===
              "20:45",
          "Save response replaced newer edits",
        );
      } finally {
        panel._hass.callWS = original;
      }
      await save();
      assert(
        routineEntries(panel.saved).length === 3 &&
          panel.saved.routines[0].steps[0].when.clock_range.earliest ===
            "23:50",
        "Saving retained edits duplicated the routine or lost the time",
      );
    },
  );
  await check(
    "managed-file creation keeps changes in an exportable draft",
    async () => {
      await panel.selectSource("file", "occupied/house.yaml");
      home();
      const saves = calls.filter((c) => c.type === "occupied/save").length;
      click("Create routine");
      choose(["light.hall"]);
      click("Continue");
      field("name", "Hall light");
      click("Continue");
      click("Add to draft");
      assert(
        !panel.routineEditor &&
          panel.dirty &&
          routineEntries(panel.draft).length === 4 &&
          routineEntries(panel.saved).length === 3,
        "Managed creation was applied or lost",
      );
      await panel.exportYaml();
      assert(
        panel.yaml.includes("Hall light"),
        "Managed draft cannot be exported",
      );
      assert(
        calls.filter((c) => c.type === "occupied/save").length === saves,
        "Managed-file builder issued a save",
      );
      await panel.selectSource("gui");
      await panel.reloadSaved(true);
      home();
      assert(deviceCalls.length === 0, "Routine editing controlled devices");
      fit();
    },
  );
}
