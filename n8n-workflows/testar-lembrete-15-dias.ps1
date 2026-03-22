# Teste manual: envia a MESMA mensagem do workflow "Lembrete 15 dias" pela Evolution API.
#
# Uso:
#   .\testar-lembrete-15-dias.ps1
#   .\testar-lembrete-15-dias.ps1 -ListarApenas   # só chama a Edge (quem entraria na lista hoje), não envia WhatsApp
#
param(
  [switch]$ListarApenas
)

$ErrorActionPreference = "Stop"

# --- configure aqui ---
$telefoneComDDD = "11915605439"   # destino (so numeros; vira 5511915605439)
$nomeExibicao    = "Teste BookNow"
$evolutionBase  = "http://72.60.159.183:8080"
$instancia      = "ozeias-stoffel"   # nome da instancia Evolution (WhatsApp / "perfil" que envia)
$apikeyEvolution = "caio123"     # mesma do n8n / Evolution

$supabaseUrlEdge = "https://rubvkpxvgffmnloaxbqa.supabase.co/functions/v1/get-15day-reminder-list"
# --- fim configure ---

function Normalize-Phone55([string]$raw) {
  $d = ($raw -replace '\D', '')
  if ($d.Length -lt 10) { throw "Telefone invalido: $raw" }
  if (-not $d.StartsWith("55")) { $d = "55$d" }
  return $d
}

$number = Normalize-Phone55 $telefoneComDDD

# Mesmo texto do n8n; so ASCII aqui para o .ps1 rodar em qualquer encoding (WhatsApp aceita igual)
$cal = [char]::ConvertFromUtf32(0x1F4C5)
$texto = "$cal *BookNow*`n`nOla, $nomeExibicao!`n`nJa faz um tempinho desde seu ultimo atendimento. Que tal agendar um novo horario?`n`nAbra o app e reserve seu horario. Ate la!"

if ($ListarApenas) {
  Write-Host "GET $supabaseUrlEdge" -ForegroundColor Cyan
  try {
    $r = Invoke-RestMethod -Uri $supabaseUrlEdge -Method GET -ContentType "application/json"
    $r | ConvertTo-Json -Depth 6
    Write-Host "`nSe clients estiver vazio, ninguem entrou na janela 14-16 dias; use o envio direto abaixo para testar a mensagem." -ForegroundColor Yellow
  } catch {
    Write-Host $_ -ForegroundColor Red
  }
  exit 0
}

$base = $evolutionBase.TrimEnd('/')
$url = "$base/message/sendText/$instancia"

$bodyObj = @{
  number   = $number
  options  = @{
    delay     = 1200
    presence  = "composing"
  }
  textMessage = @{
    text = $texto
  }
}

$json = $bodyObj | ConvertTo-Json -Depth 5 -Compress

Write-Host "POST $url" -ForegroundColor Cyan
Write-Host "number=$number" -ForegroundColor Gray

try {
  $resp = Invoke-RestMethod -Uri $url -Method POST -Headers @{ apikey = $apikeyEvolution } -Body $json -ContentType "application/json; charset=utf-8"
  $resp | ConvertTo-Json -Depth 6
  Write-Host "`nOK - verifique o WhatsApp no numero $number" -ForegroundColor Green
} catch {
  Write-Host "Erro:" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    Write-Host $reader.ReadToEnd()
  } else {
    Write-Host $_
  }
  exit 1
}
