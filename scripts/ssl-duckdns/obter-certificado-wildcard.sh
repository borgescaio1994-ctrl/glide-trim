#!/bin/bash
# Certificado CURINGA real para *.SEUBASE.duckdns.org (BookNow)
#
# Requer: um único domínio DuckDNS (ex.: booknow) com subdomínios para cada barbearia.
# Ex.: barbearia1.booknow.duckdns.org, loja-joao.booknow.duckdns.org
#
# Uso:
#   export DUCKDNS_BASE="booknow"      # nome do domínio no DuckDNS (sem .duckdns.org)
#   export DUCKDNS_TOKEN="seu-token"
#   export CERTBOT_EMAIL="seu@email.com"
#   sudo -E ./obter-certificado-wildcard.sh

set -e

CERT_NAME="${CERT_NAME:-booknow-wildcard}"
BASE="${DUCKDNS_BASE:?Defina DUCKDNS_BASE (ex: booknow)}"
TOKEN="${DUCKDNS_TOKEN:?Defina DUCKDNS_TOKEN}"
EMAIL="${CERTBOT_EMAIL:-admin@booknow.app}"
DOMAIN="${BASE}.duckdns.org"

echo "[OK] Obtendo certificado curinga para *.${DOMAIN} e ${DOMAIN}"
echo "     Token e base serão usados via plugin dns-duckdns"
echo ""

# Credenciais para o plugin (arquivo seguro)
CRED_DIR="/etc/letsencrypt"
CRED_FILE="${CRED_DIR}/duckdns-${BASE}.ini"
mkdir -p "$CRED_DIR"
echo "dns_duckdns_token=${TOKEN}" > "$CRED_FILE"
chmod 600 "$CRED_FILE"

# Certbot com plugin dns-duckdns (DNS-01 challenge)
certbot certonly \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --preferred-challenges dns \
  --authenticator dns-duckdns \
  --dns-duckdns-credentials "$CRED_FILE" \
  --dns-duckdns-propagation-seconds 60 \
  --cert-name "$CERT_NAME" \
  -d "*.${DOMAIN}" \
  -d "${DOMAIN}"

echo ""
echo "[OK] Certificado obtido em /etc/letsencrypt/live/${CERT_NAME}/"
echo "     Domínios cobertos: *.${DOMAIN} e ${DOMAIN}"
echo ""
echo "     Recarregue o Nginx:"
echo "     sudo nginx -t && sudo systemctl reload nginx"
