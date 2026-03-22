# Limpar usuários e manter só o admin

Se quiser apagar todos os perfis exceto o do admin, use o **SQL Editor** do Supabase.

## 1. Manter só por role

Remove da tabela `profiles` quem **não** for `admin`:

```sql
DELETE FROM public.profiles
WHERE (role IS NULL OR role != 'admin');
```

## 2. Manter só por email

Substitua `'admin@seuemail.com'` pelo email do admin:

```sql
DELETE FROM public.profiles
WHERE email != 'admin@seuemail.com';
```

## 3. Usuários de login (auth.users)

A tabela `profiles` é só perfil. Para remover os logins dos usuários deletados:

- Abra no Supabase: **Authentication → Users**
- Apague manualmente os usuários que não forem o admin

Ou use a API do Supabase (service role) para deletar em `auth.users`.

---

Depois de rodar o SQL e (se quiser) limpar em Authentication, só o admin continuará com acesso.
