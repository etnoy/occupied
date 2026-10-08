// Exercise the builder through its rendered controls and the real pure planner.
import { stepEntries } from "../../custom_components/occupied/frontend/step-model.js";

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
    if (
      ["end", "endOffset"].includes(key) &&
      !root.querySelector(`[data-builder-field="${key}"]`)
    )
      click(key === "end" ? "Add end of window" : "Add end offset");
    const node = root.querySelector(`[data-builder-field="${key}"]`);
    assert(node, `Missing builder field: ${key}`);
    if (node.tagName === "HA-SELECTOR") {
      node.select(value);
      return node;
    }
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
    click("Save step");
    await wait(() => !panel.busy);
    assert(
      !panel.stepEditor,
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
    "guided timing-first creation validates and saves without separate validation",
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
      click("Create your first step");
      fit();
      assert(
        root.querySelector('[data-builder-field="start"]').type === "time" &&
          root
            .querySelector('[data-builder-field="start"]')
            .getBoundingClientRect().height > 0 &&
          root.textContent.includes("Start time") &&
          !root.querySelector('[data-builder-field="end"]') &&
          !root.querySelector('[data-builder-field="variation"]') &&
          !root.querySelector('[data-builder-field="days"]'),
        "Start time is missing when only the HA selector wrapper is loaded, or removed controls are still shown",
      );
      field("start", "17:45");
      field("end", "18:15");
      click("Continue");
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
      fit();
      const before = calls.length;
      await save();
      const entry = stepEntries(panel.saved)[0];
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
      click("Add related step");
      assert(
        panel.stepEditor.form.entities.length === 2,
        "Parent entities not prefilled",
      );

      assert(
        root.querySelector('[data-builder-field="mode"]').value === "relative",
        "Related timing not selected",
      );
      field("startOffset", "30m");
      click("Continue");
      choose(["light.kitchen"]);
      click("Continue");
      field("name", "Kitchen lights");
      await save();
      childId = panel.selectedStep;
      select(childId);
      click("Add related step");
      field("startOffset", "120m");
      click("Continue");
      choose(["light.kitchen", "light.living_room", "switch.floor_lamp"]);
      click("Continue");
      field("action", "turn_off");
      field("name", "Lights out");
      await save();
      endId = panel.selectedStep;
      assert(
        stepEntries(panel.saved).length === 3,
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
        `Related step preview infeasible: ${JSON.stringify(panel.preview)}`,
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
      click("Back to steps");
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
      click("Edit step");
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
          root.querySelector('[data-builder-field="start"]'),
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
      field("start", "18:05");
      field("end", "18:35");
      field("name", "Evening glow");
      field("mode", "relative");
      const parents = [
        ...root.querySelector('[data-builder-field="anchor"]').options,
      ].map((o) => o.value);
      assert(
        !parents.includes(`step:${parentId}`) &&
          !parents.includes(`step:${childId}`) &&
          !parents.includes(`step:${endId}`),
        "Cycle-producing parents offered",
      );
      field("mode", "absolute");
      await save();
      const edited = stepEntries(panel.saved).find((e) => e.id === parentId);
      assert(
        edited.entities.includes("light.hall") &&
          edited.actions[0].data.brightness_pct === 55 &&
          edited.when.clock_range.earliest === "18:05",
        "Single-page save lost edits made across multiple sections",
      );
      assert(
        stepEntries(panel.saved)[1].when.relative_to === parentId,
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
      click("Edit step");
      field("mode", "relative");
      field("anchor", "sun:sunset");
      field("startOffset", "-40m");
      field("endOffset", "-20m");
      await save();
      assert(
        stepEntries(panel.saved)[0].when.sun_range.offset_range.min === "-40m",
        "Before-sunset offset sign was lost",
      );
      await panel.runPreview();
      assert(panel.preview.valid, "Sun timing failed planner validation");
      select(parentId);
      click("Edit step");
      field("mode", "absolute");
      field("start", "23:50");
      field("end", "00:20");
      await save();
      await panel.runPreview();
      assert(
        panel.preview.valid &&
          stepEntries(panel.saved)[0].when.clock_range.cross_midnight,
        "Overnight routine chain failed",
      );
    },
  );
  await check(
    "backend errors point into the routine form and do not submit an invalid save",
    async () => {
      select(parentId);
      click("Edit step");
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
        click("Save step");
        await wait(() => !panel.busy);
        assert(
          root.querySelector(
            '[data-builder-field="start"][aria-invalid="true"]',
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
        !panel.stepEditor && !panel.dirty,
        "Cancel did not discard the existing routine's pending edits",
      );
    },
  );
  await check(
    "in-flight validation and save preserve newer routine edits without duplicating routines",
    async () => {
      select(parentId);
      click("Edit step");
      field("start", "20:00");
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
        click("Save step");
        await wait(() => release);
        field("start", "21:00");
        release();
        await wait(() => !panel.busy);
        assert(
          panel.stepEditor.form.timing.start === "21:00" &&
            calls.filter((c) => c.type === "occupied/save").length === saves,
          "Stale validation saved or overwrote new edits",
        );
        gate = "occupied/save";
        release = undefined;
        click("Save step");
        await wait(() => release);
        field("start", "23:50"); // Revert to the value from before editing.
        release();
        await wait(() => !panel.busy);
        assert(
          panel.stepEditor.form.timing.start === "23:50" &&
            panel.saved.routines[0].steps[0].when.clock_range.earliest ===
              "21:00",
          "Save response replaced newer edits",
        );
      } finally {
        panel._hass.callWS = original;
      }
      await save();
      assert(
        stepEntries(panel.saved).length === 3 &&
          panel.saved.routines[0].steps[0].when.clock_range.earliest ===
            "23:50",
        "Saving retained edits duplicated the routine or lost the time",
      );
    },
  );
  await check(
    "scene and service steps use explicit intervals and relative offset bounds",
    async () => {
      click("Create step");
      field("start", "06:40:00");
      field("end", "07:20:00");
      click("Continue");
      field("kind", "scene");
      choose(["scene.morning"]);
      click("Continue");
      field("name", "Morning scene");
      await save();
      const morning = stepEntries(panel.saved).find(
        (e) => e.name === "Morning scene",
      );
      assert(
        morning.actions[0].action === "scene.turn_on",
        "Scene was not saved as a scene call",
      );
      select(morning.id);
      click("Add related step");
      const offset = field("startOffset", "30");
      assert(
        offset.getAttribute("aria-invalid") === "true" &&
          !offset.checkValidity() &&
          root.textContent.includes("Use h, m or s"),
        "Invalid offset format was not explained as typed",
      );
      field("startOffset", "10s");
      assert(
        offset === root.querySelector('[data-builder-field="startOffset"]') &&
          !offset.hasAttribute("aria-invalid") &&
          offset.checkValidity(),
        "Correcting an offset did not clear validation or replaced the input",
      );
      const endOffset = field("endOffset", "5s");
      assert(
        !endOffset.checkValidity() &&
          root.textContent.includes("at least the start offset"),
        "End bound ordering was not validated live",
      );
      field("endOffset", "20m");
      assert(
        endOffset.checkValidity() && !endOffset.hasAttribute("aria-invalid"),
        "Corrected end offset remained invalid",
      );
      click("Continue");
      field("kind", "service");
      choose(["cover.blinds"]);
      click("Continue");
      field("service", "cover.set_cover_position");
      field("data", '{"position": 75}');
      field("name", "Breakfast blinds");

      await save();
      const breakfast = stepEntries(panel.saved).find(
        (e) => e.name === "Breakfast blinds",
      );
      assert(
        breakfast.when.relative_to === morning.id &&
          breakfast.when.offset_range.min === "10s",
        "Relative bounds were lost",
      );
      const preview = await fixtureWS({
        type: "occupied/preview",
        program: panel.saved,
        date: "2026-10-06",
        days: 1,
        seed: "step-intervals",
      });
      const times = preview.plans[0].steps;
      const delta =
        (Date.parse(times[breakfast.id]) - Date.parse(times[morning.id])) /
        1000;
      assert(
        delta >= 10 && delta <= 1200,
        "Breakfast did not follow the sampled Morning time",
      );
      select(breakfast.id);
      click("Edit step");
      field("name", "Breakfast shades");
      await save();
      assert(
        stepEntries(panel.saved).find((e) => e.id === breakfast.id).actions[0]
          .data.position === 75,
        "Service data was lost while editing",
      );
      // Remove these independent examples to retain the following managed-draft fixture.
      const next = structuredClone(panel.saved);
      next.routines = next.routines.filter(
        (r) => !r.steps.some((e) => [morning.id, breakfast.id].includes(e.id)),
      );
      await panel.save(next);
      home();
      fit();
      assert(deviceCalls.length === 0, "Step editing controlled devices");
    },
  );
  await check(
    "managed-file creation keeps changes in an exportable draft",
    async () => {
      await panel.selectSource("file", "occupied/house.yaml");
      home();
      const saves = calls.filter((c) => c.type === "occupied/save").length;
      click("Create step");
      click("Continue");
      choose(["light.hall"]);
      click("Continue");
      field("name", "Hall light");
      click("Add to draft");
      assert(
        !panel.stepEditor &&
          panel.dirty &&
          stepEntries(panel.draft).length === 4 &&
          stepEntries(panel.saved).length === 3,
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
