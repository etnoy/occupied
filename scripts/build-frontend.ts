// Compile strict TypeScript and refresh the runtime assets used by HA/HACS.
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";

const root = fileURLToPath(new URL("../", import.meta.url));
const check = process.argv.includes("--check");
execFileSync(
  process.execPath,
  [
    resolve(root, "node_modules/typescript/bin/tsc"),
    "--project",
    resolve(root, "tsconfig.json"),
  ],
  { cwd: root, stdio: "inherit" },
);
const stale: string[] = [];
for (const directory of [
  "custom_components/occupied/frontend",
  "tests/frontend/src",
]) {
  const destinationDirectory =
    directory === "tests/frontend/src"
      ? "tests/frontend/generated"
      : `${directory}/dist`;
  if (!check)
    await rm(resolve(root, destinationDirectory), {
      recursive: true,
      force: true,
    });
  for (const name of await readdir(resolve(root, directory))) {
    if (!name.endsWith(".ts") || name.endsWith(".d.ts")) continue;
    const source = `${directory}/${name.replace(/\.ts$/, ".js")}`;
    const destination =
      directory === "tests/frontend/src"
        ? "tests/frontend/generated"
        : `${directory}/dist`;
    const relative = `${destination}/${name.replace(/\.ts$/, ".js")}`;
    let emitted = await readFile(
      resolve(root, "build/typescript", source),
      "utf8",
    );
    // Resolve the test-only source alias to the exact assets shipped to HA.
    if (directory === "tests/frontend/src") {
      emitted = emitted.replaceAll(
        '"@occupied/',
        '"../../../custom_components/occupied/frontend/dist/',
      );
    }
    const banner = `// Generated from ${name} by pnpm run build. Do not edit.\n`;
    const options = await resolveConfig(resolve(root, relative));
    const content = await format(banner + emitted, {
      ...options,
      filepath: relative,
    });
    if (check) {
      const current = await readFile(resolve(root, relative), "utf8").catch(
        () => "",
      );
      if (current !== content) stale.push(relative);
    } else {
      await mkdir(resolve(root, destination), { recursive: true });
      await writeFile(resolve(root, relative), content);
    }
  }
}
if (stale.length) {
  throw new Error(
    `Generated frontend assets are out of date. Run pnpm run build:\n${stale.join("\n")}`,
  );
}
console.log(
  check
    ? "Generated frontend assets match their TypeScript sources."
    : "Built frontend and test JavaScript from strict TypeScript.",
);
