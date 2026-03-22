# SSL/HTTPS DuckDNS (BookNow)

Documentação principal: **[docs/HTTPS-DUCKDNS-AUTOMATICO.md](../../docs/HTTPS-DUCKDNS-AUTOMATICO.md)**

## Modo atual: 1 domínio DuckDNS por barbearia

1. Crie o domínio no DuckDNS e aponte o IP do servidor.
2. Cadastre o mesmo valor em **`custom_domain`** no app.
3. No servidor, rode **`obter-certificado.sh`** (lê o Supabase e expande o certificado SAN) ou use **cron** diário.

## Opcional: certificado curinga (`*.base.duckdns.org`)

Use **`obter-certificado-wildcard.sh`** apenas se adotar subdomínios de um único domínio base.

## Apache + SSL (passo 4)

Exemplo com `SSLCertificateFile` / `SSLCertificateKeyFile`: **`apache-ssl-example.conf`**
