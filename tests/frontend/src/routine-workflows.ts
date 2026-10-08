import type { OccupiedPanel } from "@occupied/occupied-panel.js";
import { required } from "@occupied/types.js";
import {
  assert,
  type TestSelector,
  type TestSourcePicker,
  type Check,
} from "./types.js";
// Exercise the builder through its rendered controls and the real pure planner.
import { stepEntries } from "@occupied/step-model.js";

export async function runRoutineWorkflows(panel: OccupiedPanel, check: Check) {
  const wait = async (predicate: () => unknown) => {
    for (let n = 0; n < 150; n++) {
      if (predicate()) return;
      await new Promise<void>((r) => setTimeout(r, 20));
    }
    throw new Error("Timed out waiting for routine builder");
  };
  const root = panel.shadowRoot;
  const click = (label: string) => {
    const node = [...root.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => b.textContent === label && !b.closest("[hidden]"),
    );
    assert(node && !node.disabled, `Missing or disabled button: ${label}`);
    node.click();
  };
  const field = (key: string, value: string) => {
    if (key === "mode") {
      const option = root.querySelector<HTMLInputElement>(
        `[data-builder-field="mode"][value="${value}"]`,
      );
      assert(option, `Missing timing option: ${value}`);
      option.click();
      return option;
    }
    if (
      ["end", "endOffset"].includes(key) &&
      !root.querySelector<HTMLInputElement>(`[data-builder-field="${key}"]`)
    )
      click(key === "end" ? "Add end of window" : "Add end offset");
    const node = root.querySelector<HTMLInputElement>(
      `[data-builder-field="${key}"]`,
    );
    assert(node, `Missing builder field: ${key}`);
    if (key === "anchor") {
      node.dispatchEvent(
        new CustomEvent("value-changed", { detail: { value } }),
      );
      return node;
    }
    if (node.tagName === "HA-SELECTOR") {
      (node as unknown as TestSelector).select(value);
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
  const choose = (ids: string[]) => {
    const selector = root.querySelector<TestSelector>(
      '[data-editor-section="entities"] ha-selector',
    );
    if (selector?.select) {
      selector.select(ids);
      return;
    }
    for (const node of root.querySelectorAll<HTMLInputElement>(
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
  const select = (id: string) => {
    const trigger = root.querySelector<HTMLButtonElement>(
      `[data-step-menu="${id}"]`,
    );
    assert(trigger, "Missing step overflow menu");
    if (trigger.getAttribute("aria-expanded") !== "true") trigger.click();
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
  let parentId = "",
    childId = "",
    endId = "";
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
        root.querySelectorAll<HTMLButtonElement>("nav button").length === 2,
        "Primary navigation is not simplified",
      );
      assert(
        !root.textContent.includes("Validate draft"),
        "Separate validation remains in normal flow",
      );
      click("Create your first step");
      field("name", "Evening lights");
      fit();
      assert(
        required(
          root.querySelector<HTMLInputElement>('[data-builder-field="start"]'),
        ).type === "time" &&
          required(
            root.querySelector<HTMLInputElement>(
              '[data-builder-field="start"]',
            ),
          ).getBoundingClientRect().height > 0 &&
          root.textContent.includes("Start time window") &&
          !root.querySelector<HTMLInputElement>('[data-builder-field="end"]') &&
          !root.querySelector<HTMLInputElement>(
            '[data-builder-field="variation"]',
          ) &&
          !root.querySelector<HTMLInputElement>('[data-builder-field="days"]'),
        "Start time is missing when only the HA selector wrapper is loaded, or removed controls are still shown",
      );
      assert(
        root.textContent.includes(
          "Runs at 18:00. Add an end of window to introduce randomness.",
        ),
        "Fixed-time explanation does not match the selected start",
      );
      field("start", "17:45");
      assert(
        root.textContent.includes("Runs at 17:45."),
        "Explanation did not update while editing",
      );
      field("end", "18:15");
      assert(
        root.textContent.includes(
          "Runs at a random time between 17:45 and 18:15.",
        ),
        "Window explanation does not match the selected bounds",
      );
      click("Continue");
      click("Continue");
      assert(
        root.textContent.includes("Select at least one"),
        "Empty selection did not explain the problem",
      );
      choose(["light.living_room", "switch.floor_lamp"]);
      click("Continue");
      fit();
      field("brightness", "60");
      fit();
      const before = calls.length;
      await save();
      const entry = stepEntries(panel.saved)[0];
      parentId = entry.id;
      assert(
        entry.entities.length === 2 && required(entry.actions).length === 2,
        "Mixed domain selection was lost",
      );
      assert(
        required(required(entry.actions)[0].data).brightness_pct === 60 &&
          Object.keys(required(entry.actions)[1].data || {}).length === 0,
        "Light settings leaked into switch service data",
      );
      assert(
        required(required(entry.when).clock_range).earliest === "17:45" &&
          required(required(entry.when).clock_range).latest === "18:15",
        "Clock variation not stored",
      );
      assert(
        required(panel.saved.groups).length === 0 &&
          required(required(panel.saved.lighting).baseline).length === 1,
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
        required(panel.stepEditor).form.entities.length === 2,
        "Parent entities not prefilled",
      );

      assert(
        required(
          root.querySelector<HTMLInputElement>(
            '[data-builder-field="mode"]:checked',
          ),
        ).value === "relative",
        "Related timing not selected",
      );
      field("name", "Kitchen lights");
      field("startOffset", "30m");
      click("Continue");
      choose(["light.kitchen"]);
      click("Continue");
      await save();
      childId = required(panel.selectedStep);
      select(childId);
      click("Add related step");
      field("name", "Lights out");
      field("startOffset", "120m");
      click("Continue");
      choose(["light.kitchen", "light.living_room", "switch.floor_lamp"]);
      click("Continue");
      field("action", "turn_off");
      await save();
      endId = required(panel.selectedStep);
      assert(
        stepEntries(panel.saved).length === 3,
        "Extra user-facing routines created",
      );
      assert(
        root.textContent.includes(
          "Runs 30 minutes after Evening lights step.",
        ) &&
          root.textContent.includes("Runs 2 hours after Kitchen lights step."),
        "Relationships missing from list",
      );
      click("Preview schedule");
      await wait(() => !panel.busy && panel.preview);
      assert(
        required(panel.preview).valid,
        `Related step preview infeasible: ${JSON.stringify(panel.preview)}`,
      );
      for (const plan of required(panel.preview).plans) {
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
      const remove = [
        ...root.querySelectorAll<HTMLButtonElement>("button"),
      ].find((b) => b.textContent === "Delete" && !b.closest("[hidden]"));
      assert(
        !required(remove).disabled &&
          !required(
            root.querySelector<HTMLElement>(".step-menu:not([hidden])"),
          ).textContent.includes("Used by"),
        "Menu should offer Delete without dependency details",
      );
      const before = JSON.stringify(panel.draft);
      click("Delete");
      const dialog = root.querySelector<HTMLDialogElement>(
        ".step-delete-dialog",
      );
      assert(
        dialog?.open && dialog.matches(":modal"),
        "Delete did not open a modal confirmation",
      );
      assert(
        dialog.textContent.includes("Kitchen lights") &&
          dialog.textContent.includes(
            "Change those relationships before deleting.",
          ),
        "Confirmation did not explain dependencies",
      );
      const confirm = [
        ...dialog.querySelectorAll<HTMLButtonElement>("button"),
      ].find((b) => b.textContent === "Delete step");
      assert(required(confirm).disabled, "Dependent step can be deleted");
      required(confirm).click();
      assert(
        JSON.stringify(panel.draft) === before,
        "Blocked deletion changed the draft",
      );
      click("Cancel");
      await wait(
        () => !root.querySelector<HTMLDialogElement>(".step-delete-dialog"),
      );
      assert(
        root.activeElement ===
          root.querySelector<HTMLButtonElement>(
            `[data-step-menu="${parentId}"]`,
          ),
        "Cancel did not restore focus",
      );
      select(parentId);
      click("Edit step");
      const entityPicker = root.querySelector<TestSelector>(
        '[data-editor-section="entities"] [data-builder-field="entities"]',
      );
      assert(
        root.querySelectorAll<HTMLElement>("[data-editor-section]").length ===
          3 &&
          entityPicker?.tagName === "HA-SELECTOR" &&
          Array.isArray(entityPicker.value) &&
          entityPicker.value.length > 0 &&
          required(required(entityPicker.selector.entity).filter).domain.join(
            ",",
          ) === "light,switch" &&
          root.querySelector<HTMLInputElement>(
            '[data-builder-field="action"]',
          ) &&
          root.querySelector<HTMLInputElement>('[data-builder-field="start"]'),
        "Existing routine does not show entities, action and timing together",
      );
      assert(
        !root.querySelector<HTMLElement>(".builder-steps") &&
          ![...root.querySelectorAll<HTMLButtonElement>("button")].some((b) =>
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
        ...required(
          root.querySelector<TestSourcePicker>('[data-builder-field="anchor"]'),
        ).sourceChoices,
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
        required(edited).entities.includes("light.hall") &&
          required(required(required(edited).actions)[0].data)
            .brightness_pct === 55 &&
          required(required(required(edited).when).clock_range).earliest ===
            "18:05",
        "Single-page save lost edits made across multiple sections",
      );
      assert(
        required(stepEntries(panel.saved)[1].when).relative_to === parentId,
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
        required(required(stepEntries(panel.saved)[0].when).sun_range)
          .offset_range.min === "-40m",
        "Before-sunset offset sign was lost",
      );
      await panel.runPreview();
      assert(
        required(panel.preview).valid,
        "Sun timing failed planner validation",
      );
      select(parentId);
      click("Edit step");
      field("mode", "absolute");
      field("start", "23:50");
      field("end", "00:20");
      assert(
        root.textContent.includes(
          "Runs at a random time between 23:50 and 00:20 the next day.",
        ),
        "Overnight explanation does not clarify the end date",
      );
      await save();
      await panel.runPreview();
      assert(
        required(panel.preview).valid &&
          required(required(stepEntries(panel.saved)[0].when).clock_range)
            .cross_midnight,
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
      panel._hass.callWS = async <T>(
        message: Record<string, unknown>,
      ): Promise<T> =>
        message.type === "occupied/editor_validate"
          ? ({
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
            } as T)
          : original<T>(message);
      try {
        click("Save step");
        await wait(() => !panel.busy);
        assert(
          root.querySelector<HTMLInputElement>(
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
      let release: (() => void) | undefined;
      const releaseGate = () => required(release)();
      let gate = "occupied/editor_validate";
      panel._hass.callWS = async (message) => {
        if (message.type === gate)
          await new Promise<void>((r) => {
            release = r;
          });
        return original(message);
      };
      try {
        const saves = calls.filter((c) => c.type === "occupied/save").length;
        click("Save step");
        await wait(() => release);
        field("start", "21:00");
        releaseGate();
        await wait(() => !panel.busy);
        assert(
          required(panel.stepEditor).form.timing.start === "21:00" &&
            calls.filter((c) => c.type === "occupied/save").length === saves,
          "Stale validation saved or overwrote new edits",
        );
        gate = "occupied/save";
        release = undefined;
        click("Save step");
        await wait(() => release);
        field("start", "23:50"); // Revert to the value from before editing.
        releaseGate();
        await wait(() => !panel.busy);
        assert(
          required(panel.stepEditor).form.timing.start === "23:50" &&
            required(
              required(
                required(required(panel.saved.routines)[0].steps)[0].when,
              ).clock_range,
            ).earliest === "21:00",
          "Save response replaced newer edits",
        );
      } finally {
        panel._hass.callWS = original;
      }
      await save();
      assert(
        stepEntries(panel.saved).length === 3 &&
          required(
            required(required(required(panel.saved.routines)[0].steps)[0].when)
              .clock_range,
          ).earliest === "23:50",
        "Saving retained edits duplicated the routine or lost the time",
      );
    },
  );
  await check(
    "scene and service steps use explicit intervals and relative offset bounds",
    async () => {
      click("Create step");
      field("name", "Morning scene");
      field("start", "06:40:00");
      field("end", "07:20:00");
      click("Continue");
      field("kind", "scene");
      choose(["scene.morning"]);
      click("Continue");
      await save();
      const morning = stepEntries(panel.saved).find(
        (e) => e.name === "Morning scene",
      );
      assert(
        required(required(morning).actions)[0].action === "scene.turn_on",
        "Scene was not saved as a scene call",
      );
      select(required(morning).id);
      click("Add related step");
      field("name", "Breakfast blinds");
      const offset = field("startOffset", "30");
      assert(
        offset.getAttribute("aria-invalid") === "true" &&
          !offset.checkValidity() &&
          root.textContent.includes("Use h, m or s"),
        "Invalid offset format was not explained as typed",
      );
      field("startOffset", "10s");
      assert(
        offset ===
          root.querySelector<HTMLInputElement>(
            '[data-builder-field="startOffset"]',
          ) &&
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

      await save();
      const breakfast = stepEntries(panel.saved).find(
        (e) => e.name === "Breakfast blinds",
      );
      assert(
        required(required(breakfast).when).relative_to ===
          required(morning).id &&
          required(required(required(breakfast).when).offset_range).min ===
            "10s",
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
        (Date.parse(times[required(breakfast).id]) -
          Date.parse(times[required(morning).id])) /
        1000;
      assert(
        delta >= 10 && delta <= 1200,
        "Breakfast did not follow the sampled Morning time",
      );
      select(required(breakfast).id);
      click("Edit step");
      field("name", "Breakfast shades");
      await save();
      assert(
        required(
          required(
            required(
              stepEntries(panel.saved).find(
                (e) => e.id === required(breakfast).id,
              ),
            ).actions,
          )[0].data,
        ).position === 75,
        "Service data was lost while editing",
      );
      // Remove these independent examples to retain the following managed-draft fixture.
      const next = structuredClone(panel.saved);
      next.routines = required(next.routines).filter(
        (r) =>
          !required(r.steps).some((e) =>
            [required(morning).id, required(breakfast).id].includes(e.id),
          ),
      );
      await panel.save(next);
      home();
      fit();
      assert(deviceCalls.length === 0, "Step editing controlled devices");
    },
  );
  await check(
    "relative time picker searches grouped HA sources and retains references",
    async () => {
      const originalCatalog = panel.catalog;
      const knownSources = (originalCatalog.time_sources || []).map(
        (source) => source.value,
      );
      assert(
        [
          "entity:input_datetime.wake_up",
          "entity:sensor.phone_next_alarm",
          "entity:calendar.work:start_time",
          "entity:calendar.work:end_time",
        ].every((value) => knownSources.includes(value)),
        "Catalog did not offer all HA time sources",
      );
      panel.catalog = {
        ...originalCatalog,
        time_sources: [
          { value: "sun:dawn", name: "Dawn", group: "Solar events" },
          {
            value: "entity:sensor.next_alarm",
            entity_id: "sensor.next_alarm",
            name: "Phone alarm",
            group: "Home Assistant times",
          },
          {
            value: "entity:calendar.work:start_time",
            name: "Work · start",
            group: "Calendars",
          },
        ],
      };
      home();
      click("Create step");
      field("name", "Alarm relative step");
      field("mode", "relative");
      const search = root.querySelector<TestSourcePicker>(
        '[data-builder-field="anchor"]',
      );
      required(search).focus();
      assert(
        [
          ...root.querySelectorAll<HTMLElement>(
            '[data-source-value^="step:"], [data-source-value^="sun:"]',
          ),
        ].every((row) => !row.querySelector<HTMLElement>("small")),
        "Fallback repeats group labels on rows",
      );
      required(search).value = "Phone";
      required(search).dispatchEvent(new Event("input", { bubbles: true }));
      let picker = search;
      assert(
        root.querySelector<HTMLElement>(
          '[data-source-value="entity:sensor.next_alarm"]',
        ),
        "Search lost alarm source",
      );
      assert(
        !root.querySelector<HTMLElement>('[data-source-value="sun:dawn"]'),
        "Search did not filter solar event",
      );
      required(search).value = "no such source";
      required(search).dispatchEvent(new Event("input", { bubbles: true }));
      assert(
        required(
          root.querySelector<HTMLElement>("[data-source-status]"),
        ).textContent.includes("No matching"),
        "No-results feedback missing",
      );
      required(search).value = "Phone";
      required(search).dispatchEvent(new Event("input", { bubbles: true }));
      required(search).dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
      assert(
        required(search).hasAttribute("aria-activedescendant"),
        "Keyboard result did not get highlighted",
      );
      required(search).dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
      assert(
        required(
          root.querySelector<TestSourcePicker>('[data-builder-field="anchor"]'),
        ).value === "Phone alarm",
        "Keyboard did not select result by friendly name",
      );
      assert(
        required(root.querySelector<HTMLElement>("#relative-source-results"))
          .hidden,
        "Selection left results open",
      );
      field("startOffset", "-30m");
      field("endOffset", "-10m");
      assert(
        required(
          root.querySelector<HTMLElement>("[data-timing-explanation]"),
        ).textContent.includes("Phone alarm"),
        "Timing explanation lost friendly source name",
      );
      click("Continue");
      choose(["light.hall"]);
      click("Continue");
      await save();
      const entry = stepEntries(panel.saved).find(
        (step) => step.name === "Alarm relative step",
      );
      assert(
        required(required(required(entry).when).entity_range).entity_id ===
          "sensor.next_alarm" &&
          required(required(required(entry).when).entity_range).offset_range
            .min === "-30m",
        "HA source was not saved",
      );
      // Temporarily absent sources remain editable; do not silently switch anchors.
      panel.catalog = originalCatalog;
      select(required(entry).id);
      click("Edit step");
      picker = root.querySelector<TestSourcePicker>(
        '[data-builder-field="anchor"]',
      );
      assert(
        required(picker).selectedValue === "entity:sensor.next_alarm",
        "Missing source reference was lost",
      );
      click("Cancel");
      const next = structuredClone(panel.saved);
      next.routines = required(next.routines).filter(
        (routine) =>
          !required(routine.steps).some(
            (step) => step.id === required(entry).id,
          ),
      );
      await panel.save(next);
      home();
      fit();
      assert(
        deviceCalls.length === 0,
        "Time source editing controlled devices",
      );
    },
  );
  await check(
    "managed-file creation keeps changes in an exportable draft",
    async () => {
      await panel.selectSource("file", "occupied/house.yaml");
      home();
      const saves = calls.filter((c) => c.type === "occupied/save").length;
      click("Create step");
      field("name", "Hall light");
      click("Continue");
      choose(["light.hall"]);
      click("Continue");
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
  await check(
    "HA generic time picker uses live-search item contract and explicit selections",
    async () => {
      const get = customElements.get;
      try {
        customElements.get = function (name) {
          return name === "ha-generic-picker"
            ? HTMLElement
            : get.call(this, name);
        };
        home();
        click("Create step");
        field("mode", "relative");
        let picker = root.querySelector<TestSourcePicker>(
          '[data-builder-field="anchor"]',
        );
        assert(
          required(picker).tagName === "HA-GENERIC-PICKER",
          "Native HA picker was not used",
        );
        assert(
          !root.querySelector<HTMLInputElement>("#relative-source-search") &&
            !root.querySelector<HTMLElement>(".source-picker select"),
          "Separate search/dropdown remains",
        );
        assert(
          required(picker).allowCustomValue === false &&
            required(picker).required,
          "Picker permits arbitrary anchors",
        );
        assert(
          required(picker)
            .getItems()
            .some(
              (item) =>
                typeof item !== "string" &&
                item.id === "sun:sunset" &&
                item.primary,
            ),
          "Native picker did not receive friendly items",
        );
        const items = required(picker)
          .getItems()
          .filter((item) => typeof item !== "string");
        assert(
          items
            .filter(
              (item) =>
                item.id.startsWith("step:") || item.id.startsWith("sun:"),
            )
            .every((item) => !item.secondary),
          "Native picker repeats group label on rows",
        );
        assert(
          items.some(
            (item) =>
              item.id === "entity:input_datetime.wake_up" &&
              item.secondary === "input_datetime.wake_up",
          ),
          "Native picker lost time helper",
        );
        assert(
          items.some((item) => item.id === "entity:sensor.phone_next_alarm"),
          "Native picker lost timestamp sensor",
        );
        assert(
          items.some((item) => item.id === "entity:calendar.work:end_time"),
          "Native picker lost calendar end",
        );
        assert(
          required(picker).notFoundLabel.includes("No matching"),
          "Native picker lacks empty results feedback",
        );
        field("anchor", "sun:sunset");
        picker = root.querySelector<TestSourcePicker>(
          '[data-builder-field="anchor"]',
        );
        assert(
          required(picker).value === "sun:sunset" &&
            required(panel.stepEditor).form.timing.anchor === "sun:sunset",
          "Native event did not update selection",
        );
        assert(
          required(picker).valueRenderer("sun:sunset").getAttribute("slot") ===
            "headline",
          "Native selected name does not use headline slot",
        );
        required(picker).dispatchEvent(
          new CustomEvent("value-changed", { detail: { value: "invented" } }),
        );
        assert(
          required(panel.stepEditor).form.timing.anchor === "sun:sunset",
          "Invalid native option changed anchor",
        );
        click("Cancel");
      } finally {
        customElements.get = get;
        panel.stepEditor = null;
        home();
      }
    },
  );
  await check(
    "step cards use accessible overflow menus without a detail pane",
    async () => {
      home();
      assert(
        !root.querySelector<HTMLElement>(".routine-detail"),
        "Right-hand detail pane remains",
      );
      const entry = stepEntries(panel.draft).find(
        (step) => step.kind === "steps",
      );
      select(required(entry).id);
      const trigger = root.querySelector<HTMLButtonElement>(
        `[data-step-menu="${required(entry).id}"]`,
      );
      const menu = root.querySelector<HTMLElement>(
        `#step-actions-${required(entry).id}`,
      );
      assert(
        required(trigger).getAttribute("aria-expanded") === "true",
        "Menu did not open",
      );
      assert(
        String(root.activeElement?.textContent) === "Edit step",
        "Menu did not focus first action",
      );
      required(menu).dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
      assert(
        root.activeElement?.textContent === "Add related step",
        "Menu keyboard navigation failed",
      );
      required(menu).dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      assert(
        required(menu).hidden && root.activeElement === trigger,
        "Escape did not close menu and restore focus",
      );
      select(required(entry).id);
      click("Add related step");
      assert(
        required(panel.stepEditor).form.timing.anchor ===
          `step:${required(entry).id}`,
        "Menu selected wrong relative parent",
      );
      click("Cancel");
      select(required(entry).id);
      click("Edit step");
      assert(
        required(panel.stepEditor).id === required(entry).id &&
          required(panel.stepEditor).existing,
        "Menu edited wrong step",
      );
      click("Cancel");
      fit();
    },
  );
  await check(
    "deletion requires confirmation and cancellation preserves the draft",
    async () => {
      home();
      const leaf = stepEntries(panel.draft).find((step) => step.id === endId);
      assert(leaf, "Missing leaf step");
      select(leaf.id);
      click("Duplicate");
      const id = required(panel.selectedStep);
      const before = JSON.stringify(panel.draft);
      select(id);
      click("Delete");
      let dialog = root.querySelector<HTMLDialogElement>(".step-delete-dialog");
      assert(
        dialog?.open && required(root.activeElement).textContent === "Cancel",
        "Confirmation should initially focus Cancel",
      );
      assert(
        JSON.stringify(panel.draft) === before,
        "Opening confirmation deleted the step",
      );
      click("Cancel");
      await wait(
        () => !root.querySelector<HTMLDialogElement>(".step-delete-dialog"),
      );
      assert(
        JSON.stringify(panel.draft) === before,
        "Cancel changed the draft",
      );
      select(id);
      click("Delete");
      dialog = root.querySelector<HTMLDialogElement>(".step-delete-dialog");
      required(dialog).requestClose(); // Native dismissal follows the same path as Escape.
      await wait(
        () => !root.querySelector<HTMLDialogElement>(".step-delete-dialog"),
      );
      assert(
        JSON.stringify(panel.draft) === before,
        "Dismissal changed the draft",
      );
      select(id);
      click("Delete");
      dialog = root.querySelector<HTMLDialogElement>(".step-delete-dialog");
      assert(
        !required(
          [
            ...required(dialog).querySelectorAll<HTMLButtonElement>("button"),
          ].find((b) => b.textContent === "Delete step"),
        ).disabled,
        "Independent step deletion is blocked",
      );
      fit();
      click("Delete step");
      await wait(
        () => !root.querySelector<HTMLDialogElement>(".step-delete-dialog"),
      );
      assert(
        !stepEntries(panel.draft).some((step) => step.id === id),
        "Confirmed deletion retained the step",
      );
      assert(
        stepEntries(panel.draft).some((step) => step.id === leaf.id),
        "Deletion removed the original instead of the duplicate",
      );
      assert(panel.dirty, "Confirmed deletion did not leave a draft change");
      fit();
    },
  );
}
