#!/usr/bin/env bash
# Comando unico: run -> medir -> cleanup (a limpeza roda sempre, inclusive em falha ou Ctrl-C).
#   bash loadtest/run.sh                      # ERP_SCALE=1 (tamanho real), 3 ciclos, 12 usuarios
#   ERP_SCALE=0.01 bash loadtest/run.sh --cycles 1 --duration 60 --warmup 20 --idle 20   # fumaca
#   KEEP_DATA=1 bash loadtest/run.sh          # so para depuracao: nao limpa ao final
cd "$(dirname "$0")/.."
trap 'bash loadtest/cleanup.sh' EXIT
trap 'exit 130' INT TERM
node loadtest/run.mjs --no-cleanup "$@"
