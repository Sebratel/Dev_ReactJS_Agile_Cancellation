# Limpeza do teste de carga (equivalente a loadtest/cleanup.sh). So toca em recursos do projeto `ger-loadtest`.
#   powershell -File loadtest/cleanup.ps1             # padrao: limpa
#   $env:KEEP_DATA = '1'; powershell -File loadtest/cleanup.ps1   # opt-out explicito (depuracao)
# O disco do Docker (VHDX) nao encolhe sozinho: use loadtest/compact-docker-disk.ps1 (PowerShell elevado).
$ErrorActionPreference = 'Continue'
Set-Location (Join-Path $PSScriptRoot '..')
$Project = if ($env:COMPOSE_PROJECT_NAME) { $env:COMPOSE_PROJECT_NAME } else { 'ger-loadtest' }
if ($Project -notlike 'ger-loadtest*') { Write-Host "recusado: projeto '$Project' nao e do loadtest"; exit 1 }

if ($env:KEEP_DATA -eq '1') {
  Write-Host 'KEEP_DATA=1: limpeza pulada (containers, volumes e loadtest/out mantidos).'
  exit 0
}

function Get-VhdxPath {
  foreach ($p in @("$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx", "$env:LOCALAPPDATA\Docker\wsl\data\ext4.vhdx")) {
    if (Test-Path $p) { return $p }
  }
}
function Show-Report([string]$title) {
  Write-Host "=== $title ==="
  docker system df
  $v = Get-VhdxPath
  if ($v) { Write-Host ('VHDX: {0:N2} GiB ({1})' -f ((Get-Item $v).Length / 1GB), $v) } else { Write-Host 'VHDX: nao localizado' }
  $c = Get-PSDrive C
  Write-Host ('Livre no C: {0:N2} GiB' -f ($c.Free / 1GB))
}

Show-Report 'ANTES'

docker compose -p $Project --env-file loadtest/loadtest.env -f docker-compose.portainer.yml -f loadtest/docker-compose.loadtest.yml down -v --rmi local --remove-orphans

foreach ($c in (docker ps -aq --filter "label=com.docker.compose.project=$Project")) { docker rm -f $c | Out-Null }
foreach ($v in (docker volume ls -q --filter 'name=^ger-loadtest')) { docker volume rm -f $v | Out-Null; Write-Host "volume removido: $v" }
foreach ($n in (docker network ls -q --filter 'name=^ger-loadtest')) { docker network rm $n 2>$null | Out-Null }
foreach ($i in (docker images --format '{{.Repository}}:{{.Tag}}' | Where-Object { $_ -like 'ger-loadtest*' })) { docker rmi -f $i 2>$null | Out-Null; Write-Host "imagem removida: $i" }

# imagens baixadas so para o teste: removidas apenas se nao existiam antes (lista gravada por run.mjs)
$before = 'loadtest/out/images-before.txt'
if (Test-Path $before) {
  $known = Get-Content $before
  foreach ($i in @('postgres:16', 'node:22-alpine', 'mariadb:11', 'node:22-bookworm-slim', 'nginx:alpine')) {
    docker image inspect $i *> $null
    if ($LASTEXITCODE -eq 0 -and ($known -notcontains $i)) {
      if (-not (docker ps -aq --filter "ancestor=$i")) { docker rmi $i 2>$null | Out-Null; Write-Host "imagem de teste removida: $i" }
    }
  }
}

docker builder prune -f

Remove-Item -Recurse -Force 'loadtest/out' -ErrorAction SilentlyContinue
Write-Host 'loadtest/out removido.'

Show-Report 'DEPOIS'
