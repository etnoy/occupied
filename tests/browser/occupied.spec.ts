import { expect, test } from "@playwright/test";

test("create a controller, save a step, and preview the installed release", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
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

  await page.goto("/config/integrations/dashboard/add?domain=occupied");
  await page.getByLabel("Username", { exact: true }).fill("smoke");
  await page
    .getByLabel("Password", { exact: true })
    .fill("disposable-smoke-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Smoke controller");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Finish", exact: true }).click();

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
  await panel.locator('[data-builder-field="start"] input').fill("18:00");
  await panel
    .locator('[data-builder-field="entities"] input')
    .fill("Smoke light");
  await page.getByRole("option", { name: /Smoke light/ }).click();
  await panel.getByRole("button", { name: "Save step", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "Evening light", exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(
    panel.getByRole("button", { name: "Evening light", exact: true }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(panel.locator(".timeline")).toBeVisible();
  await expect(
    panel.getByText("Smoke light", { exact: true }).first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
