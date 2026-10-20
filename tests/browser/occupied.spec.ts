import { expect, test } from "@playwright/test";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { expectedHaShellError } from "../frontend/src/ha-shell-errors.js";
import type { OccupiedPanel } from "@occupied/occupied-panel.js";
import type { Catalog, HaSelector } from "@occupied/lib/types.js";
import type { ProgramDocument } from "@occupied/lib/types.js";

test("create, preview, delete and protect YAML edits in the installed release", async ({
  page,
  request,
}) => {
  // Capture errors throughout HA setup and the installed panel, including reload.
  const errors: string[] = [];
  const saves: { steps?: Record<string, unknown> }[] = [];
  page.on("websocket", (socket) => {
    socket.on("framesent", ({ payload }) => {
      const message = JSON.parse(payload.toString()) as {
        type?: string;
        program?: { steps?: Record<string, unknown> };
      };
      if (message.type === "occupied/save" && message.program) {
        saves.push(message.program);
      }
    });
  });
  let panelStarted = false;
  page.on("pageerror", (error) => {
    if (expectedHaShellError(error, panelStarted)) {
      return;
    }
    errors.push(error.message);
  });

  const owner = await request.post("/api/onboarding/users", {
    data: {
      name: "Browser tests",
      username: "smoke",
      password: "disposable-smoke-password",
      client_id: "http://127.0.0.1:18123/",
      language: "en",
    },
  });
  expect(owner.ok(), await owner.text()).toBeTruthy();

  const { auth_code: authCode } = (await owner.json()) as { auth_code: string };
  const response = await request.post("/auth/token", {
    form: {
      grant_type: "authorization_code",
      code: authCode,
      client_id: "http://127.0.0.1:18123/",
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const tokens = await response.json();
  await page.addInitScript(
    (session) => {
      localStorage.setItem("hassTokens", JSON.stringify(session));
    },
    {
      ...tokens,
      hassUrl: "http://127.0.0.1:18123",
      clientId: "http://127.0.0.1:18123/",
      expires: Date.now() + tokens.expires_in * 1000,
    },
  );

  await page.goto("/config/integrations/dashboard");
  // Newer HA frontends ask for confirmation before opening settings.
  const confirm = page.getByRole("button", { name: "Confirm", exact: true });
  const addIntegration = page.getByRole("button", {
    name: "Add integration",
    exact: true,
  });
  await expect(confirm.or(addIntegration).first()).toBeVisible();
  if (await confirm.isVisible()) {
    await confirm.click();
  }
  await page.goto("/config/integrations/dashboard/add?domain=occupied");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await page.getByText("Create in the UI", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Controller name*", exact: true })
    .fill("Smoke controller");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page
    .getByRole("button", { name: "Skip and finish", exact: true })
    .click();

  panelStarted = true;
  await page.goto("/occupied");
  const panel = page.locator("occupied-panel");
  await expect(
    panel.getByRole("button", { name: "Create your first step" }),
  ).toBeVisible();
  const entryId = await panel.evaluate((element) => {
    const controller = element as OccupiedPanel;
    controller.change(["name"], "Pending reload draft");
    const callWS = controller._hass.callWS.bind(controller._hass);
    let failOnce = true;
    controller._hass.callWS = <T>(message: Record<string, unknown>) => {
      if (failOnce && message.type === "occupied/program") {
        failOnce = false;

        return Promise.reject(new Error("Simulated controller load failure"));
      }

      return callWS<T>(message);
    };

    return controller.selectedEntry;
  });
  const reloadEntry = () =>
    request.post(`/api/config/config_entries/entry/${entryId}/reload`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
  const failedReload = await reloadEntry();
  expect(failedReload.ok()).toBeTruthy();
  await expect(panel.locator("#error")).toHaveText(
    "Simulated controller load failure",
  );
  await expect(
    panel.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(panel.locator("#error")).toBeHidden();
  expect(
    await panel.evaluate((element) => (element as OccupiedPanel).draft?.name),
  ).toBe("Pending reload draft");
  await panel.evaluate((element) => (element as OccupiedPanel).discardEdits());
  const recoveredReload = await reloadEntry();
  expect(recoveredReload.ok()).toBeTruthy();
  await expect
    .poll(() =>
      panel.evaluate((element) => (element as OccupiedPanel).entryLoaded),
    )
    .toBe(true);
  await panel.getByRole("button", { name: "Create your first step" }).click();
  await panel
    .getByRole("textbox", { name: "Step name", exact: true })
    .fill("Evening light");
  await panel.getByRole("radio", { name: "Time of day", exact: true }).check();
  // Interact with HA's real time and entity selectors through their native inputs.
  const clock = panel.locator('[data-builder-field="start"]');
  await clock.locator('input[name="hours"]').fill("7");
  await clock.locator('input[name="minutes"]').fill("15");
  await clock.locator('input[name="minutes"]').press("Tab");
  await panel
    .locator('[data-builder-field="entities"]')
    .getByRole("listitem")
    .click();
  await page.getByText("Smoke light", { exact: true }).click();
  await panel
    .getByRole("button", { name: "Step actions", exact: true })
    .click();
  await panel.getByRole("menuitem", { name: "Preview", exact: true }).click();
  const actionPreview = panel.getByRole("dialog", {
    name: "Preview",
    exact: true,
  });
  await expect(actionPreview).toContainText("light.turn_on");
  await expect(actionPreview).toContainText("light.smoke_light");
  expect(saves).toHaveLength(0);
  await actionPreview
    .getByRole("button", { name: "Test action: Action", exact: true })
    .click();
  await expect(actionPreview.getByRole("status")).toHaveText(
    "Command completed.",
  );
  await actionPreview
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Step actions", exact: true }),
  ).toBeFocused();
  await panel.getByRole("button", { name: "Save step", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: /^Evening light(?:\s|$)/ }),
  ).toBeVisible();

  await expect(panel.locator(".step-row")).toHaveAccessibleName(
    /Evening light.*Turn on.*Smoke light.*Runs at/,
  );
  await panel.getByRole("button", { name: "Random", exact: true }).click();
  await panel.locator("[data-create-random]").click();
  await panel.evaluate((element) => {
    const controller = element as OccupiedPanel;
    const form = controller.randomEditor!.form;
    form.on.entities = ["light.smoke_light"];
    form.off.entities = [];
    form.sameEntities = true;
    controller.flush();
  });
  const savedCount = saves.length;
  await panel.locator("[data-random-actions]").click();
  await panel.getByRole("menuitem", { name: "Preview", exact: true }).click();
  const randomPreview = panel.getByRole("dialog", {
    name: "Preview",
    exact: true,
  });
  await expect(randomPreview.locator("pre")).toHaveCount(2);
  await expect(randomPreview.locator("pre").first()).toContainText(
    "light.turn_on",
  );
  await expect(randomPreview.locator("pre").last()).toContainText(
    "light.turn_off",
  );
  await expect(randomPreview.locator("pre").last()).toContainText(
    "light.smoke_light",
  );
  await randomPreview
    .getByRole("button", {
      name: "Test action: When event starts",
      exact: true,
    })
    .click();
  await expect(randomPreview.getByRole("status")).toHaveText(
    "Command completed.",
  );
  await randomPreview
    .getByRole("button", { name: "Test action: When event ends", exact: true })
    .click();
  await expect(randomPreview.getByRole("status")).toHaveCount(2);
  expect(saves).toHaveLength(savedCount);
  await randomPreview
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(panel.locator("[data-random-actions]")).toBeFocused();
  await panel.evaluate((element) => {
    const controller = element as OccupiedPanel;
    controller.randomEditor = null;
    controller.tab = "steps";
    controller.renderView();
  });
  await panel.getByRole("button", { name: /^Evening light(?:\s|$)/ }).click();
  const editedName = panel.getByRole("textbox", {
    name: "Step name",
    exact: true,
  });
  await editedName.fill("Unsaved name");
  await panel.getByRole("button", { name: "Preview", exact: true }).click();
  const unsaved = panel.getByRole("alertdialog", {
    name: "Unsaved changes",
    exact: true,
  });
  await expect(unsaved).toBeVisible();
  expect(await unsaved.evaluate((element) => element.matches(":modal"))).toBe(
    true,
  );
  const keepEditing = unsaved.getByRole("button", {
    name: "Keep editing",
    exact: true,
  });
  const discard = unsaved.getByRole("button", {
    name: "Discard changes",
    exact: true,
  });
  await expect(keepEditing).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(discard).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(keepEditing).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(unsaved).not.toBeVisible();
  await expect(editedName).toHaveValue("Unsaved name");
  await panel.getByRole("button", { name: "Settings", exact: true }).click();
  await unsaved
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(unsaved).not.toBeVisible();

  await page.reload();
  await expect(
    panel.getByRole("button", { name: /^Evening light(?:\s|$)/ }),
  ).toBeVisible();
  // Entity warnings remain on their cards after save, editor changes, and reload.
  const unavailableState = await request.post(
    "/api/states/light.browser_unavailable",
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      data: { state: "unavailable" },
    },
  );
  expect(unavailableState.ok()).toBeTruthy();
  const beforeWarnings = await panel.evaluate(async (element) => {
    const controller = element as OccupiedPanel;
    const program = controller.saved!;
    await controller.save({
      ...program,
      steps: {
        ...program.steps,
        browser_unavailable: {
          name: "Unavailable step",
          action: "turn_on",
          entities: ["light.browser_unavailable"],
          timing: { absolute_time: { start: "18:00" } },
        },
      },
      random: {
        browser_unavailable: {
          name: "Unavailable event",
          start: { absolute_time: { start: "18:00" } },
          end: { duration: { min: "1h" } },
          on: { action: "turn_on", entities: ["light.browser_unavailable"] },
          off: { action: "turn_off", entities: ["light.browser_unavailable"] },
        },
      },
    });

    return JSON.stringify(program);
  });
  const stepWarning = panel.locator('[data-step-id="browser_unavailable"]');
  await expect(stepWarning).toHaveClass(/step-warning/);
  await expect(stepWarning.locator(".step-row-warning")).toContainText(
    "Unresolved entity: light.browser_unavailable",
  );
  await expect(
    panel
      .locator("#issues")
      .getByText("Unresolved entity: light.browser_unavailable", {
        exact: true,
      }),
  ).toHaveCount(2);
  await stepWarning.locator(".step-row").click();
  await expect(stepWarning).toHaveClass(/step-warning/);
  await panel.getByRole("button", { name: "Random", exact: true }).click();
  const eventWarning = panel.locator('[data-random-id="browser_unavailable"]');
  await expect(eventWarning).toHaveClass(/step-warning/);
  await expect(eventWarning.locator(".step-warning-message")).toHaveCount(2);
  await expect(eventWarning.locator(".step-row-warning")).toContainText(
    "Unresolved entity: light.browser_unavailable",
  );
  await eventWarning.locator(".step-row").click();
  await expect(eventWarning).toHaveClass(/step-warning/);
  await expect(
    panel
      .locator("#issues")
      .getByText("Unresolved entity: light.browser_unavailable", {
        exact: true,
      }),
  ).toHaveCount(1);
  await page.reload();
  await panel.getByRole("button", { name: "Random", exact: true }).click();
  await expect(eventWarning).toHaveClass(/step-warning/);
  const recoveredState = await request.post(
    "/api/states/light.browser_unavailable",
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      data: { state: "off" },
    },
  );
  expect(recoveredState.ok()).toBeTruthy();
  await page.reload();
  await panel.getByRole("button", { name: "Random", exact: true }).click();
  await expect(eventWarning).not.toHaveClass(/step-warning/);
  await panel.getByRole("button", { name: "Steps", exact: true }).click();
  await expect(stepWarning).not.toHaveClass(/step-warning/);
  await panel.evaluate(async (element, program) => {
    await (element as OccupiedPanel).save(
      JSON.parse(program) as ProgramDocument["program"],
    );
  }, beforeWarnings);

  // Configuration order wins over start times and old browser preferences.
  const ids = await panel.evaluate((element) => {
    const controller = element as OccupiedPanel;
    const draft = controller.draft;
    if (!draft) {
      throw new Error("Expected a loaded program before checking list order");
    }
    const first = Object.keys(draft.steps!)[0];
    controller.draft = {
      ...draft,
      steps: {
        ...draft.steps,
        browser_child: {
          ...draft.steps![first],
          name: "Dependent light",
          timing: { relative_to: { step: first, start_offset: "-1h" } },
        },
        browser_second: {
          ...draft.steps![first],
          name: "Earlier light",
          timing: { absolute_time: { start: "05:00" } },
        },
      },
      random: {
        browser_late: {
          name: "Late window",
          start: { absolute_time: { start: "22:00" } },
          end: { duration: { min: "1h" } },
          on: { action: "turn_on", entities: ["light.smoke_light"] },
          off: { action: "turn_off", entities: ["light.smoke_light"] },
        },
        browser_early: {
          name: "Early window",
          start: { absolute_time: { start: "06:00" } },
          end: { duration: { min: "1h" } },
          on: { action: "turn_on", entities: ["light.smoke_light"] },
          off: { action: "turn_off", entities: ["light.smoke_light"] },
        },
      },
    };
    localStorage.setItem(
      `occupied:activity-order:${controller.selectedEntry}:steps`,
      JSON.stringify(["browser_second", first, "browser_child"]),
    );
    localStorage.setItem(
      `occupied:activity-order:${controller.selectedEntry}:random`,
      JSON.stringify(["browser_early", "browser_late"]),
    );
    controller.renderView();

    return [first, "browser_child", "browser_second"];
  });
  const stepIds = () =>
    panel
      .locator("[data-step-id]")
      .evaluateAll((rows) =>
        rows.map((row) => (row as HTMLElement).dataset.stepId),
      );
  await expect.poll(stepIds).toEqual(ids);
  await expect(panel.locator("[data-step-id=browser_child]")).toHaveCSS(
    "margin-left",
    "14px",
  );
  await expect(panel.getByRole("button", { name: /^Reorder / })).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Reset to chronological", exact: true }),
  ).toHaveCount(0);
  await panel.evaluate((element) => {
    const controller = element as OccupiedPanel;
    controller.hass = {
      ...controller._hass,
      states: { ...controller._hass.states },
    };
    controller.flush();
  });
  await expect.poll(stepIds).toEqual(ids);
  await panel.getByRole("button", { name: "Random", exact: true }).click();
  await expect
    .poll(() =>
      panel
        .locator("[data-random-id]")
        .evaluateAll((rows) =>
          rows.map((row) => (row as HTMLElement).dataset.randomId),
        ),
    )
    .toEqual(["browser_late", "browser_early"]);
  await expect(panel.getByRole("button", { name: /^Reorder / })).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Reset to chronological", exact: true }),
  ).toHaveCount(0);
  await panel.evaluate((element) => {
    const controller = element as OccupiedPanel;
    for (const collection of ["steps", "random"]) {
      localStorage.removeItem(
        `occupied:activity-order:${controller.selectedEntry}:${collection}`,
      );
    }
  });
  await page.reload();
  await expect(
    panel.getByRole("button", { name: /^Evening light(?:\s|$)/ }),
  ).toBeVisible();

  await panel.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(panel.locator("state-history-chart-timeline")).toBeVisible();
  await expect(
    panel.locator("state-history-chart-timeline canvas"),
  ).toBeVisible();
  await expect(
    panel.getByRole("cell", { name: "Smoke light", exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Evening light · step", exact: true }),
  ).toBeVisible();
  const source = panel.getByRole("button", {
    name: "Evening light · step",
    exact: true,
  });
  const sourceNode = (await source.elementHandle())!;
  const chart = panel.locator("state-history-chart-timeline");
  const chartInputs = await chart.evaluateHandle((element) => {
    const timeline = element as HTMLElement & {
      data: unknown;
      startTime: Date;
      endTime: Date;
    };

    return {
      data: timeline.data,
      start: timeline.startTime,
      end: timeline.endTime,
    };
  });
  await source.focus();
  await panel.evaluate((element) => {
    const controller = element as OccupiedPanel;
    for (let index = 0; index < 10; index++) {
      controller.hass = {
        ...controller._hass,
        states: { ...controller._hass.states },
      };
      controller.flush();
    }
  });
  expect(await sourceNode.evaluate((node) => node.isConnected)).toBe(true);
  await expect(source).toBeFocused();
  expect(
    await chart.evaluate((element, before) => {
      const timeline = element as HTMLElement & {
        data: unknown;
        startTime: Date;
        endTime: Date;
      };

      return (
        timeline.data === before.data &&
        timeline.startTime === before.start &&
        timeline.endTime === before.end
      );
    }, chartInputs),
  ).toBe(true);
  await chartInputs.dispose();
  await panel.evaluate((element) => {
    const controller = element as OccupiedPanel;
    const timeline = controller.shadowRoot.querySelector(
      "state-history-chart-timeline",
    ) as HTMLElement & { data: unknown[] };
    timeline.data = [...timeline.data];
    controller.navigate("steps");
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        globalThis.requestAnimationFrame(() =>
          globalThis.requestAnimationFrame(() => resolve()),
        ),
      ),
  );
  expect(errors).toEqual([]);
  // End of preview lifecycle regression.

  await page.reload();
  await panel.getByRole("button", { name: /^Evening light(?:\s|$)/ }).click();
  await panel
    .getByRole("button", { name: "Step actions", exact: true })
    .click();
  await panel
    .getByRole("menuitem", { name: "Delete step", exact: true })
    .click();
  const deletion = panel.getByRole("dialog", {
    name: "Delete step?",
    exact: true,
  });
  await deletion
    .getByRole("button", { name: "Delete step", exact: true })
    .click();
  await expect(deletion).not.toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Create your first step" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    panel.getByRole("button", { name: "Create your first step" }),
  ).toBeVisible();
  expect(saves).toHaveLength(4);
  expect(Object.keys(saves.at(-1)?.steps || {})).toEqual([]);

  await page.reload();
  await panel.getByRole("button", { name: "Settings", exact: true }).click();
  const editor = panel.locator("ha-code-editor");
  const yamlValue = () =>
    editor.evaluate(
      (element) => (element as HTMLElement & { value: string }).value,
    );
  await expect.poll(yamlValue).toContain("Smoke controller");
  const yaml = `${await yamlValue()}\n# Local YAML edit\n`;
  const before = await panel.evaluate((element) => {
    const controller = element as OccupiedPanel;

    return controller._hass.callWS<ProgramDocument>({
      type: "occupied/program",
      config_entry_id: controller.selectedEntry,
    });
  });
  const saveYaml = panel.locator("section.yaml-panel").getByRole("button", {
    name: "Save changes",
    exact: true,
  });
  await expect(saveYaml).toBeDisabled();
  await panel.locator('input[type="file"]').setInputFiles({
    name: "local.yaml",
    mimeType: "text/yaml",
    buffer: Buffer.from(yaml),
  });
  await expect(saveYaml).toBeEnabled();
  const external = await panel.evaluate(async (element, revision) => {
    const controller = element as OccupiedPanel;
    const document = await controller._hass.callWS<ProgramDocument>({
      type: "occupied/program",
      config_entry_id: controller.selectedEntry,
    });

    return controller._hass.callWS<{ valid: boolean }>({
      type: "occupied/save",
      config_entry_id: controller.selectedEntry,
      expected_revision: revision,
      program: { ...document.program, name: "Externally changed controller" },
    });
  }, before.revision);
  expect(external.valid).toBe(true);
  const reload = panel.getByRole("button", {
    name: "Reload saved program",
    exact: true,
  });
  await expect(reload).toBeVisible();
  await reload.click();
  await expect(saveYaml).toBeEnabled();
  await expect.poll(yamlValue).toBe(yaml);
  await saveYaml.click();
  await expect(panel.getByRole("alert")).toContainText("program changed");
  await expect(reload).toBeVisible();
  const saved = await panel.evaluate((element) => {
    const controller = element as OccupiedPanel;

    return controller._hass.callWS<ProgramDocument>({
      type: "occupied/program",
      config_entry_id: controller.selectedEntry,
    });
  });
  expect(saved.program.name).toBe("Externally changed controller");
  await expect.poll(yamlValue).toBe(yaml);
  await panel.evaluate((element) => (element as OccupiedPanel).discardEdits());
  const recoveryEntry = await panel.evaluate(
    (element) => (element as OccupiedPanel).selectedEntry,
  );
  const containerName = await readFile(
    ".browser-artifacts/active-container",
    "utf8",
  );
  const container = containerName.trim();
  expect(container).toMatch(/^occupied-browser-[a-f0-9]{12}$/);
  const docker = promisify(execFile);
  const storageKey = `occupied.${recoveryEntry}.program`;
  const storagePath = `/config/.storage/${storageKey}`;
  const readStoredProgram = async () => {
    const { stdout } = await docker("docker", [
      "exec",
      container,
      "python",
      "-c",
      "from pathlib import Path; import sys; print(Path(sys.argv[1]).read_text())",
      storagePath,
    ]);

    return JSON.parse(stdout).data;
  };
  const preserved = {
    schema_version: 99,
    name: "Preserved future program",
    steps: { future: { opaque: "keep me" } },
  };
  const enterRecovery = async () => {
    await docker("docker", [
      "exec",
      container,
      "python",
      "-c",
      "from pathlib import Path; import sys; Path(sys.argv[1]).write_text(sys.argv[2])",
      storagePath,
      JSON.stringify({
        version: 1,
        minor_version: 1,
        key: storageKey,
        data: preserved,
      }),
    ]);
    // Seed recovery from another HA page; open-panel reload is covered by B1.
    await page.goto("/config/integrations/dashboard");
    const response = await request.post(
      `/api/config/config_entries/entry/${recoveryEntry}/reload`,
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );
    expect(response.ok()).toBeTruthy();
    await page.goto("/occupied");
    await expect(
      panel.getByRole("button", { name: "Steps", exact: true }),
    ).toBeDisabled();
    await expect(
      panel.getByRole("button", { name: "Random", exact: true }),
    ).toBeDisabled();
    await panel
      .getByRole("navigation", { name: "Occupied", exact: true })
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await expect.poll(yamlValue).toContain("schema_version: 99");
    await expect.poll(yamlValue).toContain("keep me");
    expect(await readStoredProgram()).toEqual(preserved);
  };
  await enterRecovery();
  await panel.locator('input[type="file"]').setInputFiles({
    name: "repair.yaml",
    mimeType: "text/yaml",
    buffer: Buffer.from("schema_version: 1\nname: Repaired recovery\n"),
  });
  await saveYaml.click();
  await expect(
    panel.getByRole("button", { name: "Steps", exact: true }),
  ).toBeEnabled();
  await expect(panel.locator("#notice")).toBeHidden();
  await enterRecovery();
  page.once("dialog", (dialog) => dialog.accept());
  await panel
    .getByRole("button", { name: "Discard preserved program", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Create your first step" }),
  ).toBeVisible();
  const discarded = await readStoredProgram();
  expect(discarded.schema_version).toBe(1);
  expect(Object.keys(discarded.steps || {})).toEqual([]);
  // Supply deterministic service descriptions; this exercises help without dispatch.
  await panel.evaluate((element) => {
    const controller = element as OccupiedPanel;
    controller.discardEdits();
    controller.catalog.services.remote = {
      turn_on: {
        name: "Start remote activity",
        target: { entity: [{ domain: "remote" }] },
        fields: {
          activity: {
            required: true,
            description: "Activity to start",
            example: "TV",
          },
        },
      },
    };
    controller.tab = "steps";
    controller.renderView();
  });
  await panel
    .getByRole("button", { name: "Create your first step", exact: true })
    .click();
  const serviceEditor = panel.locator(".step-editor");
  await serviceEditor
    .locator('[data-builder-field="kind"]')
    .selectOption("service");
  const serviceSelector = serviceEditor.locator(
    '[data-builder-field="service"]',
  );
  await serviceSelector.evaluate((element) => {
    element.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: "remote.turn_on" },
        bubbles: true,
      }),
    );
  });
  await expect(
    serviceEditor.getByText("Activity to start", { exact: true }),
  ).toBeVisible();
  await expect(serviceEditor.locator("dt")).toHaveText("activity · Required");
  await serviceEditor
    .getByRole("button", { name: "Insert example", exact: true })
    .click();
  await expect(
    serviceEditor.locator('[data-builder-field="data"]'),
  ).toHaveValue('{\n  "activity": "TV"\n}');
  await expect(
    serviceEditor.getByRole("button", { name: "Insert example", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    panel.getByRole("button", { name: "Create your first step", exact: true }),
  ).toBeVisible();
  // Disposable state only: this editor smoke test never dispatches a device call.
  const remoteState = await request.post("/api/states/remote.service_smoke", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    data: {
      state: "off",
      attributes: {
        friendly_name: "Smoke remote",
        activity_list: ["TV", "Wii"],
      },
    },
  });
  expect(remoteState.ok()).toBeTruthy();
  await panel.evaluate(async (element) => {
    const controller = element as OccupiedPanel;
    controller.discardEdits();
    controller.catalog = (await controller.ws("catalog")) as Catalog;
    controller.tab = "random";
    controller.renderView();
  });
  await panel.locator("[data-create-random]").click();
  const random = panel.locator(".random-editor");
  await random.locator('[data-builder-field="on.kind"]').selectOption("remote");
  await random
    .locator('[data-builder-field="off.kind"]')
    .selectOption("remote");
  await expect(random.locator('[data-builder-field="on.service"]')).toHaveValue(
    "remote.turn_on",
  );
  await expect(
    random.locator('[data-builder-field="off.service"]'),
  ).toHaveValue("remote.turn_off");
  await random
    .locator('[data-builder-field="on.entities"]')
    .evaluate((element) => {
      element.dispatchEvent(
        new CustomEvent("value-changed", {
          detail: { value: ["remote.service_smoke"] },
          bubbles: true,
        }),
      );
    });
  await random.getByRole("checkbox", { name: "Use the same entities" }).check();
  await expect
    .poll(() =>
      random
        .locator('[data-builder-field="on.activity"]')
        .evaluate((element) => (element as HaSelector).selector),
    )
    .toMatchObject({ select: { options: ["TV", "Wii"], custom_value: true } });
  await random
    .locator('[data-builder-field="on.activity"]')
    .evaluate((element) => {
      element.dispatchEvent(
        new CustomEvent("value-changed", {
          detail: { value: "TV" },
          bubbles: true,
        }),
      );
    });
  await random
    .getByRole("button", { name: "Save random event", exact: true })
    .click();
  await expect(random).toHaveCount(0);
  const remoteProgram = await panel.evaluate(
    (element) => (element as OccupiedPanel).saved,
  );
  const remoteEvent = Object.values(remoteProgram!.random!)[0];
  expect(remoteEvent.on).toMatchObject({
    action: "remote.turn_on",
    entities: ["remote.service_smoke"],
    data: { activity: "TV" },
  });
  expect(remoteEvent.off).toMatchObject({
    action: "remote.turn_off",
    entities: ["remote.service_smoke"],
  });
  expect(errors).toEqual([]);
});
