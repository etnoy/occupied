// Compile strict TypeScript and refresh or verify the assets shipped to HA/HACS.
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { build } from "esbuild";
import { compile } from "svelte/compiler";

const root = fileURLToPath(new URL("../", import.meta.url));
const check = process.argv.includes("--check");
const testsOnly = process.argv.includes("--tests-only");
if (check && testsOnly) {
  throw new Error("Use either --check or --tests-only");
}
execFileSync(
  process.execPath,
  [
    resolve(root, "node_modules/typescript/bin/tsc"),
    "--project",
    resolve(root, "tsconfig.json"),
  ],
  { cwd: root, stdio: "inherit" },
);
// Svelte templates participate in the same strict checks as TypeScript modules.
execFileSync(
  process.execPath,
  [
    resolve(root, "node_modules/svelte-check/bin/svelte-check"),
    "--tsconfig",
    resolve(root, "tsconfig.json"),
    "--fail-on-warnings",
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
  if ((check && tests) || (testsOnly && !tests)) {
    continue;
  }
  const destination = tests ? "tests/frontend/generated" : `${directory}/dist`;
  const filenames = await readdir(resolve(root, directory));
  const sources = filenames
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".d.ts"))
    .sort();
  if (check) {
    const expected = new Set(
      sources.map((name) => name.replace(/\.ts$/, ".js")),
    );
    const existing = await readdir(resolve(root, destination), {
      withFileTypes: true,
    }).catch(() => []);
    for (const entry of existing) {
      if (!entry.isFile() || !expected.has(entry.name)) {
        stale.push(`Unexpected asset: ${destination}/${entry.name}`);
      }
    }
  } else {
    await rm(resolve(root, destination), { recursive: true, force: true });
  }
  for (const name of sources) {
    const source = `${directory}/${name.replace(/\.ts$/, ".js")}`;
    const relative = `${destination}/${name.replace(/\.ts$/, ".js")}`;
    let emitted = await readFile(
      resolve(root, "build/typescript", source),
      "utf8",
    );
    if (!tests && name === "occupied-panel.ts") {
      const bundle = await build({
        entryPoints: [resolve(root, directory, name)],
        bundle: true,
        format: "esm",
        target: "es2023",
        write: false,
        legalComments: "inline",
        conditions: ["browser"],
        // The shared stylesheet is injected into the panel's shadow root.
        loader: { ".css": "text" },
        plugins: [
          {
            name: "svelte",
            setup(builder) {
              builder.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
                const source = await readFile(path, "utf8");
                const compiled = compile(source, {
                  filename: path,
                  generate: "client",
                  css: "injected",
                });

                return { contents: compiled.js.code, loader: "js" };
              });
            },
          },
        ],
      });
      emitted = bundle.outputFiles![0].text;
    }
    // Tests import the exact committed modules installed by HA.
    if (tests) {
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
      if (current !== content) {
        stale.push(relative);
      }
    } else {
      await mkdir(resolve(root, destination), { recursive: true });
      await writeFile(resolve(root, relative), content);
    }
  }
}
if (stale.length > 0) {
  throw new Error(
    `Committed frontend assets are missing, stale or unexpected. Run pnpm run build and commit frontend/dist alongside the TypeScript sources:\n${stale.join("\n")}`,
  );
}
let message = "Built frontend and test JavaScript from strict TypeScript.";
if (check) {
  message = "Committed frontend assets match their TypeScript sources.";
} else if (testsOnly) {
  message = "Built test JavaScript without changing committed frontend assets.";
}
console.log(message);
