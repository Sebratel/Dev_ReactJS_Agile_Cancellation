# Compacta o disco virtual do Docker Desktop (docker_data.vhdx) para devolver ao Windows o espaco
# liberado pelo cleanup. NAO e executado automaticamente: precisa de PowerShell ELEVADO (Administrador).
#   powershell -File loadtest/compact-docker-disk.ps1          # pede confirmacao
#   powershell -File loadtest/compact-docker-disk.ps1 -Force   # sem confirmacao
# ATENCAO: o script PARA o Docker Desktop e TODOS os containers em execucao (inclusive de outros projetos).
param([switch]$Force)
$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host 'Este script precisa de um PowerShell ELEVADO (Executar como administrador).' -ForegroundColor Red
  exit 1
}

$vhdx = @("$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx", "$env:LOCALAPPDATA\Docker\wsl\data\ext4.vhdx") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $vhdx) { Write-Host 'docker_data.vhdx nao encontrado.' -ForegroundColor Red; exit 1 }

$before = (Get-Item $vhdx).Length
Write-Host ('VHDX: {0}  ({1:N2} GiB)' -f $vhdx, ($before / 1GB))
Write-Host 'ATENCAO: sera executado "wsl --shutdown": o Docker Desktop e TODOS os containers (de qualquer projeto) serao parados.' -ForegroundColor Yellow
if (-not $Force) {
  $ans = Read-Host 'Digite SIM para continuar'
  if ($ans -ne 'SIM') { Write-Host 'Cancelado.'; exit 0 }
}

Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue | Stop-Process -Force
wsl --shutdown
Start-Sleep -Seconds 8

if (Get-Command Optimize-VHD -ErrorAction SilentlyContinue) {
  Optimize-VHD -Path $vhdx -Mode Full
} else {
  Write-Host 'Hyper-V indisponivel: usando diskpart (compact vdisk).'
  $script = Join-Path $env:TEMP 'ger-loadtest-compact.txt'
  "select vdisk file=`"$vhdx`"`nattach vdisk readonly`ncompact vdisk`ndetach vdisk`nexit" | Set-Content -Encoding ASCII $script
  diskpart /s $script
  Remove-Item $script -ErrorAction SilentlyContinue
}

$after = (Get-Item $vhdx).Length
Write-Host ('Espaco recuperado: {0:N2} GiB (VHDX agora {1:N2} GiB)' -f (($before - $after) / 1GB), ($after / 1GB)) -ForegroundColor Green

$dd = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dd) { Write-Host 'Religando o Docker Desktop...'; Start-Process $dd }
