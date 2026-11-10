import fs from 'fs';
import path from 'path';

const gitignore = `
*.log
.DS_Store
node_modules
dist
`;

const tsconfig = `
{
    // see https://www.typescriptlang.org/tsconfig to better understand tsconfigs
    "include": ["src", "types"],
    "compilerOptions": {
      "module": "esnext",
      "lib": ["dom", "esnext"],
      "importHelpers": true,
      "declaration": true,
      "sourceMap": true,
      "rootDir": "./src",
      "strict": true,
      "noImplicitReturns": true,
      "noFallthroughCasesInSwitch": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "moduleResolution": "bundler",
      "jsx": "react",
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "noEmit": true,
      "declarationDir": "./dist/types"
    }
  }
`;

const readme = `
# Package documentation
`;

const licence = `
MIT License

Copyright (c) <year> <author>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

const jestConfig = `
module.exports = {
  transform: {
    '.(ts|tsx)$': require.resolve('ts-jest/dist'),
    '.(js|jsx)$': require.resolve('babel-jest'), // jest's default
  },
  transformIgnorePatterns: ['[/\\\\\\\\]node_modules[/\\\\\\\\].+\\\\.(js|jsx)$'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}'],
  testMatch: ['<rootDir>/tests/**/*.(spec|test).{ts,tsx,js,jsx}'],
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  watchPlugins: [
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname'),
  ],
};
`;

const test = `
import { SayHello } from '../src';

describe('SayHello Tests', () => {
  it('Greet the user provided name', () => {
    expect(SayHello('Bertrand')).toEqual('Hello, Bertrand');
  });
});
`;

const defaultScript = `
export const SayHello = (name: string) => \`Hello, \${name}\`;
`;

const gitflowMain = `
# This workflow will run tests using node and then publish a package to GitHub Packages when a release is created
# For more information see: https://help.github.com/actions/language-and-framework-guides/publishing-nodejs-packages

name: Deployment

on:
  push:
    branches:
      - master

jobs:
  build:
    name: Build, lint, and test on Node \${{ matrix.node }} and \${{ matrix.os }}

    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        node: ['16.x', '18.x', '20.x']
        os: [ubuntu-latest, windows-latest, macOS-latest]

    steps:
      - name: Checkout repo
        uses: actions/checkout@v3

      - name: Use Node \${{ matrix.node }}
        uses: actions/setup-node@v3
        with:
          node-version: \${{ matrix.node }}

      - name: Check npm version
        run: npm -v

      - name: Removes package-lock.json
        run: rm package-lock.json

      - name: Install deps and build (with cache)
        uses: bahmutov/npm-install@v1
        with:
          useLockFile: false

      - name: Lint
        run: npm run lint
    env:
      NODE_AUTH_TOKEN: \${{secrets.GITHUB_TOKEN}}

  publish-gpr:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          registry-url: https://npm.pkg.github.com/
          scope: '@azlabsjs'
      - name: Check npm version
        run: npm -v

      - name: Removes package-lock.json
        run: rm package-lock.json

      - name: Install deps
        uses: bahmutov/npm-install@v1
        with:
          useLockFile: false

      - name: Build
        run: npm run build

      - run: npm publish
    env:
      NODE_AUTH_TOKEN: \${{secrets.GITHUB_TOKEN}}

`;

const gitflowSize = `
name: size
on: [pull_request]
jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v2

      - name: Use Node
        uses: actions/setup-node@v1
        with:
          node-version: 20

      - name: Check npm version
        run: npm -v

      - name: Removes package-lock.json
        run: rm package-lock.json

      - name: Install deps
        uses: bahmutov/npm-install@v1
        with:
          useLockFile: false
  
      - name: Build
        run: npm run build

      - run: npm run size
    
    env:
      CI_JOB_NUMBER: 1
      NODE_AUTH_TOKEN: \${{secrets.GITHUB_TOKEN}}

`;

const esLintConfig = `
{
  "root": true,
  "extends": [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
      "project": [
          "./tsconfig.json"
      ]
  },
  "plugins": [
      "@typescript-eslint"
  ],
  "rules": {
      "@typescript-eslint/no-explicit-any": 0
  },
  "ignorePatterns": [
      "src/**/*.test.ts",
      "src/frontend/generated/*"
  ]
}
`;


const lintStagedConfig = `
module.exports = {
  '*.{ts,js}': ['prettier --write', 'eslint --fix'],
  '*.html': ['prettier --write', 'eslint'],
  '*.{json,md,css}': ['prettier --write'],
};
`;

const precommitHook = `
#!/bin/sh

npx betterer precommit
npx lint-staged
ts-build build
`;

const npmrcConfigForTsBuild = `
@azlabsjs:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}
`;

const writeContent = (path_: string, content: string) => {
  fs.open(path_, 'w+', (err, fd) => {
    if (err) {
      throw new Error(err.message);
    }
    try {
      fs.writeFileSync(fd, content);
    } finally {
      fs.close(fd);
    }
  });
};

export const createProjectStructure = (path_: string) => {
  if (!fs.existsSync(path_)) {
    fs.mkdirSync(path_, { recursive: true });
  }

  writeContent(path.join(path_, '.gitignore'), gitignore);
  writeContent(path.join(path_, 'tsconfig.json'), tsconfig);
  writeContent(path.join(path_, 'README.md'), readme);
  writeContent(path.join(path_, 'LICENSE'), licence);
  writeContent(path.join(path_, '.eslintrc.json'), esLintConfig);
  writeContent(path.join(path_, 'jest.config.js'), jestConfig);

  if (!fs.existsSync(path.join(path_, 'tests'))) {
    fs.mkdirSync(path.join(path_, 'tests'), { recursive: true });
  }

  writeContent(path.join(path_, 'tests', 'index.spec.ts'), test);

  if (!fs.existsSync(path.join(path_, 'src'))) {
    fs.mkdirSync(path.join(path_, 'src'), { recursive: true });
  }

  writeContent(path.join(path_, 'src', 'index.ts'), defaultScript);

  if (!fs.existsSync(path.join(path_, '.github', 'workflows'))) {
    fs.mkdirSync(path.join(path_, '.github', 'workflows'), { recursive: true });
  }

  writeContent(path.join(path_, '.github', 'workflows', 'main.yml'), gitflowMain);
  writeContent(path.join(path_, '.github', 'workflows', 'size.yml'), gitflowSize);

  if (!fs.existsSync(path.join(path_, '.githooks'))) {
    fs.mkdirSync(path.join(path_, '.githooks'), { recursive: true });
  }

  writeContent(path.join(path_, '.githooks', 'pre-commit'), precommitHook);
  writeContent(path.join(path_, 'lint-staged.config.js'), lintStagedConfig);
  writeContent(path.join(path_, '.npmrc'), npmrcConfigForTsBuild);
};
