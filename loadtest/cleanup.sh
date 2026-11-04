#!/usr/bin/env bash
# Limpeza do teste de carga: remove TUDO o que o teste criou (containers, volumes, redes, imagens do
# projeto e loadtest/out). So toca em recursos do projeto `ger-loadtest`; nunca em outros projetos.
#   bash loadtest/cleanup.sh            # padrao: limpa
#   KEEP_DATA=1 bash loadtest/cleanup.sh   # opt-out explicito (so para depuracao): nao apaga nada
# Nota: o disco do Docker (VHDX) NAO encolhe sozinho; para devolver o espaco ao Windows rode
# loadtest/compact-docker-disk.ps1 (PowerShell elevado).
set -u
export MSYS2_ARG_CONV_EXCL='*'
cd "$(dirname "$0")/.."
PROJECT="${COMPOSE_PROJECT_NAME:-ger-loadtest}"
case "$PROJECT" in ger-loadtest*) ;; *) echo "recusado: projeto '$PROJECT' nao e do loadtest"; exit 1 ;; esac

if [ "${KEEP_DATA:-0}" = "1" ]; then
  echo "KEEP_DATA=1: limpeza pulada (containers, volumes e loadtest/out mantidos)."
  exit 0
fi

vhdx_path() {
  local base="${LOCALAPPDATA:-}"
  [ -n "$base" ] && command -v cygpath >/dev/null 2>&1 && base="$(cygpath -u "$base")"
  for p in "$base/Docker/wsl/disk/docker_data.vhdx" "$base/Docker/wsl/data/ext4.vhdx"; do
    [ -f "$p" ] && { echo "$p"; return; }
  done
}
report() {
  echo "=== $1 ==="
  docker system df 2>/dev/null
  local v; v="$(vhdx_path)"
  [ -n "$v" ] && echo "VHDX: $(du -h "$v" 2>/dev/null | cut -f1) ($v)" || echo "VHDX: nao localizado"
  echo "Livre no C: $(df -h /c 2>/dev/null | awk 'NR==2{print $4}')"
}

report "ANTES"

COMPOSE=(docker compose -p "$PROJECT" --env-file loadtest/loadtest.env -f docker-compose.portainer.yml -f loadtest/docker-compose.loadtest.yml)
"${COMPOSE[@]}" down -v --rmi local --remove-orphans 2>&1 | tail -5

# sobras do projeto (por label/nome), caso o compose tenha falhado no meio
for c in $(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT"); do docker rm -f "$c" >/dev/null; done
for v in $(docker volume ls -q --filter "name=^ger-loadtest"); do docker volume rm -f "$v" >/dev/null 2>&1 && echo "volume removido: $v"; done
for n in $(docker network ls -q --filter "name=^ger-loadtest"); do docker network rm "$n" >/dev/null 2>&1; done
for i in $(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^ger-loadtest'); do docker rmi -f "$i" >/dev/null 2>&1 && echo "imagem removida: $i"; done

# imagens baixadas SO para o teste (postgres, node-alpine, mariadb...): removidas apenas se nao existiam
# antes da execucao (lista gravada por run.mjs) e se nenhum container usa a imagem.
if [ -f loadtest/out/images-before.txt ]; then
  for i in postgres:16 node:22-alpine mariadb:11 node:22-bookworm-slim nginx:alpine; do
    if docker image inspect "$i" >/dev/null 2>&1 && ! grep -qx "$i" loadtest/out/images-before.txt; then
      if [ -z "$(docker ps -aq --filter "ancestor=$i")" ]; then docker rmi "$i" >/dev/null 2>&1 && echo "imagem de teste removida: $i"; fi
    fi
  done
fi

docker builder prune -f 2>&1 | tail -2

rm -rf loadtest/out
echo "loadtest/out removido."

report "DEPOIS"
