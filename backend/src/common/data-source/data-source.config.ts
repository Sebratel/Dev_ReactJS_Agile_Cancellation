import type { DataSourceMode } from '@/common/data-source/data-source.constants';

export function getDataSourceMode(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceMode {
  if (env.DATA_SOURCE_MODE === 'database') {
    return 'database';
  }

  return 'mock';
}
