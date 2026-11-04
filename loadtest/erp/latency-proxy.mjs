// Proxy TCP com latencia realista entre o backend e o Postgres do ERP artificial (equivalente a um
// toxiproxy "latency + jitter", mas com distribuicao calibravel: mistura rapido/lento por rajada e
// atraso extra no estabelecimento da conexao). Usado SO no teste de carga.
//
// RTT de uma consulta = atraso(ida) + atraso(volta). Cada rajada de bytes sorteia um atraso:
//   com prob. SLOW_PROB  -> N(SLOW_MS, SLOW_SD)    (rede congestionada)
//   senao                -> N(FAST_MS, FAST_SD)
// Defaults calibrados para queryRttMs p50~9 / p95~57 e connectMs p50~95 / p95~137 do ERP real.
import net from 'node:net';

const env = (k, d) => Number(process.env[k] ?? d);
const FAST_MS = env('ERP_LAT_FAST_MS', 4.2);
const FAST_SD = env('ERP_LAT_FAST_SD', 1.2);
const SLOW_MS = env('ERP_LAT_SLOW_MS', 29);
const SLOW_SD = env('ERP_LAT_SLOW_SD', 3);
const SLOW_PROB = env('ERP_LAT_SLOW_PROB', 0.23);
const CONNECT_EXTRA_MS = env('ERP_LAT_CONNECT_EXTRA_MS', 66);
const CONNECT_SIGMA = env('ERP_LAT_CONNECT_SIGMA', 0.3);
const TARGET_HOST = process.env.ERP_LAT_TARGET_HOST ?? 'postgres-erp';
const TARGET_PORT = env('ERP_LAT_TARGET_PORT', 5432);

const gauss = () => {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const oneWay = () =>
  Math.max(
    0,
    Math.random() < SLOW_PROB
      ? SLOW_MS + gauss() * SLOW_SD
      : FAST_MS + gauss() * FAST_SD,
  );
const connectExtra = () => CONNECT_EXTRA_MS * Math.exp(gauss() * CONNECT_SIGMA);

function delayedPipe(src, dst) {
  // fila FIFO por direcao (um unico timer): preserva a ordem dos bytes, que timers separados nao garantem
  const queue = [];
  let timer = null;
  let ended = false;
  let lastAt = 0;
  let lastDeliver = 0;
  let burstDelay = 0;
  const drain = () => {
    timer = null;
    const now = performance.now();
    while (queue.length > 0 && queue[0].at <= now) {
      const { chunk } = queue.shift();
      if (!dst.destroyed) dst.write(chunk);
    }
    if (queue.length > 0) {
      timer = setTimeout(drain, Math.max(0, queue[0].at - performance.now()));
    } else if (ended) {
      dst.end();
    }
  };
  src.on('data', (chunk) => {
    const now = performance.now();
    if (now - lastAt > 1) burstDelay = oneWay();
    lastAt = now;
    lastDeliver = Math.max(lastDeliver, now + burstDelay);
    queue.push({ at: lastDeliver, chunk });
    if (!timer)
      timer = setTimeout(drain, Math.max(0, lastDeliver - performance.now()));
  });
  src.on('end', () => {
    ended = true;
    if (!timer && queue.length === 0) dst.end();
  });
  src.on('error', () => dst.destroy());
}

net
  .createServer((client) => {
    client.pause();
    const upstream = net.connect(TARGET_PORT, TARGET_HOST);
    upstream.setNoDelay(true);
    client.setNoDelay(true);
    upstream.on('error', () => client.destroy());
    client.on('error', () => upstream.destroy());
    client.on('close', () => upstream.destroy());
    upstream.on('close', () => client.destroy());
    upstream.once('connect', () => {
      setTimeout(() => {
        delayedPipe(client, upstream);
        delayedPipe(upstream, client);
        client.resume();
      }, connectExtra());
    });
  })
  .listen(5432, '0.0.0.0', () =>
    process.stdout.write(
      `erp-latency: :5432 -> ${TARGET_HOST}:${TARGET_PORT} (fast ${FAST_MS}ms, slow ${SLOW_MS}ms p=${SLOW_PROB}, connect +${CONNECT_EXTRA_MS}ms)\n`,
    ),
  );
