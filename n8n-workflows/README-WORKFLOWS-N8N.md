# Workflows n8n (BookNow)

Nesta pasta há estes workflows principais no n8n:

| Arquivo | Uso |
|--------|-----|
| **verificacao-whatsapp.json** | Envio do código de 6 dígitos para vincular/verificar WhatsApp |
| **confirmacao-agendamento.json** | Mensagem de confirmação de agendamento por WhatsApp |
| **lembrete-15-dias.json** | Lembrete diário (cron) para clientes com ~15 dias do último atendimento concluído |

## Verificação (código)

- **Payload:** `{ phone, code, action: 'send_verification', sender_phone? }`
- Chamado pela Edge Function **send-whatsapp-verification** quando o usuário pede “Enviar código” na tela de vincular WhatsApp (**cliente, barbeiro ou dono ADMIN_BARBER**).
- **Dono da barbearia:** guia completo em **[CONFIGURAR-N8N-VERIFICACAO-DONO.md](./CONFIGURAR-N8N-VERIFICACAO-DONO.md)** (mesmo workflow; após validar, o app ativa onboarding e grava `whatsapp_sender_phone` da unidade).

## Confirmação e cancelamento de agendamento (mesmo workflow)

- **Confirmação:** payload com `client_phone`, `client_name`, `barber_name`, `service_name`, `appointment_date`, `appointment_time`, `service_price`, `evolution_instance` (resolvido na Edge a partir da loja/master). Chamado pela Edge Function **send-whatsapp-confirmation** quando o cliente confirma o agendamento.
- **Cancelamento:** mesmo webhook com `type: 'cancel'` e os mesmos campos (data/hora/serviço/barbeiro). O nó "Montar mensagem" monta a mensagem de cancelamento em vez da de confirmação.

## Autenticação Evolution API (obrigatório)

A Evolution API exige o header **`apikey`**. Nos JSONs atuais o valor é **texto fixo** (`COLE_AQUI_A_CHAVE_GLOBAL_DA_EVOLUTION`) para evitar `access to env vars denied` quando o n8n bloqueia `$env` em expressões.

- Cole a **API key global** da Evolution em cada nó **Enviar … (Evolution)**.
- Se preferir `$env.EVOLUTION_API_KEY`, habilite env no n8n e use no header.

Sem `apikey` correto → **401 Unauthorized**.

## Lembrete 15 dias

- Schedule + `GET` na Edge **`get-15day-reminder-list`** + envio Evolution por cliente.
- Detalhes: **[README-LEMBRETE-15-DIAS.md](./README-LEMBRETE-15-DIAS.md)**.

## Importar no n8n

1. Menu → **Import from File** (ou colar o JSON).
2. Importe `verificacao-whatsapp.json`, `confirmacao-agendamento.json` e, se quiser o lembrete, `lembrete-15-dias.json`.
3. Cole a **apikey** da Evolution nos nós de envio (ou configure `$env`).
4. Confira URLs (webhooks, Edge `get-15day-reminder-list` se usar lembrete).
5. **Ative** cada workflow.

Detalhes da confirmação: **README-CONFIRMACAO-AGENDAMENTO.md**. Lembrete 15 dias: **README-LEMBRETE-15-DIAS.md**.
