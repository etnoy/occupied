import { expect, test } from "@playwright/test";
import { expectedHaShellError } from "../frontend/src/ha-shell-errors.js";
import type { OccupiedPanel } from "@occupied/occupied-panel.js";
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
  await panel.getByRole("button", { name: "Create your first step" }).click();
  await panel
    .getByRole("textbox", { name: "Step name", exact: true })
    .fill("Evening light");
  await panel
    .getByRole("radio", { name: "Absolute time", exact: true })
    .check();
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
  await panel.getByRole("button", { name: "Save step", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "Evening light", exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(
    panel.getByRole("button", { name: "Evening light", exact: true }),
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
  await page.reload();
  await panel
    .getByRole("button", { name: "Evening light", exact: true })
    .click();
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
  expect(saves).toHaveLength(2);
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
  expect(errors).toEqual([]);
});
