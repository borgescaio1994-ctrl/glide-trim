# Workflow n8n – Lembrete 15 dias (reagendar)

Dispara **todo dia às 9h** (cron `0 9 * * *`), busca clientes com último atendimento **concluído** entre **14 e 16 dias atrás** (janela ~15 dias) e envia lembrete no WhatsApp via **Evolution API**.

## Fluxo

1. **Todo dia 9h** – Schedule Trigger.
2. **Buscar clientes (15 dias)** – `GET` na Edge Function **`get-15day-reminder-list`** (Supabase).
3. **Montar mensagem e URL Evolution** – um item por cliente; monta `sendUrl` com `evolution_instance` (por barbearia ou master).
4. **Enviar lembrete (Evolution)** – `POST` com header `apikey` (mesmo padrão dos workflows de verificação/confirmação).

## Edge Function `get-15day-reminder-list`

- Retorno: `{ clients: [ { phone, full_name, establishment_id, sender_phone, evolution_instance } ] }`.
- **`evolution_instance`**: `establishments.whatsapp_evolution_instance` ou fallback `master_evolution_instance` / `MASTER_EVOLUTION_INSTANCE` / `caio_zap`.
- Em **`supabase/config.toml`**: `verify_jwt = false` para o n8n poder chamar sem JWT.

**Deploy** (após alterações):

```bash
npx supabase functions deploy get-15day-reminder-list --project-ref rubvkpxvgffmnloaxbqa
```

## Ajustar URL da Edge no n8n

No nó **Buscar clientes (15 dias)**, a URL padrão é:

`https://rubvkpxvgffmnloaxbqa.supabase.co/functions/v1/get-15day-reminder-list`

Se o seu projeto for outro, troque o host/ref.

## Evolution

No nó **Enviar lembrete (Evolution)**:

- **URL:** `={{ $json.sendUrl }}` (já configurado).
- **Header `apikey`:** substitua `COLE_AQUI_A_CHAVE_GLOBAL_DA_EVOLUTION` pela API key global (texto fixo), igual aos outros workflows.

## Mensagem

O texto está no nó **Montar mensagem e URL Evolution**; edite o `message` em JavaScript se quiser outro copy.

## Importar

Menu n8n → **Import from File** → `lembrete-15-dias.json` → **ative** o workflow.

---

## Testar a mensagem no WhatsApp (sem esperar o cron)

1. Abra **`testar-lembrete-15-dias.ps1`** na pasta `n8n-workflows`.
2. Preencha **`$telefoneComDDD`** (seu número), **`$apikeyEvolution`** (mesma chave do n8n) e, se precisar, **`$instancia`**.
3. No PowerShell, na pasta do projeto:
   ```powershell
   cd c:\Users\lenovo\Desktop\projetodevbarberpro\glide-trim\n8n-workflows
   .\testar-lembrete-15-dias.ps1
   ```
4. Opcional — só ver quem a Edge retornaria hoje (janela 14–16 dias), **sem enviar** WhatsApp:
   ```powershell
   .\testar-lembrete-15-dias.ps1 -ListarApenas
   ```
   Se `clients` vier vazio, é normal: ninguém completou atendimento nessa janela; o script direto acima ainda envia o texto de teste para o número que você configurou.
