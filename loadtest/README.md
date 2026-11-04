# Teste de carga e memoria (loadtest)

Imita o ERP real (Postgres com o schema `erp` que o GER consulta, **mesmo tamanho do ERP de producao**
e latencia de rede equivalente) e o uso da API por varios usuarios, mede memoria por servico e procura
leaks. O repositorio guarda **so instrucoes e scripts**; todos os dados e artefatos nascem durante o
teste e sao apagados no fim.

## Rodar (comando unico: run -> medir -> cleanup)

```bash
bash loadtest/run.sh                  # ERP_SCALE=1 (tamanho real, ~27 GB), 3 ciclos x (2 min aquec. + 10 min), 12 usuarios
ERP_SCALE=0.01 bash loadtest/run.sh --cycles 1 --duration 60 --warmup 20 --idle 20   # fumaca (~280 MB, ~6 min)
```

`run.sh` executa `node loadtest/run.mjs` e, **sempre** ao final (sucesso, falha ou Ctrl-C), `loadtest/cleanup.sh`.
Requer Docker e Node 22. Opcoes do `run.mjs`: `--users 12 --cycles 3 --duration 600 --warmup 120 --idle 90`.
`KEEP_DATA=1` (opt-out explicito, so para depuracao) pula a limpeza. Windows sem Git Bash: use
`node loadtest/run.mjs` e `powershell -File loadtest/cleanup.ps1`.

O relatorio final fica em [`RESULTS.md`](./RESULTS.md) (gerado a cada execucao; texto pequeno, versionavel).

## O que existe

| Arquivo | Funcao |
| --- | --- |
| `run.sh` / `run.mjs` | Orquestrador: ERP + proxy -> dataset -> medicao de latencia -> stack real (build) -> seed -> N ciclos (memoria + carga + idle + GC + heap snapshot) -> `RESULTS.md` -> cleanup |
| `docker-compose.loadtest.yml`, `loadtest.env` | Override sobre `docker-compose.portainer.yml` (perfil medium): `postgres-erp`, `erp-latency`, `n8n-mock` e flags de diagnostico so no backend. Valores PLACEHOLDER |
| `erp/erp-profile.json` | Perfil agregado do ERP real (linhas, bytes, colunas, distribuicoes, latencia). Sem PII, sem credenciais |
| `erp/profile-real-erp.mjs` | Refaz o perfil lendo o ERP real em modo somente leitura: `node loadtest/erp/profile-real-erp.mjs --env-file <.env com ERP_DB_*>` (o env-file **nunca** e commitado) |
| `erp/build-erp.mjs` | Gera o ERP artificial em lotes SQL (`generate_series`), com `ERP_SCALE` (1 = real, 0.01 = smoke), calibracao de largura de linha e de indices e relatorio simulado x real. Idempotente/retomavel |
| `erp/mutate.sql` | "Virada" do ERP durante a carga: pagamentos, cancelamentos e novos contratos elegiveis |
| `erp/latency-proxy.mjs` | Proxy TCP entre backend e ERP: conexao ~95 ms, RTT de consulta p50 ~9 ms / p95 ~57 ms (calibravel por `ERP_LAT_*`) |
| `erp/measure-erp-latency.mjs` | Mesma rotina do perfil real (15 conexoes novas x 5 `SELECT 1`) |
| `mock-n8n/server.mjs` | Mock HTTP do N8N (HSM e recuperacao) |
| `container/*.cjs` | `seed-users` (usuarios), `fast-cron` (acelera `@Cron`), `mem-probe` (GC forcado e heap snapshot), montados so no backend de teste |
| `scenario.mjs` | Runner de carga (fetch nativo): VUs com RTT de cliente (20 ms +- 10) e think time de 1-5 s, webhooks de ingestao e virada do ERP; p50/p95/p99 por endpoint |
| `analyze-heap.mjs` | Contagem/tamanho por constructor e diff entre `.heapsnapshot` |
| `cleanup.sh`, `cleanup.ps1`, `compact-docker-disk.ps1` | Limpeza total e compactacao do disco do Docker (ver abaixo) |

## Decisoes e limites

- **Login**: em `NODE_ENV=production` o dev-login/mock Google fica desligado. Os usuarios sao semeados
  no MariaDB com refresh token (hash argon2) e os VUs entram por `POST /auth/refresh`.
- **Throttler** (60 req/min por IP): cada VU usa um `X-Forwarded-For` proprio (`trust proxy=1`).
- **Criterios de aceite** (`docs/dimensionamento.md`): P99 <= 80% do `mem_limit`, pico < 95% e sem
  crescimento sustentado entre ciclos identicos (idle + GC forcado: heapUsed e RSS).
- **MariaDB e `innodb_snapshot_isolation`**: a partir da 11.6.2 a opcao vem ligada: uma transacao que
  altera uma linha modificada por outra transacao depois do seu snapshot falha com erro 1020 ("Record has
  changed since last read") em vez de esperar. Sob carga isso derrubava o worker de HSM em lote
  (`bulk_contact_jobs`, varios itens do lote atualizam o mesmo job) e a reconciliacao do sync do ERP
  (`collection_cases` alterados por usuarios durante a transacao longa). A correcao esta na aplicacao
  (`backend/src/common/utils/retry-on-write-conflict.util.ts`: ate 4 tentativas, backoff exponencial com
  jitter, so em escritas idempotentes). A opcao **nao foi desligada** (e o padrao do MariaDB e protege a
  consistencia); desliga-la (`--innodb-snapshot-isolation=OFF`) so seria aceitavel com decisao registrada.
  A imagem esta fixada em `mariadb:11.8` no compose de producao e do loadtest (sem tag flutuante); nao
  rebaixe para 11.4 sobre um volume ja criado pela 11.8 (downgrade nao e suportado). Confirme em producao
  com `SELECT VERSION()`.
- **Memoria do backend**: o limitante e o RSS, nao o heap do V8. `BACKEND_HEAP_MB=768` fica muito acima do
  `heapUsed` (~50-90 MiB apos GC); o crescimento observado e memoria nativa (arenas do glibc e Prisma
  engine em `RssAnon`). Ver `RESULTS.md`.
- Heap snapshots sao tirados so no idle entre ciclos, fora da janela medida.
- O Postgres do ERP (6 GiB, cache de paginas) mostra uso alto de memoria por causa do page cache; ele
  nao faz parte da stack de producao e nao entra nos criterios.

## Limpeza e espaco em disco

- **O que e criado**: containers/rede/imagens `ger-loadtest-*`, volume `ger-loadtest_db_data` (MariaDB),
  volume `ger-loadtest-erp-data` (dataset do ERP), imagens baixadas (postgres, node-alpine, mariadb),
  cache de build e `loadtest/out/` (CSV, logs, heap snapshots). Nada disso entra no git.
- **Pico**: ~27 GB de dados + ~3 GB de indices/WAL no volume do ERP (`ERP_SCALE=1`), ~2,5 GB de cache de
  build/imagens e ~0,3 GB em `loadtest/out`. Antes de gerar, `build-erp.mjs` calcula
  `sum(totalBytes) x ERP_SCALE x 1,15`, compara com o livre do host e com a folga dentro do VHDX e
  **aborta** se o disco do host fosse ficar com menos de 10 GiB livres. A geracao tambem para se o livre
  cair abaixo de 10 GiB.
- **`cleanup.sh`/`cleanup.ps1`**: `docker compose -p ger-loadtest down -v --rmi local --remove-orphans`,
  remocao de volumes/redes/imagens `ger-loadtest*`, das imagens que o teste baixou (so as que nao existiam
  antes), `docker builder prune -f` e `rm -rf loadtest/out`; imprimem `docker system df`, tamanho do VHDX e
  livre no C: antes e depois. Nunca tocam em recursos de outros projetos.
- **Quando compactar**: o `docker_data.vhdx` (Docker Desktop/WSL2) **nao encolhe sozinho**: apagar dados
  libera espaco so dentro dele. Para devolver o espaco ao Windows rode, em PowerShell **elevado** e com o
  Docker parado, `loadtest/compact-docker-disk.ps1` (para o Docker e todos os containers; pede confirmacao).
