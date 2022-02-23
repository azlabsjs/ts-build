import chalk from 'chalk';
import { getInstallCmd } from './helpers';
import * as Logger from './logger';

// This was copied from Razzle. Lots of unused stuff.
const program = {
  name: 'ts-build',
};

export const help = function () {
  return `
    Only ${chalk.green('<project-directory>')} is required.
    If you have any problems, do not hesitate to file an issue:
    ${chalk.cyan('https://github.com/formium/tsdx/issues/new')}
  `;
};

export const missingProjectName = function () {
  return `
Please specify the project directory:
  ${chalk.cyan(program.name)} ${chalk.green('<project-directory>')}
For example:
  ${chalk.cyan(program.name)} ${chalk.green('my-tsdx-lib')}
Run ${chalk.cyan(`${program.name} --help`)} to see all options.
`;
};

export const alreadyExists = function (projectName: string) {
  return `
Uh oh! Looks like there's already a directory called ${chalk.red(
    projectName
  )}. Please try a different name or delete that folder.`;
};

export const installing = function (packages: string[]) {
  const pkgText = packages
    .map(function (pkg) {
      return `    ${chalk.cyan(chalk.bold(pkg))}`;
    })
    .join('\n');

  return `Installing npm modules:
${pkgText}
`;
};

export const installError = function (packages: string[]) {
  const pkgText = packages
    .map(function (pkg) {
      return `${chalk.cyan(chalk.bold(pkg))}`;
    })
    .join(', ');

  Logger.error(`Failed to install ${pkgText}, try again.`);
};

export const copying = function (projectName: string) {
  return `
Creating ${chalk.bold(chalk.green(projectName))}...
`;
};

export const start = async function (projectName: string) {
  const cmd = await getInstallCmd();
  const commands = {
    install: cmd === 'npm' ? 'npm install' : 'yarn install',
    build: cmd === 'npm' ? 'npm run build' : 'yarn build',
    start: cmd === 'npm' ? 'npm run start' : 'yarn start',
    test: cmd === 'npm' ? 'npm test' : 'yarn test',
  };

  return `
  ${chalk.green('Awesome!')} Project successfully generated.

  Run:
    ${Logger.cmd(
      `cd ${projectName}`
    )} to move in project directory and start working
    
  To build for production:
    ${Logger.cmd(commands.build)}
  To test your library with Jest:
    ${Logger.cmd(commands.test)}
`;
};

export const incorrectNodeVersion = function (requiredVersion: string) {
  return `Unsupported Node version! Your current Node version (${chalk.red(
    process.version
  )}) does not satisfy the requirement of Node ${chalk.cyan(requiredVersion)}.`;
};
