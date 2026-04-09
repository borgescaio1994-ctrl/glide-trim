# Copia a landing estática (synapses-ia.com.br) para public/synapse-landing
# Origem: mesma pasta PROJETOS que contém BOOKNOW → "landing-page - synapse.ia"
$ErrorActionPreference = "Stop"
$BooknowRoot = Split-Path $PSScriptRoot -Parent
$Projetos = Split-Path $BooknowRoot -Parent
$Src = Join-Path $Projetos "landing-page - synapse.ia"
$Dst = Join-Path $BooknowRoot "public\synapse-landing"

if (-not (Test-Path (Join-Path $Src "index.html"))) {
    Write-Host "Origem nao encontrada: $Src" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $Dst | Out-Null
Copy-Item -Force (Join-Path $Src "index.html") -Destination $Dst
$assetsSrc = Join-Path $Src "assets"
if (Test-Path $assetsSrc) {
    $assetsDst = Join-Path $Dst "assets"
    New-Item -ItemType Directory -Force -Path $assetsDst | Out-Null
    Copy-Item -Recurse -Force "$assetsSrc\*" -Destination $assetsDst
}
Write-Host "Landing copiada para: $Dst" -ForegroundColor Green
