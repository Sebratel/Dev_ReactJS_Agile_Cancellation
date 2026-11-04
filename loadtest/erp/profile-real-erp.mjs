#!/usr/bin/env node
// Perfila o ERP REAL (Postgres) para que o ERP artificial do teste de carga tenha o mesmo tamanho.
// SOMENTE LEITURA: transacao READ ONLY, statement_timeout curto, apenas metadados e agregados.
// Nao le nem grava linhas de dados (sem PII) e nao imprime credenciais.
//
//   node loadtest/erp/profile-real-erp.mjs --env-file <caminho/.env com ERP_DB_*> [--out loadtest/erp/erp-profile.json]
//
// A saida (erp-profile.json) so tem contagens, tamanhos e colunas: e seguro versionar.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('backend/package.json'));
const { Client } = require('pg');

const TABLES = [
  'contracts',
  'contract_types',
  'contract_events',
  'contract_event_types',
  'people',
  'financers_natures',
  'financial_receivable_titles',
  'financial_receipt_titles',
  'financial_renegotiations',
  'financial_renegotiation_titles',
];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function parseEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const envFile = arg('env-file');
if (!envFile) throw new Error('--env-file obrigatorio');
const out = arg('out', 'loadtest/erp/erp-profile.json');
const env = parseEnv(envFile);

const connConfig = {
  host: env.ERP_DB_HOST,
  port: Number(env.ERP_DB_PORT || 5432),
  database: env.ERP_DB_NAME,
  user: env.ERP_DB_USER,
  password: env.ERP_DB_PASSWORD,
  ssl: env.ERP_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 15000,
  statement_timeout: 30000,
  application_name: 'ger-loadtest-profile-readonly',
};
const client = new Client(connConfig);

function pct(xs, p) {
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.ceil((p / 100) * a.length) - 1)];
}

// Tempo de conexao REAL (handshake TCP + auth + 1o SELECT) e RTT de consulta: alimenta o atraso
// de rede do ERP simulado (toxiproxy), para a carga nao rodar com latencia zero.
async function measureConnection(samples = 15) {
  const connect = [];
  const rtt = [];
  for (let i = 0; i < samples; i++) {
    const c = new Client({
      ...connConfig,
      application_name: 'ger-loadtest-rtt',
    });
    const t0 = performance.now();
    await c.connect();
    connect.push(performance.now() - t0);
    for (let k = 0; k < 5; k++) {
      const t1 = performance.now();
      await c.query('SELECT 1');
      rtt.push(performance.now() - t1);
    }
    await c.end();
  }
  const r = (v) => Number(v.toFixed(2));
  return {
    samples,
    connectMs: {
      p50: r(pct(connect, 50)),
      p95: r(pct(connect, 95)),
      max: r(Math.max(...connect)),
    },
    queryRttMs: {
      p50: r(pct(rtt, 50)),
      p95: r(pct(rtt, 95)),
      p99: r(pct(rtt, 99)),
      max: r(Math.max(...rtt)),
    },
  };
}

await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout = '30s'");

  const profile = {
    generatedAt: new Date().toISOString(),
    schema: 'erp',
    tables: {},
  };

  const sizes = await client.query(
    `SELECT c.relname AS table, c.reltuples::bigint AS approx_rows,
            pg_total_relation_size(c.oid) AS total_bytes,
            pg_relation_size(c.oid) AS table_bytes,
            pg_indexes_size(c.oid) AS index_bytes
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'erp' AND c.relname = ANY($1) AND c.relkind IN ('r','p')`,
    [TABLES],
  );
  for (const r of sizes.rows) {
    profile.tables[r.table] = {
      approxRows: Number(r.approx_rows),
      totalBytes: Number(r.total_bytes),
      tableBytes: Number(r.table_bytes),
      indexBytes: Number(r.index_bytes),
    };
  }

  // Contagem exata so quando a estimativa e pequena (evita varredura pesada no ERP de producao).
  for (const [table, info] of Object.entries(profile.tables)) {
    if (info.approxRows >= 0 && info.approxRows < 2_000_000) {
      const r = await client.query(
        `SELECT count(*)::bigint AS n FROM erp."${table}"`,
      );
      info.exactRows = Number(r.rows[0].n);
    }
  }

  const cols = await client.query(
    `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'erp' AND table_name = ANY($1)
      ORDER BY table_name, ordinal_position`,
    [TABLES],
  );
  for (const c of cols.rows) {
    (profile.tables[c.table_name] ??= {}).columns ??= [];
    profile.tables[c.table_name].columns.push({
      name: c.column_name,
      type: c.data_type,
      nullable: c.is_nullable === 'YES',
    });
  }

  // Distribuicoes via estatisticas do planner (pg_stats): nao varre tabelas. Lista EXPLICITA de colunas de
  // codigo/status (nada de texto livre ou dado pessoal); qualquer outra coluna e ignorada.
  const ALLOWED = {
    contracts: [
      'status',
      'stage',
      'v_status',
      'client_type',
      'deleted',
      'contract_type_id',
    ],
    financial_receivable_titles: [
      'situation',
      'type',
      'parcel',
      'renegotiated',
      'finished',
      'origin',
      'bank_situation',
      'blocked_contract',
      'title_loss',
      'deleted',
    ],
    financial_receipt_titles: ['deleted', 'finished', 'origin'],
    financial_renegotiations: ['type', 'deleted'],
    financial_renegotiation_titles: ['type', 'deleted'],
    people: ['status', 'situation', 'client', 'deleted'],
    contract_events: ['deleted'],
  };
  const stats = await client.query(
    `SELECT tablename, attname, n_distinct, null_frac, most_common_vals::text AS vals, most_common_freqs::text AS freqs
       FROM pg_stats
      WHERE schemaname = 'erp' AND tablename = ANY($1)
        AND most_common_vals IS NOT NULL AND n_distinct BETWEEN 1 AND 200`,
    [TABLES],
  );
  for (const st of stats.rows) {
    if (!ALLOWED[st.tablename]?.includes(st.attname)) continue;
    const t = (profile.tables[st.tablename] ??= {});
    (t.distributions ??= {})[st.attname] = {
      nDistinct: Number(st.n_distinct),
      nullFrac: Number(st.null_frac),
      values: st.vals.replace(/^\{|\}$/g, '').split(','),
      freqs: st.freqs
        .replace(/^\{|\}$/g, '')
        .split(',')
        .map(Number),
    };
  }

  await client.query('ROLLBACK');
  profile.connection = await measureConnection();
  fs.writeFileSync(out, JSON.stringify(profile, null, 2) + '\n');
  for (const [t, i] of Object.entries(profile.tables)) {
    console.log(
      `${t.padEnd(34)} rows~${String(i.exactRows ?? i.approxRows).padStart(11)}  total=${((i.totalBytes ?? 0) / 1048576).toFixed(0)} MiB`,
    );
  }
  console.log(`perfil gravado em ${out}`);
} finally {
  await client.end();
}
