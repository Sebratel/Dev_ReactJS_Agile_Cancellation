# Notificação de mudanças — GER Cancelamento (CI/CD, Docker e correções do teste de carga)

Documento para repasse interno. Não foi enviado a ninguém. PR: Sebratel/Dev_ReactJS_Agile_Cancellation#1 (base `staging`).

## 1. O que muda para quem opera

| Área     | Mudança                                                                                                                                                                                                                | Ação necessária                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Compose  | `docker-compose.yml` virou `docker-compose.portainer.yml`; stack `dev_reactjs_agile_cancellation`; serviços `frontend`, `backend`, `mariadb`; sem `container_name`; healthchecks; `init: true`; logs json-file 10m x 3 | Apontar a stack do Portainer para o novo arquivo                                                                       |
| Recursos | `mem_limit`/`cpus`/heap por variável, com perfis em `deploy/profiles/{low,medium,high}.env`                                                                                                                            | Definir as variáveis no Environment do Portainer (perfil `medium` é o padrão)                                          |
| Frontend | Imagem `nginx-unprivileged`, escuta na porta **8080** (não 80)                                                                                                                                                         | Publicação continua `${WEB_PORT:-80}:8080`; ajustar proxy externo se apontava para 80 do container                     |
| Backend  | Roda como usuário `node`; `TZ` e `NODE_OPTIONS` definidos                                                                                                                                                              | Nenhuma                                                                                                                |
| CI       | GitHub Actions com `ci-ok` (validações do compose, front, back, imagem + smoke)                                                                                                                                        | Proteger `staging`/`main` exigindo `ci-ok` + 1 aprovação                                                               |
| Segredos | Só no Environment do Portainer                                                                                                                                                                                         | `JWT_SECRET` ≥ 32 caracteres, `N8N_WEBHOOK_SECRET` ≥ 16, `CORS_ORIGIN` fora de localhost (a API recusa subir sem isso) |

## 2. Correções de código (achadas no teste de carga)

1. **Conflito de escrita no MariaDB 11 (erro 1020).** O `innodb_snapshot_isolation` do MariaDB 11.x faz atualizações concorrentes falharem. Afetava o worker de HSM (`bulkContactJob.update`) e o sync do ERP (`collectionCase.update`). Adicionado retry com backoff (`retry-on-write-conflict.util.ts`) nos repositórios de webhooks e de lotes de contato.
2. **Rejeição não tratada no sync do ERP.** `runSync()` sem `.catch` derrubaria o processo no Node 22. Agora é capturada e registrada em log.
3. **Pool `pg` do ERP nunca era fechado.** `ErpSyncService` agora implementa `OnModuleDestroy` (`pool.end()`) e tem listener de `'error'` no pool.

Cobertura: backend e frontend com limite mínimo de 70% imposto em `jest.config.ts` e `vite.config.ts`; 676 testes do backend passando.

## 3. Resultado do teste de carga

- Simulação do ERP: Postgres artificial com **o mesmo tamanho do real** (26.955 MiB contra 26.909 MiB, diferença de 0,2%), distribuições de códigos/status copiadas do perfil agregado (sem dados pessoais nem credenciais) e proxy de latência que reproduz o tempo de conexão real.
- Carga: 12 usuários simultâneos, ~3.900 requisições, 0 erros HTTP.
- Memória do backend (perfil medium, limite 1 GiB), 3 ciclos iniciais: média 652 MiB, P99 694 MiB (67,8% do limite), pico 733 MiB. O heap do V8 ficou estável (46–65 MiB); o crescimento inicial de RSS é memória nativa e estabiliza após o primeiro ciclo.
- CPU: P99 próximo de 100% de 1 CPU; é o gargalo real do perfil medium.
- Último ciclo, com as correções: 0 linhas de ERROR no backend, mutações do ERP aplicadas (9 ok).

## 4. Pontos em aberto (não afirmar como resolvidos)

- No último ciclo o sync do ERP durou 0,17 s (antes ~56 s) e a memória caiu para ~250 MiB. Pode ser ganho real ou o sync processando pouco; **não foi confirmado**. Repetir o teste antes de reduzir o perfil.
- O log do MariaDB ainda registrou 87 ocorrências de 1020 contra 4 retries; a diferença não foi explicada.
- Só 1 ciclo válido na versão final (o ciclo de 22:37 foi invalidado por suspensão do computador).
- Imagem `mariadb:11` flutuante: fixar a versão menor (ex.: 11.4) e documentar o impacto de `innodb_snapshot_isolation`.
- `prisma migrate deploy` roda no start do container e segue mesmo se falhar; decidir se a falha deve bloquear o deploy.
- Backend sem Elastic APM e sem logs JSON estruturados.
- Cobertura de `erp-sync.service.ts` baixa (~15%); margem de branches ~1 ponto.

## 5. Como repetir o teste

Instruções em `loadtest/README.md`. O teste só ocupa disco durante o uso: `bash loadtest/cleanup.sh` apaga containers, volumes, imagens, cache e `loadtest/out`. Para devolver o espaço ao Windows, rodar `loadtest/compact-docker-disk.ps1` em PowerShell como administrador (para todos os containers do Docker durante a compactação).

## 6. Regra nova: medir memória antes de definir o perfil

Todo app é medido antes de escolher o perfil: média, P90, P99 e pico (`scripts/measure-memory.mjs`). Aceite: P99 ≤ 80% do `mem_limit`, pico < 95%, sem crescimento sustentado entre ciclos idênticos. Detalhes em `docs/dimensionamento.md`.

## 7. Rollback

Reverter o PR e reimplantar a imagem anterior pelo Portainer. As mudanças de código não alteram o schema do banco.
