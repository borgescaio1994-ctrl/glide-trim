# send-whatsapp-verification

Envia o código de 6 dígitos para o **n8n** (webhook), que dispara o WhatsApp via **Evolution API**.

Usado na tela **Vincular WhatsApp** (`/verify-phone`) — **clientes, barbeiros e dono (ADMIN_BARBER)**.

## Secret (recomendado)

| Nome | Valor |
|------|--------|
| `N8N_WEBHOOK_VERIFICACAO` | URL **Production** do webhook do workflow de verificação no n8n (com UUID). |
| `N8N_WEBHOOK_TIMEOUT_MS` | Opcional. Tempo máximo (ms) esperando o n8n responder. Padrão **30000** (30s). Se aparecer *The signal has been aborted*, aumente (ex.: `60000`) ou deixe o n8n/Evolution mais rápidos. |

Se o secret não existir, a função usa um fallback de URL no código (ambiente legado).

## Payload para o n8n

```json
{
  "phone": "5511999998888",
  "code": "123456",
  "action": "send_verification",
  "route": "MASTER_TO_OWNER",
  "evolution_instance": "caio_zap",
  "sender_phone": null
}
```

- **`route`:** `MASTER_TO_OWNER` (código para o dono) ou `SHOP_TO_CLIENT` (código para cliente/barbeiro da loja).
- **`evolution_instance`:** nome da instância na Evolution (master ou loja, resolvido no servidor).
- **`sender_phone`:** referência (master ou `whatsapp_sender_phone` da loja).

O app envia `establishment_id` / `barber_id` no body da função; a Edge resolve a instância da loja.

## Deploy

```bash
npx supabase functions deploy send-whatsapp-verification --project-ref SEU_PROJECT_REF
```

Guia completo (incluindo dono da barbearia): `n8n-workflows/CONFIGURAR-N8N-VERIFICACAO-DONO.md`.
