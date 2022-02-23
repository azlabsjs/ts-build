import chalk from 'chalk';

const stderr = console.error.bind(console);

export function logError(err: Error | any) {
  const error = err.error ?? err;
  const description = `${error.name ? error.name + ': ' : ''}${
    error.message || error
  }`;
  const message = error.plugin
    ? error.plugin === 'rpt2'
      ? `(typescript) ${description}`
      : `(${error.plugin} plugin) ${description}`
    : description;

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
}

// This was copied from Razzle. Lots of unused stuff.
export const info = (msg: string) => {
  console.log(`${chalk.gray('>')} ${msg}`);
};

export const error = (msg: string | Error) => {
  if (msg instanceof Error) {
    msg = msg.message;
  }

  console.error(`${chalk.red('> Error!')} ${msg}`);
};

export const success = (msg: string) => {
  console.log(`${chalk.green('> Success!')} ${msg}`);
};


export const cmd = (cmd: string) => {
  return chalk.bold(chalk.cyan(cmd));
};

export const code = (cmd: string) => {
  return `${chalk.gray('`')}${chalk.bold(cmd)}${chalk.gray('`')}`;
};

export const param = (param: string) => {
  return chalk.bold(`${chalk.gray('{')}${chalk.bold(param)}${chalk.gray('}')}`);
};