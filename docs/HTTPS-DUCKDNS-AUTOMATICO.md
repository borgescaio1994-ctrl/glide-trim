# HTTPS com DuckDNS (BookNow)

**Fluxo adotado:** **1 domínio DuckDNS por barbearia** (ex.: `barbearia-stoffels.duckdns.org`, `outra-loja.duckdns.org`). Cada domínio aponta para o **mesmo IP** do VPS. O Certbot inclui todos no **mesmo certificado (SAN)** ou você pode emitir **um certificado por domínio** — veja abaixo.

---

## Passo a passo (por barbearia)

1. **DuckDNS:** crie o domínio (ex.: `minhaloja` → `minhaloja.duckdns.org`) e defina o **registro A** = IP do servidor.
2. **Super Admin:** cadastre a unidade com **`custom_domain`** = exatamente esse domínio (`minhaloja.duckdns.org`), sem `https://`.
3. **Servidor:** rode o script **`obter-certificado.sh`** (ele lê os domínios no Supabase e **expande** o certificado) **ou** configure **cron diário** para rodar o script automaticamente.
4. **Nginx:** use o certificado gerado (um arquivo SAN com vários nomes) nos caminhos em `/etc/letsencrypt/live/...`.

---

## Script recomendado: um certificado com vários domínios (SAN)

Arquivo: **`scripts/ssl-duckdns/obter-certificado.sh`**

- Busca no Supabase todos os `custom_domain` ativos que terminam em `duckdns.org`.
- Gera **um** certificado Let's Encrypt listando **todos** esses domínios (até o limite da CA).
- Quando entra **domínio novo**, rode o script de novo para **incluir** o novo nome (`--expand`).

Variáveis no servidor:

```bash
export SUPABASE_URL="https://SEU_PROJECT.supabase.co"
export SUPABASE_ANON_KEY="sua-chave-anonima"
export CERTBOT_EMAIL="seu@email.com"
sudo -E ./obter-certificado.sh
sudo nginx -t && sudo systemctl reload nginx
```

Alternativa sem Supabase: lista em **`scripts/ssl-duckdns/dominios.txt`** (um domínio por linha).

**Webroot:** o script usa HTTP-01 em `/var/www/html` — o Nginx precisa servir `/.well-known/acme-challenge/` nesse `root` (veja `nginx-acme.conf`).

---

## Um certificado por domínio (se preferir)

Para **cada** domínio, em separado:

```bash
sudo certbot certonly --webroot -w /var/www/html \
  --email seu@email.com --agree-tos --non-interactive \
  -d minhaloja.duckdns.org
```

Repita para cada loja (outro `-d` por execução). No Nginx, use **SNI**: um `server { server_name minhaloja.duckdns.org; ssl_certificate ... }` por domínio ou um mapa — fica mais trabalhoso que **um SAN único**.

---

## Modo opcional — Subdomínios + curinga

Se no futuro quiser **um** domínio base e `loja.base.duckdns.org` com **um** certificado curinga, use **`obter-certificado-wildcard.sh`** e `docs` antigos sobre `*.base.duckdns.org`.

---

## Resumo

| O que você faz | Onde |
|------------------|------|
| Criar domínio + IP | DuckDNS |
| `custom_domain` igual ao domínio | Super Admin / Supabase |
| Atualizar HTTPS | Servidor: `obter-certificado.sh` (+ Nginx) |

## Apache (passo 4 — ligar o certificado ao servidor)

1. Veja o nome do certificado: `sudo ls /etc/letsencrypt/live/`
2. Copie o exemplo **`scripts/ssl-duckdns/apache-ssl-example.conf`** para o VPS (ex.: `/etc/apache2/sites-available/booknow-ssl.conf`).
3. Edite **`SSLCertificateFile`** / **`SSLCertificateKeyFile`** para o caminho certo (ex.: `booknow-wildcard` ou `booknow-duckdns`).
4. Ajuste **`ServerName`** / **`ServerAlias`** aos seus domínios.
5. Ative módulos e site:

```bash
sudo a2enmod ssl rewrite
sudo a2ensite booknow-ssl
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## Arquivos

- `scripts/ssl-duckdns/obter-certificado.sh` — SAN a partir do Supabase ou `dominios.txt`
- `scripts/ssl-duckdns/obter-certificado-wildcard.sh` — curinga (opcional)
- `scripts/ssl-duckdns/nginx-acme.conf` / `nginx-exemplo.conf` — Nginx
- `scripts/ssl-duckdns/apache-ssl-example.conf` — **Apache + SSL (exemplo)**
