# Por que o n8n de confirmação não dispara?

A mensagem de confirmação deve ser enviada **sempre** que um agendamento é concluído:
- Cliente **já verificado** → ao clicar em "Confirmar Agendamento" (BookAppointment chama a Edge Function).
- Cliente **verificou na hora** → após digitar o código em Vincular WhatsApp (VerifyPhone salva o agendamento e chama a Edge Function).

O Supabase chama uma **URL de webhook** para avisar o n8n. Se essa URL estiver errada, o n8n **não recebe** a chamada (ou devolve 404) e a mensagem não chega.

No n8n, a URL de produção pode ter um **UUID** em vez do path. Por isso é preciso configurar o **secret** no Supabase com a URL que o próprio n8n mostra.

---

## Checklist rápido

- [ ] Workflow **"Confirmação de Agendamento"** está **ativo** no n8n?
- [ ] No nó **Webhook** desse workflow, você copiou a **Production URL** (com UUID ou path)?
- [ ] No Supabase → **Edge Functions** → **Secrets** existe **N8N_WEBHOOK_CONFIRMACAO** com essa URL (usando IP **72.60.159.183** se vier localhost)?
- [ ] Depois de salvar o secret, você fez **deploy** de novo da função?  
  `npx supabase functions deploy send-whatsapp-confirmation --project-ref rubvkpxvgffmnloaxbqa`

---

## Passo a passo (obrigatório)

### 1. No n8n

1. Abra o workflow **"Confirmação de Agendamento"** (ou o nome que você deu).
2. Deixe o workflow **ativo** (toggle **Active** ligado).
3. Clique no **primeiro nó** (Webhook).
4. Copie a **Production URL** que aparece no nó.  
   Ela deve ser parecida com:
   - `http://72.60.159.183:5678/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`  
   ou
   - `http://localhost:5678/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

5. Se aparecer **localhost**, troque por **72.60.159.183** (IP da sua VPS), mantendo o resto (incluindo o UUID).  
   Exemplo:  
   `http://localhost:5678/webhook/abc123-uuid-aqui`  
   →  
   `http://72.60.159.183:5678/webhook/abc123-uuid-aqui`

### 2. No Supabase

1. Acesse o projeto no [Supabase Dashboard](https://supabase.com/dashboard).
2. Vá em **Project Settings** (ícone de engrenagem) → **Edge Functions**.
3. Na seção **Secrets**, clique em **Add new secret**.
4. **Name:** `N8N_WEBHOOK_CONFIRMACAO`  
   **Value:** a URL que você montou no passo 1 (com IP e UUID).
5. Salve.

### 3. Redeploy da função

No terminal, na pasta do projeto:

```bash
npx supabase functions deploy send-whatsapp-confirmation --project-ref rubvkpxvgffmnloaxbqa
```

(Substitua `rubvkpxvgffmnloaxbqa` pelo ref do seu projeto se for outro.)

---

## Testar o webhook (opcional)

Para saber se a URL está certa, você pode chamar o webhook manualmente. No PowerShell (troque a URL pela sua Production URL do n8n):

```powershell
$body = @{
  client_phone = "5511999999999"
  client_name = "Teste"
  barber_name = "Barbeiro"
  service_name = "Corte"
  appointment_date = "2025-03-15"
  appointment_time = "14:00"
  service_price = 35
  evolution_instance = "caio_zap"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://72.60.159.183:5678/webhook/confirmacao-agendamento" -Method POST -Body $body -ContentType "application/json"
```

(Se o seu n8n usar UUID, use essa URL no lugar: `http://72.60.159.183:5678/webhook/SEU-UUID-AQUI`.)

Se o workflow disparar e você receber a mensagem no WhatsApp, a URL está correta — use essa mesma URL no secret **N8N_WEBHOOK_CONFIRMACAO** e faça o deploy da função.

---

Depois disso, ao agendar (ou ao verificar o número no fluxo de agendamento), a Edge Function passará a chamar a URL correta e o n8n deve disparar e enviar a confirmação no WhatsApp.

---

## Evolution: `apikey` e instância

- No nó **Enviar WhatsApp (Evolution)**, cole a **API key global** da Evolution no header `apikey` (placeholder `COLE_AQUI_A_CHAVE_GLOBAL_DA_EVOLUTION`), igual ao workflow de verificação.
- O campo **`evolution_instance`** no JSON de teste (ou enviado pela Edge Function) define a instância; a URL é montada automaticamente (`/message/sendText/{instância}`).
