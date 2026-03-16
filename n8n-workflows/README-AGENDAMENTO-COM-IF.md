# Workflow BarberPro – Confirmação e Cancelamento (normalizado)

## Arquivo

`confirmacao-agendamento-com-if.json`

## Fluxo normalizado (igual para os dois casos)

| Ação do usuário | App | Edge Function | n8n | WhatsApp |
|-----------------|-----|---------------|-----|----------|
| **Confirmar agendamento** | Chama `send-whatsapp-confirmation` (sem `type`) | POST para o mesmo webhook | Normalizar → IF (false) → Montar CONFIRMAÇÃO → Enviar | ✅ Agendamento confirmado! |
| **Cancelar agendamento**  | Chama `send-whatsapp-confirmation` com `type: 'cancel'` | POST para o mesmo webhook | Normalizar → IF (true) → Montar CANCELAMENTO → Enviar | ❌ Agendamento cancelado |

- **Um único webhook** recebe os dois tipos de POST.
- **Normalizar payload** — lê o body (em `.body` ou na raiz), define `isCancel` a partir de `type === 'cancel'`.
- **É cancelamento?** — ramo **true** → mensagem de cancelamento; ramo **false** → mensagem de confirmação.
- **Enviar WhatsApp** — um único nó para os dois ramos; header `apikey` = `caio123`.

## Uso no n8n

1. Importar o JSON (Import from File / colar).
2. Ativar o workflow.
3. Configurar no Supabase o secret `N8N_WEBHOOK_CONFIRMACAO` com a **Production URL** do webhook.

## Lembrete: "15 dias depois"

A mensagem 15 dias após o agendamento concluído exige um **workflow separado** com trigger **Agendado (Cron)**.
