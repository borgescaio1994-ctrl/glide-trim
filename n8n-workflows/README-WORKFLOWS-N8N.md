# Workflows n8n (BarberPro)

Nesta pasta há **dois** workflows para usar no n8n:

| Arquivo | Uso |
|--------|-----|
| **verificacao-whatsapp.json** | Envio do código de 6 dígitos para vincular/verificar WhatsApp |
| **confirmacao-agendamento.json** | Mensagem de confirmação de agendamento por WhatsApp |

## Verificação (código)

- **Payload:** `{ phone, code, action: 'send_verification' }`
- Chamado pela Edge Function **send-whatsapp-verification** quando o usuário pede “Enviar código” na tela de vincular WhatsApp.

## Confirmação e cancelamento de agendamento (mesmo workflow)

- **Confirmação:** payload com `client_phone`, `client_name`, `barber_name`, `service_name`, `appointment_date`, `appointment_time`, `service_price`. Chamado pela Edge Function **send-whatsapp-confirmation** quando o cliente confirma o agendamento.
- **Cancelamento:** mesmo webhook com `type: 'cancel'` e os mesmos campos (data/hora/serviço/barbeiro). O nó "Montar mensagem" monta a mensagem de cancelamento em vez da de confirmação.

## Autenticação Evolution API (obrigatório)

A Evolution API exige o header **`apikey`** nas requisições. Os workflows já enviam esse header usando a variável de ambiente **`EVOLUTION_API_KEY`**.

**No n8n (Docker / servidor):**
- Defina a variável `EVOLUTION_API_KEY` com a API key da sua instância Evolution.
- Exemplo no `docker-compose`:  
  `environment: EVOLUTION_API_KEY: "sua-api-key-aqui"`
- Ou no nó **Enviar WhatsApp**: em Headers, troque o valor de `apikey` para a sua chave em texto (em vez de `$env.EVOLUTION_API_KEY`).

Sem isso, a Evolution API responde **401 Unauthorized**.

## Importar no n8n

1. Menu → **Import from File** (ou colar o JSON).
2. Importe `verificacao-whatsapp.json` e `confirmacao-agendamento.json`.
3. Configure **EVOLUTION_API_KEY** (ver seção acima).
4. Em cada um, confira o nó **Enviar WhatsApp** (URL da Evolution API e body com `textMessage`).
5. **Ative** os dois workflows e use as URLs de webhook que o n8n mostrar nas Edge Functions do Supabase.

Detalhes da confirmação: **README-CONFIRMACAO-AGENDAMENTO.md**.
