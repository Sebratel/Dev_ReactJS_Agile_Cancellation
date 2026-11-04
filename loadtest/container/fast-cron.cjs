// SO PARA O TESTE DE CARGA (NODE_OPTIONS=--require /loadtest/fast-cron.cjs).
// Acelera os @Cron do backend para que varios ciclos de sync ocorram durante o teste:
//   '*/10 * * * *' (sync ERP)           -> a cada 30 s   (LOADTEST_ERP_CRON)
//   '*/30 * * * *' (pre-cobranca, ERP)  -> a cada 60 s   (LOADTEST_PRECOLLECTION_CRON)
// Nao altera nenhum arquivo de backend/src nem o compose de producao.
const Module = require('node:module');

const REPLACEMENTS = new Map([
  ['*/10 * * * *', process.env.LOADTEST_ERP_CRON || '*/30 * * * * *'],
  ['*/30 * * * *', process.env.LOADTEST_PRECOLLECTION_CRON || '0 * * * * *'],
]);

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  const loaded = originalLoad.apply(this, arguments);
  if (request !== 'cron' || loaded.__fastCronPatched) return loaded;
  const Original = loaded.CronJob;
  class FastCronJob extends Original {
    constructor(cronTime, ...rest) {
      super(
        typeof cronTime === 'string' && REPLACEMENTS.has(cronTime)
          ? REPLACEMENTS.get(cronTime)
          : cronTime,
        ...rest,
      );
    }
    static from(params) {
      if (
        params &&
        typeof params.cronTime === 'string' &&
        REPLACEMENTS.has(params.cronTime)
      ) {
        params = { ...params, cronTime: REPLACEMENTS.get(params.cronTime) };
      }
      return Original.from(params);
    }
  }
  return new Proxy(loaded, {
    get(target, prop) {
      if (prop === 'CronJob') return FastCronJob;
      if (prop === '__fastCronPatched') return true;
      return target[prop];
    },
  });
};
