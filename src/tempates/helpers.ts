import { ProjectArgs, Template } from './types';

export const composePackageJson =
  (template: Template | { [index: string]: any }) =>
  ({ name, author }: ProjectArgs) => {
    return {
      ...template.packageJson,
      name,
      author,
      'size-limit': [
        {
          path: `dist/cjs/index.cjs`,
          limit: '10 KB',
        },
        {
          path: `dist/esm/index.mjs`,
          limit: '10 KB',
        },
      ],
    };
  };
