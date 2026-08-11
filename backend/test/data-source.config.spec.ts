import { getDataSourceMode } from '@/common/data-source/data-source.config';

describe('Data source config', () => {
  it('usa mock por padrao quando DATA_SOURCE_MODE nao e database', () => {
    expect(getDataSourceMode({ DATA_SOURCE_MODE: 'mock' })).toBe('mock');
    expect(getDataSourceMode({})).toBe('mock');
  });

  it('usa database quando DATA_SOURCE_MODE=database', () => {
    expect(getDataSourceMode({ DATA_SOURCE_MODE: 'database' })).toBe(
      'database',
    );
  });
});
