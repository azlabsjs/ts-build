import path from 'path';
import fs from 'fs';

const appDirectory = fs.realpathSync(process.cwd());

export const resolveApp = function (path_: string) {
  return path.resolve(appDirectory, path_);
};
