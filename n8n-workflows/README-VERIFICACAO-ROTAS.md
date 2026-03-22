# Verificação WhatsApp — duas rotas (master → dono | loja → cliente)

## Comportamento

| Quem pede o código | `route` na Edge Function | Instância Evolution usada |
|--------------------|-------------------------|---------------------------|
| **Dono** (`ADMIN_BARBER`) | `MASTER_TO_OWNER` | `master_evolution_instance` (system_settings) ou secret `MASTER_EVOLUTION_INSTANCE` ou padrão `caio_zap` |
| **Cliente, barbeiro, etc.** | `SHOP_TO_CLIENT` | `establishments.whatsapp_evolution_instance` da loja; se vazio, cai no **mesmo** master (até você configurar a loja) |

O app envia `establishment_id` e/ou `barber_id` (agendamento) para a Edge Function resolver a loja.

## n8n

1. Importe **`verificacao-whatsapp.json`**.
2. Variáveis de ambiente no Docker/servidor do n8n:
   - **`EVOLUTION_API_KEY`** — apikey da Evolution (obrigatório).
   - **`EVOLUTION_API_BASE`** — opcional; padrão `http://72.60.159.183:8080` (sem barra no final).
3. O nó **Montar mensagem e URL Evolution** monta  
   `{{EVOLUTION_API_BASE}}/message/sendText/{{evolution_instance}}`  
   onde `evolution_instance` vem **no JSON** enviado pela Edge Function (não fixo no workflow).

## Supabase / CRM

1. Rode a migration **`20260322000000_verification_evolution_instances.sql`** (coluna `whatsapp_evolution_instance`).
2. **Gestão de Lojas:** seção MASTER — salve número + **instância Evolution do master** (grava `master_evolution_instance`).
3. Em **Ver detalhes** da barbearia — informe a **instância Evolution da loja** (WhatsApp do dono, para mandar código aos clientes).

## Deploy

```bash
npx supabase functions deploy send-whatsapp-verification --project-ref SEU_REF
```

Secret opcional: **`MASTER_EVOLUTION_INSTANCE`** (se não usar só CRM).
