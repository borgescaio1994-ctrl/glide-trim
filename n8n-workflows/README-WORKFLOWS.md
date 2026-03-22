# Workflows n8n – BookNow

Um **workflow por ação**, para ficar mais claro e fácil de manter.

> **n8n pediu “criar usuário” de novo?** Isso não vem deste repositório — veja **[N8N-RECUPERAR-ACESSO.md](./N8N-RECUPERAR-ACESSO.md)** (volume Docker, `N8N_ENCRYPTION_KEY`, mesma URL).

| Workflow | Arquivo | Uso |
|----------|---------|-----|
| **Verificação WhatsApp** | `verificacao-whatsapp.json` | Envio do código de 6 dígitos para vincular/verificar o número |
| **Confirmação de agendamento** | `confirmacao-agendamento.json` | Mensagem quando o cliente **confirma** um agendamento (e cancelamento via `type: 'cancel'` no mesmo fluxo) |
| **Cancelamento de agendamento** | `cancelamento-agendamento.json` | Mensagem quando o agendamento é **cancelado** (texto diferente se foi o barbeiro ou o cliente) |
| **Lembrete 15 dias** | `lembrete-15-dias.json` | Todo dia às 9h: envia mensagem para clientes que tiveram atendimento **concluído** há 14–16 dias |

---

## 1. Verificação WhatsApp

- **Webhook:** `verificacao-whatsapp`
- **Chamado por:** Edge Function `send-whatsapp-verification`
- **Payload:** `phone`, `code`, `action`, `route` (`MASTER_TO_OWNER` | `SHOP_TO_CLIENT`), `evolution_instance`, opcional `sender_phone`
- **Rotas:** ver **[README-VERIFICACAO-ROTAS.md](./README-VERIFICACAO-ROTAS.md)**
- **Secret Supabase:** `N8N_WEBHOOK_VERIFICACAO` (Production URL do webhook no n8n)
- **Dono da barbearia (ADMIN_BARBER):** usa a mesma verificação na tela `/verify-phone` — guia passo a passo: **[CONFIGURAR-N8N-VERIFICACAO-DONO.md](./CONFIGURAR-N8N-VERIFICACAO-DONO.md)**

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
  1. Chama a Edge Function `get-15day-reminder-list` (GET), que retorna clientes com atendimento concluído entre 14 e 16 dias atrás, com **`evolution_instance`** por barbearia (ou master).
  2. **Montar mensagem e URL Evolution** – um item por cliente (`sendUrl` dinâmico).
  3. **Enviar lembrete (Evolution)** – mesmo padrão de apikey/body dos outros workflows.
- **Requisitos:**
  - Deploy da Edge Function `get-15day-reminder-list` e `verify_jwt = false` em `config.toml` (já no repo).
  - URL no nó “Buscar clientes (15 dias)”: `https://SEU_PROJECT_REF.supabase.co/functions/v1/get-15day-reminder-list`
- **Doc:** [README-LEMBRETE-15-DIAS.md](./README-LEMBRETE-15-DIAS.md)

---

## Resumo dos secrets (Supabase → Edge Functions)

| Secret | Uso |
|--------|-----|
| `N8N_WEBHOOK_VERIFICACAO` | Production URL do webhook de **verificação** |
| `N8N_WEBHOOK_CONFIRMACAO` | Production URL do webhook de **confirmação** |
| `N8N_WEBHOOK_CANCELAMENTO` | Production URL do webhook de **cancelamento** |

---

## Evolution API

Nos nós **Enviar … (Evolution)** use a **API key global** no header `apikey` (placeholder `COLE_AQUI_A_CHAVE_GLOBAL_DA_EVOLUTION` nos JSONs). URLs de envio são **dinâmicas** (`/message/sendText/{instância}`) onde aplicável. Veja também **README-WORKFLOWS-N8N.md**.
