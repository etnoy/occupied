import { expect, test } from "@playwright/test";

test("create a controller, save a step, and preview the installed release", async ({
  page,
  request,
}) => {
  // Capture errors throughout HA setup and the installed panel, including reload.
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    // Older HA shells report cancelled navigation animations as unhandled rejections.
    if (
      error.name === "AbortError" &&
      error.message === "Transition was skipped. New ViewTransition started"
    ) {
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
  await page
    .getByRole("textbox", { name: "Controller name*", exact: true })
    .fill("Smoke controller");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page
    .getByRole("button", { name: "Skip and finish", exact: true })
    .click();

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
    panel.getByRole("cell", { name: "Smoke light", exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Evening light · step", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
