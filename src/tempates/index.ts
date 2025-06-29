import { Template } from "./types";

export const template = {
  name: "basic",
  dependencies: [
    "husky",
    "@azlabsjs/ts-build",
    "tslib",
    "typescript",
    "size-limit",
    "@size-limit/preset-small-lib",
    "jest",
    "ts-jest",
    "@types/jest",
    "jest-watch-typeahead",
    "prettier",
    "@babel/runtime",
    "@eslint/js",
    "eslint",
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
  ],
  packageJson: {
    version: "0.1.0",
    license: "MIT",
    main: "dist/index.js",
    module: `dist/esm/index.mjs`,
    types: "dist/types/index.d.ts",
    typings: "dist/types/index.d.ts",
    files: ["dist/**/*"],
    engines: {
      node: ">=18",
    },
    scripts: {
      build: "ts-build build",
      lint: "ts-build lint",
      prepare: "git config core.hookspath .githooks && ts-build build",
      size: "size-limit",
      test: "jest",
      prettier: "prettier --write src/**/*",
    },
    husky: {
      hooks: {
        "pre-commit": "eslint",
      },
    },
    prettier: {
      printWidth: 80,
      semi: true,
      singleQuote: true,
      trailingComma: "es5",
    },
    exports: {
      ".": {
        import: {
          types: "./dist/esm/index.d.ts",
          typings: "./dist/esm/index.d.ts",
          default: "./dist/esm/index.mjs",
        },
        require: {
          types: "./dist/cjs/index.d.ts",
          typings: "./dist/cjs/index.d.ts",
          default: "./dist/cjs/index.cjs",
        },
      },
    },
  },
} as Template;

export { composePackageJson } from "./helpers";
export { createProjectStructure } from "./project";
