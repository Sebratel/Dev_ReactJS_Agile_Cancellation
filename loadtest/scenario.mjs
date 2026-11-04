#!/usr/bin/env node
// Teste de carga do GER: N usuarios virtuais (VUs) concorrentes + "ERP" (sync, virada de dados e
// webhooks de ingestao). Sem dependencias externas (fetch/undici nativo do Node 22).
//
//   node loadtest/scenario.mjs --users 12 --duration 600 --warmup 120 --label cycle1
//
// Opcoes (todas opcionais): --api http://127.0.0.1:4000  --web http://127.0.0.1:8081
//   --project ger-loadtest  --users-file loadtest/out/users.json  --out loadtest/out/<label>-latency.json
//   --mutate-every 60 (s, virada do ERP via psql no container)  --ingest-every 10 (s, webhook de ingestao)
//   --seed 1 (semente do gerador pseudo-aleatorio, torna os ciclos identicos)
// Saida: tabela por endpoint (contagem, erros, p50/p95/p99) + JSON em --out.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};

const API = arg('api', 'http://127.0.0.1:4000');
const WEB = arg('web', 'http://127.0.0.1:8081');
const PROJECT = arg('project', 'ger-loadtest');
const USERS = Number(arg('users', '12'));
const DURATION_S = Number(arg('duration', '600'));
const WARMUP_S = Number(arg('warmup', '120'));
const LABEL = arg('label', 'run');
const USERS_FILE = arg('users-file', path.join(here, 'out', 'users.json'));
const OUT = arg('out', path.join(here, 'out', `${LABEL}-latency.json`));
const MUTATE_EVERY_S = Number(arg('mutate-every', '60'));
const INGEST_EVERY_S = Number(arg('ingest-every', '10'));
const MIN_GAP_MS = 1200; // o Throttler da API limita 60 req/min por IP: cada VU fica < 50/min
const SEED = Number(arg('seed', '1'));
const RTT_MS = Number(arg('rtt', '20')); // RTT de rede do cliente (ms), com jitter
const RTT_JITTER_MS = Number(arg('rtt-jitter', '10'));
const THINK_MIN_MS = Number(arg('think-min', '1000')); // tempo de leitura da tela entre acoes
const THINK_MAX_MS = Number(arg('think-max', '5000'));

// PRNG deterministico (mulberry32): ciclos com a mesma semente fazem a mesma sequencia de escolhas.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// espera ate `ms` ou ate `stopAt` (o que vier primeiro), para os workers encerrarem junto com o teste
const sleepUntil = async (ms, stopAt) => {
  const end = Math.min(Date.now() + ms, stopAt);
  while (Date.now() < end) await sleep(Math.min(500, end - Date.now()));
};

// ---------------------------------------------------------------- metricas
let measuring = false;
const stats = new Map(); // label -> { n, errors, byStatus, lat[] }
const errorSamples = [];
function record(label, status, ms, errText, benign = false) {
  if (!measuring) return;
  let s = stats.get(label);
  if (!s) {
    s = { n: 0, errors: 0, byStatus: {}, lat: [] };
    stats.set(label, s);
  }
  s.n += 1;
  s.lat.push(ms);
  s.byStatus[status] = (s.byStatus[status] ?? 0) + 1;
  if ((status >= 400 || status === 0) && !benign) {
    s.errors += 1;
    if (errorSamples.length < 40 && (status >= 500 || status === 0)) {
      errorSamples.push({
        label,
        status,
        errText: String(errText ?? '').slice(0, 300),
      });
    }
  }
}
function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[
    Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  ];
}

// ---------------------------------------------------------------- usuarios virtuais
const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
const byRole = (role) => users.filter((u) => u.role === role);
// Mix de papeis: 1 admin, 2 supervisores, resto agentes de cobranca (+ cancelamento).
function pickVuUsers(n) {
  const order = [
    ...byRole('SUPERVISOR').slice(0, 2),
    ...byRole('COLLECTION_AGENT'),
    ...byRole('ADMIN'),
    ...byRole('CANCELLATION_AGENT'),
  ];
  return Array.from({ length: n }, (_, i) => order[i % order.length]);
}

class Vu {
  constructor(index, user) {
    this.index = index;
    this.user = user;
    this.rand = rng(SEED * 1000 + index);
    this.lastReq = 0;
    this.token = null;
    this.loggedAt = 0;
    this.refreshToken = user.refreshToken;
    this.xff = `10.20.${Math.floor(index / 250)}.${(index % 250) + 10}`; // IP distinto por usuario
    this.caseIds = [];
    this.caseExternalIds = [];
    this.isManager = user.role === 'ADMIN' || user.role === 'SUPERVISOR';
  }

  pick(arr) {
    return arr[Math.floor(this.rand() * arr.length)];
  }

  async call(
    label,
    method,
    urlPath,
    body,
    { base = API, auth = true, headers = {}, benign422 = false } = {},
  ) {
    // access token dura 15 min: renova antes de expirar (como o frontend faz)
    if (auth && this.token && Date.now() - this.loggedAt > 10 * 60_000)
      await this.login();
    const wait = this.lastReq + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    await sleep(Math.max(0, RTT_MS + (this.rand() * 2 - 1) * RTT_JITTER_MS)); // RTT de ida do cliente
    this.lastReq = Date.now();
    const h = { 'x-forwarded-for': this.xff, ...headers };
    if (body !== undefined) h['content-type'] = 'application/json';
    if (auth && this.token) h.authorization = `Bearer ${this.token}`;
    const t0 = performance.now();
    try {
      const res = await fetch(base + urlPath, {
        method,
        headers: h,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      const text = await res.text();
      record(
        label,
        res.status,
        performance.now() - t0,
        text,
        benign422 && res.status === 422,
      );
      if (res.status === 401 && measuring && errorSamples.length < 60) {
        errorSamples.push({
          label,
          status: 401,
          who: this.user.email,
          tokenAgeS: Math.round((Date.now() - this.loggedAt) / 1000),
          errText: text.slice(0, 160),
        });
      }
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        /* resposta nao-JSON (ex.: HTML do frontend) */
      }
      return { status: res.status, json };
    } catch (error) {
      record(label, 0, performance.now() - t0, error?.message);
      return { status: 0, json: null };
    }
  }

  async login() {
    const r = await this.call(
      'POST /auth/refresh',
      'POST',
      '/auth/refresh',
      { refreshToken: this.refreshToken },
      { auth: false },
    );
    const d = r.json?.data;
    if (d?.accessToken) {
      this.token = d.accessToken;
      this.loggedAt = Date.now();
      this.refreshToken = d.refreshToken ?? this.refreshToken;
    }
    await this.call('GET /auth/me', 'GET', '/auth/me');
  }

  // ---- fluxos
  async browseCases() {
    const q = new URLSearchParams({
      page: String(1 + Math.floor(this.rand() * 4)),
      limit: this.pick(['20', '50']),
      sortBy: this.pick([
        'daysOverdue',
        'totalOutstanding',
        'createdAt',
        'updatedAt',
      ]),
      sortDirection: this.pick(['asc', 'desc']),
    });
    const roll = this.rand();
    if (roll < 0.25)
      q.set(
        'status',
        this.pick(['WAITING_TRIAGE', 'IN_COLLECTION', 'AWAITING_PAYMENT']),
      );
    else if (roll < 0.45)
      q.set('daysOverdueMin', String(this.pick([1, 10, 30])));
    else if (roll < 0.6)
      q.set('search', this.pick(['Silva', 'Souza', 'Ana', 'Lucas', 'Santos']));
    else if (roll < 0.7)
      q.set('priority', this.pick(['HIGH', 'MEDIUM', 'LOW']));
    else if (roll < 0.8)
      q.set('slaStatus', this.pick(['overdue', 'due_today', 'ok']));
    const r = await this.call(
      'GET /collection-cases (lista/filtros)',
      'GET',
      `/collection-cases?${q}`,
    );
    this.absorbCases(r.json);
    if (this.rand() < 0.5) {
      await this.call(
        'GET /collection-cases/overdue-dates-summary',
        'GET',
        `/collection-cases/overdue-dates-summary?${q}`,
      );
    }
  }

  absorbCases(json) {
    const items = json?.data?.items ?? json?.data?.data ?? json?.data ?? [];
    if (!Array.isArray(items)) return;
    for (const c of items) {
      if (c?.id) this.caseIds.push(c.id);
      if (c?.externalId) this.caseExternalIds.push(c.externalId);
    }
    this.caseIds = this.caseIds.slice(-200);
    this.caseExternalIds = this.caseExternalIds.slice(-200);
  }

  async ensureCases() {
    if (this.caseIds.length === 0) {
      const r = await this.call(
        'GET /collection-cases (lista/filtros)',
        'GET',
        '/collection-cases?page=1&limit=50',
      );
      this.absorbCases(r.json);
    }
    return this.caseIds.length > 0;
  }

  async caseWork() {
    if (!(await this.ensureCases())) return;
    const id = this.pick(this.caseIds);
    await this.call(
      'GET /collection-cases/:id',
      'GET',
      `/collection-cases/${id}`,
    );
    await this.call(
      'GET /collection-cases/:id/timeline',
      'GET',
      `/collection-cases/${id}/timeline`,
    );
    await this.call(
      'GET /collection-cases/:id/notes',
      'GET',
      `/collection-cases/${id}/notes`,
    );
    if (this.user.role === 'COLLECTION_AGENT' || this.isManager) {
      await this.call(
        'POST /collection-cases/:id/attempts',
        'POST',
        `/collection-cases/${id}/attempts`,
        {
          channel: this.pick(['PHONE', 'WHATSAPP', 'SMS', 'EMAIL']),
          result: this.pick([
            'CONTACTED',
            'NO_ANSWER',
            'VOICEMAIL',
            'CALLBACK_REQUESTED',
          ]),
          notes: 'Tentativa de contato sintetica (teste de carga).',
          nextContactAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
      );
      if (this.rand() < 0.6) {
        await this.call(
          'POST /collection-cases/:id/notes',
          'POST',
          `/collection-cases/${id}/notes`,
          {
            content: 'Nota sintetica do teste de carga.',
          },
        );
      }
      if (this.rand() < 0.4) {
        const p = await this.call(
          'POST /collection-cases/:id/promises',
          'POST',
          `/collection-cases/${id}/promises`,
          {
            promisedAmount: 99.9,
            promisedDate: new Date(Date.now() + 3 * 86_400_000).toISOString(),
            notes: 'Promessa sintetica.',
          },
        );
        const promiseId = p.json?.data?.id ?? p.json?.data?.promise?.id;
        if (promiseId && this.rand() < 0.6) {
          const action = this.pick(['fulfill', 'break', 'cancel']);
          await this.call(
            `POST /collection-cases/:id/promises/:pid/${action}`,
            'POST',
            `/collection-cases/${id}/promises/${promiseId}/${action}`,
            {
              notes: 'Atualizacao sintetica.',
            },
          );
        }
      }
    }
  }

  async whatsappSingle() {
    if (!(await this.ensureCases())) return;
    const id = this.pick(this.caseIds);
    await this.call(
      'POST /collection-cases/:id/contact-whatsapp',
      'POST',
      `/collection-cases/${id}/contact-whatsapp`,
    );
  }

  async dashboard() {
    await this.call('GET /dashboard/summary', 'GET', '/dashboard/summary');
    if (!this.isManager) return;
    await this.call(
      'GET /dashboard/operations',
      'GET',
      '/dashboard/operations',
    );
    await this.call(
      'GET /dashboard/recovery-ranking',
      'GET',
      '/dashboard/recovery-ranking',
    );
    await this.call(
      'GET /dashboard/cancellation-reasons',
      'GET',
      '/dashboard/cancellation-reasons',
    );
  }

  async supervision() {
    if (!this.isManager) return this.dashboard();
    await this.call(
      'GET /collection-cases/portfolios',
      'GET',
      '/collection-cases/portfolios',
    );
    await this.call(
      'GET /collection-cases/status-summary',
      'GET',
      '/collection-cases/status-summary',
    );
    await this.call(
      'GET /collection-cases/intake-summary',
      'GET',
      '/collection-cases/intake-summary',
    );
    await this.call('GET /users/workload', 'GET', '/users/workload');
    await this.call(
      'GET /integration-events/summary',
      'GET',
      '/integration-events/summary',
    );
    await this.call('GET /audit-logs', 'GET', '/audit-logs?limit=20');
    await this.call(
      'GET /payment-promises',
      'GET',
      '/payment-promises?limit=20',
    );
  }

  async notifications() {
    await this.call('GET /notifications', 'GET', '/notifications?limit=20');
    await this.call(
      'GET /notifications/unread-count',
      'GET',
      '/notifications/unread-count',
    );
    if (this.rand() < 0.2)
      await this.call(
        'PATCH /notifications/read-all',
        'PATCH',
        '/notifications/read-all',
      );
  }

  async preCollection() {
    if (this.user.role === 'CANCELLATION_AGENT') return this.notifications();
    await this.call(
      'GET /pre-collection',
      'GET',
      `/pre-collection?daysWindow=${this.pick([3, 7, 15])}`,
    );
  }

  async erpViews() {
    if (!this.isManager) return this.notifications();
    await this.call(
      'GET /erp/renegotiation-summary',
      'GET',
      '/erp/renegotiation-summary',
    );
    await this.call(
      'GET /erp/renegotiation-history',
      'GET',
      '/erp/renegotiation-history',
    );
    if (this.caseExternalIds.length > 0) {
      await this.call(
        'GET /erp/renegotiation-detail/:id',
        'GET',
        `/erp/renegotiation-detail/${this.pick(this.caseExternalIds)}`,
      );
    }
  }

  async bulkWhatsapp() {
    if (!this.isManager) return this.browseCases();
    const r = await this.call(
      'GET /collection-cases (lote: selecionar)',
      'GET',
      '/collection-cases?page=1&limit=100&status=WAITING_TRIAGE',
    );
    const items = r.json?.data?.items ?? [];
    const ids = items
      .map((c) => c.id)
      .filter(Boolean)
      .slice(0, 40);
    if (ids.length === 0) return;
    const job = await this.call(
      'POST /bulk-contact-whatsapp',
      'POST',
      '/bulk-contact-whatsapp',
      { caseIds: ids },
    );
    const jobId = job.json?.data?.id ?? job.json?.data?.jobId;
    await this.call(
      'GET /bulk-contact-whatsapp',
      'GET',
      '/bulk-contact-whatsapp?limit=10',
    );
    if (jobId) {
      for (let i = 0; i < 3; i += 1) {
        await sleep(4000);
        await this.call(
          'GET /bulk-contact-whatsapp/:id',
          'GET',
          `/bulk-contact-whatsapp/${jobId}`,
        );
      }
    }
  }

  async admin() {
    await this.call('GET /settings', 'GET', '/settings');
    if (this.isManager) {
      await this.call('GET /users', 'GET', '/users');
      await this.call('GET /customers', 'GET', '/customers?limit=20');
    }
  }

  async webProbe() {
    // Frontend (nginx): SPA + proxy /api -> backend. IP do cliente = gateway do Docker (1 bucket).
    await this.call('GET web / (SPA)', 'GET', '/', undefined, {
      base: WEB,
      auth: false,
    });
    await this.call(
      'GET web /api/health (proxy)',
      'GET',
      '/api/health',
      undefined,
      { base: WEB, auth: false },
    );
  }

  flows() {
    // [peso, funcao]
    return [
      [28, () => this.browseCases()],
      [30, () => this.caseWork()],
      [6, () => this.dashboard()],
      [5, () => this.supervision()],
      [9, () => this.notifications()],
      [4, () => this.preCollection()],
      [3, () => this.erpViews()],
      [5, () => this.whatsappSingle()],
      [1.5, () => this.bulkWhatsapp()],
      [2, () => this.admin()],
      [3, () => this.login()],
      [3.5, () => this.webProbe()],
    ];
  }

  async run(stopAt) {
    await this.login();
    const flows = this.flows();
    const total = flows.reduce((a, [w]) => a + w, 0);
    while (Date.now() < stopAt) {
      let roll = this.rand() * total;
      let chosen = flows[0][1];
      for (const [w, fn] of flows) {
        roll -= w;
        if (roll <= 0) {
          chosen = fn;
          break;
        }
      }
      try {
        await chosen();
      } catch (error) {
        record('vu-exception', 0, 0, error?.stack);
      }
      await sleep(THINK_MIN_MS + this.rand() * (THINK_MAX_MS - THINK_MIN_MS)); // think time
    }
  }
}

// ---------------------------------------------------------------- "ERP": webhook de ingestao, virada de dados, distribuicao
const WEBHOOK_SECRET =
  process.env.LT_WEBHOOK_SECRET ?? 'loadtest-webhook-0123456789abcdef';
let ingestSeq = 0;
async function ingestWorker(stopAt) {
  const rand = rng(SEED * 7919);
  while (Date.now() < stopAt) {
    const events = Array.from({ length: 25 }, () => {
      const n = ingestSeq++;
      const days = 2 + Math.floor(rand() * 90);
      const due = new Date(Date.now() - days * 86_400_000).toISOString();
      return {
        externalId: `lt-ing-${n % 4000}`,
        customer: {
          name: `Cliente Sintetico ${n % 4000}`,
          document: String(70_000_000_000 + (n % 4000)),
          email: `ingest${n % 4000}@example.com`,
          phone: `5511950${String(n % 100000).padStart(5, '0')}`,
          externalId: `lt-ing-cust-${n % 4000}`,
        },
        contract: {
          code: `LT-${n % 4000}`,
          status: 'ACTIVE',
          startDate: '2023-01-10T00:00:00.000Z',
          monthlyValue: 129.9,
          externalId: `lt-ing-ct-${n % 4000}`,
        },
        invoices: [
          {
            externalId: `lt-ing-inv-${n % 4000}`,
            invoiceNumber: `LT${n % 4000}`,
            status: 'OVERDUE',
            dueDate: due,
            amount: 129.9,
          },
        ],
        case: {
          status: 'WAITING_TRIAGE',
          priority: days > 60 ? 'HIGH' : 'MEDIUM',
          outstandingAmount: 129.9,
          daysOverdue: days,
        },
      };
    });
    const t0 = performance.now();
    try {
      const res = await fetch(`${API}/webhooks/n8n/collection-cases`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-webhook-secret': WEBHOOK_SECRET,
          'x-forwarded-for': '10.99.0.1',
        },
        body: JSON.stringify({ source: 'n8n-loadtest', events }),
        signal: AbortSignal.timeout(60_000),
      });
      const text = await res.text();
      record(
        'POST /webhooks/n8n/collection-cases (ingestao)',
        res.status,
        performance.now() - t0,
        text,
      );
    } catch (error) {
      record(
        'POST /webhooks/n8n/collection-cases (ingestao)',
        0,
        performance.now() - t0,
        error?.message,
      );
    }
    // resposta do cliente via Matrix (webhook)
    const t1 = performance.now();
    try {
      const res = await fetch(`${API}/webhooks/n8n/matrix-replies`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-webhook-secret': WEBHOOK_SECRET,
          'x-forwarded-for': '10.99.0.2',
        },
        body: JSON.stringify({
          codAtendimento: `lt-${ingestSeq}`,
          message: 'Ola, vou pagar amanha.',
          author: 'Cliente',
          phone: '5511950000000',
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const text = await res.text();
      record(
        'POST /webhooks/n8n/matrix-replies',
        res.status,
        performance.now() - t1,
        text,
      );
    } catch (error) {
      record(
        'POST /webhooks/n8n/matrix-replies',
        0,
        performance.now() - t1,
        error?.message,
      );
    }
    await sleepUntil(INGEST_EVERY_S * 1000, stopAt);
  }
}

function dockerExec(args, input) {
  return new Promise((resolve) => {
    const child = execFile(
      'docker',
      args,
      { maxBuffer: 20 * 1024 * 1024 },
      (error, stdout, stderr) => resolve({ ok: !error, stdout, stderr }),
    );
    if (input) child.stdin.end(input);
  });
}
const mutations = { ok: 0, failed: 0 };
async function erpMutator(stopAt) {
  while (Date.now() < stopAt) {
    await sleepUntil(MUTATE_EVERY_S * 1000, stopAt);
    if (Date.now() >= stopAt) break;
    const r = await dockerExec([
      'exec',
      '-i',
      `${PROJECT}-postgres-erp-1`,
      'psql',
      '-U',
      'erp_user',
      '-d',
      'erp_artificial',
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      '/erp-sql/mutate.sql',
    ]);
    if (r.ok) mutations.ok += 1;
    else {
      mutations.failed += 1;
      process.stderr.write(`mutacao ERP falhou: ${r.stderr.slice(0, 200)}\n`);
    }
  }
}

// usuario dedicado (ADMIN) para distribuicao de casos: nao compartilha refresh token com nenhum VU
const ops = new Vu(900, byRole('ADMIN')[0]);
async function distributor(stopAt) {
  const vu = ops;
  while (Date.now() < stopAt) {
    await vu.call(
      'POST /collection-cases/auto-distribute',
      'POST',
      '/collection-cases/auto-distribute',
      {
        statuses: ['WAITING_TRIAGE'],
        targetRole: 'COLLECTION_AGENT',
      },
      { benign422: true },
    ); // 422 = nao ha casos sem responsavel (resposta valida)
    await sleepUntil(60_000, stopAt);
  }
}

// ---------------------------------------------------------------- execucao
async function main() {
  const startedAt = Date.now();
  const warmupEnd = startedAt + WARMUP_S * 1000;
  const stopAt = warmupEnd + DURATION_S * 1000;
  const vus = pickVuUsers(USERS).map((u, i) => new Vu(i, u));
  console.log(
    `[${LABEL}] ${USERS} VUs (${vus.map((v) => v.user.role[0]).join('')}), aquecimento ${WARMUP_S}s + medicao ${DURATION_S}s`,
  );

  // distribuicao inicial: o sync do ERP ja deve ter criado casos (cron acelerado)
  await ops.login();
  await ops.call(
    'POST /collection-cases/auto-distribute',
    'POST',
    '/collection-cases/auto-distribute',
    { statuses: ['WAITING_TRIAGE'], targetRole: 'COLLECTION_AGENT' },
  );

  const tasks = [
    ...vus.map((v) => v.run(stopAt)),
    ingestWorker(stopAt),
    erpMutator(stopAt),
    distributor(stopAt),
  ];
  setTimeout(
    () => {
      measuring = true;
      console.log(`[${LABEL}] aquecimento concluido, medindo...`);
    },
    Math.max(0, warmupEnd - Date.now()),
  );
  const progress = setInterval(() => {
    const total = [...stats.values()].reduce((a, s) => a + s.n, 0);
    const errs = [...stats.values()].reduce((a, s) => a + s.errors, 0);
    console.log(
      `[${LABEL}] t=${Math.round((Date.now() - startedAt) / 1000)}s req=${total} erros=${errs}`,
    );
  }, 60_000);
  await Promise.all(tasks);
  clearInterval(progress);
  // o refresh token rotaciona a cada login: persiste os novos para o proximo ciclo
  for (const v of [...vus, ops]) {
    const u = users.find((x) => x.id === v.user.id);
    if (u) u.refreshToken = v.refreshToken;
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(users));
  measuring = false;

  const rows = [...stats.entries()]
    .map(([endpoint, s]) => {
      const lat = [...s.lat].sort((a, b) => a - b);
      return {
        endpoint,
        n: s.n,
        errors: s.errors,
        err5xx: Object.entries(s.byStatus)
          .filter(([k]) => Number(k) >= 500 || k === '0')
          .reduce((a, [, v]) => a + v, 0),
        status: s.byStatus,
        p50: Math.round(pct(lat, 50)),
        p95: Math.round(pct(lat, 95)),
        p99: Math.round(pct(lat, 99)),
        max: Math.round(lat[lat.length - 1] ?? 0),
      };
    })
    .sort((a, b) => b.n - a.n);
  const total = rows.reduce((a, r) => a + r.n, 0);
  const errors = rows.reduce((a, r) => a + r.errors, 0);
  const err5xx = rows.reduce((a, r) => a + r.err5xx, 0);
  const all = [...stats.values()].flatMap((s) => s.lat).sort((a, b) => a - b);
  const summary = {
    label: LABEL,
    users: USERS,
    warmupS: WARMUP_S,
    durationS: DURATION_S,
    requests: total,
    rps: Number((total / DURATION_S).toFixed(2)),
    errors,
    err5xx,
    errorRatePct: Number(((errors / Math.max(1, total)) * 100).toFixed(2)),
    p50: Math.round(pct(all, 50)),
    p95: Math.round(pct(all, 95)),
    p99: Math.round(pct(all, 99)),
    erpMutations: mutations,
    errorSamples,
    rows,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.table(
    rows.map(({ endpoint, n, errors: e, err5xx: e5, p50, p95, p99 }) => ({
      endpoint,
      n,
      erros: e,
      '5xx/net': e5,
      p50,
      p95,
      p99,
    })),
  );
  console.log(
    `[${LABEL}] total=${total} rps=${summary.rps} erros=${errors} (5xx/rede=${err5xx}) p95=${summary.p95}ms p99=${summary.p99}ms -> ${OUT}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
