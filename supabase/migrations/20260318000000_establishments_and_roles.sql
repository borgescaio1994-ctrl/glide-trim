-- ============================================================
-- Establishments + establishment_id + profile_role + RLS
-- ============================================================

-- 1) Tabela establishments
CREATE TABLE IF NOT EXISTS public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT,
  status BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- 2) Enum para hierarquia de usuários (profiles)
DO $$ BEGIN
  CREATE TYPE public.profile_role AS ENUM ('SUPER_ADMIN', 'ADMIN_BARBER', 'BARBER', 'CUSTOMER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) Coluna profile_role em profiles (mantém role antigo para compat)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_role public.profile_role DEFAULT 'CUSTOMER';

-- Migrar: barber -> BARBER; client -> CUSTOMER
UPDATE public.profiles p
SET profile_role = CASE
  WHEN p.role::text = 'barber' THEN 'BARBER'::public.profile_role
  ELSE 'CUSTOMER'::public.profile_role
END
WHERE p.profile_role IS NULL OR p.profile_role = 'CUSTOMER';

-- Quem tem admin em user_roles vira ADMIN_BARBER (depois vincule establishment_id no painel)
UPDATE public.profiles p
SET profile_role = 'ADMIN_BARBER'::public.profile_role
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
);

-- 4) Coluna establishment_id em profiles (dono/admin e barbeiros da unidade)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_establishment_id ON public.profiles(establishment_id);

-- 5) establishment_id em appointments, services, barber_schedules
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_establishment_id ON public.appointments(establishment_id);

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_services_establishment_id ON public.services(establishment_id);

ALTER TABLE public.barber_schedules
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_barber_schedules_establishment_id ON public.barber_schedules(establishment_id);

-- 6) Tabela de mapeamento domínio/slug -> establishment (para useEstablishment)
-- O slug na URL ou hostname (ex: barbearia-stoffels.duckdns.org -> slug barbearia-stoffels)
-- já está em establishments.slug. Opcional: tabela domain_establishment se um dia houver vários domínios por estabelecimento.

-- 7) Função: usuário é SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT true FROM public.profiles WHERE id = _user_id AND profile_role = 'SUPER_ADMIN'),
    false
  );
$$;

-- 8) Função: establishment_id do usuário (para ADMIN_BARBER / BARBER)
CREATE OR REPLACE FUNCTION public.current_user_establishment_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT establishment_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 9) RLS para establishments
DROP POLICY IF EXISTS "super_admin_all_establishments" ON public.establishments;
DROP POLICY IF EXISTS "admin_barber_own_establishment" ON public.establishments;
DROP POLICY IF EXISTS "anyone_read_establishments" ON public.establishments;

CREATE POLICY "super_admin_all_establishments" ON public.establishments
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- ADMIN_BARBER só acessa o registro da própria unidade (id = establishment_id do perfil)
CREATE POLICY "admin_barber_own_establishment" ON public.establishments
  FOR ALL USING (id = public.current_user_establishment_id());

-- Leituras públicas por slug (para cliente escolher barbearia pelo domínio)
CREATE POLICY "anyone_read_establishments" ON public.establishments
  FOR SELECT USING (status = true);

-- 10) RLS appointments: SUPER_ADMIN vê tudo; ADMIN_BARBER/BARBER só do establishment
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_super_admin_all" ON public.appointments;
DROP POLICY IF EXISTS "appointments_establishment_scope" ON public.appointments;

CREATE POLICY "appointments_super_admin_all" ON public.appointments
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "appointments_establishment_scope" ON public.appointments
  FOR ALL USING (
    public.is_super_admin(auth.uid())
    OR establishment_id = public.current_user_establishment_id()
    OR client_id = auth.uid()
    OR barber_id = auth.uid()
  );

-- 11) RLS services: mesmo critério
DROP POLICY IF EXISTS "services_super_admin_all" ON public.services;
DROP POLICY IF EXISTS "services_establishment_scope" ON public.services;

CREATE POLICY "services_super_admin_all" ON public.services
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "services_establishment_scope" ON public.services
  FOR ALL USING (
    public.is_super_admin(auth.uid())
    OR establishment_id = public.current_user_establishment_id()
    OR barber_id = auth.uid()
  );

-- Leituras públicas para clientes (serviços ativos)
CREATE POLICY "services_public_read_active" ON public.services
  FOR SELECT USING (is_active = true);

-- 12) RLS barber_schedules
DROP POLICY IF EXISTS "barber_schedules_super_admin_all" ON public.barber_schedules;
DROP POLICY IF EXISTS "barber_schedules_establishment_scope" ON public.barber_schedules;

CREATE POLICY "barber_schedules_super_admin_all" ON public.barber_schedules
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "barber_schedules_establishment_scope" ON public.barber_schedules
  FOR ALL USING (
    public.is_super_admin(auth.uid())
    OR establishment_id = public.current_user_establishment_id()
    OR barber_id = auth.uid()
  );

CREATE POLICY "barber_schedules_public_read" ON public.barber_schedules
  FOR SELECT USING (true);

-- 13) RLS profiles: SUPER_ADMIN vê tudo; outros conforme establishment
DROP POLICY IF EXISTS "profiles_super_admin_all" ON public.profiles;
CREATE POLICY "profiles_super_admin_all" ON public.profiles
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Manter políticas existentes para usuário ver/atualizar próprio perfil
-- (já existem "Users can view all profiles", "Users can update own profile")

-- 14) Trigger updated_at para establishments
CREATE TRIGGER update_establishments_updated_at
  BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 15) Definir primeiro SUPER_ADMIN (gestão geral; acessa /super-admin pela URL, ex.: após "Sou barbeiro")
UPDATE public.profiles
SET profile_role = 'SUPER_ADMIN'
WHERE email = 'borgescaio1994@gmail.com';

COMMENT ON COLUMN public.profiles.profile_role IS 'SUPER_ADMIN: acesso total. ADMIN_BARBER: dono da barbearia. BARBER: barbeiro. CUSTOMER: cliente.';
COMMENT ON TABLE public.establishments IS 'Barbearias/unidades do sistema. Identificação por slug (ex: hostname barbearia-stoffels.duckdns.org -> slug barbearia-stoffels).';
