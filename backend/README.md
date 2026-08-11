# GER Collection Cancellation API

Backend NestJS da plataforma GER — Gestao de Cobranca e Cancelamento, com MySQL via Prisma.

## Objetivo desta etapa

- PrismaClient real integrado ao NestJS
- Primeira migration oficial do dominio
- Seed idempotente de desenvolvimento
- Endpoints mockados de dashboard e collection-cases mantidos

## Stack

- NestJS
- TypeScript strict
- Prisma + MySQL
- Jest
- ESLint
- Prettier

## Banco MySQL

Crie o banco local com charset recomendado:

```sql
CREATE DATABASE DB_Cancellation_Plataform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

## Configuracao local

1. Na raiz do projeto, copie o exemplo:

```bash
cd ..
cp .env.example .env
```

2. Edite `.env` na raiz localmente com sua conexao MySQL:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB_Cancellation_Plataform"
```

Substitua `USER`, `PASSWORD`, `HOST` e `PORTA` pelos valores do seu ambiente.

### Avisos de seguranca

- Nunca commitar `.env`
- Nunca expor `DATABASE_URL` em logs, README, testes ou issues
- Dados do seed sao ficticios e servem apenas para desenvolvimento
- Autenticacao real ainda nao existe nesta etapa

## Fonte de dados (mock vs database)

Use `DATA_SOURCE_MODE` no `.env` da raiz:

| Valor      | Comportamento                                       |
| ---------- | --------------------------------------------------- |
| `mock`     | Endpoints usam repositories mock (padrao em testes) |
| `database` | Endpoints leem do MySQL via Prisma                  |

Exemplo:

```env
DATA_SOURCE_MODE="database"
```

Para desenvolvimento local com banco real:

```env
DATA_SOURCE_MODE="database"
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB_Cancellation_Plataform"
```

## Scripts principais

| Script                                                              | Descricao                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| `npm run start:dev`                                                 | Sobe a API em modo desenvolvimento                      |
| `npm run prisma:generate`                                           | Gera o Prisma Client                                    |
| `npm run prisma:validate`                                           | Valida o schema                                         |
| `npm run prisma:format`                                             | Formata o schema                                        |
| `npm run prisma:migrate:dev -- init_collection_cancellation_schema` | Cria/aplica migration de desenvolvimento                |
| `npm run prisma:migrate:status`                                     | Status das migrations                                   |
| `npm run prisma:seed`                                               | Executa seed idempotente                                |
| `npm run db:reset-demo`                                             | Limpa dados de dominio demo e recria seed (dev/homolog) |
| `npm run db:setup`                                                  | generate + migrate:dev + seed                           |
| `npm run test:run`                                                  | Testes padrao (sem banco real)                          |
| `npm run test:db`                                                   | Testes de integracao com DB (`RUN_DB_INTEGRATION=true`) |

## Setup inicial do banco

```bash
npm run prisma:generate
npm run prisma:migrate:dev -- init_collection_cancellation_schema
npm run prisma:seed
npm run start:dev
```

Ou em um unico fluxo:

```bash
npm run db:setup
npm run start:dev
```

Se `prisma:migrate:dev` precisar de nome manual, use `-- init_collection_cancellation_schema` ou `-- --name <nome_da_migration>`.

## Seed de desenvolvimento

O seed cria:

- 6 roles (`ADMIN`, `SUPERVISOR`, `COLLECTION_AGENT`, `CANCELLATION_AGENT`, `FINANCE`, `VIEWER`)
- 1 usuario admin (`admin@ger.local`)
- 1 usuario financeiro (`finance@ger.local`, role `FINANCE`)
- ate 5 clientes com documentos ficticios
- contratos, faturas em aberto e casos de cobranca relacionados

Senhas de desenvolvimento (nao versionar valores reais):

| Usuario | Variavel de ambiente   | Fallback local documentado |
| ------- | ---------------------- | -------------------------- |
| Admin   | `DEV_ADMIN_PASSWORD`   | `Admin@123456`             |
| Finance | `DEV_FINANCE_PASSWORD` | `Finance@123456`           |

O seed e idempotente: pode ser executado multiplas vezes com `upsert` por chaves unicas.

### Cenarios demonstraveis criados pelo seed

| Caso (`externalId`) | Finalidade operacional                                        |
| ------------------- | ------------------------------------------------------------- |
| `seed-case-001`     | Pronto para registrar tentativa de contato                    |
| `seed-case-002`     | Pronto para registrar promessa de pagamento                   |
| `seed-case-003`     | Cancelamento em andamento com 8 etapas pendentes              |
| `seed-case-004`     | Elegivel para encaminhar ao cancelamento                      |
| `seed-case-005`     | Cancelamento concluido (caso `CLOSED` com etapas `COMPLETED`) |

## Reset de demonstracao (`db:reset-demo`)

Comando para restaurar dados de dominio em **desenvolvimento** ou **homologacao** quando a base ficou inconsistente apos testes manuais.

```bash
npm run db:reset-demo:confirm
```

Alternativas equivalentes:

```bash
npm run db:reset-demo -- --confirm
RESET_DEMO_CONFIRM=true npm run db:reset-demo
```

### Regras de seguranca

- **Nunca** executar em producao (`NODE_ENV=production` bloqueia a operacao).
- Exige confirmacao explicita com `--confirm`.
- Preserva `users`, `roles`, `user_roles` e migrations.
- Remove e recria apenas dados de dominio demonstraveis:
  - `audit_logs`
  - `cancellation_steps`
  - `cancellation_processes`
  - `payment_promises`
  - `collection_attempts`
  - `collection_cases`
  - `invoices`
  - `contracts`
  - `customers`

### Credenciais de demo (apos reset)

| Perfil     | E-mail              | Senha (fallback local) |
| ---------- | ------------------- | ---------------------- |
| Admin      | `admin@ger.local`   | `Admin@123456`         |
| Financeiro | `finance@ger.local` | `Finance@123456`       |

Senhas podem ser sobrescritas por `DEV_ADMIN_PASSWORD` e `DEV_FINANCE_PASSWORD` no `.env`.

## Cancelamento — regras operacionais (Etapa 19.1)

### Ordem e permissoes de etapas

As 8 etapas do processo devem ser concluidas em sequencia. Permissoes:

- `FINANCE`: `LOWER_TITLES`, `APPLY_FINE`
- `CANCELLATION_AGENT`: `OPEN_ELEVEN_REQUEST` e etapas operacionais
- `ADMIN` / `SUPERVISOR`: todas as etapas (respeitando ordem)

### ELEVEN_MODE

| Modo       | Endpoint generico `OPEN_ELEVEN_REQUEST` | Endpoint `POST .../eleven/request` |
| ---------- | --------------------------------------- | ---------------------------------- |
| `stub`     | Bloqueado (`step_requires_integration`) | Permitido (protocolo stub)         |
| `live`     | Bloqueado                               | Permitido (provider real futuro)   |
| `disabled` | Bloqueado                               | Retorna 503                        |

A etapa `OPEN_ELEVEN_REQUEST` **nunca** pode ser concluida pelo endpoint generico, em qualquer modo. Com `disabled`, a etapa permanece bloqueada ate alterar `ELEVEN_MODE`.

### Status da integracao Eleven (frontend)

Endpoint autenticado para o frontend desabilitar a acao quando necessario:

| Metodo | Rota                          | Resposta                                              |
| ------ | ----------------------------- | ----------------------------------------------------- |
| GET    | `/integrations/eleven/status` | `{ mode, available, message }` — sem credenciais/URLs |

### Status final do caso

Nao existe status dedicado `CANCELLED` no enum `CollectionStatus`. Quando `CancellationProcess.status = COMPLETED`, o caso e encerrado com `CLOSED`. Nesta versao, `CLOSED` apos conclusao do processo de cancelamento significa encerramento por cancelamento (ver `collection-case-closure.constants.ts`).

## Estrutura

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── seed/
│   └── migrations/
├── scripts/
├── src/
└── test/
```

## Endpoints disponiveis

| Metodo | Rota                             | Observacao                                           |
| ------ | -------------------------------- | ---------------------------------------------------- |
| GET    | `/health`                        | Healthcheck (publico)                                |
| GET    | `/health/ready`                  | Readiness com ping ao banco (503 se DB indisponivel) |
| GET    | `/dashboard/summary`             | Autenticado                                          |
| GET    | `/collection-cases`              | Autenticado, paginado                                |
| GET    | `/collection-cases/:id`          | Autenticado                                          |
| PATCH  | `/collection-cases/:id/assign`   | `SUPERVISOR`/`ADMIN` — distribui o caso a um agente  |
| GET    | `/customers`                     | `ADMIN`/`SUPERVISOR`/`FINANCE` — lista paginada      |
| GET    | `/customers/:id`                 | `ADMIN`/`SUPERVISOR`/`FINANCE` — detalhe + faturas   |
| GET    | `/users`                         | `ADMIN`/`SUPERVISOR` — lista paginada de usuarios    |
| GET    | `/users/:id`                     | `ADMIN`/`SUPERVISOR`                                 |
| POST   | `/users`                         | `ADMIN` — cria usuario (senha hasheada com argon2)   |
| PATCH  | `/users/:id`                     | `ADMIN` — atualiza nome/status/papeis                |
| POST   | `/webhooks/n8n/collection-cases` | Ingestao do N8N — autenticado por `X-Webhook-Secret` |

### Webhook de ingestao do N8N

Recebe lotes de clientes inadimplentes do fluxo `financial_collection_cancellation` e faz upsert idempotente de `customers`, `contracts`, `invoices` e `collection_cases`, registrando um `IntegrationEvent`.

- Autenticacao: header `X-Webhook-Secret` comparado (timing-safe) com `N8N_WEBHOOK_SECRET`.
- Sem o segredo configurado, o endpoint responde `503`.
- Corpo: `{ source?, events: [{ externalId, customer, contract, invoices?, case }] }`.
- Resposta `202` com resumo: `{ received, customersUpserted, contractsUpserted, invoicesUpserted, casesUpserted, skipped }`.

## Testes

Testes padrao nao exigem MySQL real. A conexao Prisma e desabilitada via `PRISMA_AUTO_CONNECT=false` no setup de testes.

Para integracao com banco:

```bash
set RUN_DB_INTEGRATION=true
npm run test:db
```

## Proximos passos

1. Implementar autenticacao real (JWT / sessao)
2. Substituir mocks por repositorios Prisma nos modulos de negocio
3. Integrar frontend aos endpoints da API
4. Evoluir regras operacionais de cobranca e cancelamento
