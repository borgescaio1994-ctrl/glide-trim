# Establishments e Super Admin

## 1. Rodar a migration

No Supabase (Dashboard → SQL Editor) ou via CLI:

```bash
supabase db push
```

Ou execute o conteúdo de `supabase/migrations/20260318000000_establishments_and_roles.sql` no SQL Editor.

## 2. SUPER_ADMIN (gestão geral)

O primeiro SUPER_ADMIN está definido na migration: **borgescaio1994@gmail.com**.  
Não há botão "Super Admin" no menu; o acesso é pela URL `/super-admin` (por exemplo, após fazer login em "Sou barbeiro").

## 3. Hierarquia de usuários (profile_role)

| Role         | Descrição |
|-------------|-----------|
| SUPER_ADMIN | Acesso total; lista todas as barbearias; rota `/super-admin` |
| ADMIN_BARBER| Dono da barbearia; vê apenas a unidade dele (establishment_id do perfil) |
| BARBER      | Barbeiro da unidade |
| CUSTOMER    | Cliente |

## 4. HTTPS e domínios DuckDNS

Fluxo usual: **um domínio DuckDNS por barbearia** (`loja.duckdns.org`), IP apontando para o servidor, `custom_domain` igual no cadastro; no servidor use **`scripts/ssl-duckdns/obter-certificado.sh`**. Veja **[HTTPS-DUCKDNS-AUTOMATICO.md](./HTTPS-DUCKDNS-AUTOMATICO.md)**.

## 5. Identificação da barbearia (domínio / path)

O hook `useEstablishment()` identifica a barbearia por:

- **Domínio:** `barbearia-stoffels.duckdns.org` → slug `barbearia-stoffels` (primeiro segmento do hostname)
- **Path:** `/e/barbearia-stoffels` ou `/estabelecimento/barbearia-stoffels` → slug `barbearia-stoffels`
- **Fallback (dev):** variável de ambiente `VITE_DEFAULT_ESTABLISHMENT_SLUG`

O slug deve ser único na tabela `establishments` e igual ao cadastrado ao criar a barbearia.

## 6. RLS (segurança)

- **SUPER_ADMIN:** vê e edita tudo (appointments, services, barber_schedules, profiles, establishments).
- **ADMIN_BARBER:** só vê/edita registros onde `establishment_id` é o do perfil dele.
- Clientes e barbeiros continuam com as políticas de “próprio perfil” e “próprios agendamentos”.

## 7. Painel Super Admin

- Rota: `/super-admin` (protegida: só `profile_role = 'SUPER_ADMIN'`).
- Lista de barbearias e botão **Cadastrar Nova Barbearia**.
- Nova barbearia: `/super-admin/new` (nome, slug, logo_url, primary_color, status).

## 8. Vincular ADMIN_BARBER (Ozéias) à barbearia

Para o dono da barbearia ver só a unidade dele:

1. Crie a barbearia em **Super Admin** (ex.: slug `barbearia-stoffels`).
2. No Supabase, atualize o perfil do Ozéias com o `establishment_id` dessa barbearia e o role:

```sql
UPDATE public.profiles
SET establishment_id = (SELECT id FROM public.establishments WHERE slug = 'barbearia-stoffels' LIMIT 1),
    profile_role = 'ADMIN_BARBER'
WHERE email = 'ozeias@exemplo.com';
```

Depois disso, ao logar como Ozéias, o Painel Admin mostrará apenas dados dessa unidade.
