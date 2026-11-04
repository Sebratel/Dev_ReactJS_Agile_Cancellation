#!/usr/bin/env node
// Analisa .heapsnapshot do V8: contagem/tamanho por constructor e diff entre snapshots.
//   node loadtest/analyze-heap.mjs a.heapsnapshot b.heapsnapshot c.heapsnapshot [--top 15] [--json out.json]
// O diff compara o primeiro com o ultimo (e mostra tambem o total de cada snapshot).
import fs from 'node:fs';

const argv = process.argv.slice(2);
const files = [];
let top = 15;
let jsonOut = null;
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--top') top = Number(argv[++i]);
  else if (argv[i] === '--json') jsonOut = argv[++i];
  else files.push(argv[i]);
}
if (files.length < 1) {
  console.error(
    'uso: analyze-heap.mjs snap1 [snap2 ...] [--top N] [--json out.json]',
  );
  process.exit(1);
}

export function aggregate(file) {
  const snap = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { node_fields: fields, node_types: types } = snap.snapshot.meta;
  const stride = fields.length;
  const iType = fields.indexOf('type');
  const iName = fields.indexOf('name');
  const iSize = fields.indexOf('self_size');
  const typeNames = types[0];
  const { nodes, strings } = snap;
  const map = new Map();
  let total = 0;
  for (let i = 0; i < nodes.length; i += stride) {
    const type = typeNames[nodes[i + iType]];
    // hidden/synthetic sao internos do V8; "object" e "closure" agrupam por nome do constructor/funcao
    if (type === 'synthetic') continue;
    const name =
      type === 'string' ||
      type === 'concatenated string' ||
      type === 'sliced string'
        ? '(string)'
        : strings[nodes[i + iName]];
    const key = `${type}:${name}`;
    const size = nodes[i + iSize];
    total += size;
    const e = map.get(key);
    if (e) {
      e.count += 1;
      e.size += size;
    } else map.set(key, { key, count: 1, size });
  }
  return { file, total, nodeCount: nodes.length / stride, map };
}

const results = files.map((f) => aggregate(f));
const mib = (n) => (n / 1048576).toFixed(2);
for (const r of results) {
  console.log(`${r.file}: ${mib(r.total)} MiB em ${r.nodeCount} objetos`);
}
const out = {
  snapshots: results.map((r) => ({
    file: r.file,
    totalMiB: Number(mib(r.total)),
    nodes: r.nodeCount,
  })),
  diffs: [],
};
for (let i = 1; i < results.length; i += 1) {
  const a = results[0];
  const b = results[i];
  const rows = [];
  for (const [key, e] of b.map) {
    const prev = a.map.get(key) ?? { count: 0, size: 0 };
    rows.push({
      key,
      dCount: e.count - prev.count,
      dSizeKiB: Math.round((e.size - prev.size) / 1024),
      count: e.count,
      sizeKiB: Math.round(e.size / 1024),
    });
  }
  rows.sort((x, y) => y.dSizeKiB - x.dSizeKiB);
  console.log(
    `\nDiff ${files[0]} -> ${files[i]}: ${((b.total - a.total) / 1048576).toFixed(2)} MiB. Maiores crescimentos:`,
  );
  console.table(rows.slice(0, top));
  out.diffs.push({
    from: files[0],
    to: files[i],
    deltaMiB: Number(((b.total - a.total) / 1048576).toFixed(2)),
    top: rows.slice(0, top),
  });
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2));
