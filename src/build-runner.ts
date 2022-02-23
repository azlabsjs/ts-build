import { normalizeOpts, writeEntryFile } from './helpers';
import { appDist } from './constants';
import { createProgressEstimator } from './progress-estimator';
import { rollup } from 'rollup';
import { logError } from './logger';

import { concatAllArray } from './helpers';
import { createRollupConfig } from './rollup';
import { BuildOptions, BuildOpts, NormalizedOpts } from './types';
import fs from 'fs';
import { appConfig } from './constants';

let configurations = {
  rollup(config: { [index: string]: any }) {
    return config;
  },
};

if (fs.existsSync(appConfig)) {
  configurations = require(appConfig);
}

export async function createBuildConfigs(opts: NormalizedOpts) {
  const allInputs: BuildOptions[] = concatAllArray(
    opts.input.map((input) =>
      createAllFormats(opts, input).map((options, index) => ({
        ...options,
        // We want to know if this is the first run for each entryfile
        // for certain plugins (e.g. css)
        writeMeta: index === 0,
      }))
    )
  );

  return await Promise.all(
    allInputs.map(async (options, index) => {
      const config = await createRollupConfig(options, index);
      return configurations.rollup(config);
    })
  );
}

function createAllFormats(opts: NormalizedOpts, input: string) {
  return [
    opts.format.includes('cjs') && {
      ...opts,
      format: 'cjs',
      env: 'development',
      input,
    },
    opts.format.includes('cjs') && {
      ...opts,
      format: 'cjs',
      env: 'production',
      input,
    },
    opts.format.includes('esm') && { ...opts, format: 'esm', input },
    opts.format.includes('umd') && {
      ...opts,
      format: 'umd',
      env: 'development',
      input,
    },
    opts.format.includes('umd') && {
      ...opts,
      format: 'umd',
      env: 'production',
      input,
    },
    opts.format.includes('system') && {
      ...opts,
      format: 'system',
      env: 'development',
      input,
    },
    opts.format.includes('system') && {
      ...opts,
      format: 'system',
      env: 'production',
      input,
    },
  ].filter(Boolean);
}

export const run = async (options: BuildOpts) => {
  const opts = await normalizeOpts(options);
  const buildConfigs = await createBuildConfigs(opts);
  // # TODO : Remove dist folder
  if (fs.existsSync(appDist)) {
    fs.rmSync(appDist, { force: true, recursive: true });
  }
  // #endregion
  const logger = createProgressEstimator();
  if (opts.format.includes('cjs')) {
    logger(writeEntryFile(), 'Creating entry file');
  }
  try {
    const promise = Promise.all(
      buildConfigs.map(async (options) => {
        const bundle = await rollup(options);
        await bundle.write(options.output);
      })
    ).catch((e) => {
      throw e;
    });
    logger(promise, 'Building modules');
    await promise;
  } catch (error) {
    logError(error);
    process.exit(1);
  }
};
