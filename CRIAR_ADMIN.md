# Criar perfil de administrador (BarberPro)

1. Acesse o Supabase Dashboard → Authentication → Users → Add user.
2. Crie o usuário com o email que será o admin.
3. No banco, na tabela `profiles`, defina para esse usuário:
   - `role`: `'admin'` ou `'superadmin'`
   - `is_verified`: `true`

Para o app não listar esse email na lista de barbeiros, configure no `.env`:

```env
VITE_SUPERADMIN_EMAIL=seu-email-admin@exemplo.com
```
