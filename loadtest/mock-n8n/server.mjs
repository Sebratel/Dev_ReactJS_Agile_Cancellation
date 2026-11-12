// Mock HTTP do N8N (HSM Matrix + notificacao de recuperacao). Aceita qualquer POST, responde 200
// com latencia simulada (MOCK_LATENCY_MS, padrao 40 ms) e conta chamadas em GET /__stats.
import http from 'node:http';

const latency = Number(process.env.MOCK_LATENCY_MS ?? 40);
const counts = new Map();
let bytes = 0;

http
  .createServer((req, res) => {
    if (req.url === '/__stats') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ counts: Object.fromEntries(counts), bytes }));
      return;
    }
    if (req.url === '/health') {
      res.end('ok');
      return;
    }
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
    });
    req.on('end', () => {
      bytes += size;
      const key = `${req.method} ${req.url}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      setTimeout(() => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ ok: true, status: 'accepted', mock: true }));
      }, latency);
    });
  })
  .listen(8080, () => process.stdout.write('mock-n8n ouvindo em :8080\n'));
