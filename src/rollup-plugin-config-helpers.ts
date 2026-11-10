import { ConfigItem, createConfigItem } from '@babel/core';
import { RollupBabelCustomInputPlugin, createBabelInputPluginFactory } from '@rollup/plugin-babel';
import { isTruthy, deepMerge } from './helpers';

const createConfigItems = ( type: any, items: { name: string; [index: string]: any }[]) => {
  return items.map(({ name, ...options }) => {
    return createConfigItem([name, options], { type });
  });
};

const mergeConfigItems = (type: any, ...configItemsToMerge: any[][]) => {
  const mergedItems: any[] = [];

  configItemsToMerge.forEach((configItemToMerge) => {
    configItemToMerge.forEach((item) => {
      const itemToMergeWithIndex = mergedItems.findIndex(
        (mergedItem) => mergedItem.file.resolved === item.file.resolved
      );

      if (itemToMergeWithIndex === -1) {
        mergedItems.push(item);
        return;
      }
      mergedItems[itemToMergeWithIndex] = createConfigItem(
        [
          mergedItems[itemToMergeWithIndex].file.resolved,
          deepMerge(mergedItems[itemToMergeWithIndex].options, item.options),
        ],
        { type }
      );
    });
  });

  return mergedItems;
};

export const babelPlugin = (customOptions: { [index: string]: any }) =>
  createBabelInputPluginFactory(() => {
    return {
      options({ customOptions, ...pluginOptions }) {
        return {
          customOptions,
          pluginOptions,
        };
      },
      config(config) {
        let plugins: { name: string; [index: string]: any }[] = [
          {
            name: '@babel/plugin-transform-runtime',
            absoluteRuntime: false,
          },
          {
            name: './babel-plugin-annotate-pure-calls-compat',
          },
          {
            name: '@babel/plugin-transform-class-properties',
            loose: true,
          },
        ];

        // 2. Replaced babel-plugin-transform-rename-import with modern alternative
        if (customOptions['format'] !== 'cjs') {
          plugins = [
            ...plugins,
            {
              name: 'babel-plugin-transform-rewrite-imports',
              replacements: [{ original: 'lodash(?!/fp)', replacement: 'lodash-es' }],
            },
          ];
        }

        if (isTruthy(customOptions['extractErrors'])) {
          plugins = [
            ...plugins,
            {
              name: './errors/transformErrorMessages',
            },
          ];
        }

        const defaultPlugins = createConfigItems('plugin', plugins);

        const babelOptions = config.options || {};
        babelOptions.presets = babelOptions.presets || [];

        const presetEnvIdx = babelOptions.presets.findIndex((preset) =>
          (preset as ConfigItem).file?.request.includes('@babel/preset-env')
        );

        if (presetEnvIdx !== -1) {
          const presetEnv = babelOptions.presets[presetEnvIdx];
          babelOptions.presets[presetEnvIdx] = createConfigItem(
            [
              (presetEnv as ConfigItem).file?.resolved,
              deepMerge(
                {
                  loose: true,
                  targets: customOptions.targets,
                  useBuiltIns: 'usage',
                  corejs: '3.38',
                },
                (presetEnv as ConfigItem).options,
                {
                  modules: false,
                }
              ),
            ],
            { type: `preset` }
          );
        } else {
          const defaultPresets = createConfigItems('preset', [
            {
              name: '@babel/preset-env',
              targets: customOptions.targets,
              modules: false,
              loose: true,
              useBuiltIns: 'usage',
              corejs: '3.38',
            },
          ]);

          babelOptions.presets = mergeConfigItems(
            'preset',
            defaultPresets,
            babelOptions.presets
          );
        }

        babelOptions.plugins = mergeConfigItems(
          'plugin',
          defaultPlugins,
          babelOptions.plugins || []
        );

        return babelOptions;
      },
    } as RollupBabelCustomInputPlugin;
  });