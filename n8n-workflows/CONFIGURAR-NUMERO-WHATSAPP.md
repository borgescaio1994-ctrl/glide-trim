# Onde configurar o número 11 97715-4516 (quem dispara as mensagens)

O número que **envia** as mensagens (código de verificação, confirmação, etc.) **não** é configurado no n8n. Ele é configurado na **Evolution API**.

---

## 1. Evolution API (aqui você configura o número)

A Evolution API é quem tem a conexão com o WhatsApp. O número que aparece para o cliente é o **celular conectado na instância**.

1. Acesse o painel da **Evolution API** (no seu caso: `http://72.60.159.183:8080` ou o painel que você usa para gerenciar instâncias).
2. Crie uma **instância** (ou use uma existente, ex: `caio_zap`).
3. Conecte o **WhatsApp do número 11 97715-4516** nessa instância (QR Code ou link).
4. Anote o **nome da instância** (ex: `caio_zap`) – é isso que o n8n usa na URL.

Enquanto o WhatsApp conectado na Evolution for o **11 97715-4516**, todas as mensagens enviadas por esse workflow sairão desse número.

---

## 2. n8n (só aponta para a instância)

No n8n você **não** coloca o número da barbearia. Você só diz **qual instância** da Evolution usar.

- No workflow **Verificação WhatsApp** (e nos outros que enviam WhatsApp), o nó **"Enviar WhatsApp"** está assim:
  - **URL:** `http://72.60.159.183:8080/message/sendText/caio_zap`
- O último trecho da URL (`caio_zap`) é o **nome da instância** na Evolution.
- Se você criou outra instância na Evolution (por exemplo `barbearia`), troque na URL:
  - `.../message/sendText/barbearia`

**Onde alterar no n8n:**
1. Abra o n8n (ex: `http://72.60.159.183:5678`).
2. Abra o workflow **BookNow - Verificação WhatsApp** (ou o que envia mensagens).
3. Clique no nó **"Enviar WhatsApp"** (HTTP Request).
4. No campo **URL**, veja o final: `/message/sendText/NOME_DA_INSTANCIA`.
5. Troque `NOME_DA_INSTANCIA` pelo nome da instância que tem o 11 97715-4516 conectado na Evolution.

---

## Resumo

| Onde              | O que configurar |
|-------------------|------------------|
| **Evolution API** | Conectar o WhatsApp **11 97715-4516** em uma instância (ex: `caio_zap`). |
| **n8n**           | No nó "Enviar WhatsApp", URL terminando em `/message/sendText/NOME_DA_INSTANCIA` com o nome dessa instância. |

Assim, o mesmo número (11 97715-4516) será o que abre no app ao clicar no botão e o que dispara as mensagens via n8n/Evolution.
