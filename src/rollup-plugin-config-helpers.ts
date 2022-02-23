import { ConfigItem, createConfigItem } from '@babel/core';
import { createBabelInputPluginFactory } from '@rollup/plugin-babel';
import { isTruthy, merge } from './helpers';

// replace lodash with lodash-es, but not lodash/fp
const replacements = [{ original: 'lodash(?!/fp)', replacement: 'lodash-es' }];

const createConfigItems = (
  type: any,
  items: { name: string; [index: string]: any }[]
) => {
  return items.map(({ name, ...options }) => {
    const item = createConfigItem([name, options], { type });
    return item;
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
          merge(mergedItems[itemToMergeWithIndex].options, item.options),
        ],
        {
          type,
        }
      );
    });
  });

  return mergedItems;
};

export const babelPlugin = (customOptions: { [inde: string]: any }) =>
  createBabelInputPluginFactory(() => {
    return {
      // Passed the plugin options.
      options({ customOptions, ...pluginOptions }) {
        return {
          // Pull out any custom options that the plugin might have.
          customOptions,

          // Pass the options back with the two custom options removed.
          pluginOptions,
        };
      },
      config(config) {
        let plugins: { name: string; [index: string]: any }[] = [
          { name: 'babel-plugin-macros' },
          { name: 'babel-plugin-annotate-pure-calls' },
          { name: 'babel-plugin-dev-expression' },
          {
            name: 'babel-plugin-polyfill-regenerator',
            // don't pollute global env as this is being used in a library
            method: 'usage-pure',
          },
          {
            name: '@babel/plugin-proposal-class-properties',
            loose: true,
          },
        ];
        if (customOptions['format'] !== 'cjs') {
          plugins = [
            ...plugins,
            {
              name: 'babel-plugin-transform-rename-import',
              replacements,
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

        // if they use preset-env, merge their options with ours
        if (presetEnvIdx !== -1) {
          const presetEnv = babelOptions.presets[presetEnvIdx];
          babelOptions.presets[presetEnvIdx] = createConfigItem(
            [
              (presetEnv as ConfigItem).file?.resolved,
              merge(
                {
                  loose: true,
                  targets: customOptions.targets,
                },
                (presetEnv as ConfigItem).options,
                {
                  modules: false,
                }
              ),
            ],
            {
              type: `preset`,
            }
          );
        } else {
          // if no preset-env, add it & merge with their presets
          const defaultPresets = createConfigItems('preset', [
            {
              name: '@babel/preset-env',
              targets: customOptions.targets,
              modules: false,
              loose: true,
            },
          ]);

          babelOptions.presets = mergeConfigItems(
            'preset',
            defaultPresets,
            babelOptions.presets
          );
        }

        // Merge babelrc & our plugins together
        babelOptions.plugins = mergeConfigItems(
          'plugin',
          defaultPlugins,
          babelOptions.plugins || []
        );

        return babelOptions;
      },
    };
  });
