import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importX from "eslint-plugin-import-x";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "node_modules", "build", "convex/_generated"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    plugins: {
      react,
      "import-x": importX,
    },
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      parserOptions: {
        projectService: true,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
      "import-x/resolver-next": [
        createTypeScriptImportResolver({
          project: "./tsconfig.json",
        }),

        importX.createNodeResolver(),
      ],
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "prefer-const": "error",
      curly: ["error", "all"],
      eqeqeq: ["error", "always", { null: "never" }],
      "object-shorthand": ["error", "always"],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],

              message: "Use @ alias instead of parent-relative imports.",
            },
          ],
        },
      ],

      // React rules
      "react/function-component-definition": [
        "error",
        {
          namedComponents: "function-declaration",
          unnamedComponents: "arrow-function",
        },
      ],
      "react/jsx-key": "error",
      "react/no-unknown-property": "error",
      "react/jsx-no-useless-fragment": "error",
      "react/jsx-pascal-case": "error",
      "react/self-closing-comp": "error",

      // Import rules
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-cycle": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-mutable-exports": "error",

      // // Typescript rules
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
        },
      ],
      "@typescript-eslint/no-confusing-void-expression": "error",
      "@typescript-eslint/only-throw-error": "error",
    },
  },
  {
    files: ["vite.config.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      prettier,
    ],
    plugins: {
      "import-x": importX,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        projectService: true,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-duplicates": "error",
    },
  },
  {
    files: ["src/App.tsx", "vite.config.ts", "eslint.config.ts"],
    rules: {
      "import-x/no-default-export": "off",
    },
  },
  {
    files: ["eslint.config.ts"],
    extends: [js.configs.recommended, prettier],
    plugins: {
      "import-x": importX,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-duplicates": "error",
    },
  },
]);
