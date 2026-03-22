# Workflow n8n – Confirmação de agendamento (WhatsApp)

Alinhado ao workflow **Verificação WhatsApp**: URL dinâmica da Evolution (`/message/sendText/{instância}`), **sem `$env` no header** (evita `access to env vars denied` quando `N8N_BLOCK_ENV_ACCESS_IN_NODE` está ativo).

## O que faz

1. **Webhook** recebe um POST com os dados do agendamento (e opcionalmente `evolution_instance`, enviado pela Edge Function `send-whatsapp-confirmation`).
2. **Montar mensagem e URL Evolution** formata o texto (confirmação ou cancelamento se `type: 'cancel'`) e monta `sendUrl` com a instância correta.
3. **Enviar WhatsApp (Evolution)** envia via `POST` com header `apikey`.
4. **Responder Webhook** devolve sucesso para quem chamou.

## Importar no n8n

1. Abra o n8n.
2. Menu → **Import from File**.
3. Selecione `confirmacao-agendamento.json`.

## Configurar Evolution

No nó **"Enviar WhatsApp (Evolution)"**:

- **URL**: `={{ $json.sendUrl }}` (já configurado; vem do nó Code).
- **Header `apikey`**: substitua `COLE_AQUI_A_CHAVE_GLOBAL_DA_EVOLUTION` pela **API key global** da Evolution (texto fixo), **ou** use Credentials do n8n — **não** use `={{ $env.EVOLUTION_API_KEY }}` se o servidor bloquear `$env` em expressões.

A **base** da API (`http://72.60.159.183:8080`) e o nome da instância padrão (`caio_zap`) estão no nó Code; a instância **por barbearia** vem do payload `evolution_instance` (resolvido na Edge Function a partir de `establishments.whatsapp_evolution_instance` ou master).

Ative o workflow para o webhook ficar disponível.

## URL do webhook

Depois de ativar, use a **Production URL** do nó Webhook (pode incluir UUID). Configure no Supabase o secret **`N8N_WEBHOOK_CONFIRMACAO`** com essa URL (veja `CONFIGURAR-URL-CONFIRMACAO.md`).

## Payload (body do POST)

A Edge Function `send-whatsapp-confirmation` envia, entre outros:

| Campo | Exemplo | Obrigatório |
|--------|---------|-------------|
| `client_phone` | `"5511999999999"` | Sim |
| `client_name` | `"João"` | Não |
| `barber_name` | `"Carlos"` | Não |
| `service_name` | `"Corte"` | Não |
| `appointment_date` | `"2025-03-15"` | Não |
| `appointment_time` | `"14:00"` | Não |
| `service_price` | `35` | Não |
| `evolution_instance` | `"minha_instancia"` | Não (padrão `caio_zap`; a Edge preenche pela loja) |
| `type` | `"cancel"` | Não (se enviado, mensagem de cancelamento) |

Exemplo mínimo de teste manual:

```json
{
  "client_phone": "5511999999999",
  "client_name": "João Silva",
  "barber_name": "Carlos",
  "service_name": "Corte masculino",
  "appointment_date": "2025-03-15",
  "appointment_time": "14:00",
  "service_price": 35,
  "evolution_instance": "caio_zap"
}
```

## Integração com o app

- **Edge Function** `send-whatsapp-confirmation`: chamada após confirmar agendamento (ex.: `BookAppointment`, fluxo com verificação).
- Secrets: `N8N_WEBHOOK_CONFIRMACAO` (URL do webhook), Supabase padrão (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

## Modelo da mensagem

Confirmação e cancelamento seguem o texto definido no nó **Montar mensagem e URL Evolution** (ajuste livremente).
