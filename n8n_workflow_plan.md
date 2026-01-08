# Workflow N8N para Verificação WhatsApp

## Visão Geral
O workflow será dividido em duas partes principais:
1. **Envio de Código de Verificação**: Recebe solicitação do app, gera código, salva no banco e envia via WhatsApp.
2. **Recebimento e Validação de Respostas**: Monitora mensagens recebidas, valida códigos e atualiza status.

## Parte 1: Envio de Código de Verificação

### Nós Necessários:
1. **Webhook** (Trigger)
   - Path: `/webhook-test/whatsapp`
   - Method: POST
   - Recebe: `{ phone, user_id, action: 'start_verification' }`

2. **Function** (Gerar Código)
   - Código JavaScript:
     ```javascript
     const code = Math.floor(100000 + Math.random() * 900000).toString();
     const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos
     return { code, expiresAt };
     ```

3. **Supabase** (Inserir na tabela phone_verifications)
   - Operation: Insert
   - Table: phone_verifications
   - Data:
     - phone_number: `{{ $json.phone }}`
     - token: `{{ $node["Function"].json.code }}`
     - expires_at: `{{ $node["Function"].json.expiresAt }}`

4. **HTTP Request** (Enviar mensagem WhatsApp via WAHA)
   - Method: POST
   - URL: `http://192.168.100.23:5678/api/sendText`
   - Headers:
     - Content-Type: application/json
   - Body:
     ```json
     {
       "chatId": "{{ $json.phone }}@c.us",
       "text": "Seu código de verificação é: {{ $node[\"Function\"].json.code }}\n\nDigite este código para confirmar seu número."
     }
     ```

5. **Respond to Webhook** (Resposta ao app)
   - Response Code: 200
   - Response Body: `{ success: true, message: "Código enviado" }`

## Parte 2: Recebimento e Validação de Respostas

### Abordagem: Polling (já que webhook do WAHA pode ser complexo)
1. **Schedule Trigger** (Executa a cada 30 segundos)
   - Rule: `*/30 * * * * *`

2. **HTTP Request** (Buscar mensagens não lidas do WAHA)
   - Method: GET
   - URL: `http://192.168.100.23:5678/api/messages?chatId=all&limit=10&downloadMedia=false`

3. **Function** (Filtrar mensagens recebidas recentes)
   - Filtrar mensagens dos últimos 30 segundos, não enviadas pelo bot

4. **Supabase** (Buscar verificações pendentes)
   - Operation: Select
   - Table: phone_verifications
   - Filter: verified_at IS NULL AND expires_at > NOW()

5. **Function** (Verificar se mensagem contém código válido)
   - Para cada mensagem, verificar se o texto é um código de 6 dígitos
   - Buscar na lista de verificações pendentes se código corresponde ao phone_number

6. **Supabase** (Atualizar verificação como confirmada)
   - Operation: Update
   - Table: phone_verifications
   - Filter: id do registro encontrado
   - Data: verified_at = NOW()

7. **Supabase** (Atualizar perfil do usuário)
   - Operation: Update
   - Table: profiles
   - Filter: id = user_id da verificação
   - Data:
     - phone_number: phone_number
     - is_verified: true

8. **HTTP Request** (Enviar confirmação via WhatsApp)
   - Method: POST
   - URL: `http://192.168.100.23:5678/api/sendText`
   - Body:
     ```json
     {
       "chatId": "{{ $json.phone_number }}@c.us",
       "text": "✅ Número verificado com sucesso! Seu agendamento foi confirmado."
     }
     ```

9. **HTTP Request** (Notificar app sobre verificação - opcional)
   - Se o app tiver um endpoint para notificações, chamar aqui

## Considerações Técnicas
- **Segurança**: Validar que o phone_number é brasileiro (55...)
- **Expiração**: Verificar expires_at antes de aceitar código
- **Limpeza**: Adicionar job para remover verificações expiradas
- **Rate Limiting**: Limitar tentativas de verificação por IP/telefone

## Dependências N8N
- @n8n/nodes-base (HTTP Request, Supabase, Function, Schedule)
- Credenciais Supabase configuradas no N8N

## Teste
1. Importar workflow no N8N
2. Configurar credenciais
3. Testar envio de código
4. Responder com código via WhatsApp
5. Verificar atualização no banco