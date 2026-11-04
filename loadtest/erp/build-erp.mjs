#!/usr/bin/env node
// Gera o ERP ARTIFICIAL com o mesmo tamanho do ERP real (contagens de linhas e bytes por tabela),
// a partir de loadtest/erp/erp-profile.json (so agregados). Dados 100% sinteticos, gerados em SQL
// (generate_series) em lotes, dentro do volume nomeado `ger-loadtest-erp-data` (nunca no repo).
//
//   ERP_SCALE=1    node loadtest/erp/build-erp.mjs            # tamanho real (~28 GB, dezenas de minutos)
//   ERP_SCALE=0.01 node loadtest/erp/build-erp.mjs --force    # smoke local/CI (~280 MB)
// Opcoes: --project ger-loadtest  --force (recria)  --elig-pct 3 (% de contratos ativos elegiveis)
// Idempotente/retomavel: lotes ja gravados (erp_gen.meta) sao pulados; mesma escala => no-op.
// Calibracao: cada tabela grande e amostrada (40 mil linhas) para medir largura da linha e bytes de
// indice por linha; `filler` e colunas `aux_N` (com indice) completam o tamanho do perfil real.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const profile = JSON.parse(
  fs.readFileSync(path.join(here, 'erp-profile.json'), 'utf8'),
);
const T = profile.tables;

export function requiredBytes(scale) {
  const total = Object.values(T).reduce((a, t) => a + t.totalBytes, 0);
  return Math.round(total * scale * 1.15);
}

export function freeBytes(p = process.platform === 'win32' ? 'C:\\' : '/') {
  const s = fs.statfsSync(p);
  return Number(s.bavail) * Number(s.bsize);
}

const GiB = 1024 ** 3;
const fmtGiB = (n) => (n / GiB).toFixed(2) + ' GiB';

// ------------------------------------------------------------------ SQL helpers
function real(name) {
  const t = T[name];
  return {
    rows: t.exactRows ?? t.approxRows,
    table: t.tableBytes,
    index: t.indexBytes,
    total: t.totalBytes,
  };
}

function distCase(table, col, expr, asType) {
  const d = T[table].distributions[col];
  const vals = d.values.map((v) => v.replace(/^"|"$/g, ''));
  const q = (v) =>
    asType === 'bool'
      ? v === 't'
        ? 'true'
        : 'false'
      : asType === 'text'
        ? `'${v.replace(/'/g, "''")}'`
        : v;
  let acc = 0;
  const whens = vals
    .map((v, i) => {
      acc += d.freqs[i];
      return `WHEN ${expr} < ${acc.toFixed(8)} THEN ${q(v)}`;
    })
    .join(' ');
  return `(CASE ${whens} ELSE ${q(vals[0])} END)`;
}

const FIRST = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Eduarda',
  'Felipe',
  'Gabriela',
  'Hugo',
  'Isabela',
  'Joao',
  'Karina',
  'Lucas',
  'Mariana',
  'Nicolas',
  'Olivia',
  'Paulo',
  'Quiteria',
  'Rafael',
  'Sofia',
  'Tiago',
];
const LAST = [
  'Silva',
  'Souza',
  'Oliveira',
  'Santos',
  'Pereira',
  'Lima',
  'Ferreira',
  'Costa',
  'Rodrigues',
  'Almeida',
];
const arr = (a) => `ARRAY[${a.map((x) => `'${x}'`).join(',')}]`;

function functionsSql({ C, elig, pr }) {
  const vs = T.contracts.distributions.v_status;
  const names = vs.values.map((v) => v.replace(/^"|"$/g, ''));
  let acc = 0;
  const vcase = names
    .map((v, i) => {
      acc += vs.freqs[i];
      return `WHEN erp_gen.u(c*13+1) < ${acc.toFixed(8)} THEN '${v}'`;
    })
    .join(' ');
  return `
CREATE SCHEMA IF NOT EXISTS erp_gen;
CREATE OR REPLACE FUNCTION erp_gen.u(x bigint) RETURNS float8 LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT (hashint8(x)::bigint + 2147483648)/4294967296.0 $$;
CREATE OR REPLACE FUNCTION erp_gen.vstatus(c bigint) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT CASE ${vcase} ELSE 'Normal' END $$;
CREATE OR REPLACE FUNCTION erp_gen.ctype(c bigint) RETURNS bigint LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT ${distCase('contracts', 'contract_type_id', 'erp_gen.u(c*19+5)', 'num')}::bigint $$;
CREATE OR REPLACE FUNCTION erp_gen.is_active(c bigint) RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT erp_gen.vstatus(c) NOT IN ('Cancelado','Encerrado') $$;
CREATE OR REPLACE FUNCTION erp_gen.is_elig(c bigint) RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT erp_gen.vstatus(c) IN ('Normal','Bloqueio Financeiro') AND erp_gen.ctype(c) <> 33
       AND erp_gen.u(c*17+3) < ${elig} $$;
-- estado do titulo g (idade k = (g-1)/C; active/elig vem de erp_gen.cinfo): 0 aberto, 1 pago c/ baixa, 2 pago s/ baixa, 3 excluido
CREATE OR REPLACE FUNCTION erp_gen.title_state(g bigint, active boolean, elig boolean, k bigint) RETURNS int LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT CASE
       WHEN elig AND k <= 1 THEN 0
       WHEN erp_gen.u(g*3+1) < 0.136 THEN 3
       WHEN erp_gen.u(g*7+4) < (CASE
              WHEN active THEN (CASE WHEN k = 0 THEN 0.95 WHEN k = 1 THEN 0.12 WHEN k <= 3 THEN 0.04 ELSE 0.01 END)
              ELSE (CASE WHEN k < 6 THEN 0.40 ELSE 0.03 END) END) THEN 0
       WHEN erp_gen.u(g*5+2) < ${pr} THEN 1 ELSE 2 END $$;
CREATE OR REPLACE FUNCTION erp_gen.title_exp(g bigint, active boolean, elig boolean, k bigint, off_a int, off_c int) RETURNS date LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT CASE
       WHEN elig AND k = 0 THEN (CURRENT_DATE - 1)
       WHEN elig AND k = 1 THEN ((CURRENT_DATE - 1) - interval '1 month')::date
       WHEN active THEN CURRENT_DATE + 20 - off_a - 30*k::int
       ELSE CURRENT_DATE - 10 - off_c - 30*k::int END $$;
`;
}

// ------------------------------------------------------------------ especificacao das tabelas
// cols: [nome, tipo, expressao SQL em funcao de `g` (e `s.st`/`s.ex` para titulos)]
function specs(N) {
  const P = N.people;
  const C = N.contracts;
  const U = (salt) => `erp_gen.u(g*97+${salt})`;
  return {
    people: {
      rows: P,
      pk: 'id',
      cols: [
        ['id', 'bigint', 'g'],
        [
          'tx_id',
          'varchar(20)',
          `lpad(((abs(hashint8(g))::bigint % 90000000000) + 10000000000)::text, 11, '0')`,
        ],
        [
          'name',
          'varchar(255)',
          `(${arr(FIRST)})[1+floor(${U(1)}*20)::int] || ' ' || (${arr(LAST)})[1+floor(${U(2)}*10)::int] || ' ' || g`,
        ],
        ['email', 'varchar(255)', `'cliente' || g || '@example.com'`],
        [
          'phone',
          'varchar(32)',
          `'5511' || lpad((30000000 + floor(${U(3)}*9999999))::int::text, 8, '0')`,
        ],
        [
          'cell_phone_1',
          'varchar(32)',
          `'55119' || lpad((50000000 + floor(${U(4)}*49999999))::int::text, 8, '0')`,
        ],
        [
          'situation',
          'integer',
          distCase('people', 'situation', U(5), 'num') + '::int',
        ],
        ['status', 'integer', '1'],
        ['client', 'boolean', distCase('people', 'client', U(6), 'bool')],
        ['deleted', 'boolean', distCase('people', 'deleted', U(7), 'bool')],
      ],
      idx: [['tx_id'], ['name']],
    },
    contracts: {
      rows: C,
      pk: 'id',
      cols: [
        ['id', 'bigint', 'g'],
        ['public_id', 'uuid', `md5('ger-c' || g)::uuid`],
        ['client_id', 'bigint', 'g'],
        ['contract_type_id', 'bigint', 'erp_gen.ctype(g)'],
        ['contract_number', 'varchar(40)', `'CTR' || (500000 + g)`],
        ['v_status', 'varchar(40)', 'erp_gen.vstatus(g)'],
        [
          'status',
          'bigint',
          `(CASE erp_gen.vstatus(g) WHEN 'Cancelado' THEN 4 WHEN 'Normal' THEN 1 WHEN 'Bloqueio Financeiro' THEN 6 WHEN 'Suspenso' THEN 5 WHEN 'Cortesia' THEN 3 ELSE 9 END)`,
        ],
        ['stage', 'bigint', distCase('contracts', 'stage', U(8), 'num')],
        ['date', 'date', `CURRENT_DATE - (60 + floor(${U(9)}*1700))::int`],
        [
          'amount',
          'numeric(12,2)',
          `(79.9 + floor(${U(10)}*220))::numeric(12,2)`,
        ],
        ['deleted', 'boolean', distCase('contracts', 'deleted', U(11), 'bool')],
      ],
      idx: [
        ['public_id', 'unique'],
        ['client_id'],
        ['contract_type_id'],
        ['v_status'],
      ],
    },
    financial_receivable_titles: {
      rows: N.financial_receivable_titles,
      pk: 'id',
      from: `erp_gen.cinfo ci, LATERAL (SELECT erp_gen.title_state(g, ci.active, ci.elig, (g-1)/${C}) AS st, erp_gen.title_exp(g, ci.active, ci.elig, (g-1)/${C}, ci.off_a, ci.off_c) AS ex) s`,
      where: `ci.c = 1 + (g-1) % ${C}`,
      cols: [
        ['id', 'bigint', 'g'],
        ['contract_id', 'bigint', `1 + (g-1) % ${C}`],
        ['client_id', 'bigint', `1 + (g-1) % ${C}`],
        [
          'financer_nature_id',
          'bigint',
          `(CASE WHEN ${U(12)} < 0.015 THEN 2 WHEN ${U(13)} < 0.05 THEN 3 + floor(${U(14)}*470) ELSE 1 END)::bigint`,
        ],
        [
          'bill_title_id',
          'bigint',
          `(CASE WHEN ${U(15)} < 0.015 AND s.st <> 0 THEN g END)`,
        ],
        [
          'renegotiated',
          'boolean',
          `(s.st <> 0 AND ${distCase('financial_receivable_titles', 'renegotiated', U(16), 'bool')})`,
        ],
        ['deleted', 'boolean', '(s.st = 3)'],
        ['finished', 'boolean', '(s.st IN (1,2))'],
        [
          'type',
          'bigint',
          distCase('financial_receivable_titles', 'type', U(17), 'num'),
        ],
        ['situation', 'bigint', '0'],
        [
          'parcel',
          'bigint',
          distCase('financial_receivable_titles', 'parcel', U(18), 'num'),
        ],
        [
          'origin',
          'bigint',
          distCase('financial_receivable_titles', 'origin', U(19), 'num'),
        ],
        ['title', 'varchar(40)', `'FAT-' || lpad(g::text, 9, '0')`],
        [
          'title_amount',
          'numeric(12,2)',
          `(79.9 + floor(${U(20)}*220))::numeric(12,2)`,
        ],
        [
          'balance',
          'numeric(12,2)',
          `(CASE WHEN s.st = 0 THEN (79.9 + floor(${U(20)}*220)) ELSE 0 END)::numeric(12,2)`,
        ],
        ['expiration_date', 'date', 's.ex'],
        ['issue_date', 'date', 's.ex - 10'],
      ],
      idx: [['contract_id'], ['financer_nature_id'], ['expiration_date']],
    },
    financial_receipt_titles: {
      rows: N.financial_receipt_titles,
      pk: 'id',
      from: `erp_gen.cinfo ci, LATERAL (SELECT erp_gen.title_state(g, ci.active, ci.elig, (g-1)/${C}) AS st, erp_gen.title_exp(g, ci.active, ci.elig, (g-1)/${C}, ci.off_a, ci.off_c) AS ex) s`,
      where: `ci.c = 1 + (g-1) % ${C} AND s.st = 1`,
      scan: N.financial_receivable_titles,
      cols: [
        ['id', 'bigint', 'g'],
        ['financial_receivable_title_id', 'bigint', 'g'],
        ['client_id', 'bigint', `1 + (g-1) % ${C}`],
        [
          'client_paid_date',
          'date',
          `LEAST(s.ex + floor(${U(21)}*10)::int, CURRENT_DATE)`,
        ],
        [
          'payment_form_id',
          'bigint',
          `(CASE WHEN ${U(22)} < 0.0558 THEN NULL ELSE 1 + floor(${U(23)}*8) END)::bigint`,
        ],
        [
          'finished',
          'boolean',
          distCase('financial_receipt_titles', 'finished', U(24), 'bool'),
        ],
        [
          'origin',
          'bigint',
          distCase('financial_receipt_titles', 'origin', U(25), 'num'),
        ],
        [
          'amount',
          'numeric(12,2)',
          `(79.9 + floor(${U(20)}*220))::numeric(12,2)`,
        ],
        [
          'deleted',
          'boolean',
          distCase('financial_receipt_titles', 'deleted', U(26), 'bool'),
        ],
      ],
      idx: [['financial_receivable_title_id']],
    },
    financial_renegotiations: {
      rows: N.financial_renegotiations,
      pk: 'id',
      cols: [
        ['id', 'bigint', 'g'],
        [
          'date',
          'timestamp',
          `now() - (floor(${U(27)}*1500) * interval '1 day')`,
        ],
        ['client_id', 'bigint', `1 + (g*7) % ${P}`],
        [
          'type',
          'bigint',
          distCase('financial_renegotiations', 'type', U(28), 'num'),
        ],
        [
          'deleted',
          'boolean',
          distCase('financial_renegotiations', 'deleted', U(29), 'bool'),
        ],
      ],
      idx: [],
    },
    financial_renegotiation_titles: {
      rows: N.financial_renegotiation_titles,
      pk: 'id',
      cols: [
        ['id', 'bigint', 'g'],
        [
          'financial_renegotiation_id',
          'bigint',
          `1 + (g-1) % ${N.financial_renegotiations}`,
        ],
        [
          'financial_receivable_title_id',
          'bigint',
          `(CASE (g-1)/${N.financial_renegotiations} WHEN 0 THEN 8 WHEN 1 THEN 2 ELSE 4 END) * ${C} + 1 + ((1 + (g-1) % ${N.financial_renegotiations}) * 37) % ${C}`,
        ],
        [
          'type',
          'bigint',
          `(CASE (g-1)/${N.financial_renegotiations} WHEN 0 THEN 0 ELSE 1 END)`,
        ],
        [
          'balance',
          'numeric(12,2)',
          `(79.9 + floor(${U(30)}*220))::numeric(12,2)`,
        ],
        ['deleted', 'boolean', 'false'],
      ],
      idx: [['financial_renegotiation_id'], ['financial_receivable_title_id']],
    },
    contract_events: {
      rows: N.contract_events,
      pk: 'id',
      cols: [
        ['id', 'bigint', 'g'],
        ['contract_id', 'bigint', `1 + (g-1) % ${C}`],
        ['person_id', 'bigint', `1 + (g-1) % ${C}`],
        [
          'contract_event_type_id',
          'bigint',
          `(CASE WHEN (g-1)/${C} = 0 AND NOT erp_gen.is_active(1 + (g-1) % ${C}) THEN 1 + floor(${U(31)}*6) ELSE 7 + floor(${U(32)}*146) END)::bigint`,
        ],
        [
          'date',
          'timestamp',
          `now() - (floor(${U(33)}*1800) * interval '1 day')`,
        ],
        ['deleted', 'boolean', 'false'],
      ],
      idx: [['contract_id'], ['contract_event_type_id']],
    },
  };
}

function ddl(schema, name, spec, auxCount, withIdx) {
  const cols = spec.cols.map(([n, t]) => `${n} ${t}`);
  for (let i = 1; i <= auxCount; i += 1) cols.push(`aux_${i} bigint`);
  cols.push('filler text');
  let sql = `CREATE TABLE ${schema}.${name} (${cols.join(', ')}, PRIMARY KEY (${spec.pk})) WITH (autovacuum_enabled=false);\n`;
  if (withIdx) sql += indexDdl(schema, name, spec, auxCount);
  return sql;
}

function indexDdl(schema, name, spec, auxCount) {
  let sql = '';
  for (const [col, kind] of spec.idx) {
    sql += `CREATE ${kind === 'unique' ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${name}_${col}_idx ON ${schema}.${name} (${col});\n`;
  }
  for (let i = 1; i <= auxCount; i += 1) {
    sql += `CREATE INDEX IF NOT EXISTS ${name}_aux_${i}_idx ON ${schema}.${name} (aux_${i});\n`;
  }
  return sql;
}

function insertSql(schema, name, spec, a, b, auxCount, fillerLen) {
  const names = spec.cols.map(([n]) => n);
  const exprs = spec.cols.map(([, , e]) => e);
  for (let i = 1; i <= auxCount; i += 1) {
    names.push(`aux_${i}`);
    exprs.push(`hashint8(g*31+${i})::bigint`);
  }
  names.push('filler');
  exprs.push(
    fillerLen > 0
      ? `substr(repeat(md5(g::text), 1 + ${fillerLen}/32), 1, ${fillerLen})`
      : 'NULL',
  );
  return `INSERT INTO ${schema}.${name} (${names.join(', ')})
SELECT ${exprs.join(', ')} FROM generate_series(${a}::bigint, ${b}::bigint) AS g${spec.from ? ', ' + spec.from : ''}${spec.where ? ' WHERE ' + spec.where : ''};`;
}

// ------------------------------------------------------------------ execucao
export async function buildErp({
  project = 'ger-loadtest',
  scale = 1,
  force = false,
  eligPct = 3,
  log = console.log,
  composeArgs,
}) {
  const cargs =
    composeArgs ??
    ((...a) => [
      'compose',
      '-p',
      project,
      '--env-file',
      'loadtest/loadtest.env',
      '-f',
      'docker-compose.portainer.yml',
      '-f',
      'loadtest/docker-compose.loadtest.yml',
      ...a,
    ]);
  const psqlAsync = (sql) =>
    new Promise((resolve, reject) => {
      const p = spawn(
        'docker',
        cargs(
          'exec',
          '-T',
          'postgres-erp',
          'psql',
          '-U',
          'erp_user',
          '-d',
          'erp_artificial',
          '-v',
          'ON_ERROR_STOP=1',
          '-q',
          '-At',
          '-f',
          '-',
        ),
        { cwd: root },
      );
      let err = '';
      p.stderr.on('data', (d) => (err += d));
      p.on('close', (code) =>
        code === 0
          ? resolve()
          : reject(new Error('psql falhou: ' + err.slice(0, 800))),
      );
      p.stdin.end(sql);
    });
  const psql = (sql) => {
    const r = spawnSync(
      'docker',
      cargs(
        'exec',
        '-T',
        'postgres-erp',
        'psql',
        '-U',
        'erp_user',
        '-d',
        'erp_artificial',
        '-v',
        'ON_ERROR_STOP=1',
        '-q',
        '-At',
        '-f',
        '-',
      ),
      { cwd: root, input: sql, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
    );
    if (r.status !== 0)
      throw new Error(`psql falhou: ${r.stderr.slice(0, 800)}`);
    return r.stdout.trim();
  };

  const need = requiredBytes(scale);
  const free = freeBytes();
  const doneAlready =
    psql(
      `CREATE SCHEMA IF NOT EXISTS erp_gen; CREATE TABLE IF NOT EXISTS erp_gen.meta (k text PRIMARY KEY, v text); SELECT v FROM erp_gen.meta WHERE k='done'`,
    ) === `scale=${scale};elig=${eligPct}`;
  // O VHDX do Docker e dinamico e NAO encolhe: espaco liberado dentro dele e reaproveitado sem
  // crescer no host. Crescimento no host = necessario - folga ja alocada dentro do VHDX.
  const df = spawnSync(
    'docker',
    cargs(
      'exec',
      '-T',
      'postgres-erp',
      'df',
      '-B1',
      '--output=size,used,avail',
      '/var/lib/postgresql/data',
    ),
    { cwd: root, encoding: 'utf8' },
  );
  const [fsSize, fsUsed] = df.stdout
    .trim()
    .split(String.fromCharCode(10))
    .pop()
    .trim()
    .split(/\s+/)
    .map(Number);
  let vhdx = 0;
  for (const p of [
    path.join(
      process.env.LOCALAPPDATA ?? '',
      'Docker',
      'wsl',
      'disk',
      'docker_data.vhdx',
    ),
    path.join(
      process.env.LOCALAPPDATA ?? '',
      'Docker',
      'wsl',
      'data',
      'ext4.vhdx',
    ),
  ]) {
    if (fs.existsSync(p)) {
      vhdx = fs.statSync(p).size;
      break;
    }
  }
  const slack =
    vhdx > 0 && Number.isFinite(fsUsed) ? Math.max(0, vhdx - fsUsed) : 0;
  const hostGrowth = Math.max(0, need - slack);
  log(
    `[erp] escala ${scale}: precisa de ~${fmtGiB(need)} (perfil x escala x 1,15); livre no host: ${fmtGiB(free)}; VHDX ${fmtGiB(vhdx)} com ~${fmtGiB(slack)} livres dentro => crescimento no host ~${fmtGiB(hostGrowth)}`,
  );
  if (!doneAlready && free - hostGrowth < 10 * GiB) {
    throw new Error(
      `Espaco insuficiente: gerar o dataset (~${fmtGiB(need)}) faria o disco do host cair para ${fmtGiB(free - hostGrowth)} livres (minimo 10 GiB). Libere espaco (loadtest/cleanup.sh, loadtest/compact-docker-disk.ps1) ou reduza ERP_SCALE.`,
    );
  }
  if (!doneAlready && Number.isFinite(fsSize) && need > fsSize - fsUsed) {
    throw new Error(
      `Espaco insuficiente no disco virtual do Docker: precisa de ~${fmtGiB(need)} e ha ${fmtGiB(fsSize - fsUsed)} livres.`,
    );
  }

  const N = {};
  for (const name of Object.keys(T)) {
    const small = real(name).rows < 1000;
    N[name] = small
      ? real(name).rows
      : Math.max(1000, Math.round(real(name).rows * scale));
  }
  const C = N.contracts;
  const S = specs(N);
  const tables = Object.keys(S);

  psql(
    `CREATE SCHEMA IF NOT EXISTS erp_gen; CREATE TABLE IF NOT EXISTS erp_gen.meta (k text PRIMARY KEY, v text);`,
  );
  const meta = (k) => psql(`SELECT v FROM erp_gen.meta WHERE k='${k}'`);
  const setMeta = (k, v) =>
    `INSERT INTO erp_gen.meta VALUES ('${k}','${v}') ON CONFLICT (k) DO UPDATE SET v=EXCLUDED.v;`;
  if (!force && meta('done') === `scale=${scale};elig=${eligPct}`) {
    log('[erp] dataset ja gerado com esta escala (use --force para recriar).');
    return report();
  }
  if (
    force ||
    (meta('scale') && meta('scale') !== `scale=${scale};elig=${eligPct}`)
  ) {
    log('[erp] removendo dataset anterior (libera espaco)...');
    psql(
      `DROP SCHEMA IF EXISTS erp CASCADE; DROP SCHEMA IF EXISTS erp_cal CASCADE; TRUNCATE erp_gen.meta;`,
    );
  }
  psql(setMeta('scale', `scale=${scale};elig=${eligPct}`));

  const t0 = Date.now();
  const stamp = () => `${Math.round((Date.now() - t0) / 1000)}s`;
  psql(
    `ALTER SYSTEM SET fsync=off; ALTER SYSTEM SET full_page_writes=off; SELECT pg_reload_conf();`,
  );
  try {
    // 1) funcoes + pr (probabilidade de baixa) calibrada para o total de recibos
    psql(functionsSql({ C, elig: eligPct / 100, pr: 1 }));
    if (!meta('cinfo')) {
      psql(`DROP TABLE IF EXISTS erp_gen.cinfo;
CREATE TABLE erp_gen.cinfo AS SELECT g::bigint AS c, erp_gen.is_active(g) AS active, erp_gen.is_elig(g) AS elig,
  floor(erp_gen.u(g*7)*10)::int AS off_a, floor(erp_gen.u(g*11)*1500)::int AS off_c FROM generate_series(1, ${C}) g;
ALTER TABLE erp_gen.cinfo ADD PRIMARY KEY (c); ANALYZE erp_gen.cinfo;
${setMeta('cinfo', 1)}`);
    }
    const step = Math.max(
      1,
      Math.floor(N.financial_receivable_titles / 200000),
    );
    const f1 = Number(
      psql(
        `SELECT avg((erp_gen.title_state(g, ci.active, ci.elig, (g-1)/${C})=1)::int) FROM generate_series(1, ${N.financial_receivable_titles}, ${step}) g JOIN erp_gen.cinfo ci ON ci.c = 1 + (g-1) % ${C}`,
      ),
    );
    const pr = Math.min(
      1,
      N.financial_receipt_titles / (N.financial_receivable_titles * f1),
    );
    psql(functionsSql({ C, elig: eligPct / 100, pr: pr.toFixed(6) }));
    log(
      `[erp] ${stamp()} fracao paga=${f1.toFixed(4)} => P(baixa)=${pr.toFixed(4)}`,
    );

    psql(
      `CREATE SCHEMA IF NOT EXISTS erp; CREATE SCHEMA IF NOT EXISTS erp_cal;`,
    );

    // 2) tabelas pequenas (dimensoes)
    if (!meta('dims')) {
      psql(`
CREATE TABLE erp.contract_types (id bigint PRIMARY KEY, title varchar(120) NOT NULL);
INSERT INTO erp.contract_types SELECT g, CASE WHEN g = 33 THEN 'Sebratel - Fat. Especial' ELSE 'Plano ' || g END FROM generate_series(1, ${N.contract_types}) g;
CREATE TABLE erp.financers_natures (id bigint PRIMARY KEY, title varchar(160) NOT NULL);
INSERT INTO erp.financers_natures SELECT g, CASE WHEN g = 1 THEN 'Mensalidade' WHEN g = 2 THEN 'DF - TARIFA BAIXA DE TÍTULO' ELSE 'Natureza ' || g END FROM generate_series(1, ${N.financers_natures}) g;
CREATE TABLE erp.contract_event_types (id bigint PRIMARY KEY, title varchar(160) NOT NULL);
INSERT INTO erp.contract_event_types SELECT g, CASE WHEN g <= 6 THEN (ARRAY['Cancelamento - Mudanca de endereco','Cancelamento - Insatisfacao','Cancelamento - Inadimplencia','Cancelamento - Preco','Cancelamento - Falecimento','Cancelamento - Outros'])[g] ELSE 'Evento ' || g END FROM generate_series(1, ${N.contract_event_types}) g;
${setMeta('dims', '1')}`);
    }

    // 3) calibracao + carga por tabela
    const plan = {};
    for (const name of tables) {
      const spec = S[name];
      const target = real(name);
      const rowsReal = target.rows;
      const widthT = target.table / rowsReal;
      const idxT = target.index / rowsReal;
      let aux = Number(meta(`aux:${name}`) || -1);
      let filler = Number(meta(`filler:${name}`) || -1);
      if (aux < 0 || filler < 0) {
        const sample = Math.min(40000, spec.rows);
        psql(`DROP TABLE IF EXISTS erp_cal.${name};`);
        psql(ddl('erp_cal', name, spec, 1, true));
        const sampleSql = insertSql(
          'erp_cal',
          name,
          spec,
          1,
          spec.scan ? Math.round((spec.scan * sample) / spec.rows) : sample,
          1,
          0,
        );
        psql(sampleSql);
        const m = psql(`
SELECT count(*), pg_relation_size('erp_cal.${name}'::regclass), pg_relation_size('erp_cal.${name}_aux_1_idx'::regclass),
       pg_indexes_size('erp_cal.${name}'::regclass) - pg_relation_size('erp_cal.${name}_aux_1_idx'::regclass)
FROM erp_cal.${name};`)
          .split('|')
          .map(Number);
        const [cnt, heap, auxIdx, usedIdx] = m;
        const w = heap / cnt;
        filler = Math.max(0, Math.round(widthT - w));
        const auxPer = auxIdx / cnt;
        const usedPer = usedIdx / cnt;
        aux = Math.max(0, Math.round((idxT - usedPer) / auxPer));
        // as colunas aux tambem entram na largura: recalcula o preenchimento
        filler = Math.max(0, Math.round(widthT - w - (aux - 1) * 8));
        psql(
          `DROP TABLE erp_cal.${name}; ${setMeta(`aux:${name}`, aux)} ${setMeta(`filler:${name}`, filler)}`,
        );
        log(
          `[erp] ${stamp()} calibracao ${name}: linha real ${widthT.toFixed(0)} B (medida sem preenchimento ${w.toFixed(0)} B) => filler ${filler} B; indice real ${idxT.toFixed(0)} B/linha => ${aux} indices aux`,
        );
      }
      plan[name] = { aux, filler };
    }

    const BATCH = 1_000_000;
    const PAR = Number(process.env.ERP_GEN_PARALLEL ?? 4);
    const loadOrder = [
      'people',
      'contracts',
      'financial_renegotiations',
      'financial_receivable_titles',
      'financial_receipt_titles',
      'financial_renegotiation_titles',
      'contract_events',
    ];
    for (const name of loadOrder) {
      const spec = S[name];
      const { aux, filler } = plan[name];
      if (!psql(`SELECT to_regclass('erp.${name}')`)) {
        psql(ddl('erp', name, spec, aux, false));
      }
      const total = spec.scan ?? spec.rows;
      const doneKeys = new Set(
        psql(`SELECT k FROM erp_gen.meta WHERE k LIKE 'b:${name}:%'`)
          .split(String.fromCharCode(10))
          .filter(Boolean),
      );
      const batches = [];
      for (let a = 1; a <= total; a += BATCH) {
        if (!doneKeys.has(`b:${name}:${a}`))
          batches.push([a, Math.min(total, a + BATCH - 1)]);
      }
      let finished = total - batches.reduce((x, [a, b]) => x + (b - a + 1), 0);
      const queue = [...batches];
      const worker = async () => {
        while (queue.length > 0) {
          const [a, b] = queue.shift();
          if (freeBytes() < 10 * GiB) {
            throw new Error(
              `Disco do host com menos de 10 GiB livres durante a geracao (${name}, lote ${a}-${b}). Abortando; rode o cleanup e compacte o VHDX.`,
            );
          }
          await psqlAsync(
            `SET synchronous_commit=off;\nBEGIN;\n${insertSql('erp', name, spec, a, b, aux, filler)}\n${setMeta(`b:${name}:${a}`, b)}\nCOMMIT;`,
          );
          finished += b - a + 1;
          log(
            `[erp] ${stamp()} ${name}: ${finished}/${total} (livre ${fmtGiB(freeBytes())})`,
          );
        }
      };
      await Promise.all(
        Array.from(
          { length: Math.min(PAR, Math.max(1, batches.length)) },
          worker,
        ),
      );
    }

    // 4) indices (usados pelo sync + aux) e estatisticas
    for (const name of tables) {
      if (meta(`indexed:${name}`)) continue;
      const { aux } = plan[name];
      psql(
        `SET maintenance_work_mem='1GB'; SET max_parallel_maintenance_workers=4;\n${indexDdl('erp', name, S[name], aux)}`,
      );
      // completa os bytes de indice do perfil real com indices de expressao (chaves aleatorias de 8 B)
      const targetIdx = real(name).index * (real(name).rows < 1000 ? 1 : scale);
      let cur = Number(psql(`SELECT pg_indexes_size('erp.${name}'::regclass)`));
      let n = 0;
      let last = cur / Math.max(1, aux + S[name].idx.length + 1);
      while (
        real(name).rows >= 1000 &&
        targetIdx - cur > 0.6 * last &&
        n < 60
      ) {
        n += 1;
        psql(
          `SET maintenance_work_mem='1GB'; SET max_parallel_maintenance_workers=4; CREATE INDEX IF NOT EXISTS ${name}_x${n}_idx ON erp.${name} ((hashint8(${S[name].pk} + ${n})));`,
        );
        const next = Number(
          psql(`SELECT pg_indexes_size('erp.${name}'::regclass)`),
        );
        last = next - cur;
        cur = next;
      }
      psql(setMeta(`indexed:${name}`, 1));
      log(
        `[erp] ${stamp()} indices ${name} criados (livre ${fmtGiB(freeBytes())})`,
      );
    }
    // FKs logicas: indices nas dimensoes ja sao PKs
    for (const name of tables) {
      psql(
        `ALTER TABLE erp.${name} SET (autovacuum_enabled=true); VACUUM (ANALYZE) erp.${name};`,
      );
      log(`[erp] ${stamp()} VACUUM ANALYZE ${name}`);
    }
    psql(
      `ANALYZE erp.contract_types; ANALYZE erp.financers_natures; ANALYZE erp.contract_event_types; ${setMeta('done', `scale=${scale};elig=${eligPct}`)}`,
    );
    psql(`DROP SCHEMA IF EXISTS erp_cal CASCADE;`);
  } finally {
    psql(
      `ALTER SYSTEM RESET fsync; ALTER SYSTEM RESET full_page_writes; SELECT pg_reload_conf(); CHECKPOINT;`,
    );
  }
  log(`[erp] geracao concluida em ${stamp()}`);
  return report();

  function report() {
    const rows = psql(`
SELECT relname, n_live_tup::bigint FROM pg_stat_user_tables WHERE schemaname='erp' ORDER BY relname;`);
    const lines = [
      '| tabela | linhas reais x escala | linhas simuladas | total real x escala (MiB) | total simulado (MiB) | desvio |',
      '|---|---|---|---|---|---|',
    ];
    let simTot = 0;
    let realTot = 0;
    for (const name of Object.keys(T)) {
      const sizes = psql(
        `SELECT count(*), pg_total_relation_size('erp.${name}'::regclass) FROM erp.${name}`,
      )
        .split('|')
        .map(Number);
      const exp = N[name] ?? real(name).rows;
      const rt =
        (real(name).total * (real(name).rows < 1000 ? 1 : scale)) / 1048576;
      const st = sizes[1] / 1048576;
      simTot += st;
      realTot += rt;
      lines.push(
        `| ${name} | ${exp} | ${sizes[0]} | ${rt.toFixed(0)} | ${st.toFixed(0)} | ${(((st - rt) / rt) * 100).toFixed(1)}% |`,
      );
    }
    lines.push(
      `| TOTAL | | | ${realTot.toFixed(0)} | ${simTot.toFixed(0)} | ${(((simTot - realTot) / realTot) * 100).toFixed(1)}% |`,
    );
    void rows;
    const md = lines.join('\n');
    log('[erp] simulado x real:\n' + md);
    return md;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const a = process.argv.slice(2);
  const arg = (n, d) => {
    const i = a.indexOf(`--${n}`);
    return i >= 0 ? a[i + 1] : d;
  };
  try {
    const md = await buildErp({
      project: arg('project', 'ger-loadtest'),
      scale: Number(process.env.ERP_SCALE ?? arg('scale', '1')),
      force: a.includes('--force'),
      eligPct: Number(arg('elig-pct', '3')),
    });
    fs.mkdirSync(path.join(root, 'loadtest', 'out'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'loadtest', 'out', 'erp-size-report.md'),
      md,
    );
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
