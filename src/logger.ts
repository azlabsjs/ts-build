import chalk from "chalk";
import { ErrorType } from "./types";

const stderr = console.error.bind(console);

export const Logger = {
  logError(err: ErrorType) {
    const error = err.error ?? err;
    const description = `${error.name ? error.name + ': ' : ''}${error.message || error}`;
    const message = error.plugin ? error.plugin === 'rpt2' ? `(typescript) ${description}` : `(${error.plugin} plugin) ${description}` : description;
    stderr(chalk.bold.red(message));

    if (error.loc) {
      stderr();
      stderr(`at ${error.loc.file}:${error.loc.line}:${error.loc.column}`);
    }

    if (error.frame) {
      stderr();
      stderr(chalk.dim(error.frame));
    } else if (err.stack) {
      const headlessStack = error.stack.replace(message, '');
      stderr(chalk.dim(headlessStack));
    }

    stderr();
  },

  info(msg: string) {
    console.log(`${chalk.gray('>')} ${msg}`);
  },

  error(msg: string | Error) {
    if (msg instanceof Error) {
      msg = msg.message;
    }

    console.error(`${chalk.red('> Error!')} ${msg}`);
  },

  success(msg: string) {
    console.log(`${chalk.green('> Success!')} ${msg}`);
  },

  cmd(cmd: string) {
    return chalk.bold(chalk.cyan(cmd));
  },

  code(cmd: string) {
    return `${chalk.gray('`')}${chalk.bold(cmd)}${chalk.gray('`')}`;
  },

  param(param: string) {
    return chalk.bold(`${chalk.gray('{')}${chalk.bold(param)}${chalk.gray('}')}`);
  }
}
