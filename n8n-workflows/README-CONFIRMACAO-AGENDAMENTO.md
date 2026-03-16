# Workflow n8n – Confirmação de agendamento (WhatsApp)

## O que faz

1. **Webhook** recebe um POST com os dados do agendamento.
2. **Montar mensagem** formata o texto (nome do cliente, barbeiro, serviço, data, hora, valor).
3. **Enviar WhatsApp** envia a mensagem via API (Evolution API ou similar).
4. **Responder Webhook** devolve sucesso para quem chamou.

## Importar no n8n

1. Abra o n8n.
2. Menu (três pontinhos) → **Import from File** (ou **Import from URL** / colar JSON).
3. Selecione o arquivo `confirmacao-agendamento.json`.

## Configurar envio no WhatsApp

No nó **"Enviar WhatsApp"**:

- **URL**: a URL da sua API de WhatsApp.
  - **Evolution API** (exemplo): `http://SEU_SERVIDOR:8080/message/sendText/SUA_INSTANCIA`
  - Troque `SEU_SERVIDOR` e `SUA_INSTANCIA` pelos seus dados.
- **Header `apikey` (obrigatório)**: a Evolution API exige autenticação. O workflow usa `$env.EVOLUTION_API_KEY`.
  - Defina a variável **EVOLUTION_API_KEY** no ambiente do n8n (Docker: `environment: EVOLUTION_API_KEY: "sua-chave"`).
  - Ou no nó, em **Headers**, substitua o valor de `apikey` pela sua API key em texto.
- Sem o header `apikey` correto, a API responde **401 Unauthorized**.

No n8n, ative o workflow para o webhook ficar disponível.

## URL do webhook

Depois de ativar o workflow, o n8n mostra a URL do webhook, algo como:

```
https://SEU_N8N/v2/webhook/confirmacao-agendamento
```

ou

```
https://SEU_N8N/webhook/confirmacao-agendamento
```

Guarde essa URL para configurar no Supabase ou no app.

## Payload (body do POST)

Envie um JSON no body do POST com pelo menos:

| Campo             | Exemplo        | Obrigatório |
|------------------|----------------|-------------|
| `client_phone`   | `"11999999999"`| Sim         |
| `client_name`    | `"João"`       | Não         |
| `barber_name`    | `"Carlos"`     | Não         |
| `service_name`   | `"Corte"`      | Não         |
| `appointment_date` | `"2025-03-15"` | Não      |
| `appointment_time` | `"14:00"`     | Não         |
| `service_price`  | `35.00`        | Não         |

Exemplo mínimo:

```json
{
  "client_phone": "5511999999999",
  "client_name": "João Silva",
  "barber_name": "Carlos",
  "service_name": "Corte masculino",
  "appointment_date": "2025-03-15",
  "appointment_time": "14:00",
  "service_price": 35
}
```

## Chamar o webhook quando o agendamento for criado

### Opção 1: Supabase Edge Function

Crie uma Edge Function que é chamada pelo app após criar o agendamento (ou por um trigger no banco). Dentro dela, faça um `fetch` para a URL do webhook n8n com o payload acima.

### Opção 2: Supabase Database Webhook

No painel do Supabase: **Database → Webhooks → Create a new hook**:

- **Table**: `appointments`
- **Events**: Insert
- **URL**: a URL do webhook n8n
- **HTTP Headers**: `Content-Type: application/json`
- **Body**: escolha “Payload” e monte um JSON que use as colunas da tabela (ex.: `client_phone` do perfil do cliente, nome do serviço, etc.). Se a tabela não tiver todos os campos, use uma Edge Function que leia relacionamentos e depois chame o n8n.

### Opção 3: Direto do app (front)

Após o `insert` do agendamento no Supabase, chame a URL do webhook com `fetch` e o mesmo JSON de exemplo. Só use se a URL do n8n for pública e você tratar erros no front.

## Modelo da mensagem enviada

A mensagem enviada pelo workflow segue este formato:

```
✅ *Agendamento confirmado!*

Olá, [client_name]!

Seu horário foi reservado:
📅 Data: DD/MM/AAAA
🕐 Horário: HH:MM
✂️ Serviço: [service_name]
👤 Barbeiro: [barber_name]
💰 Valor: R$ XX,XX

Até lá!
```

Ajuste o texto no nó **"Montar mensagem"** do workflow se quiser outro formato.
