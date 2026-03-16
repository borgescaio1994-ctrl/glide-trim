# send-whatsapp-cancellation

**Uma Edge Function por ação.** Esta função é usada **apenas para cancelamento** de agendamento.

- **Confirmação** → `send-whatsapp-confirmation`
- **Cancelamento** → `send-whatsapp-cancellation` (esta)

## Deploy obrigatório

Esta função precisa estar **implantada** no Supabase para o cancelamento acordar o n8n:

```bash
npx supabase functions deploy send-whatsapp-cancellation --project-ref rubvkpxvgffmnloaxbqa
```

## Secret (opcional)

No Supabase: **Project Settings → Edge Functions → Secrets** → `N8N_WEBHOOK_CANCELAMENTO` = Production URL do webhook de cancelamento no n8n.  
Se não definir, usa o default: `http://72.60.159.183:5678/webhook/cancelamento-agendamento`.
