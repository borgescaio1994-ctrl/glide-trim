# n8n pediu para criar usuário de novo — como recuperar o acesso

## Importante

**Alterações neste repositório** (workflows `.json`, Edge Functions do Supabase, docs) **não** apagam usuário nem senha do n8n.  
O n8n guarda isso no **banco de dados / volume** do **servidor onde o Docker roda** (ex.: seu VPS `72.60.159.183`).

Se apareceu o assistente de **“criar primeiro usuário”** de novo, em geral é um destes casos:

| Causa | O que aconteceu |
|--------|------------------|
| **Volume Docker perdido** | Container recriado sem `-v` apontando para o mesmo diretório de dados. |
| **`N8N_ENCRYPTION_KEY` mudou** | n8n não consegue ler credenciais antigas; pode parecer instalação nova ou falhar login. |
| **Banco SQLite/Postgres novo** | Pasta `~/.n8n` ou volume vazio; n8n acha que é primeira execução. |
| **Outra URL/porta** | Você abriu outra instância (ex.: `localhost` vs IP do VPS). |

---

## O que fazer (no servidor, não no código do BookNow)

1. **Confirme a URL**  
   Acesse exatamente o endereço que você usava antes (ex.: `http://72.60.159.183:5678`). Se abrir outro host, pode ser outra instância “zerada”.

2. **Docker Compose / run — volume de dados**  
   O n8n precisa de **volume persistente** para `~/.n8n` (SQLite) ou um **Postgres** fixo.  
   Exemplo de ideia (ajuste ao seu compose real):
   ```yaml
   volumes:
     - n8n_data:/home/node/.n8n
   ```
   Se você removeu o volume ou trocou o nome, os usuários “somem”.

3. **`N8N_ENCRYPTION_KEY`**  
   Deve ser **a mesma chave** de sempre. Se mudar após já ter dados, o n8n pode exigir setup de novo ou dar erro de credenciais.  
   Documentação n8n: mantenha a key estável em produção.

4. **Backup**  
   Se você tem backup da pasta de dados do n8n ou dump do Postgres, **restaure** no volume/banco correto e suba o container de novo.

5. **Se não tiver backup**  
   Você precisará **criar de novo** o usuário owner no assistente e **reimportar** os workflows (`verificacao-whatsapp.json`, etc.) e **reativar** webhooks.  
   Atualize os secrets no Supabase (`N8N_WEBHOOK_*`) com as **novas** URLs Production dos webhooks, se os UUIDs mudarem.

---

## Resumo

- **Não há “reverter alteração no Git”** que devolva o login do n8n — isso é **infraestrutura** (volume + encryption key + mesma instância).
- Se quiser, envie como você sobe o n8n (trecho do `docker-compose.yml` ou comando `docker run`) para revisar volume e variáveis.
