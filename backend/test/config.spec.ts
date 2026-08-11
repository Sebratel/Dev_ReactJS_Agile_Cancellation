import { getAppConfig } from '@/config/app.config';

describe('App config', () => {
  it('carrega valores padrao seguros', () => {
    const config = getAppConfig({});

    expect(config.appName).toBe('ger-collection-cancellation-api');
    expect(config.port).toBe(4000);
    expect(config.corsOrigin).toBe('http://localhost:5173');
    expect(config.timezone).toBe('UTC');
    expect(config.databaseUrl).toContain('mysql://USER:PASSWORD@HOST');
  });
});
