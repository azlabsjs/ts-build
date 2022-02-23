export const template = {
  name: 'basic',
  dependencies: [
    'husky',
    '@iazlabs/ts-build',
    'tslib',
    'typescript',
    'size-limit',
    '@size-limit/preset-small-lib',
  ],
  packageJson: {
    version: '0.1.0',
    license: 'MIT',
    main: 'dist/index.js',
    typings: `dist/index.d.ts`,
    files: ['dist', 'src'],
    engines: {
      node: '>=14',
    },
    scripts: {
      // start: 'ts-build watch',
      build: 'ts-build build',
      // test: 'ts-build test',
      lint: 'eslint',
      prepare: 'ts-build build',
      size: 'size-limit',
      analyze: 'size-limit --why',
    },
    peerDependencies: {},
    /*
        'size-limit': [
          {
            path: `dist/cjs/index.js`,
            limit: '10 KB',
          },
          {
            path: `dist/esm/index.js`,
            limit: '10 KB',
          },
        ],
        */
    husky: {
      hooks: {
        'pre-commit': 'eslint',
      },
    },
    prettier: {
      printWidth: 80,
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
    },
  } as { [index: string]: any },
} as { [index: string]: any };

export { composePackageJson } from './helpers';
export { createProjectStructure } from './project';
