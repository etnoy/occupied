import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import typescriptEslint from "typescript-eslint";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const typescriptFiles = [
  "custom_components/occupied/frontend/**/*.ts",
  "tests/frontend/**/*.ts",
  "scripts/*.ts",
];

export default typescriptEslint.config([
  eslintPluginUnicorn.configs.recommended,
  eslintPluginPrettierRecommended,
  js.configs.recommended,
  typescriptEslint.configs.recommended,
  {
    ignores: [
      "eslint.config.mjs",
      "custom_components/occupied/frontend/dist/**",
    ],
  },
  {
    files: typescriptFiles,
    languageOptions: {
      parser: typescriptEslint.parser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        project: "tsconfig.json",
        tsconfigRootDir: configDirectory,
      },
    },
    rules: {
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
      curly: ["error", "all"],
      "eol-last": ["error", "always"],
      "no-else-return": "error",
      "no-unneeded-ternary": "error",
      "object-shorthand": ["error", "always"],
      "unicorn/class-reference-in-static-methods": [
        "error",
        { preferThis: false, preferSuper: false },
      ],
      "unicorn/consistent-boolean-name": "off",
      "unicorn/consistent-class-member-order": "off",
      "unicorn/filename-case": "off",
      "unicorn/import-style": "off",
      "unicorn/max-nested-calls": "off",
      "unicorn/name-replacements": "off",
      "unicorn/no-array-sort": "off",
      "unicorn/no-break-in-nested-loop": "off",
      "unicorn/no-computed-property-existence-check": "off",
      "unicorn/no-declarations-before-early-exit": "off",
      "unicorn/no-for-loop": "off",
      "unicorn/no-nested-ternary": "error",
      "unicorn/no-non-function-verb-prefix": "off",
      "unicorn/no-null": "off",
      "unicorn/no-unnecessary-global-this": "off",
      "unicorn/no-thenable": "off",
      "unicorn/no-top-level-assignment-in-function": "off",
      "unicorn/no-unsafe-property-key": "off",
      "unicorn/no-unreadable-for-of-expression": "off",
      "unicorn/no-unreadable-object-destructuring": "off",
      "unicorn/prefer-await": "off",
      "unicorn/prefer-event-target": "off",
      "unicorn/prefer-iterator-helpers": "off",
      "unicorn/prefer-iterator-to-array": "off",
      "unicorn/prefer-module": "off",
      "unicorn/prefer-private-class-fields": "off",
      "unicorn/prefer-promise-with-resolvers": "off",
      "unicorn/prefer-query-selector": "off",
      "unicorn/prefer-scoped-selector": "off",
      "unicorn/prefer-simple-condition-first": "off",
      "unicorn/prefer-structured-clone": "off",
      "unicorn/prefer-top-level-await": "off",
      "unicorn/prefer-uint8array-base64": "off",
      "unicorn/require-array-sort-compare": "off",
    },
  },
  {
    files: ["custom_components/occupied/frontend/**/*.ts"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["tests/frontend/**/*.ts", "scripts/*.ts"],
    languageOptions: { globals: globals.node },
  },
]);
