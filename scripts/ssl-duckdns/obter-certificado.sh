#!/bin/bash
# HTTPS automático para domínios DuckDNS (BookNow)
# Busca domínios do Supabase ou de dominios.txt e obtém/expande certificado Let's Encrypt.
#
# Uso:
#   SUPABASE_URL=... SUPABASE_ANON_KEY=... sudo ./obter-certificado.sh
#   OU: preencha dominios.txt e rode sudo ./obter-certificado.sh

set -e

CERT_NAME="booknow-duckdns"
WEBROOT="/var/www/html"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMINIOS_FILE="${SCRIPT_DIR}/dominios.txt"

# --- Coletar domínios ---
DOMINIOS=()

if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
  echo "[OK] Buscando domínios do Supabase..."
  RESP=$(curl -s -w "\n%{http_code}" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Accept: application/json" \
    "${SUPABASE_URL}/rest/v1/establishments?select=custom_domain&status=eq.true&custom_domain=not.is.null" 2>/dev/null || true)
  HTTP_CODE=$(echo "$RESP" | tail -n1)
  BODY=$(echo "$RESP" | sed '$d')
  if [ "$HTTP_CODE" = "200" ] && [ -n "$BODY" ]; then
    # Extrai custom_domain de cada objeto; filtra só duckdns.org (usa Python se disponível)
    if command -v python3 &>/dev/null; then
      while IFS= read -r dom; do
        [ -n "$dom" ] && DOMINIOS+=("$dom")
      done < <(echo "$BODY" | python3 -c "
import json,sys
try:
  for r in json.load(sys.stdin):
    d=r.get('custom_domain')
    if d and str(d).strip().lower().endswith('duckdns.org'):
      print(str(d).strip().lower())
except: pass
" 2>/dev/null)
    else
      while IFS= read -r dom; do
        dom=$(echo "$dom" | tr -d '"' | tr -d ' ')
        if [ -n "$dom" ] && echo "$dom" | grep -q 'duckdns\.org$'; then
          DOMINIOS+=("$dom")
        fi
      done < <(echo "$BODY" | grep -oE '"custom_domain"[^}]*' | sed 's/.*"custom_domain"[^"]*"\([^"]*\)".*/\1/')
    fi
  else
    echo "[AVISO] Falha ao buscar Supabase (HTTP $HTTP_CODE). Usando dominios.txt se existir."
  fi
fi

if [ ${#DOMINIOS[@]} -eq 0 ] && [ -f "$DOMINIOS_FILE" ]; then
  echo "[OK] Lendo domínios de $DOMINIOS_FILE"
  while IFS= read -r line; do
    line=$(echo "$line" | sed 's/#.*//' | tr -d ' \r\n')
    if [ -n "$line" ] && echo "$line" | grep -q 'duckdns\.org$'; then
      DOMINIOS+=("$line")
    fi
  done < "$DOMINIOS_FILE"
fi

if [ ${#DOMINIOS[@]} -eq 0 ]; then
  echo "[ERRO] Nenhum domínio encontrado. Defina SUPABASE_URL e SUPABASE_ANON_KEY ou crie dominios.txt"
  exit 1
fi

echo "[OK] Domínios: ${DOMINIOS[*]}"

# --- Certbot ---
CERTBOT_OPTS=(
  certonly
  --webroot
  -w "$WEBROOT"
  --non-interactive
  --agree-tos
  --email "${CERTBOT_EMAIL:-admin@booknow.app}"
  --cert-name "$CERT_NAME"
)

# Se o certificado já existe, usar --expand para adicionar novos domínios
if [ -d "/etc/letsencrypt/live/${CERT_NAME}" ]; then
  CERTBOT_OPTS+=(--expand)
fi

for d in "${DOMINIOS[@]}"; do
  CERTBOT_OPTS+=(-d "$d")
done

echo "[OK] Executando Certbot..."
certbot "${CERTBOT_OPTS[@]}"

echo ""
echo "[OK] Certificado obtido/atualizado em /etc/letsencrypt/live/${CERT_NAME}/"
echo "     Recarregue o Nginx: sudo nginx -t && sudo systemctl reload nginx"
