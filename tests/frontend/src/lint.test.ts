import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

void test("Svelte lint checks typed scripts, declaration spacing, and template keys", async () => {
  const eslint = new ESLint();
  const filePath = fileURLToPath(
    new URL(
      "../../../custom_components/occupied/frontend/src/App.svelte",
      import.meta.url,
    ),
  );
  const [result] = await eslint.lintText(
    [
      '<script lang="ts">',
      '  import { onMount } from "svelte";',
      "  let { values }: { values: string[] } = $props();",
      "  onMount(() => {});",
      "  Promise.resolve();",
      "</script>",
      "",
      "{#each values as value}",
      "  <p>{value}</p>",
      "{/each}",
      "",
    ].join("\n"),
    { filePath },
  );
  assert.equal(result.fatalErrorCount, 0);
  const rules = new Set(result.messages.map((message) => message.ruleId));
  for (const rule of [
    "@typescript-eslint/no-floating-promises",
    "occupied-svelte/script-spacing",
    "svelte/require-each-key",
  ]) {
    assert.ok(rules.has(rule), `Svelte lint must enforce ${rule}`);
  }
});
