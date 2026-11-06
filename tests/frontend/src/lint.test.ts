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

void test("anti-slop checks Svelte scripts and honors justified assertions", async () => {
  const eslint = new ESLint();

  const filePath = fileURLToPath(
    new URL(
      "../../../custom_components/occupied/frontend/src/App.svelte",
      import.meta.url,
    ),
  );

  const lint = async (script: string) => {
    const [result] = await eslint.lintText(
      `<script lang="ts">\n${script}\n</script>\n`,
      { filePath },
    );

    assert.equal(result.fatalErrorCount, 0);

    return new Set(result.messages.map((message) => message.ruleId));
  };

  const violations = await lint(
    [
      'const input: unknown = JSON.parse("null");',
      "const value = input as string;",
      "const forced = input as object as string;",
      "const items: number[] = [1, 2];",
      "const doubled = items.filter((item) => item > 0).map((item) => item * 2);",
      "function handle(value: unknown) { return value; }",
      'if (typeof input === "string") { console.log(input); }',
      "const copied = items.reduce((acc, item) => Object.assign({}, acc, { [item]: item }), {});",
      "const options = { ...(items.length ? { value: 1 } : {}) };",
      "function save(value: object) {}",
      "function load(): unknown { return null; }",
      "type Payload = unknown;",
      "type Metadata = Record<string, unknown>;",
      "const userShape = {};",
      'Reflect.get(options, "value");',
      "Reflect.apply(save, null, []);",
      'vi.mock("./dependency.js");',
      'function widen() { const known = { id: "ok" }; const stored: unknown = known; return stored as { id: string }; }',
    ].join("\n"),
  );

  for (const rule of [
    "require-safety-comment-for-type-assertion",
    "no-chained-type-assertions",
    "no-array-filter-map",
    "no-unknown-parameters",
    "no-runtime-typeof",
    "no-reduce-accumulator-copy",
    "no-conditional-empty-object-spread",
    "no-object-parameters",
    "no-unknown-returns",
    "no-unknown-type-aliases",
    "no-unsafe-dictionary-type",
    "no-shape-in-symbol-names",
    "no-reflect-get",
    "no-reflect-apply",
    "no-module-mocking",
    "no-known-value-widening",
    "no-widen-then-assert",
    "require-readable-spacing",
  ]) {
    assert.ok(
      violations.has(`anti-slop/${rule}`),
      `Svelte must enforce ${rule}`,
    );
  }

  const justified = await lint(
    [
      'const input: unknown = JSON.parse("null");',
      'if (input !== "ready") { throw new Error("Expected ready"); }',
      "// SAFETY: the equality check above establishes the literal value.",
      'const ready = input as "ready";',
      'function isString(value: unknown): value is string { return typeof value === "string"; }',
    ].join("\n"),
  );

  assert.ok(
    !justified.has("anti-slop/require-safety-comment-for-type-assertion"),
  );
  assert.ok(!justified.has("anti-slop/no-runtime-typeof"));
});
