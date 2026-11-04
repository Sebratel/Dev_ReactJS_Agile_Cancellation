#!/usr/bin/env node
// Mede memoria/CPU dos containers de uma stack Docker e resume media, P90, P99 e pico.
// Regra do projeto: todo app e medido sob carga antes de definir/alterar o perfil de recursos
// (docs/dimensionamento.md).
//
//   node scripts/measure-memory.mjs sample --project <compose-project> --seconds 600 --interval 2 --out mem.csv
//   node scripts/measure-memory.mjs summarize mem.csv [--limits backend=1024,mariadb=1024]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const [, , command, ...rest] = process.argv;

function arg(name, fallback) {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : fallback;
}

export function parseMiB(text) {
  const m = /^([\d.]+)\s*([KMG]i?B)/i.exec(text.trim());
  if (!m) return NaN;
  const v = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith('k')) return v / 1024;
  if (unit.startsWith('g')) return v * 1024;
  return v;
}

export function percentile(sorted, p) {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, idx)];
}

export function summarize(rows, limits = {}) {
  const byService = new Map();
  for (const r of rows) {
    if (!byService.has(r.service))
      byService.set(r.service, { mem: [], cpu: [] });
    byService.get(r.service).mem.push(r.memMiB);
    byService.get(r.service).cpu.push(r.cpuPct);
  }
  return [...byService.entries()].map(([service, { mem, cpu }]) => {
    const m = [...mem].sort((a, b) => a - b);
    const c = [...cpu].sort((a, b) => a - b);
    const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const limit = limits[service];
    const p99 = percentile(m, 99);
    return {
      service,
      samples: m.length,
      memAvgMiB: avg(m),
      memP90MiB: percentile(m, 90),
      memP99MiB: p99,
      memMaxMiB: m[m.length - 1],
      cpuAvgPct: avg(c),
      cpuP99Pct: percentile(c, 99),
      limitMiB: limit ?? null,
      p99OfLimitPct: limit ? (p99 / limit) * 100 : null,
    };
  });
}

function sample() {
  const project = arg('project');
  const seconds = Number(arg('seconds', '600'));
  const interval = Number(arg('interval', '2'));
  const out = arg('out', 'mem.csv');
  if (!project) throw new Error('--project obrigatorio');
  const lines = ['ts,service,memMiB,cpuPct'];
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const ids = execFileSync(
      'docker',
      [
        'ps',
        '--filter',
        `label=com.docker.compose.project=${project}`,
        '--format',
        '{{.ID}}\t{{.Label "com.docker.compose.service"}}',
      ],
      { encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => l.split('\t'));
    if (ids.length > 0) {
      const raw = execFileSync(
        'docker',
        [
          'stats',
          '--no-stream',
          '--format',
          '{{.ID}}\t{{.MemUsage}}\t{{.CPUPerc}}',
          ...ids.map(([id]) => id),
        ],
        { encoding: 'utf8' },
      )
        .trim()
        .split('\n');
      const names = new Map(ids.map(([id, svc]) => [id, svc]));
      for (const row of raw) {
        const [id, mem, cpu] = row.split('\t');
        const svc = [...names.entries()].find(
          ([full]) => full.startsWith(id) || id.startsWith(full),
        )?.[1];
        if (svc)
          lines.push(
            `${new Date().toISOString()},${svc},${parseMiB(mem.split('/')[0]).toFixed(1)},${parseFloat(cpu).toFixed(1)}`,
          );
      }
    }
    Atomics.wait(
      new Int32Array(new SharedArrayBuffer(4)),
      0,
      0,
      interval * 1000,
    );
  }
  fs.writeFileSync(out, lines.join('\n') + '\n');
  console.log(`${lines.length - 1} amostras em ${out}`);
}

function summarizeFile() {
  const file = rest[0];
  const limitsArg = arg('limits', '');
  const limits = Object.fromEntries(
    limitsArg
      .split(',')
      .filter(Boolean)
      .map((p) => p.split('='))
      .map(([k, v]) => [k, Number(v)]),
  );
  const rows = fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .slice(1)
    .map((l) => {
      const [, service, mem, cpu] = l.split(',');
      return { service, memMiB: Number(mem), cpuPct: Number(cpu) };
    });
  const result = summarize(rows, limits);
  console.table(
    result.map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [
          k,
          typeof v === 'number' ? Number(v.toFixed(1)) : v,
        ]),
      ),
    ),
  );
}

if (process.argv[1]?.endsWith('measure-memory.mjs')) {
  if (command === 'sample') sample();
  else if (command === 'summarize') summarizeFile();
  else if (command) {
    console.error('uso: sample | summarize');
    process.exit(1);
  }
}
