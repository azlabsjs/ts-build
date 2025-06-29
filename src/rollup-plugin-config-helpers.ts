import { ConfigItem, createConfigItem } from "@babel/core";
import {
  RollupBabelCustomInputPlugin,
  createBabelInputPluginFactory,
} from "@rollup/plugin-babel";
import { isTruthy, merge } from "./helpers";

// replace lodash with lodash-es, but not lodash/fp
const replacements = [{ original: "lodash(?!/fp)", replacement: "lodash-es" }];

const createConfigItems = (
  type: "preset" | "plugin",
  items: { name: string; [index: string]: unknown }[]
) => {
  return items.map(({ name, ...options }) => {
    const item = createConfigItem([name, options], { type });
    return item;
  });
};

const mergeConfigItems = (
  type: "preset" | "plugin",
  ...configItemsToMerge: ConfigItem[][]
) => {

  const mergedItems: ConfigItem[] = [];

  configItemsToMerge.forEach((configItemToMerge) => {
    configItemToMerge.forEach((item) => {
      const itemToMergeWithIndex = mergedItems.findIndex(
        (mergedItem) =>
          mergedItem.file?.resolved === item.file?.resolved
      );

      if (itemToMergeWithIndex === -1) {
        mergedItems.push(item);
        return;
      }
      mergedItems[itemToMergeWithIndex] = createConfigItem(
        [
          mergedItems[itemToMergeWithIndex].file?.resolved,
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

export const babelPlugin = (customOptions: { [inde: string]: unknown }) =>
  createBabelInputPluginFactory(() => {
    return {
      // Passed the plugin options.
      options({ customOptions, ...pluginOptions }) {
        return {
          // Pull out custom options that the plugin might have.
          customOptions,

          // Pass the options back with the two custom options removed.
          pluginOptions,
        };
      },
      config(config) {
        let plugins: { name: string; [index: string]: unknown }[] = [
          {
            name: "@babel/plugin-transform-runtime",
            absoluteRuntime: false,
          },
          { name: "babel-plugin-macros" },
          { name: "babel-plugin-annotate-pure-calls" },
          { name: "babel-plugin-dev-expression" },
          {
            name: "babel-plugin-polyfill-regenerator",
            // don't pollute global env as this is being used in a library
            method: "usage-pure",
          },
          {
            name: "@babel/plugin-transform-class-properties",
            loose: true,
          },
        ];
        if (customOptions["format"] !== "cjs") {
          plugins = [
            ...plugins,
            {
              name: "babel-plugin-transform-rename-import",
              replacements,
            },
          ];
        }
        if (isTruthy(customOptions["extractErrors"])) {
          plugins = [
            ...plugins,
            {
              name: "./errors/transformErrorMessages",
            },
          ];
        }
        const defaultPlugins = createConfigItems("plugin", plugins);

        const babelOptions = config.options || {};
        babelOptions.presets = babelOptions.presets || [];

        const presetEnvIdx = babelOptions.presets.findIndex((preset) =>
          (preset as ConfigItem).file?.request.includes("@babel/preset-env")
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
          const defaultPresets = createConfigItems("preset", [
            {
              name: "@babel/preset-env",
              targets: customOptions.targets,
              modules: false,
              loose: true,
            },
          ]);

          babelOptions.presets = mergeConfigItems(
            "preset",
            defaultPresets,
            babelOptions.presets as ConfigItem[]
          );
        }

        // Merge babelrc & our plugins together
        babelOptions.plugins = mergeConfigItems(
          "plugin",
          defaultPlugins,
          (babelOptions.plugins as ConfigItem[]) ?? []
        );

        return babelOptions;
      },
    } as RollupBabelCustomInputPlugin;
  });
