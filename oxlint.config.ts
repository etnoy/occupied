import { defineConfig } from "oxlint";
import antiSlop from "./tools/oxlint/anti-slop/index.ts";
import antiSlopEffect from "./tools/oxlint/anti-slop/effect/index.ts";

export default defineConfig({
  ignorePatterns: [
    "tools/oxlint/anti-slop/**",
    "**/dist/**",
    "**/generated/**",
    ".agents/**",
    ".codex/**",
  ],
  jsPlugins: [
    {
      name: "anti-slop-effect",
      specifier: "./tools/oxlint/anti-slop/effect/index.ts",
    },
    { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
  ],
  categories: { correctness: "off" },
  rules: {
    "oxc/no-accumulating-spread": "error",
    ...Object.fromEntries(
      Object.keys(antiSlop.rules).map((name) => [`anti-slop/${name}`, "error"]),
    ),
    ...Object.fromEntries(
      Object.keys(antiSlopEffect.rules).map((name) => [
        `anti-slop-effect/${name}`,
        "error",
      ]),
    ),
    "anti-slop/no-runtime-typeof": ["error", { allowInTypeGuards: true }],
  },
});
