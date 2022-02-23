import { progressEstimatorCache } from './constants';
import progressEstimator from 'progress-estimator';
import fs from 'fs';

export function createProgressEstimator() {
  if (!fs.existsSync(progressEstimatorCache)) {
    fs.mkdirSync(progressEstimatorCache, { recursive: true });
  }
  return progressEstimator({
    storagePath: progressEstimatorCache,
  });
}
