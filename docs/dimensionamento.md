# Dimensionamento de recursos (low / medium / high)

Estimativas de projeto (nao medidas em producao): Node/NestJS + Prisma idle ~150-250 MB e pico em lote 2-3x; MariaDB com buffer pool dimensionado; nginx estatico ~10-30 MB. O heap do V8 (`--max-old-space-size`) fica em ~75% do `mem_limit` para o container nao morrer por OOM antes do GC agir.

| Perfil | Uso esperado | Backend | MariaDB | Frontend | Total |
|---|---|---|---|---|---|
| low | ate ~20 usuarios, sync leve | 512m / 0.5 CPU / heap 384 | 512m / 0.5 CPU / pool 256M | 64m / 0.25 CPU | ~1.1 GB / 1.25 CPU |
| medium (padrao) | ~50 usuarios, lotes e HSM | 1g / 1 CPU / heap 768 | 1g / 1 CPU / pool 512M | 128m / 0.5 CPU | ~2.1 GB / 2.5 CPU |
| high | 100+ usuarios, lotes grandes | 2g / 2 CPU / heap 1536 | 2g / 2 CPU / pool 1G | 256m / 1 CPU | ~4.3 GB / 5 CPU |

## Como aplicar

Cole o conteudo de `deploy/profiles/<perfil>.env` no painel **Environment** da stack no Portainer e faca *Pull and redeploy*. Sem nada definido, vale o `medium`. O `Dockerfile` do backend ja traz `NODE_OPTIONS` do `medium` como padrao; o compose o sobrescreve por `BACKEND_HEAP_MB`.

## Validar e ajustar

Rode `docker stats` com carga real (importacao de lote) e promova de perfil se a memoria do backend passar de ~80% do limite ou a CPU ficar saturada; a estimativa deve ser trocada pelo valor medido.
