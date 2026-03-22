-- Garantir que borgescaio1994@gmail.com seja SUPER_ADMIN (gestão geral).
-- Pode rodar mesmo se a migration anterior já foi aplicada.
UPDATE public.profiles
SET profile_role = 'SUPER_ADMIN'
WHERE email = 'borgescaio1994@gmail.com';
