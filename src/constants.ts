import { resolveApp } from "./resolver";

export const appDist = resolveApp('dist');
export const tsconfigJson = resolveApp('tsconfig.json');
export const appConfig = resolveApp('app.config.js');
export const packageJson = resolveApp('package.json');
export const progressEstimatorCache = resolveApp(
  'node_modules/.cache/.progress-estimator'
);
