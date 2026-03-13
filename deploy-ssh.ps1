# Deploy automático: build + envio para Hostinger VPS
# Uso: npm run deploy   ou   powershell -ExecutionPolicy Bypass -File ./deploy-ssh.ps1

$ErrorActionPreference = "Stop"
$HostName = "72.60.159.183"
$User = "root"
$RemotePath = "/var/www/html"
$SshKey = "$env:USERPROFILE\.ssh\id_ed25519"

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
& ssh -i $SshKey -o StrictHostKeyChecking=no "${User}@${HostName}" "mkdir -p $TempDir"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$ScpArgs = @("-i", $SshKey, "-o", "StrictHostKeyChecking=no", "-r", "$DistPath\*", "${User}@${HostName}:${TempDir}/")
& scp @ScpArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== Ajustando arquivos no servidor ===" -ForegroundColor Cyan
$Commands = @(
    "rm -rf $RemotePath/*",
    "cp -r $TempDir/* $RemotePath/",
    "rm -rf $TempDir",
    "chown -R www-data:www-data $RemotePath 2>/dev/null || true"
)
$CmdLine = $Commands -join " && "
& ssh -i $SshKey -o StrictHostKeyChecking=no "${User}@${HostName}" $CmdLine
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nDeploy concluido: http://${HostName}/" -ForegroundColor Green
