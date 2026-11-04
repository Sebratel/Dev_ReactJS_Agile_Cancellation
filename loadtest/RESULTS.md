# Relatorio do teste de carga (2026-11-04T02:15:29.467Z)

Parametros: {"PROJECT":"ger-loadtest","CYCLES":1,"USERS":12,"DURATION":600,"WARMUP":120,"IDLE":90,"ERP_SCALE":1}

## ERP artificial: tamanho simulado x real (ERP_SCALE=1)

| tabela                         | linhas reais x escala | linhas simuladas | total real x escala (MiB) | total simulado (MiB) | desvio |
| ------------------------------ | --------------------- | ---------------- | ------------------------- | -------------------- | ------ |
| contract_event_types           | 152                   | 152              | 0                         | 0                    | -76.9% |
| contract_events                | 7485752               | 7487852          | 2355                      | 2313                 | -1.8%  |
| contract_types                 | 40                    | 40               | 0                         | 0                    | -92.9% |
| contracts                      | 291413                | 291413           | 442                       | 456                  | 3.1%   |
| financers_natures              | 475                   | 475              | 0                         | 0                    | -73.2% |
| financial_receipt_titles       | 12463014              | 12472682         | 5706                      | 5810                 | 1.8%   |
| financial_receivable_titles    | 17015804              | 17020004         | 17770                     | 17818                | 0.3%   |
| financial_renegotiation_titles | 364002                | 364002           | 68                        | 69                   | 2.1%   |
| financial_renegotiations       | 178445                | 178445           | 36                        | 36                   | 1.5%   |
| people                         | 307646                | 307646           | 532                       | 451                  | -15.2% |
| TOTAL                          |                       |                  | 26909                     | 26955                | 0.2%   |

## Latencia de conexao ao ERP (rotina: 15 conexoes novas x 5 SELECT 1)

| origem                          | connectMs p50 | p95    | queryRttMs p50 | p95   | p99   |
| ------------------------------- | ------------- | ------ | -------------- | ----- | ----- |
| real (perfil)                   | 94.94         | 137.11 | 8.32           | 56.87 | 64.89 |
| direto (antes, sem proxy)       | 10.11         | 20.59  | 1.14           | 2.56  | 3.13  |
| via proxy (depois, 15 conexoes) | 105           | 186.12 | 30.4           | 66.71 | 71.42 |
| via proxy (60 conexoes)         | 119.94        | 187.41 | 16.95          | 62.49 | 71.8  |

Duracao do sync do ERP (consulta + ingestao + reconciliacao): {"runs":64,"first":0.111,"p50":0.172,"max":32.963} (s)

## Memoria por servico (janela medida de todos os ciclos)

| servico      | amostras | media MiB | P90    | P99    | pico   | limite | P99/limite | pico/limite | CPU media % | CPU P99 % |
| ------------ | -------- | --------- | ------ | ------ | ------ | ------ | ---------- | ----------- | ----------- | --------- |
| frontend     | 129      | 14.9      | 15.9   | 16.4   | 16.7   | 128    | 12.8%      | 13.0%       | 0.2         | 2.8       |
| backend      | 129      | 249.8     | 258.4  | 299.0  | 314.8  | 1024   | 29.2%      | 30.7%       | 48.7        | 95.2      |
| mariadb      | 129      | 181.6     | 212.0  | 219.0  | 219.9  | 1024   | 21.4%      | 21.5%       | 12.1        | 29.3      |
| n8n-mock     | 129      | 17.1      | 17.9   | 18.4   | 19.7   | 128    | 14.4%      | 15.4%       | 0.4         | 3.7       |
| erp-latency  | 129      | 15.4      | 17.0   | 18.3   | 19.0   | 128    | 14.3%      | 14.8%       | 0.2         | 2.1       |
| postgres-erp | 129      | 5228.4    | 5402.6 | 5508.1 | 5704.7 | 6144   | 89.7%      | 92.8%       | 20.2        | 184.0     |

### cycle1

| servico      | amostras | media MiB | P90    | P99    | pico   | limite | P99/limite | pico/limite | CPU media % | CPU P99 % |
| ------------ | -------- | --------- | ------ | ------ | ------ | ------ | ---------- | ----------- | ----------- | --------- |
| frontend     | 129      | 14.9      | 15.9   | 16.4   | 16.7   | 128    | 12.8%      | 13.0%       | 0.2         | 2.8       |
| backend      | 129      | 249.8     | 258.4  | 299.0  | 314.8  | 1024   | 29.2%      | 30.7%       | 48.7        | 95.2      |
| mariadb      | 129      | 181.6     | 212.0  | 219.0  | 219.9  | 1024   | 21.4%      | 21.5%       | 12.1        | 29.3      |
| n8n-mock     | 129      | 17.1      | 17.9   | 18.4   | 19.7   | 128    | 14.4%      | 15.4%       | 0.4         | 3.7       |
| erp-latency  | 129      | 15.4      | 17.0   | 18.3   | 19.0   | 128    | 14.3%      | 14.8%       | 0.2         | 2.1       |
| postgres-erp | 129      | 5228.4    | 5402.6 | 5508.1 | 5704.7 | 6144   | 89.7%      | 92.8%       | 20.2        | 184.0     |

Erros no log do backend neste ciclo: {"errorLines":0,"hsmWorker":0,"erpSync":0,"mysql1020":87,"writeConflictRetries":4}; mutacoes do ERP: {"ok":9,"failed":0}

Latencia:3872 req (6.45 req/s), erros 0 (5xx/rede 0), p50 11 ms, p95 101 ms, p99 482 ms

| endpoint                                         | n   | erros | p50 | p95  | p99  |
| ------------------------------------------------ | --- | ----- | --- | ---- | ---- |
| POST /collection-cases/:id/attempts              | 428 | 0     | 18  | 65   | 759  |
| GET /collection-cases/:id/timeline               | 426 | 0     | 11  | 42   | 137  |
| GET /collection-cases/:id/notes                  | 426 | 0     | 7   | 33   | 223  |
| GET /collection-cases/:id                        | 425 | 0     | 9   | 33   | 136  |
| GET /collection-cases (lista/filtros)            | 392 | 0     | 10  | 34   | 77   |
| POST /collection-cases/:id/notes                 | 259 | 0     | 11  | 33   | 159  |
| GET /collection-cases/overdue-dates-summary      | 199 | 0     | 10  | 112  | 344  |
| POST /collection-cases/:id/promises              | 158 | 0     | 18  | 47   | 519  |
| GET /notifications                               | 157 | 0     | 6   | 21   | 101  |
| GET /notifications/unread-count                  | 157 | 0     | 6   | 22   | 104  |
| GET /dashboard/summary                           | 135 | 0     | 14  | 40   | 314  |
| POST /collection-cases/:id/contact-whatsapp      | 71  | 0     | 65  | 147  | 1187 |
| GET /pre-collection                              | 65  | 0     | 5   | 101  | 420  |
| POST /webhooks/n8n/collection-cases (ingestao)   | 58  | 0     | 414 | 683  | 916  |
| POST /webhooks/n8n/matrix-replies                | 58  | 0     | 7   | 32   | 63   |
| GET web / (SPA)                                  | 39  | 0     | 5   | 35   | 58   |
| GET web /api/health (proxy)                      | 39  | 0     | 4   | 27   | 278  |
| PATCH /notifications/read-all                    | 36  | 0     | 6   | 12   | 16   |
| POST /auth/refresh                               | 34  | 0     | 406 | 1347 | 1360 |
| GET /auth/me                                     | 34  | 0     | 4   | 63   | 304  |
| POST /collection-cases/:id/promises/:pid/cancel  | 33  | 0     | 32  | 59   | 94   |
| POST /collection-cases/:id/promises/:pid/fulfill | 29  | 0     | 28  | 63   | 72   |
| POST /collection-cases/:id/promises/:pid/break   | 29  | 0     | 28  | 74   | 230  |
| GET /settings                                    | 26  | 0     | 5   | 34   | 36   |
| GET /dashboard/operations                        | 16  | 0     | 12  | 32   | 32   |
| GET /dashboard/recovery-ranking                  | 16  | 0     | 7   | 11   | 11   |
| GET /dashboard/cancellation-reasons              | 16  | 0     | 6   | 9    | 9    |
| GET /audit-logs                                  | 10  | 0     | 8   | 17   | 17   |
| GET /payment-promises                            | 10  | 0     | 11  | 61   | 61   |
| POST /collection-cases/auto-distribute           | 10  | 0     | 261 | 447  | 447  |
| GET /collection-cases/portfolios                 | 9   | 0     | 14  | 47   | 47   |
| GET /collection-cases/status-summary             | 9   | 0     | 6   | 33   | 33   |
| GET /collection-cases/intake-summary             | 9   | 0     | 7   | 159  | 159  |
| GET /users/workload                              | 9   | 0     | 8   | 173  | 173  |
| GET /integration-events/summary                  | 9   | 0     | 8   | 21   | 21   |
| GET /bulk-contact-whatsapp/:id                   | 9   | 0     | 7   | 79   | 79   |
| GET /erp/renegotiation-summary                   | 5   | 0     | 8   | 603  | 603  |
| GET /erp/renegotiation-history                   | 5   | 0     | 301 | 475  | 475  |
| GET /users                                       | 4   | 0     | 10  | 87   | 87   |
| GET /customers                                   | 4   | 0     | 18  | 22   | 22   |
| GET /collection-cases (lote: selecionar)         | 3   | 0     | 35  | 45   | 45   |
| POST /bulk-contact-whatsapp                      | 3   | 0     | 12  | 220  | 220  |
| GET /bulk-contact-whatsapp                       | 3   | 0     | 6   | 11   | 11   |

## Backend apos GC forcado (idle entre ciclos)

| ponto       | heapUsed MiB | heapTotal MiB | RSS MiB | RssAnon MiB | RssFile MiB | external MiB | arrayBuffers MiB |
| ----------- | ------------ | ------------- | ------- | ----------- | ----------- | ------------ | ---------------- |
| baseline    | 30.2         | 37.3          | 133.3   | 65.9        | 68.1        | 2.4          | 0                |
| apos-cycle1 | 46           | 63.3          | 313.7   | 242.3       | 72.2        | 3.6          | 0.1              |

Syncs do ERP concluidos: 24. Linhas ERROR no log do backend: 0. N8N mock: {"counts":{"POST /webhook/hsm":2266},"bytes":334157}

## Heap do backend: snapshot baseline x ultimo ciclo (V8, apos GC)

- heap-baseline.heapsnapshot: 31.96 MiB, 390541 objetos
- heap-apos-cycle1.heapsnapshot: 51.46 MiB, 732789 objetos

Maiores crescimentos (delta 19.5 MiB):

| constructor                   | delta objetos | delta KiB | objetos | KiB   |
| ----------------------------- | ------------- | --------- | ------- | ----- |
| string:(string)               | 159390        | 5244      | 321277  | 17159 |
| object:Object                 | 34628         | 2015      | 55663   | 3668  |
| object:Date                   | 20960         | 1965      | 20965   | 1965  |
| hidden:system / PropertyArray | 15084         | 1300      | 18742   | 1488  |
| code:                         | 546           | 1008      | 760     | 1584  |
| array:(object elements)       | 5416          | 994       | 17559   | 2575  |
| number:heap number            | 38936         | 608       | 39313   | 614   |
| object:IngestInvoiceDto       | 6160          | 433       | 6160    | 433   |
| object:Array                  | 10653         | 333       | 24610   | 769   |
| code:system / FeedbackVector  | 1258          | 328       | 3212    | 761   |
