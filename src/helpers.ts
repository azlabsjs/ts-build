import { resolveApp } from './resolver';
import fs from 'fs';
import glob from 'tiny-glob/sync';
import { ModuleFormat, NormalizedOpts, PackageJson, WatchOpts } from './types';
import { appDist } from './constants';
import path from 'path';
import shell from 'child_process';

type InstallCommand = 'yarn' | 'npm';
let cmd: InstallCommand;

export const merge = (...list: any[]) => {
  let source: { [inde: string]: any } = {};
  for (const item of list) {
    source = Object.assign(source, item ?? {});
  }
  return source;
};

export const concatAllArray = (values: any[][]) =>
  values.reduce((previous, current) => {
    previous = previous.concat(current);
    return previous;
  }, []);

export const isTruthy = (obj: any) => {
  if (!obj) {
    return false;
  }
  return typeof obj === 'object' || Object.keys(obj).length > 0;
};

/**
 *
 * @param {string} filename
 */
function jsOrTs(filename: string) {
  const extension = fs.statSync(resolveApp(filename + '.ts')).isFile()
    ? '.ts'
    : fs.statSync(resolveApp(filename + '.tsx')).isFile()
    ? '.tsx'
    : fs.statSync(resolveApp(filename + '.jsx')).isFile()
    ? '.jsx'
    : '.js';
  return resolveApp(`${filename}${extension}`);
}

export async function getInputs(entries: string | string[], source: string) {
  entries =
    Array.isArray(entries) && entries.length !== 0
      ? entries
      : typeof source === 'string'
      ? [resolveApp(source)]
      : fs.statSync(resolveApp('src')).isDirectory()
      ? [jsOrTs('src/index')]
      : [];
  const values = await Promise.all(entries.map(async (file) => glob(file)));
  return concatAllArray(values);
}
export async function normalizeOpts(
  opts: WatchOpts,
  name: string,
  entry: string
): Promise<NormalizedOpts> {
  return {
    ...opts,
    name: opts.name ?? name,
    input: await getInputs(opts.entry ?? [], entry),
    format: opts.format.split(',').map((format) => {
      if (format === 'es') {
        return 'esm';
      }
      return format;
    }) as ModuleFormat[],
  };
}

export function writeEntryFile() {
  const contents = `
  'use strict'
  module.exports = require('./cjs/index.js')
  `;
  return new Promise((__, reject) => {
    // Create directory if not exist
    if (!fs.existsSync(appDist)) {
      fs.mkdirSync(appDist, { recursive: true });
    }
    fs.open(path.join(appDist, 'index.js'), 'w+', (err, fd) => {
      if (err) {
        reject(err);
      }
      try {
        __(fs.writeFileSync(fd, contents));
      } catch (error) {
        reject(error);
      } finally {
        if (fd) {
          fs.close(fd);
        }
      }
    });
  });
}

export const createPackageName = (name: string) =>
  name
    .toLowerCase()
    .replace(/(^@.*\/)|((^[^a-zA-Z]+)|[^\w.-])|([^a-zA-Z0-9]+$)/g, '');

export function getNodeEngineRequirement({ engines }: PackageJson) {
  return engines && engines.node;
}

const executeAsync = (command: string) => {
  return new Promise<string | undefined>((resolve) => {
    shell.exec(command, (err, result) => {
      if (err) {
        return resolve(undefined);
      }
      resolve(result.trim());
    });
  });
};

export function getAuthorName() {
  return new Promise((resolve) => {
    executeAsync('npm config get init-author-name').then((author) => {
      if (typeof author === 'string') {
        return resolve(author);
      }
      executeAsync('git config --global user.name').then((author) => {
        if (typeof author === 'string') {
          return resolve(author);
        }
        executeAsync('git config --global user.email').then((author) => {
          if (typeof author === 'string') {
            return resolve(author);
          }
          executeAsync('npm config get init-author-email').then((author) => {
            if (typeof author === 'string') {
              return resolve(author);
            }
          });
        });
      });
    });
  });
}

export default function getInstallArgs(
  cmd: InstallCommand,
  packages: string[]
) {
  switch (cmd) {
    case 'npm':
      return ['install', ...packages, '--save-dev'];
    case 'yarn':
      return ['add', ...packages, '--dev'];
  }
}

export async function getInstallCmd(): Promise<InstallCommand> {
  return new Promise((resolve) => {
    shell.exec('npm --version', (err) => {
      if (err) {
        cmd = 'yarn';
      }
      cmd = 'npm';
      resolve(cmd);
    });
  });
}
