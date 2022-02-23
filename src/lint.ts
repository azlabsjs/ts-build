import path from 'path';
import fs from 'fs';
import { ESLint } from 'eslint';

interface EslintConfigArgs {
  rootDir: string;
  write: boolean;
}

export function eslintConfig(
  { rootDir, write: write }: EslintConfigArgs,
  extras: Partial<ESLint.Options>
) {
  const config = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: ['./tsconfig.json'],
    },
    plugins: ['@typescript-eslint'],
    rules: {
      '@typescript-eslint/no-explicit-any': 0,
    },
    ignorePatterns: [
      'test/**/*.test.ts',
      'test/**/*.spec.ts',
      'src/frontend/generated/*',
    ],
    ...Object.fromEntries(
      Object.entries(extras).filter(
        ([_, value]) => typeof value !== 'undefined' && typeof value !== null
      )
    ),
  };

  if (!write) {
    return config;
  }

  const file = path.join(rootDir, '.eslintrc.js');
  try {
    fs.writeFileSync(
      file,
      `module.exports = ${JSON.stringify(config, null, 2)}`,
      { flag: 'wx' }
    );
  } catch (e: any) {
    if (e.code === 'EEXIST') {
      console.error(
        'Error trying to save the Eslint configuration file:',
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
  (
    baseConfig: Partial<ESLint.Options>,
    { fix, extensions }: { fix: boolean; extensions?: string[] | undefined }
  ) => new ESLint({
    baseConfig: eslintConfig({ rootDir, write }, baseConfig) as any,
    fix,
    extensions: extensions ?? ['.ts', '.tsx', '.js', '.jsx'],
  });

export const outputfix = async (result: ESLint.LintResult[]) => {
  await ESLint.outputFixes(result);
};

export const getErrorResultCount = (result: ESLint.LintResult[]) =>
  ESLint.getErrorResults(result).length;
