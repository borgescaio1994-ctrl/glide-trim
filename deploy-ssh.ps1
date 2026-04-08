# Deploy automático: build + envio para Hostinger VPS
# Uso: npm run deploy   ou   powershell -ExecutionPolicy Bypass -File ./deploy-ssh.ps1
#
# Se domínios/subdomínios ainda mostrarem versão antiga:
# 1) Confirme que o DNS (A/AAAA) de TODOS os hosts aponta para ESTE servidor (ex.: 72.60.159.183).
# 2) Cloudflare (laranja): Painel → Caching → Purge Everything (ou regra: Bypass cache para /*).
# 3) Teste: https://SEU-DOMINIO/deploy.json — deve mostrar deployedAt/commit recentes.

$ErrorActionPreference = "Stop"
$HostName = "72.60.159.183"
$User = "root"
$RemotePath = "/var/www/html"
# Chave do projeto (Hostinger); se não existir, usa a do usuário
$SshKeyProject = Join-Path $PSScriptRoot ".cursor-deploy\hostinger_ed25519"
$SshKey = if (Test-Path $SshKeyProject) { $SshKeyProject } else { "$env:USERPROFILE\.ssh\id_ed25519" }
Write-Host "Chave SSH: $SshKey" -ForegroundColor Gray

# Evita travar pedindo senha/passphrase/interação
$SshCommonArgs = @(
  "-o", "StrictHostKeyChecking=no",
  "-o", "BatchMode=yes",
  "-o", "ConnectTimeout=15",
  "-o", "ServerAliveInterval=10",
  "-o", "ServerAliveCountMax=1"
)

Write-Host "=== Build ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$DistPath = Join-Path $PSScriptRoot "dist"
if (-not (Test-Path $DistPath)) {
    Write-Host "Pasta dist/ nao encontrada." -ForegroundColor Red
    exit 1
}

$commit = "unknown"
try {
    Push-Location $PSScriptRoot
    $commit = (git rev-parse --short HEAD 2>$null).Trim()
    if (-not $commit) { $commit = "unknown" }
} finally {
    Pop-Location
}
$deployJson = @{
    app        = "BookNow"
    deployedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    commit     = $commit
} | ConvertTo-Json -Compress
$deployPath = Join-Path $DistPath "deploy.json"
Set-Content -Path $deployPath -Value $deployJson -Encoding utf8
Write-Host "Gerado deploy.json (commit $commit)" -ForegroundColor Gray

Write-Host "`n=== Enviando para $User@${HostName}:$RemotePath ===" -ForegroundColor Cyan
$TempDir = "/tmp/booknow-deploy-" + (Get-Date -Format "yyyyMMddHHmmss")
# Criar pasta temporária no servidor
& ssh -i $SshKey @SshCommonArgs "${User}@${HostName}" "mkdir -p $TempDir"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$ScpArgs = @("-i", $SshKey) + $SshCommonArgs + @("-r", "$DistPath\.", "${User}@${HostName}:${TempDir}/")
& scp @ScpArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== Ajustando arquivos no servidor ===" -ForegroundColor Cyan
$Commands = @(
    "find $RemotePath -mindepth 1 -maxdepth 1 -exec rm -rf {} +",
    "cp -r $TempDir/. $RemotePath/",
    "rm -rf $TempDir",
    "chown -R www-data:www-data $RemotePath 2>/dev/null || true",
    "touch $RemotePath/index.html $RemotePath/deploy.json 2>/dev/null || true",
    "(nginx -t && (systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || nginx -s reload 2>/dev/null)) || true"
)
$CmdLine = $Commands -join " && "
& ssh -i $SshKey @SshCommonArgs "${User}@${HostName}" $CmdLine
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nDeploy concluido: http://${HostName}/" -ForegroundColor Green
