import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["custom_components/occupied/frontend/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    rules: js.configs.recommended.rules,
  },
];
