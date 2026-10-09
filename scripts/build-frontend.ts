// Compile strict TypeScript and refresh or verify the assets shipped to HA/HACS.
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const check = process.argv.includes("--check");
const testsOnly = process.argv.includes("--tests-only");
if (check && testsOnly) throw new Error("Use either --check or --tests-only");
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
  const tests = directory === "tests/frontend/src";
  // Ignored test output is generated separately. A clean checkout check compares
  // only the committed runtime assets and never rewrites them.
  if ((check && tests) || (testsOnly && !tests)) continue;
  const destination = tests ? "tests/frontend/generated" : `${directory}/dist`;
  const sources = (await readdir(resolve(root, directory)))
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".d.ts"))
    .sort();
  if (check) {
    const expected = new Set(
      sources.map((name) => name.replace(/\.ts$/, ".js")),
    );
    const existing = await readdir(resolve(root, destination), {
      withFileTypes: true,
    }).catch(() => []);
    for (const entry of existing)
      if (!entry.isFile() || !expected.has(entry.name))
        stale.push(`Unexpected asset: ${destination}/${entry.name}`);
  } else await rm(resolve(root, destination), { recursive: true, force: true });
  for (const name of sources) {
    const source = `${directory}/${name.replace(/\.ts$/, ".js")}`;
    const relative = `${destination}/${name.replace(/\.ts$/, ".js")}`;
    let emitted = await readFile(
      resolve(root, "build/typescript", source),
      "utf8",
    );
    if (!tests && name === "lit.ts") {
      const bundle = await build({
        entryPoints: [resolve(root, directory, name)],
        bundle: true,
        format: "esm",
        target: "es2023",
        write: false,
        legalComments: "inline",
      });
      emitted = bundle.outputFiles![0].text;
    }
    // Tests import the exact committed modules installed by HA.
    if (tests)
      emitted = emitted.replaceAll(
        '"@occupied/',
        '"../../../custom_components/occupied/frontend/dist/',
      );
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
if (stale.length)
  throw new Error(
    `Committed frontend assets are missing, stale or unexpected. Run pnpm run build and commit frontend/dist alongside the TypeScript sources:\n${stale.join("\n")}`,
  );
console.log(
  check
    ? "Committed frontend assets match their TypeScript sources."
    : testsOnly
      ? "Built test JavaScript without changing committed frontend assets."
      : "Built frontend and test JavaScript from strict TypeScript.",
);
