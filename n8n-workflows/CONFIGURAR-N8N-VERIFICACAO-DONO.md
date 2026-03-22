# Configurar n8n – verificar o WhatsApp do **dono da barbearia**

O dono (perfil **ADMIN_BARBER**) usa a **mesma** verificação que clientes e barbeiros: tela **“Vincular WhatsApp”** (`/verify-phone`).  
Quando ele confirma o código de 6 dígitos, o app:

- marca o onboarding da unidade como ativo (`onboarding_status: ACTIVE`);
- grava **`whatsapp_sender_phone`** da barbearia com o número verificado;
- grava **`owner_phone_verified_at`**.

Ou seja: você **não** cria um workflow separado só para o dono — o fluxo é o **BookNow - Verificação WhatsApp (código)**.

---

## Fluxo resumido

1. Dono faz login no app.
2. Abre a tela de vincular WhatsApp (rota `/verify-phone` — o app pode redirecionar após login se ainda não verificou).
3. Informa o **DDD + número**, toca em **Enviar código**.
4. O app chama a Edge Function **`send-whatsapp-verification`**, que:
   - salva o código na tabela **`phone_verifications`**;
   - faz **POST** no webhook do n8n com `{ phone, code, sender_phone, action: 'send_verification' }`.
5. O n8n envia a mensagem pela **Evolution API** (WhatsApp).
6. O dono digita o código no app → validação no banco → atualização da barbearia (passos acima).

---

## Passo a passo no n8n

### 1. Importar o workflow

1. Acesse o n8n (ex.: `http://72.60.159.183:5678`).
2. **Workflows → Import from File**.
3. Importe o arquivo: **`n8n-workflows/verificacao-whatsapp.json`**.

### 2. Ajustar Evolution API (envio da mensagem)

1. Abra o workflow **BookNow - Verificação WhatsApp (código)**.
2. No nó **“Enviar WhatsApp”** (HTTP Request):
   - **URL:** deve terminar em  
     `.../message/sendText/NOME_DA_INSTANCIA`  
     (ex.: `http://72.60.159.183:8080/message/sendText/caio_zap`).
   - **Header `apikey`:** use variável de ambiente do n8n (ex.: `EVOLUTION_API_KEY`) ou o valor da sua Evolution.
3. Na **Evolution**, conecte o WhatsApp do número que deve **disparar** os códigos (ex.: número master da operação).  
   Detalhes: veja também **`CONFIGURAR-NUMERO-WHATSAPP.md`**.

### 3. Ativar e copiar a URL do webhook

1. **Salve** o workflow.
2. **Ative** o workflow (toggle “Active”).
3. Abra o nó **“Webhook Verificação”**.
4. Copie a URL de **Production** (ela inclui um UUID, ex.:  
   `http://72.60.159.183:5678/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

> **Importante:** a Edge Function precisa dessa URL **exata**. Se você mudar o path do webhook no n8n, atualize o secret no Supabase.

### 4. Configurar o Supabase (secret)

1. Supabase Dashboard → **Project Settings → Edge Functions** (ou **Secrets**).
2. Adicione o secret:
   - **Nome:** `N8N_WEBHOOK_VERIFICACAO`
   - **Valor:** a URL **Production** copiada do n8n (passo anterior).
3. Faça **deploy** da função (se ainda não estiver atualizada):

```bash
npx supabase functions deploy send-whatsapp-verification --project-ref SEU_PROJECT_REF
```

A função usa `N8N_WEBHOOK_VERIFICACAO`; se o secret não existir, cai no fallback antigo embutido no código (só para não quebrar ambientes legados).

### 5. Campo `sender_phone` no payload (opcional)

A Edge Function envia também **`sender_phone`**, lido de **`system_settings.key = master_sender_phone`** (número master para referência / futuros fluxos).  
O workflow atual **não é obrigado** a usá-lo: o remetente real da mensagem é a **instância** conectada na Evolution.

---

## Payload que o n8n recebe (POST JSON)

| Campo | Descrição |
|--------|-----------|
| `phone` | Número só dígitos, com DDI **55** (ex.: `5511999998888`) |
| `code` | Código de **6** dígitos |
| `action` | Sempre `send_verification` |
| `sender_phone` | Opcional; master da plataforma (pode ser `null`) |

O nó **“Montar mensagem”** no JSON importado já lê `body` ou raiz do JSON conforme o n8n expõe o webhook.

---

## Testar

1. Com o workflow **ativo** e o secret configurado, no app faça login como **dono**.
2. Em **Vincular WhatsApp**, envie o código.
3. No n8n, abra **Executions** e confira se a execução foi **sucesso**.
4. Se der **404** no webhook: URL errada → corrija `N8N_WEBHOOK_VERIFICACAO` e redeploy.

---

## Arquivos relacionados

| O quê | Onde |
|--------|------|
| Workflow n8n | `n8n-workflows/verificacao-whatsapp.json` |
| Edge Function | `supabase/functions/send-whatsapp-verification/` |
| Tela do app | `src/pages/VerifyPhone.tsx` |
| Lista de secrets | `n8n-workflows/README-WORKFLOWS.md` |

---

## Resumo

| Onde | O que fazer |
|------|-------------|
| **n8n** | Importar `verificacao-whatsapp.json`, configurar Evolution (URL + apikey), **ativar**, copiar URL Production. |
| **Supabase** | Secret `N8N_WEBHOOK_VERIFICACAO` = essa URL; deploy `send-whatsapp-verification`. |
| **Evolution** | Instância com o WhatsApp que **envia** o código. |
| **App** | Dono usa `/verify-phone` — mesmo fluxo para todos; após validar, a unidade é atualizada automaticamente se o perfil for **ADMIN_BARBER**. |
