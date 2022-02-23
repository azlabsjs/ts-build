#!/usr/bin/env node
import chalk from 'chalk';
import sade from 'sade';
const pkg = require('../../package.json');
const prog = sade('ts-build');
import fs from 'fs-extra';
import path from 'path';
import {
  composePackageJson,
  createProjectStructure,
  template as TemplateConfig,
} from './tempates';
import semver from 'semver';
import * as Messages from './messages';
import { logError } from './logger';
import child_process from 'child_process';
import TsBuild from './build-runner';
import getInstallArgs, {
  createPackageName,
  getAuthorName,
  getInstallCmd,
  getNodeEngineRequirement,
} from './helpers';
import { readFileSync } from 'jsonfile';

import { appRoot, packageJson } from './constants';
import { createLinter, getErrorResultCount, outputfix } from './lint';
import { createProgressEstimator } from './progress-estimator';

let appPackageJson: { [inde: string]: any } = {};
try {
  appPackageJson = readFileSync(packageJson);
} catch (e) {
  console.log(e);
}

prog
  .version(pkg.version)
  .command('create <pkg>')
  .describe('Create a new package with ts-build')
  .example('create mypackage')
  .action(async (pkg: string, opts: any) => {
    console.log(`Creating ${chalk.bold.green(pkg)}...`);
    // Helper fn to prompt the user for a different
    // folder name if one already exists
    async function getProjectPath(projectPath: string) {
      const exists = await fs.pathExists(projectPath);
      if (!exists) {
        return projectPath;
      }
      console.log(`Failed to create ${chalk.bold.red(pkg)}`);
      process.exit(1);
    }

    try {
      // get the project path
      const realPath = await fs.realpath(process.cwd());
      const projectPath = await getProjectPath(`${realPath}/${pkg}`);
      const author = (opts.author ?? (await getAuthorName())).trim();
      // Create the project structure
      createProjectStructure(projectPath);

      let license: string = await fs.readFile(
        path.resolve(projectPath, 'LICENSE'),
        { encoding: 'utf-8' }
      );

      license = license.replace(/<year>/, `${new Date().getFullYear()}`);
      license = license.replace(/<author>/, author);

      await fs.writeFile(path.resolve(projectPath, 'LICENSE'), license, {
        encoding: 'utf-8',
      });

      const generatePackageJson = composePackageJson(TemplateConfig);

      // Install deps
      process.chdir(projectPath);
      const safeName = createPackageName(pkg);
      const pkgJson = generatePackageJson({ name: safeName, author });

      const nodeVersionReq = getNodeEngineRequirement(pkgJson);
      if (
        typeof nodeVersionReq === 'string' &&
        !semver.satisfies(process.version, nodeVersionReq)
      ) {
        console.log(Messages.incorrectNodeVersion(nodeVersionReq));
        process.exit(1);
      }

      await fs.outputJSON(path.resolve(projectPath, 'package.json'), pkgJson);
      console.log(`Created ${chalk.bold.green(pkg)}`);
      await Messages.start(pkg);
    } catch (error) {
      console.log(`Failed to create ${chalk.bold.red(pkg)}`);
      logError(error);
      process.exit(1);
    }
    const { dependencies: deps } = TemplateConfig;
    console.log(Messages.installing(deps.sort()));
    try {
      const cmd = await getInstallCmd();
      const dependencies = getInstallArgs(cmd, deps).join(' '); //
      const estimator = createProgressEstimator();
      await estimator(
        new Promise<void>((__, _) => {
          child_process.exec(`${cmd} ${dependencies}`, async (err) => {
            if (err) {
              return _(err);
            }
            __();
          });
        }),
        'Installing Please wait...'
      );
      console.log(await Messages.start(pkg));
    } catch (error) {
      console.log('Failed to install dependencies');
      logError(error);
      process.exit(1);
    }
  });

prog
  .command('build')
  .describe('Build your project once and exit')
  .option('--entry, -i', 'Entry module')
  .example('build --entry src/foo.tsx')
  .option('--target', 'Specify your target environment', 'browser')
  .example('build --target node')
  .option('--name', 'Specify name exposed in UMD builds')
  .example('build --name Foo')
  .option('--format', 'Specify module format(s)', 'cjs,esm')
  .example('build --format cjs,esm')
  .option('--tsconfig', 'Specify custom tsconfig path')
  .example('build --tsconfig ./tsconfig.foo.json')
  .option('--transpileOnly', 'Skip type checking')
  .example('build --transpileOnly')
  .option(
    '--extractErrors',
    'Extract errors to ./errors/codes.json and provide a url for decoding.'
  )
  .example(
    'build --extractErrors=https://reactjs.org/docs/error-decoder.html?invariant='
  )
  .action(async (options) =>
    new TsBuild(
      options,
      appPackageJson['name'],
      appPackageJson['source']
    ).compile()
  );

prog
  .command('lint')
  .describe('Run eslint on the current project')
  .example('lint src test')
  .option('--fix', 'Fixes fixable errors and warnings')
  .example('lint src test --fix')
  .option('--ignore-pattern', 'Ignore a pattern')
  .example('lint src test --ignore-pattern test/foobar.ts')
  .example('lint src test --max-warnings 10')
  .option('--write-file', 'Write the config file locally')
  .example('lint --write-file')
  .option('--report-file', 'Write json report to file locally')
  .example('lint --report-file eslint-report.json')
  .action(
    async (options: {
      fix: boolean;
      'ignore-pattern': string;
      'write-file': boolean;
      'report-file': string;
      _: string[];
    }) => {
      if (options['_'].length === 0 && !options['write-file']) {
        const inputs = ['src'].filter(fs.existsSync);
        options['_'] = inputs.map((path_: string) =>
          path_.endsWith('/') ? path_ : path_.concat('/')
        );
        console.log(
          chalk.yellow(
            `Excuting linter on default paths "${inputs.join(' ')}"`,
            '\nTo change this behaviour, change your lint script in your package.json to "lint": "ts-build lint src examples" where example is the other directories'
          )
        );
      }

      const linter = createLinter({
        rootDir: appRoot,
        write: options['write-file'],
      })(
        {
          ...(appPackageJson['eslint'] ?? {}),
          ignorePattern: options['ignore-pattern'],
        },
        {
          fix: options.fix,
        }
      );
      const results = await linter.lintFiles(options['_']);
      if (options.fix) {
        await outputfix(results);
      }
      console.log((await linter.loadFormatter()).format(results));
      if (options['report-file']) {
        await fs.outputFile(
          options['report-file'],
          (await linter.loadFormatter('json')).format(results)
        );
      }
      if (getErrorResultCount(results) !== 0) {
        process.exit(1);
      }
    }
  );

prog.parse(process.argv);
