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
    "@typescript-eslint/parser",
    "@typescript-eslint/eslint-plugin",
    "prettier",
    "@babel/runtime",
  ],
  packageJson: {
    version: "0.1.0",
    license: "MIT",
    main: "dist/index.js",
    module: `dist/esm/index.mjs`,
    types: `dist/types/index.d.ts`,
    typings: `dist/types/index.d.ts`,
    files: ["dist/**/*"],
    engines: {
      node: ">=14",
    },
    scripts: {
      build: "ts-build build",
      lint: "ts-build lint",
      prepare: "git config core.hookspath .githooks && ts-build build",
      size: "size-limit",
      analyze: "size-limit --why",
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
          types: "./dist/types/index.d.mts",
          default: "./dist/esm/index.mjs",
        },
        require: {
          types: "./dist/types/index.d.ts",
          default: "./dist/cjs/index.cjs",
        },
      },
    },
  } as { [index: string]: any },
} as { [index: string]: any };

export { composePackageJson } from "./helpers";
export { createProjectStructure } from "./project";
