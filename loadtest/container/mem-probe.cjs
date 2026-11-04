// SO PARA O TESTE DE CARGA (NODE_OPTIONS=--require /loadtest/mem-probe.cjs --expose-gc).
// Sonda de memoria acessivel apenas dentro do container (127.0.0.1:9999):
//   GET /gc        -> forca GC (2x) e devolve process.memoryUsage() + heap por espaco + handles ativos
//   GET /snapshot  -> forca GC e grava um .heapsnapshot em /tmp/snap, devolve o caminho
const http = require('node:http');
const fs = require('node:fs');
const v8 = require('node:v8');

const SNAP_DIR = process.env.LOADTEST_SNAP_DIR || '/tmp/snap';

function forceGc() {
  if (typeof global.gc === 'function') {
    global.gc();
    global.gc();
  }
}

// VmRSS / RssAnon / RssFile / VmHWM (kB) de /proc/self/status: separa heap/nativo (anon) de codigo mapeado (file)
function procStatus() {
  const out = {};
  try {
    const lines = fs.readFileSync('/proc/self/status', 'utf8').split('\n');
    for (const line of lines) {
      const m = /^(VmRSS|RssAnon|RssFile|VmHWM):\s+(\d+) kB/.exec(line);
      if (m) out[m[1]] = Number(m[2]);
    }
  } catch {
    /* sem /proc */
  }
  return out;
}

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/gc') {
    forceGc();
    const handles = process._getActiveHandles().map((h) => h.constructor.name);
    const byType = {};
    for (const t of handles) byType[t] = (byType[t] || 0) + 1;
    res.end(
      JSON.stringify({
        at: new Date().toISOString(),
        uptimeSec: Math.round(process.uptime()),
        memoryUsage: process.memoryUsage(),
        heapSpaces: v8.getHeapSpaceStatistics().map((s) => ({
          name: s.space_name,
          used: s.space_used_size,
        })),
        activeHandles: byType,
        activeRequests: process._getActiveRequests().length,
        proc: procStatus(),
      }),
    );
    return;
  }
  if (req.url === '/snapshot') {
    forceGc();
    fs.mkdirSync(SNAP_DIR, { recursive: true });
    const file = v8.writeHeapSnapshot(
      `${SNAP_DIR}/heap-${Date.now()}.heapsnapshot`,
    );
    res.end(JSON.stringify({ file }));
    return;
  }
  res.statusCode = 404;
  res.end('{}');
});
server.on('error', () => {});
server.listen(9999, '127.0.0.1');
server.unref();
