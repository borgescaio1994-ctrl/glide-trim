# Deploy automático: build + envio para Hostinger VPS
# Uso: npm run deploy   ou   powershell -ExecutionPolicy Bypass -File ./deploy-ssh.ps1

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

Write-Host "`n=== Enviando para $User@${HostName}:$RemotePath ===" -ForegroundColor Cyan
$TempDir = "/tmp/glide-trim-deploy-" + (Get-Date -Format "yyyyMMddHHmmss")
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
    "chown -R www-data:www-data $RemotePath 2>/dev/null || true"
)
$CmdLine = $Commands -join " && "
& ssh -i $SshKey @SshCommonArgs "${User}@${HostName}" $CmdLine
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nDeploy concluido: http://${HostName}/" -ForegroundColor Green
