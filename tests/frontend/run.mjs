// CI runner for the same production-module workflows used in the collaborative preview.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const server = spawn(
  process.env.OCCUPIED_PYTHON || ".venv/bin/python",
  ["tests/frontend/serve.py"],
  { stdio: ["ignore", "pipe", "inherit"] },
);
let browser;
try {
  let ready = false;
  for (let n = 0; n < 100; n++) {
    if (server.exitCode !== null)
      throw new Error("Browser fixture exited before startup");
    try {
      await fetch("http://127.0.0.1:8765/tests/frontend/harness.html");
      ready = true;
      break;
    } catch {
      await setTimeout(100);
    }
  }
  if (!ready) throw new Error("Browser fixture did not start");
  browser = await chromium.launch({ headless: true });
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:8765/tests/frontend/harness.html");
    await page.waitForFunction(() => typeof window.runWorkflows === "function");
    const results = await page.evaluate(() => window.runWorkflows());
    console.log(JSON.stringify({ viewport, results, errors }, null, 2));
    if (errors.length || results.some((r) => !r.passed))
      throw new Error(`Browser workflows failed at ${viewport.width}px`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
