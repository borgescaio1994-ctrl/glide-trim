# Passo a passo — ativar o workflow de verificação WhatsApp

Use este guia na ordem. Substitua `SEU_PROJECT_REF` pelo ref do seu projeto Supabase (ex.: `rubvkpxvgffmnloaxbqa`).

---

## 1) Banco (Supabase)

1. Abra **SQL Editor** no Supabase.
2. Rode a migration (se ainda não rodou): arquivo  
   `supabase/migrations/20260322000000_verification_evolution_instances.sql`  
   (adiciona a coluna `whatsapp_evolution_instance` em `establishments`).

---

## 2) Evolution API

1. Confirme que a Evolution está no ar (ex.: `http://72.60.159.183:8080`).
2. Tenha pelo menos **uma instância** com WhatsApp conectado (ex.: `caio_zap` = número **master**).
3. Anote a **API key** da Evolution (usada no n8n como `EVOLUTION_API_KEY`).

---

## 3) n8n — variáveis de ambiente

No servidor onde roda o n8n (Docker Compose, painel, etc.), defina:

| Variável | Obrigatório? | Exemplo |
|----------|--------------|---------|
| `EVOLUTION_API_KEY` | Sim | chave da Evolution |
| `EVOLUTION_API_BASE` | Não | `http://72.60.159.183:8080` (sem `/` no final) |

Reinicie o n8n após alterar.

---

## 4) n8n — importar e ativar o workflow

1. Acesse o n8n (ex.: `http://72.60.159.183:5678`).
2. **Workflows → Import from File**.
3. Selecione o arquivo **`n8n-workflows/verificacao-whatsapp.json`** do projeto.
4. Abra o workflow importado e confira se os nós estão conectados:  
   **Webhook Verificação** → **Montar mensagem e URL Evolution** → **Enviar WhatsApp (Evolution)** → **Responder Webhook**.
5. Clique em **Save** (salvar).
6. Ative o workflow com o interruptor **Active** (canto superior direito).

---

## 5) n8n — copiar a URL Production do webhook

1. Abra o nó **Webhook Verificação**.
2. Na aba do webhook, copie a URL de **Production** (não use “Test URL” em produção).
3. Deve ser algo como:  
   `http://SEU-SERVIDOR:5678/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`  
   ou com HTTPS se você usa proxy.

Guarde essa URL — ela vai no Supabase no próximo passo.

---

## 6) Supabase — secret da Edge Function

1. Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets** (ou **Manage secrets**).
2. Crie/edite o secret:
   - **Nome:** `N8N_WEBHOOK_VERIFICACAO`
   - **Valor:** a URL **Production** copiada no passo 5 (inteira).

---

## 7) Supabase — deploy da função

No PC, na pasta do projeto:

```bash
npx supabase login
npx supabase functions deploy send-whatsapp-verification --project-ref SEU_PROJECT_REF
```

(Sem login local, use o token conforme a doc do Supabase CLI.)

---

## 8) App / CRM — configuração MASTER e lojas

1. No app, entre como **SUPER_ADMIN** → **Gestão de Lojas**.
2. Na seção **MASTER**, preencha:
   - número master (55…), e  
   - **instância Evolution do master** (ex.: `caio_zap`),  
   e clique em **Salvar MASTER**.
3. Para cada barbearia que for mandar código aos **clientes** pelo WhatsApp da **loja**, em **Ver detalhes** da unidade informe a **instância Evolution** daquela loja (nome igual ao da Evolution) e salve.

---

## 9) Teste rápido

1. No app, abra **Vincular WhatsApp** (`/verify-phone`), informe um número de teste e **Enviar código**.
2. No n8n: **Executions** — deve aparecer uma execução **sucesso**.
3. No celular: deve chegar a mensagem com o código (se Evolution + instância estiverem corretos).

Se der **404** no webhook: a URL do secret não bate com a **Production** do nó Webhook (UUID/path).

---

## Resumo

| Onde | O quê |
|------|--------|
| Evolution | Instância + API key |
| n8n | Importar JSON, `EVOLUTION_API_KEY`, ativar workflow, copiar URL Production |
| Supabase | Secret `N8N_WEBHOOK_VERIFICACAO` + deploy `send-whatsapp-verification` |
| CRM | MASTER (número + instância) + instância por loja (detalhes) |

Documentação extra: `README-VERIFICACAO-ROTAS.md`, `CONFIGURAR-N8N-VERIFICACAO-DONO.md`.
