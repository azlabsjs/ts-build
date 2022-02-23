import { ProjectArgs, Template } from './types';

export const composePackageJson =
  (template: Template | { [index: string]: any }) =>
  ({ name, author }: ProjectArgs) => {
    return {
      ...template.packageJson,
      name,
      author,
      module: `dist/esm/index.js`,
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
    };
  };
