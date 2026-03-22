# Importar workflow de verificação (BookNow)

## 1. URL da Evolution (importante)

| Errado (painel) | Certo (enviar mensagem) |
|------------------|-------------------------|
| `.../manager/caio_zap` | `http://SEU_IP:8080/message/sendText/caio_zap` |

O workflow **Montar mensagem** monta sozinho:  
`base` + `/message/sendText/` + instância (vinda do Supabase).

**Base só o host + porta:** `http://72.60.159.183:8080` (sem `/manager/...`).

---

## 2. Base da API e chave (evitar erro `access to env vars denied`)

No **n8n 2.x**, o nó **Code** pode bloquear **`$env`** (sandbox / `N8N_BLOCK_ENV_ACCESS_IN_NODE`). Isso gera:

`Error: access to env vars denied` e stack em `workflow-data-proxy-env-provider`.

**O JSON importado já evita `$env` no Code:** a base está em `EVOLUTION_BASE_DEFAULT` dentro do nó **Montar mensagem**. Se mudar o IP/porta da Evolution, edite essa constante no Code.

**Header `apikey`:** o JSON vem com **`COLE_AQUI_A_CHAVE_GLOBAL_DA_EVOLUTION`** (texto fixo). Após importar, abra o nó **Enviar WhatsApp (Evolution)** e substitua por **a chave global da Evolution** (a mesma do `.env` da API, ex. `AUTHENTICATION_API_KEY`).

**Não use `={{ $env.... }}` nesse header** se o servidor tiver `N8N_BLOCK_ENV_ACCESS_IN_NODE` ativo — o n8n 2.x bloqueia `$env` em todos os nós e aparece: `access to env vars denied`.

**Se quiser usar variável de ambiente mesmo assim:**

1. No Docker do n8n, defina `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` (ou remova a variável, conforme documentação do n8n).
2. Reinicie o n8n e aí pode usar expressão com `$env` no header ou usar **Credentials**.

### Erro `401 Unauthorized` na Evolution

- A chave está **vazia** (env não carregada) ou **errada** (não é a mesma da API).
- Confira no **Evolution** o valor de autenticação global (ex.: `AUTHENTICATION_API_KEY=true` + `...` no `.env`).
- A URL deve ser `POST .../message/sendText/{instancia}` com header **`apikey`** (não confundir com token de outro serviço).

---

## 3. Importar o JSON

1. n8n → **Workflows** → **Import from File**
2. Arquivo: **`verificacao-whatsapp.json`**
3. **Salvar** e **Ativar**
4. Copie a URL **Production** do nó **Webhook Verificação** → secret Supabase **`N8N_WEBHOOK_VERIFICACAO`**

---

## 4. Supabase

```bash
npx supabase functions deploy send-whatsapp-verification --project-ref rubvkpxvgffmnloaxbqa
```

---

## 5. Teste

`POST` manual no webhook com body:

```json
{
  "phone": "5511999998888",
  "code": "123456",
  "route": "MASTER_TO_OWNER",
  "evolution_instance": "caio_zap",
  "action": "send_verification"
}
```

Deve chegar WhatsApp na instância `caio_zap` conectada na Evolution.
