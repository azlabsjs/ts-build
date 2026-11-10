import path from "path";
import fs from "fs";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";

interface EslintConfigArgs {
  rootDir: string;
  write: boolean;
}

type Error = { message: string; code?: string };

export function eslintConfig(
  { rootDir, write: write }: EslintConfigArgs,
  extras: Partial<ESLint.Options>
) {
  const config = defineConfig([
    {
      ignores: [
        "test/**/*.test.ts", // ignore test files in 'test' directory
        "test/**/*.spec.ts", // ignore test files in 'test' directory
        "src/**/*.test.ts", // ignore test files
        "dist/", // Ignore the entire 'dist' directory
        "build/", // Ignore the entire 'build' directory
        "lib/", // Ignore entire 'lib' directory
        "node_modules/", // Typically ignored by default, but good to be explicit
        "coverage/", // Ignore test coverage reports
        "**/*.d.ts", // Ignore all TypeScript declaration files
        ".config/*.js", // Ignore specific JS config files
        "custom-ignore-file.js", // Ignore a specific file
      ],
    },
    eslint.configs.recommended,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(tseslint.configs.recommended as any[]),
    {
      files: ["**/*.ts", "**/*.tsx", "**/*.cts", "**.*.mts"], // Apply these specifically to TS/TSX files
      // rules: {
      //   // Your TypeScript specific rules
      // },
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          project: ["./tsconfig.json"],
        },
      },
      ...Object.fromEntries(
        Object.entries(extras).filter(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ([_, value]) => typeof value !== "undefined" && value !== null
        )
      ),
    },
  ]);

  if (!write) {
    return config;
  }

  const file = path.join(rootDir, ".eslintrc.js");
  try {
    fs.writeFileSync(
      file,
      `module.exports = ${JSON.stringify(config, null, 2)}`,
      { flag: "wx" }
    );
  } catch (e) {
    const err = e as Error;
    if (err.code === "EEXIST") {
      console.error(
        "Error trying to save the Eslint configuration file:",
        `${file} already exists.`
      );
    } else {
      console.error(e);
    }
  }
  return config;
}

export const createLinter =
  ({ rootDir, write: write }: EslintConfigArgs) =>
  (baseConfig: Partial<ESLint.Options>, { fix }: { fix: boolean }) =>
    new ESLint({
      baseConfig: eslintConfig({ rootDir, write }, baseConfig),
      fix,
    });

export const outputfix = async (result: ESLint.LintResult[]) => {
  await ESLint.outputFixes(result);
};

export const getErrorResultCount = (result: ESLint.LintResult[]) =>
  ESLint.getErrorResults(result).length;
