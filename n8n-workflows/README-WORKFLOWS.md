# Workflows n8n – BarberPro

Um **workflow por ação**, para ficar mais claro e fácil de manter.

| Workflow | Arquivo | Uso |
|----------|---------|-----|
| **Verificação WhatsApp** | `verificacao-whatsapp.json` | Envio do código de 6 dígitos para vincular/verificar o número |
| **Confirmação de agendamento** | `confirmacao-agendamento.json` ou `confirmacao-agendamento-com-if.json` | Mensagem quando o cliente **confirma** um agendamento |
| **Cancelamento de agendamento** | `cancelamento-agendamento.json` | Mensagem quando o agendamento é **cancelado** (texto diferente se foi o barbeiro ou o cliente) |
| **Lembrete 15 dias** | `lembrete-15-dias.json` | Todo dia às 9h: envia mensagem para clientes que tiveram atendimento **concluído** há 14–16 dias |

---

## 1. Verificação WhatsApp

- **Webhook:** `verificacao-whatsapp`
- **Chamado por:** Edge Function `send-whatsapp-verification`
- **Payload:** `phone`, `code`, `action: 'send_verification'`
- **Secret Supabase:** `N8N_WEBHOOK_VERIFICACAO` (Production URL do webhook no n8n)

---

## 2. Confirmação de agendamento

- **Webhook:** `confirmacao-agendamento`
- **Chamado por:** Edge Function `send-whatsapp-confirmation` (apenas quando o cliente **confirma** o agendamento)
- **Payload:** `client_phone`, `client_name`, `barber_name`, `service_name`, `appointment_date`, `appointment_time`, `service_price`
- **Secret Supabase:** `N8N_WEBHOOK_CONFIRMACAO`

---

## 3. Cancelamento de agendamento

- **Webhook:** `cancelamento-agendamento`
- **Chamado por:** Edge Function `send-whatsapp-cancellation` (quando o usuário clica em “Cancelar agendamento” no app)
- **Payload:** `client_phone`, `client_name`, `barber_name`, `service_name`, `appointment_date`, `appointment_time`, **`cancelled_by`** (`'barber'` ou `'client'`)
- **Mensagens:**
  - **Cancelado pelo barbeiro:** “Infelizmente precisamos cancelar seu agendamento…”
  - **Cancelado pelo cliente:** “Seu agendamento foi cancelado. Se precisar, agende um novo horário…”
- **Secret Supabase:** `N8N_WEBHOOK_CANCELAMENTO` (Production URL do webhook de cancelamento no n8n)

---

## 4. Lembrete 15 dias (reagendar)

- **Trigger:** Agendado (cron) – todo dia às **9h** (ajustável no nó “Todo dia 9h”)
- **Fluxo:**
  1. Chama a Edge Function `get-15day-reminder-list` (GET), que retorna clientes com atendimento concluído entre 14 e 16 dias atrás.
  2. Um item por cliente (phone, full_name).
  3. Para cada um, envia mensagem no WhatsApp: “Já faz um tempinho desde seu último atendimento. Que tal agendar um novo horário?”
- **Requisitos:**
  - Deploy da Edge Function `get-15day-reminder-list`.
  - No n8n, o nó “Buscar clientes (15 dias)” deve usar a URL do seu projeto: `https://SEU_PROJECT_REF.supabase.co/functions/v1/get-15day-reminder-list`.

---

## Resumo dos secrets (Supabase → Edge Functions)

| Secret | Uso |
|--------|-----|
| `N8N_WEBHOOK_VERIFICACAO` | Production URL do webhook de **verificação** |
| `N8N_WEBHOOK_CONFIRMACAO` | Production URL do webhook de **confirmação** |
| `N8N_WEBHOOK_CANCELAMENTO` | Production URL do webhook de **cancelamento** |

---

## Evolution API

Nos nós “Enviar WhatsApp” está configurado **apikey** = `caio123` e URL `http://72.60.159.183:8080/message/sendText/caio_zap`. Ajuste se o seu ambiente for diferente.
