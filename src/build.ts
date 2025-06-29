#!/usr/bin/env node

import chalk from "chalk";
import sade from "sade";
const prog = sade("ts-build");
import fs from "fs-extra";
import path from "path";
import {
  composePackageJson,
  createProjectStructure,
  template as TemplateConfig,
} from "./tempates";
import semver from "semver";
import * as Messages from "./messages";
import { logError } from "./logger";
import child_process from "child_process";
import TsBuild from "./builder";
import getInstallArgs, {
  createPackageName,
  getAuthorName,
  getInstallCmd,
  getNodeEngineRequirement,
} from "./helpers";
import { readFileSync } from "jsonfile";
import { appRoot, packageJson } from "./constants";
import { createLinter, getErrorResultCount, outputfix } from "./lint";
import { createProgressEstimator } from "./progress-estimator";
import { ESLint } from "eslint";
import { ErrorType, PackageJson } from "./types";

// Types
type Error = { message: string };

// Define globals
let pkgConfig: PackageJson = {} as PackageJson;
const Log = console.log;

// Read the package.json file id exists
if (fs.existsSync(packageJson)) {
  try {
    pkgConfig = readFileSync(packageJson);
  } catch (e) {
    Log(
      chalk.red(
        `Error while reading package.json file in the current director: ${
          (e as Error).message
        }`
      )
    );
  }
}

prog
  .version(pkgConfig['version'] ?? '0.5.x')
  .command("create <pkg>")
  .describe("Create a new package with ts-build")
  .example("create mypackage")
  .action(async (pkg: string, opts: { author: string }) => {
    Log(`Creating ${chalk.bold.green(pkg)}...`);
    // Helper fn to prompt the user for a different
    // folder name if one already exists
    async function getProjectPath(projectPath: string) {
      const exists = await fs.pathExists(projectPath);
      if (!exists) {
        return projectPath;
      }
      Log(`Failed to create ${chalk.bold.red(pkg)}`);
      process.exit(1);
    }

    try {
      // get the project path
      const realPath = await fs.realpath(process.cwd());
      const projectPath = await getProjectPath(`${realPath}/${pkg}`);
      const author = (
        (opts.author as string) ?? (await getAuthorName())
      )?.trim();
      // Create the project structure
      createProjectStructure(projectPath);

      let license: string = await fs.readFile(
        path.resolve(projectPath, "LICENSE"),
        { encoding: "utf-8" }
      );

      license = license.replace(/<year>/, `${new Date().getFullYear()}`);
      license = license.replace(/<author>/, author ?? "");

      await fs.writeFile(path.resolve(projectPath, "LICENSE"), license, {
        encoding: "utf-8",
      });

      const generatePackageJson = composePackageJson(TemplateConfig);

      // Install deps
      process.chdir(projectPath);
      const safeName = createPackageName(pkg);
      const pkgJson = generatePackageJson({ name: safeName, author });

      const nodeVersionReq = getNodeEngineRequirement(pkgJson);
      if (
        typeof nodeVersionReq === "string" &&
        !semver.satisfies(process.version, nodeVersionReq)
      ) {
        Log(Messages.incorrectNodeVersion(nodeVersionReq));
        process.exit(1);
      }

      await fs.outputJSON(path.resolve(projectPath, "package.json"), pkgJson);
      Log(`Created ${chalk.bold.green(pkg)}`);
      await Messages.start(pkg);
    } catch (error) {
      Log(`Failed to create ${chalk.bold.red(pkg)}`);
      logError(error as ErrorType);
      process.exit(1);
    }
    const { dependencies: deps } = TemplateConfig;
    Log(Messages.installing(deps.sort()));
    try {
      const cmd = await getInstallCmd();
      const dependencies = getInstallArgs(cmd, deps).join(" "); //
      const estimator = createProgressEstimator();
      await estimator(
        new Promise<void>((resolve, error) => {
          child_process.exec(`${cmd} ${dependencies}`, async (err) => {
            if (err) {
              return error(err);
            }
            resolve();
          });
        }),
        "Installing Please wait..."
      );
      Log(await Messages.start(pkg));
    } catch (error) {
      Log("Failed to install dependencies");
      logError(error as ErrorType);
      process.exit(1);
    }
  });

prog
  .command("build")
  .describe("Build your project once and exit")
  .option("--entry, -i", "Entry module")
  .example("build --entry src/foo.tsx")
  .option("--target", "Specify your target environment", "browser")
  .example("build --target node")
  .option("--name", "Specify name exposed in UMD builds")
  .example("build --name Foo")
  .option("--format", "Specify module format(s)", "cjs,esm")
  .example("build --format cjs,esm")
  .option("--tsconfig", "Specify custom tsconfig path")
  .example("build --tsconfig ./tsconfig.foo.json")
  .option("--transpileOnly", "Skip type checking")
  .example("build --transpileOnly")
  .option("--external", "List of external modules")
  .example("build --external lodash,conf")
  .option(
    "--inlineDynamicImports",
    "Rollup should inline dynamic imports",
    true
  )
  .example("build --inlineDynamicImports")
  .option(
    "--extractErrors",
    "Extract errors to ./errors/codes.json and provide a url for decoding."
  )
  .example(
    "build --extractErrors=https://reactjs.org/docs/error-decoder.html?invariant="
  )
  .action(async (options) =>
    new TsBuild(
      options,
      pkgConfig["name"],
      pkgConfig["source"]
    ).compile()
  );

prog
  .command("lint")
  .describe("Run eslint on the current project")
  .example("lint src test")
  .option("--fix", "Fixes fixable errors and warnings")
  .example("lint src test --fix")
  .option("--ignore-pattern", "Ignore a pattern")
  .example("lint src test --ignore-pattern test/foobar.ts")
  .example("lint src test --max-warnings 10")
  .option("--write-file", "Write the config file locally")
  .example("lint --write-file")
  .option("--report-file", "Write json report to file locally")
  .example("lint --report-file eslint-report.json")
  .action(
    async (options: {
      fix: boolean;
      "ignore-pattern": string;
      "write-file": boolean;
      "report-file": string;
      _: string[];
    }) => {
      if (options["_"].length === 0 && !options["write-file"]) {
        const inputs = ["src"].filter(fs.existsSync);
        options["_"] = inputs.map((path_: string) =>
          path_.endsWith("/") ? path_ : path_.concat("/")
        );
        Log(
          chalk.yellow(
            `Excuting linter on default paths "${inputs.join(" ")}"`,
            '\nTo change this behaviour, change your lint script in your package.json to "lint": "ts-build lint src examples" where example is the other directories'
          )
        );
      }

      const linterFactory = createLinter({
        rootDir: appRoot,
        write: options["write-file"],
      });
      const linter = linterFactory(
        {
          ...(pkgConfig["eslint"] ?? {}),
          ignorePattern: options["ignore-pattern"],
        } as Partial<ESLint.Options>,
        { fix: options.fix }
      );
      const results = await linter.lintFiles(options["_"]);
      if (options.fix) {
        await outputfix(results);
      }
      Log((await linter.loadFormatter()).format(results));
      if (options["report-file"]) {
        await fs.outputFile(
          options["report-file"],
          (await linter.loadFormatter("json")).format(results) as string
        );
      }
      if (getErrorResultCount(results) !== 0) {
        process.exit(1);
      }
    }
  );

prog.parse(process.argv);
