#!/usr/bin/env node
// Mede a latencia de conexao/consulta ao Postgres com a MESMA rotina usada no perfil do ERP real:
// abre 15 conexoes novas (connectMs) e roda 5 `SELECT 1` por conexao (queryRttMs).
//   node loadtest/erp/measure-erp-latency.mjs --port 55432 [--label direto]   # direto no Postgres
//   node loadtest/erp/measure-erp-latency.mjs --port 55433 [--label proxy]    # via proxy de latencia
// Credenciais: placeholders de loadtest/loadtest.env (ERP_DB_USER/ERP_DB_PASSWORD/ERP_DB_NAME).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const { Client } = createRequire(path.join(root, 'backend', 'package.json'))(
  'pg',
);

const a = process.argv.slice(2);
const arg = (n, d) => {
  const i = a.indexOf(`--${n}`);
  return i >= 0 ? a[i + 1] : d;
};
const envFile = Object.fromEntries(
  fs
    .readFileSync(path.join(root, 'loadtest', 'loadtest.env'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [
      l.slice(0, l.indexOf('=')),
      l.slice(l.indexOf('=') + 1).trim(),
    ]),
);

const pct = (xs, p) => {
  const s = [...xs].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};
const r1 = (n) => Math.round(n * 100) / 100;

export async function measure({
  host = '127.0.0.1',
  port,
  connections = Number(arg('connections', 15)),
  queries = 5,
}) {
  const connectMs = [];
  const queryRttMs = [];
  for (let i = 0; i < connections; i += 1) {
    const client = new Client({
      host,
      port,
      user: envFile.ERP_DB_USER,
      password: envFile.ERP_DB_PASSWORD,
      database: envFile.ERP_DB_NAME,
      ssl: false,
    });
    const t0 = performance.now();
    await client.connect();
    connectMs.push(performance.now() - t0);
    for (let q = 0; q < queries; q += 1) {
      const t1 = performance.now();
      await client.query('SELECT 1');
      queryRttMs.push(performance.now() - t1);
    }
    await client.end();
  }
  return {
    samples: connections,
    connectMs: {
      p50: r1(pct(connectMs, 50)),
      p95: r1(pct(connectMs, 95)),
      max: r1(Math.max(...connectMs)),
    },
    queryRttMs: {
      p50: r1(pct(queryRttMs, 50)),
      p95: r1(pct(queryRttMs, 95)),
      p99: r1(pct(queryRttMs, 99)),
      max: r1(Math.max(...queryRttMs)),
    },
  };
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const res = await measure({
    host: arg('host', '127.0.0.1'),
    port: Number(arg('port', '55432')),
    connections: Number(arg('connections', 15)),
  });
  console.log(JSON.stringify({ label: arg('label', ''), ...res }));
}
