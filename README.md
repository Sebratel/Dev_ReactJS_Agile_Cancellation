# GER - Gestao de Cobranca e Cancelamento

Frontend base da plataforma corporativa GER para suporte ao time financeiro no acompanhamento de inadimplencia, cobranca e futuro fluxo de cancelamento controlado.

## Escopo atual

Esta etapa entrega a fundacao tecnica e visual do frontend com autenticacao mockada, code splitting e dashboard operacional mockado:

- React + TypeScript + Vite
- layout principal com sidebar responsiva e topbar
- autenticacao mockada com login, logout e sessao local
- perfis de acesso e filtragem de menu por permissao
- rotas publicas, protegidas e guardas por papel
- code splitting com lazy loading nas rotas principais
- fallback consistente para rotas lazy
- design system corporativo com tokens centralizados
- dashboard operacional mockado com KPIs, alertas, distribuicao e tendencia
- componentes reutilizaveis
- testes de fundacao e scripts de qualidade

Nao ha backend real, banco MySQL, Prisma, credenciais reais, API integrada, n8n ou regras operacionais completas nesta etapa.

## Stack

- React
- TypeScript estrito
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- Radix UI com padrao shadcn/ui
- Lucide React
- React Hook Form
- Zod
- Recharts
- Vitest
- React Testing Library
- ESLint
- Prettier

## Requisitos

- Node.js 22+
- npm 11+

## Instalacao

```bash
npm install
```

## Execucao

```bash
npm run dev
```

## Scripts

- `npm run dev`: sobe o ambiente local
- `npm run build`: valida TypeScript incremental e gera build de producao
- `npm run preview`: publica a build localmente
- `npm run typecheck`: roda checagem estrita de tipos
- `npm run lint`: executa ESLint sem warnings
- `npm run lint:fix`: corrige problemas simples de lint
- `npm run test`: executa Vitest em watch
- `npm run test:run`: executa Vitest com coverage
- `npm run format`: aplica Prettier
- `npm run format:check`: valida formatacao
- `npm run security:scan`: procura violacoes basicas de seguranca e padrao

## Estrutura de pastas

```text
src/
├── app/
├── components/
├── design-system/
├── features/
├── lib/
├── test/
├── types/
└── utils/
```

## Design System

- fonte oficial unica: DM Sans
- background oficial: token `background`
- cards: token `card`
- acao principal: token `primary`
- sucesso real: token `success`
- estados criticos: token `danger`
- estados informativos ou sem dado: token `neutral`
- sem cores extras, gradientes, glow, glassmorphism ou dark mode nesta etapa
- sem HEX hardcoded dentro de componentes

## Ambiente

- o `.env` real fica na raiz do projeto e centraliza frontend, backend, Docker/Portainer, ERP e N8N
- existe apenas um `.env.example` versionado, tambem na raiz
- nao devem ser commitadas credenciais reais
- alteracoes no `.env` exigem reiniciar o servico afetado

## Autenticacao mockada

- login em `/login`
- logout pela topbar
- sessao persistida em `localStorage`
- usuarios mockados para os perfis:
  - `ADMIN`
  - `SUPERVISOR`
  - `COLLECTION_AGENT`
  - `CANCELLATION_AGENT`
  - `VIEWER`
- senha padrao dos usuarios mockados: `123456`

## Rotas protegidas

- `PublicRoute`: impede acesso ao login quando ja existe sessao autenticada
- `ProtectedRoute`: exige sessao autenticada para o shell principal
- `RoleGuard`: valida autorizacao por perfil antes de renderizar modulos restritos

## Dashboard mockado

- KPIs principais de cobranca, recuperacao e cancelamento
- resumo operacional com leitura executiva
- distribuicao por status
- tendencia de recuperacao nos ultimos 7 dias
- alertas operacionais
- tabela de casos criticos
- os dados continuam sendo mocks locais, sem API real nesta etapa

## Performance

- rotas principais carregadas com `React.lazy`
- dashboard e modulos secundarios fora do bundle inicial
- graficos carregados em chunks dedicados da feature dashboard

## Avisos desta etapa

- o backend real sera implementado depois
- o cliente HTTP em `src/services/api` e apenas a estrutura futura de integracao
- nao existe conexao com MySQL, Prisma ou credenciais nesta etapa

## Proximos passos sugeridos

1. Conectar os dados do dashboard a endpoints reais do backend NestJS.
2. Substituir a autenticacao mockada por sessao/token reais.
3. Implementar filtros, busca e acao operacional nos modulos de cobranca.
4. Evoluir auditoria, historico e automacoes controladas.

## CI/CD e deploy

Fluxo (padrao Sebratel, modelo A: o Portainer builda do Git, sem registry):

```
feature/* --PR--> staging --> GitHub Actions (ci-ok) --> stack de staging no Portainer
                  main    --> GitHub Actions (ci-ok) --> stack de producao no Portainer
```

- **CI** (`.github/workflows/ci.yml`): `validacoes` (nomes do compose), `frontend` e `backend` (typecheck, lint, format, security scan, testes com **cobertura minima de 70%**, build), `imagem` (build das imagens e `up --wait` da stack com smoke de `/health` e do proxy `/api`) e o agregador **`ci-ok`**, unico check obrigatorio na protecao de branch (1 aprovacao, sem push direto, sem force push).
- **Stack no Portainer**: nome `dev_reactjs_agile_cancellation` (repositorio em minusculas), arquivo `docker-compose.portainer.yml`, referencia `refs/heads/staging` (staging) ou `refs/heads/main` (producao). Webhook com *Re-pull image* e *Force redeployment*.
- **Servicos**: `frontend` (nginx), `backend` (NestJS, health em `/health`), `mariadb`. Sem `container_name`.
- **Segredos**: so no painel *Environment* da stack (veja `.env.example`). Staging usa banco, N8N e Google proprios de staging; nunca os de producao.
- **Recursos**: perfis low/medium/high em `deploy/profiles/*.env` (veja `docs/dimensionamento.md`). Padrao: medium.
- **Migrations**: rodam no start do container do backend (`prisma migrate deploy`). Escreva migrations compativeis com a versao anterior do codigo para permitir rollback sem rollback de banco.
- **Rollback**: `git revert` do commit via PR e *Pull and redeploy*; em emergencia, aponte a stack para o commit/tag anterior.
- **Observabilidade**: o backend ainda nao tem agente Elastic APM nem log JSON estruturado; pendencia registrada (skill `observabilidade-backend`).
