#!/usr/bin/env node
// Orquestrador do teste de carga (comando unico: run -> medir -> cleanup):
//   node loadtest/run.mjs                       # ERP_SCALE=1 (tamanho real), 3 ciclos x (2 min aquecimento + 10 min medidos), 12 usuarios
//   ERP_SCALE=0.01 node loadtest/run.mjs --cycles 1 --duration 60 --warmup 20 --idle 20     # fumaca rapida
// Passos: sobe ERP artificial + proxy de latencia -> gera o dataset (build-erp.mjs, no volume
// ger-loadtest-erp-data) -> mede latencia ERP -> sobe a stack real (build) -> seed de usuarios ->
// N ciclos identicos [amostragem de memoria + scenario.mjs + idle + GC + heap snapshot] -> relatorio
// (loadtest/RESULTS.md) -> loadtest/cleanup.sh (apaga containers, volumes, imagens e loadtest/out).
// KEEP_DATA=1 (ou --keep) pula a limpeza, so para depuracao.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarize } from '../scripts/measure-memory.mjs';
import { buildErp } from './erp/build-erp.mjs';
import { measure } from './erp/measure-erp-latency.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(here, 'out');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};

const PROJECT = arg('project', 'ger-loadtest');
const CYCLES = Number(arg('cycles', '3'));
const USERS = Number(arg('users', '12'));
const DURATION = Number(arg('duration', '600'));
const WARMUP = Number(arg('warmup', '120'));
const IDLE = Number(arg('idle', '90'));
const envFile = Object.fromEntries(
  fs
    .readFileSync(path.join(here, 'loadtest.env'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [
      l.slice(0, l.indexOf('=')),
      l.slice(l.indexOf('=') + 1).trim(),
    ]),
);
const ERP_SCALE = Number(process.env.ERP_SCALE ?? envFile.ERP_SCALE ?? 1);
const KEEP =
  process.env.KEEP_DATA === '1' ||
  argv.includes('--keep') ||
  argv.includes('--no-cleanup');
const INTERVAL = Number(arg('interval', '2'));
const LIMITS = {
  backend: 1024,
  mariadb: 1024,
  frontend: 128,
  'postgres-erp': 6144,
  'erp-latency': 128,
  'n8n-mock': 128,
};

const composeArgs = (...a) => [
  'compose',
  '-p',
  PROJECT,
  '--env-file',
  'loadtest/loadtest.env',
  '-f',
  'docker-compose.portainer.yml',
  '-f',
  'loadtest/docker-compose.loadtest.yml',
  ...a,
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) =>
  console.log(`[run ${new Date().toISOString().slice(11, 19)}] ${m}`);

function docker(args, opts = {}) {
  const r = spawnSync('docker', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    ...opts,
  });
  if (r.status !== 0 && !opts.allowFail)
    throw new Error(`docker ${args.join(' ')}\n${r.stderr}`);
  return r;
}
const exec = (service, ...cmd) =>
  docker(composeArgs('exec', '-T', service, ...cmd));

function probe(tag) {
  const r = exec('backend', 'wget', '-qO-', 'http://127.0.0.1:9999/gc');
  const j = JSON.parse(r.stdout);
  const m = j.memoryUsage;
  const row = {
    tag,
    at: j.at,
    heapUsedMiB: +(m.heapUsed / 1048576).toFixed(1),
    heapTotalMiB: +(m.heapTotal / 1048576).toFixed(1),
    rssMiB: +(m.rss / 1048576).toFixed(1),
    rssAnonMiB: +((j.proc?.RssAnon ?? 0) / 1024).toFixed(1),
    rssFileMiB: +((j.proc?.RssFile ?? 0) / 1024).toFixed(1),
    externalMiB: +(m.external / 1048576).toFixed(1),
    arrayBuffersMiB: +(m.arrayBuffers / 1048576).toFixed(1),
    handles: j.activeHandles,
  };
  log(
    `GC probe ${tag}: heapUsed=${row.heapUsedMiB} MiB heapTotal=${row.heapTotalMiB} rss=${row.rssMiB} (anon ${row.rssAnonMiB}) MiB external=${row.externalMiB} handles=${JSON.stringify(row.handles)}`,
  );
  return row;
}

function snapshot(tag) {
  const r = exec('backend', 'wget', '-qO-', 'http://127.0.0.1:9999/snapshot');
  const file = JSON.parse(r.stdout).file;
  const dest = path.join(out, `heap-${tag}.heapsnapshot`);
  docker(composeArgs('cp', `backend:${file}`, dest));
  exec('backend', 'rm', '-f', file);
  log(
    `heap snapshot ${tag}: ${(fs.statSync(dest).size / 1048576).toFixed(0)} MiB`,
  );
  return dest;
}

function trimCsv(file, fromIso) {
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  return lines
    .slice(1)
    .filter((l) => l.split(',')[0] >= fromIso)
    .map((l) => {
      const [, service, mem, cpu] = l.split(',');
      return { service, memMiB: Number(mem), cpuPct: Number(cpu) };
    });
}

const fmt = (n) => (n == null || Number.isNaN(n) ? '-' : n.toFixed(1));
function memTable(summary) {
  const head =
    '| servico | amostras | media MiB | P90 | P99 | pico | limite | P99/limite | pico/limite | CPU media % | CPU P99 % |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
  return (
    head +
    summary
      .map(
        (r) =>
          `| ${r.service} | ${r.samples} | ${fmt(r.memAvgMiB)} | ${fmt(r.memP90MiB)} | ${fmt(r.memP99MiB)} | ${fmt(r.memMaxMiB)} | ${r.limitMiB ?? '-'} | ${r.limitMiB ? fmt((r.memP99MiB / r.limitMiB) * 100) + '%' : '-'} | ${r.limitMiB ? fmt((r.memMaxMiB / r.limitMiB) * 100) + '%' : '-'} | ${fmt(r.cpuAvgPct)} | ${fmt(r.cpuP99Pct)} |`,
      )
      .join('\n')
  );
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const results = {
    params: {
      PROJECT,
      CYCLES,
      USERS,
      DURATION,
      WARMUP,
      IDLE,
      ERP_SCALE,
    },
    cycles: [],
    probes: [],
  };

  // imagens ja existentes antes do teste: o cleanup so remove as que o teste baixou
  fs.writeFileSync(
    path.join(out, 'images-before.txt'),
    docker(['images', '--format', '{{.Repository}}:{{.Tag}}']).stdout,
  );
  log('subindo ERP artificial + proxy de latencia...');
  docker(composeArgs('up', '-d', '--wait', 'postgres-erp', 'erp-latency'), {
    stdio: 'inherit',
  });
  results.erpSize = await buildErp({
    project: PROJECT,
    scale: ERP_SCALE,
    eligPct: Number(envFile.ERP_ELIG_PCT ?? 3),
    log,
  });
  // mesma rotina do perfil real: 15 conexoes novas x 5 SELECT 1 (direto = antes; via proxy = depois)
  results.latencyDirect = await measure({ port: 55432 });
  results.latencyProxy = await measure({ port: 55433 });
  results.latencyProxy60 = await measure({ port: 55433, connections: 60 });
  log('latencia ERP direta: ' + JSON.stringify(results.latencyDirect));
  log('latencia ERP via proxy (15): ' + JSON.stringify(results.latencyProxy));
  log('latencia ERP via proxy (60): ' + JSON.stringify(results.latencyProxy60));

  if (!flag('no-up')) {
    log('subindo a stack (build da imagem de producao)...');
    docker(
      composeArgs('up', '-d', '--build', '--wait', '--wait-timeout', '900'),
      { stdio: 'inherit' },
    );
  }

  log('seed de usuarios no MariaDB (via backend)...');
  const seeded = exec('backend', 'node', '/loadtest/seed-users.cjs');
  fs.writeFileSync(path.join(out, 'users.json'), seeded.stdout);
  log(`${JSON.parse(seeded.stdout).length} usuarios`);

  log('aguardando o primeiro sync do ERP (cron acelerado)...');
  for (let i = 0; i < 300; i += 1) {
    const logs =
      docker(composeArgs('logs', 'backend', '--no-color'), { allowFail: true })
        .stdout ?? '';
    if (/Sincronizacao concluida/.test(logs)) break;
    await sleep(3000);
  }

  results.probes.push(probe('baseline'));
  const snaps = [snapshot('baseline')];
  const allMeasured = [];

  for (let c = 1; c <= CYCLES; c += 1) {
    const label = `cycle${c}`;
    log(
      `== ${label}: ${USERS} VUs, ${WARMUP}s aquecimento + ${DURATION}s medicao ==`,
    );
    const csv = path.join(out, `${label}-mem.csv`);
    const total = WARMUP + DURATION + 15;
    const sampler = spawn(
      'node',
      [
        'scripts/measure-memory.mjs',
        'sample',
        '--project',
        PROJECT,
        '--seconds',
        String(total),
        '--interval',
        String(INTERVAL),
        '--out',
        csv,
      ],
      { cwd: root, stdio: 'inherit' },
    );
    const samplerDone = new Promise((r) => sampler.on('exit', r));
    const t0 = Date.now();
    const scen = spawn(
      'node',
      [
        'loadtest/scenario.mjs',
        '--users',
        String(USERS),
        '--duration',
        String(DURATION),
        '--warmup',
        String(WARMUP),
        '--label',
        label,
        '--project',
        PROJECT,
        '--rtt',
        envFile.CLIENT_RTT_MS ?? '20',
        '--rtt-jitter',
        envFile.CLIENT_RTT_JITTER_MS ?? '10',
        '--think-min',
        envFile.THINK_MIN_MS ?? '1000',
        '--think-max',
        envFile.THINK_MAX_MS ?? '5000',
      ],
      { cwd: root, stdio: 'inherit' },
    );
    const code = await new Promise((r) => scen.on('exit', r));
    await samplerDone;
    // contagem de erros do backend SOMENTE neste ciclo (janela do ciclo, nao acumulada do container)
    const cycleLogs =
      spawnSync(
        'docker',
        [
          'logs',
          `${PROJECT}-backend-1`,
          '--since',
          new Date(t0).toISOString(),
          '--until',
          new Date().toISOString(),
        ],
        { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
      ).stdout + '';
    const cycleText = String(cycleLogs).replace(/\u001b\[[0-9;]*m/g, '');
    const cycleErrors = {
      errorLines: (cycleText.match(/ ERROR \[/g) ?? []).length,
      hsmWorker: (
        cycleText.match(/ERROR \[WhatsappBulkContactWorkerService\]/g) ?? []
      ).length,
      erpSync: (cycleText.match(/ERROR \[ErpSyncService\]/g) ?? []).length,
      mysql1020: (cycleText.match(/code: 1020/g) ?? []).length,
      writeConflictRetries: (cycleText.match(/conflito de escrita/g) ?? [])
        .length,
    };
    log(
      `${label}: erros no log do backend neste ciclo ${JSON.stringify(cycleErrors)}`,
    );
    const measureFrom = new Date(t0 + WARMUP * 1000).toISOString();
    const rows = trimCsv(csv, measureFrom);
    allMeasured.push(...rows);
    const latency = JSON.parse(
      fs.readFileSync(path.join(out, `${label}-latency.json`), 'utf8'),
    );
    log(`${label}: scenario exit=${code}; idle ${IDLE}s...`);
    await sleep(IDLE * 1000);
    results.probes.push(probe(`apos-${label}`));
    snaps.push(snapshot(`apos-${label}`));
    results.cycles.push({
      label,
      mem: summarize(rows, LIMITS),
      latency,
      cycleErrors,
    });
  }

  results.memAll = summarize(allMeasured, LIMITS);

  // heap: diff entre snapshots (baseline vs apos-ciclos)
  const heapJson = path.join(out, 'heap-diff.json');
  const an = spawnSync(
    'node',
    [
      '--max-old-space-size=6144',
      'loadtest/analyze-heap.mjs',
      ...snaps,
      '--top',
      '15',
      '--json',
      heapJson,
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  fs.writeFileSync(path.join(out, 'heap-diff.txt'), an.stdout + an.stderr);

  // logs do backend (erros e sync) e contadores do mock
  const blog =
    docker(composeArgs('logs', 'backend', '--no-color'), { allowFail: true })
      .stdout ?? '';
  fs.writeFileSync(path.join(out, 'backend.log'), blog);
  const tlogs =
    docker(composeArgs('logs', 'backend', '--no-color', '--timestamps'), {
      allowFail: true,
    }).stdout ?? '';
  const startsAt = [];
  const durs = [];
  for (const line of tlogs.split('\n')) {
    const m = /(\d{4}-\d\d-\d\dT[\d:.]+Z)/.exec(line);
    if (!m) continue;
    const t = Date.parse(m[1]);
    if (/Iniciando sincronizacao com o ERP/.test(line)) startsAt.push(t);
    else if (
      startsAt.length > 0 &&
      /Reconciliacao ERP concluida|Nenhum caso sincronizado pelo ERP|rodada encerrada|Falha inesperada na sincronizacao/.test(
        line,
      )
    ) {
      durs.push((t - startsAt.pop()) / 1000);
      startsAt.length = 0;
    }
  }
  const sd = [...durs].sort((x, y) => x - y);
  results.syncDurationS = {
    runs: durs.length,
    first: durs[0] ?? null,
    p50: sd[Math.floor(sd.length / 2)] ?? null,
    max: sd[sd.length - 1] ?? null,
  };
  results.syncRuns = (blog.match(/Sincronizacao concluida/g) ?? []).length;
  results.backendErrors = (blog.match(/\bERROR\b/g) ?? []).length;
  const mock = docker(
    composeArgs(
      'exec',
      '-T',
      'n8n-mock',
      'wget',
      '-qO-',
      'http://127.0.0.1:8080/__stats',
    ),
    { allowFail: true },
  );
  results.n8nMock = mock.stdout;
  fs.writeFileSync(
    path.join(out, 'summary.json'),
    JSON.stringify(results, null, 2),
  );

  // relatorio
  let md = `# Relatorio do teste de carga (${new Date().toISOString()})\n\nParametros: ${JSON.stringify(results.params)}\n\n`;
  md += `## ERP artificial: tamanho simulado x real (ERP_SCALE=${ERP_SCALE})\n\n${results.erpSize}\n\n`;
  md +=
    `## Latencia de conexao ao ERP (rotina: 15 conexoes novas x 5 SELECT 1)\n\n| origem | connectMs p50 | p95 | queryRttMs p50 | p95 | p99 |\n|---|---|---|---|---|---|\n| real (perfil) | 94.94 | 137.11 | 8.32 | 56.87 | 64.89 |\n` +
    [
      ['direto (antes, sem proxy)', results.latencyDirect],
      ['via proxy (depois, 15 conexoes)', results.latencyProxy],
      ['via proxy (60 conexoes)', results.latencyProxy60],
    ]
      .map(
        ([n, r]) =>
          `| ${n} | ${r.connectMs.p50} | ${r.connectMs.p95} | ${r.queryRttMs.p50} | ${r.queryRttMs.p95} | ${r.queryRttMs.p99} |`,
      )
      .join('\n') +
    '\n\n';
  md += `Duracao do sync do ERP (consulta + ingestao + reconciliacao): ${JSON.stringify(results.syncDurationS)} (s)\n\n`;
  md += `## Memoria por servico (janela medida de todos os ciclos)\n\n${memTable(results.memAll)}\n\n`;
  for (const cy of results.cycles) {
    md += `### ${cy.label}\n\n${memTable(cy.mem)}\n\nErros no log do backend neste ciclo: ${JSON.stringify(cy.cycleErrors)}; mutacoes do ERP: ${JSON.stringify(cy.latency.erpMutations)}\n\nLatencia:${cy.latency.requests} req (${cy.latency.rps} req/s), erros ${cy.latency.errors} (5xx/rede ${cy.latency.err5xx}), p50 ${cy.latency.p50} ms, p95 ${cy.latency.p95} ms, p99 ${cy.latency.p99} ms\n\n`;
    md +=
      '| endpoint | n | erros | p50 | p95 | p99 |\n|---|---|---|---|---|---|\n' +
      cy.latency.rows
        .map(
          (r) =>
            `| ${r.endpoint} | ${r.n} | ${r.errors} | ${r.p50} | ${r.p95} | ${r.p99} |`,
        )
        .join('\n') +
      '\n\n';
  }
  md +=
    '## Backend apos GC forcado (idle entre ciclos)\n\n| ponto | heapUsed MiB | heapTotal MiB | RSS MiB | RssAnon MiB | RssFile MiB | external MiB | arrayBuffers MiB |\n|---|---|---|---|---|---|---|---|\n' +
    results.probes
      .map(
        (p) =>
          `| ${p.tag} | ${p.heapUsedMiB} | ${p.heapTotalMiB} | ${p.rssMiB} | ${p.rssAnonMiB} | ${p.rssFileMiB} | ${p.externalMiB} | ${p.arrayBuffersMiB} |`,
      )
      .join('\n') +
    `\n\nSyncs do ERP concluidos: ${results.syncRuns}. Linhas ERROR no log do backend: ${results.backendErrors}. N8N mock: ${results.n8nMock}\n`;
  try {
    const hd = JSON.parse(fs.readFileSync(heapJson, 'utf8'));
    const last = hd.diffs[hd.diffs.length - 1];
    md +=
      `\n## Heap do backend: snapshot baseline x ultimo ciclo (V8, apos GC)\n\n` +
      hd.snapshots
        .map(
          (x) =>
            `- ${path.basename(x.file)}: ${x.totalMiB} MiB, ${x.nodes} objetos`,
        )
        .join('\n') +
      `\n\nMaiores crescimentos (delta ${last.deltaMiB} MiB):\n\n| constructor | delta objetos | delta KiB | objetos | KiB |\n|---|---|---|---|---|\n` +
      last.top
        .slice(0, 10)
        .map(
          (r) =>
            `| ${r.key} | ${r.dCount} | ${r.dSizeKiB} | ${r.count} | ${r.sizeKiB} |`,
        )
        .join('\n') +
      '\n';
  } catch {
    md += '\n(diff de heap indisponivel)\n';
  }
  fs.writeFileSync(path.join(out, 'report.md'), md);
  fs.writeFileSync(path.join(here, 'RESULTS.md'), md);
  log(`relatorio em ${path.join(out, 'report.md')}`);

  cleanup();
}

// Limpeza: apaga containers/volumes/imagens do projeto e loadtest/out (KEEP_DATA=1 para depurar).
function cleanup() {
  if (KEEP) {
    log('KEEP_DATA=1: limpeza pulada (rode loadtest/cleanup.sh depois).');
    return;
  }
  const sh = spawnSync('bash', ['loadtest/cleanup.sh'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, COMPOSE_PROJECT_NAME: PROJECT },
  });
  if (sh.error || sh.status === null) {
    spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        'loadtest/cleanup.ps1',
      ],
      { cwd: root, stdio: 'inherit' },
    );
  }
}
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    cleanup();
    process.exit(130);
  });
}

main().catch((e) => {
  console.error(e);
  cleanup();
  process.exit(1);
});
