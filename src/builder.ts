import { normalizeOpts, writeEntryFile } from "./helpers";
import { appDist } from "./constants";
import { createProgressEstimator } from "./progress-estimator";
import { rollup, RollupOptions } from "rollup";
import { logError } from "./logger";
import { concatAllArray } from "./helpers";
import { createRollupConfig } from "./rollup";
import { BuildOptions, BuildOpts, ErrorType, NormalizedOpts } from "./types";
import fs from "fs";
import { appConfig } from "./constants";

let configurations = {
  rollup(config: RollupOptions) {
    return config;
  },
};

if (fs.existsSync(appConfig)) {
  import(appConfig).then((values) => (configurations = values));
}

export async function createBuildConfigs(opts: NormalizedOpts) {
  const inputs: BuildOptions[] = concatAllArray(
    opts.input.map((input) =>
      createAllFormats(opts, input).map((options, index) => ({
        ...options,
        // We want to know if this is the first run for each entryfile
        // for certain plugins (e.g. css)
        writeMeta: index === 0,
      }))
    )
  ) as BuildOptions[];
  return await Promise.all(
    inputs.map(async (options, index) => {
      const config = await createRollupConfig(
        options,
        index
      );
      return configurations.rollup(config);
    })
  );
}

function createAllFormats(opts: NormalizedOpts, input: string) {
  return [
    opts.format.includes("esm") && { ...opts, format: "esm", input },
    opts.format.includes("umd") && {
      ...opts,
      format: "umd",
      env: "development",
      input,
    },
    opts.format.includes("umd") && {
      ...opts,
      format: "umd",
      env: "production",
      input,
    },
    opts.format.includes("system") && {
      ...opts,
      format: "system",
      env: "development",
      input,
    },
    opts.format.includes("system") && {
      ...opts,
      format: "system",
      env: "production",
      input,
    },
    opts.format.includes("cjs") && {
      ...opts,
      format: "cjs",
      env: "development",
      input,
    },
    opts.format.includes("cjs") && {
      ...opts,
      format: "cjs",
      env: "production",
      input,
    },
  ].filter(Boolean);
}

export default class TsBuild {
  // Class constructor
  constructor(
    private options: BuildOpts,
    private name: string,
    private entry: string
  ) {}

  /**
   * Compile Typescript files to Javascript
   */
  async compile() {
    const externalModules = this.options?.external ?? [];
    const buildOpts: BuildOpts = {
      ...this.options,
      external:
        typeof externalModules === "string"
          ? externalModules.split(",")
          : externalModules,
    };
    const opts = await normalizeOpts(buildOpts, this.name, this.entry);
    const buildConfigs = await createBuildConfigs(opts);
    // # TODO : Remove dist folder
    if (fs.existsSync(appDist)) {
      fs.rmSync(appDist, { force: true, recursive: true });
    }
    // #endregion
    const logger = createProgressEstimator();
    if (opts.format.includes("cjs")) {
      logger(writeEntryFile(), "Creating entry file");
    }
    try {
      const promise = Promise.all(
        buildConfigs.map(async (options) => {
          const bundle = await rollup(options);
          if (!options.output) {
            return;
          }
          if (Array.isArray(options.output)) {
            for await (const item of options.output) {
              bundle.write(item);
            }
          } else {
            await bundle.write(options.output);
          }
        })
      ).catch((e) => {
        throw e;
      });
      logger(promise, "Building modules");
      await promise;
    } catch (error) {
      logError(error as ErrorType);
      process.exit(1);
    }
  }
}
