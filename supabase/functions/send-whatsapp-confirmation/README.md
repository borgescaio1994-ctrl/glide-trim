# send-whatsapp-confirmation

Edge Function que envia os dados do agendamento para o n8n (webhook) para disparar a mensagem de confirmação no WhatsApp.

## Erro 404 no webhook

Se os logs mostrarem **"Webhook retornou status 404"**, a URL usada não é a correta. O n8n usa uma **URL com UUID** na produção, não o path sozinho.

### Como corrigir

1. **No n8n**
   - Abra o workflow **"Confirmação de Agendamento"**.
   - Deixe o workflow **ativo** (toggle Active ligado).
   - Clique no primeiro nó (**Webhook**).
   - Copie a **Production URL** (algo como):
     ```
     http://72.60.159.183:5678/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
     ```
   - Não use a "Test URL"; use só a **Production URL**.

2. **No Supabase**
   - Acesse o projeto (rubvkpxvgffmnloaxbqa).
   - Vá em **Project Settings** → **Edge Functions** (ou **Settings** → **Edge Functions**).
   - Em **Secrets**, adicione:
     - **Name:** `N8N_WEBHOOK_CONFIRMACAO`
     - **Value:** a URL que você copiou do n8n (com o UUID).
   - Salve.

3. **Redeploy da função** (para garantir que o secret seja lido):
   ```bash
   npx supabase functions deploy send-whatsapp-confirmation --project-ref rubvkpxvgffmnloaxbqa
   ```

Depois disso, ao agendar no app, a função usará a URL correta e o n8n deixará de retornar 404.
