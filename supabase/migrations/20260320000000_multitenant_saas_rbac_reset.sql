-- ============================================================
-- BookNow -> SaaS Multi-tenant (definitive transition)
-- ============================================================

-- ----------------------------
-- 0) Cleanup (sem manter legado)
-- ----------------------------
-- IMPORTANTE:
-- - Isso remove apenas dados operacionais e "barbers" (profiles com role barber/admin),
--   mas não remove usuários do auth.
-- - Se você quiser preservar algum tipo de registro, ajuste antes de aplicar.

TRUNCATE TABLE public.appointments RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.services RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.barber_schedules RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.registered_barbers RESTART IDENTITY CASCADE;

-- Remove barbers antigos (exceto SUPER_ADMIN)
DELETE FROM public.user_roles ur
WHERE ur.user_id IN (
  SELECT p.id
  FROM public.profiles p
  WHERE p.email <> 'borgescaio1994@gmail.com'
);

DELETE FROM public.profiles
WHERE role::text IN ('barber', 'admin')
  AND email <> 'borgescaio1994@gmail.com';

-- ----------------------------
-- 1) establishments: Plano + Billing
-- ----------------------------

DO $$ BEGIN
  CREATE TYPE public.plan_type AS ENUM ('BRONZE', 'PRATA', 'OURO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Se a tabela não existir (ex.: banco novo / migrations anteriores não rodadas),
-- cria a estrutura base antes de alterar/usar.
CREATE TABLE IF NOT EXISTS public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT,
  status BOOLEAN NOT NULL DEFAULT true,
  plan_type public.plan_type NOT NULL DEFAULT 'BRONZE',
  subscription_status BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  max_barbers INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop colunas antigas (se existirem)
ALTER TABLE public.establishments DROP COLUMN IF EXISTS plan;
ALTER TABLE public.establishments DROP COLUMN IF EXISTS billing_due_at;
ALTER TABLE public.establishments DROP COLUMN IF EXISTS payment_pending;

-- Adiciona colunas exigidas
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS plan_type public.plan_type NOT NULL DEFAULT 'BRONZE';

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS subscription_status BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS max_barbers INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_establishments_plan_type ON public.establishments(plan_type);
CREATE INDEX IF NOT EXISTS idx_establishments_subscription_status ON public.establishments(subscription_status);

-- ----------------------------
-- 1.1) Garantir types/colunas para profiles (multi-tenant RBAC)
-- ----------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('barber', 'client');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.profile_role AS ENUM ('SUPER_ADMIN', 'ADMIN_BARBER', 'BARBER', 'CUSTOMER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_role public.profile_role DEFAULT 'CUSTOMER';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_establishment_id ON public.profiles(establishment_id);

-- ----------------------------
-- 2) NOT NULL em tabelas operacionais
-- ----------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;

ALTER TABLE public.barber_schedules
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
  ALTER COLUMN establishment_id SET NOT NULL;

ALTER TABLE public.services
  ALTER COLUMN establishment_id SET NOT NULL;

ALTER TABLE public.barber_schedules
  ALTER COLUMN establishment_id SET NOT NULL;

-- ----------------------------
-- 3) Triggers: preencher establishment_id a partir do barber_id
-- ----------------------------
CREATE OR REPLACE FUNCTION public.fill_establishment_id_from_barber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.establishment_id IS NULL AND NEW.barber_id IS NOT NULL THEN
    SELECT p.establishment_id
    INTO NEW.establishment_id
    FROM public.profiles p
    WHERE p.id = NEW.barber_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_establishment_id_appointments ON public.appointments;
CREATE TRIGGER trg_fill_establishment_id_appointments
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.fill_establishment_id_from_barber();

DROP TRIGGER IF EXISTS trg_fill_establishment_id_services ON public.services;
CREATE TRIGGER trg_fill_establishment_id_services
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.fill_establishment_id_from_barber();

DROP TRIGGER IF EXISTS trg_fill_establishment_id_barber_schedules ON public.barber_schedules;
CREATE TRIGGER trg_fill_establishment_id_barber_schedules
BEFORE INSERT OR UPDATE ON public.barber_schedules
FOR EACH ROW
EXECUTE FUNCTION public.fill_establishment_id_from_barber();

-- ----------------------------
-- 4) Corrigir handle_new_user: profile_role default correto
-- ----------------------------
-- Garante que BARBER/CUSTOMER tenham profile_role consistente.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, profile_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuário'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'client'),
    CASE
      WHEN COALESCE((NEW.raw_user_meta_data ->> 'role')::text, 'client') = 'barber' THEN 'BARBER'::public.profile_role
      ELSE 'CUSTOMER'::public.profile_role
    END
  );
  RETURN NEW;
END;
$$;

-- ----------------------------
-- 5) RLS (Multi-tenant)
-- ----------------------------

-- Helpers
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND profile_role = 'SUPER_ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_establishment_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT establishment_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin_barber(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND profile_role = 'ADMIN_BARBER'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_barber(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND profile_role = 'BARBER'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_customer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND profile_role = 'CUSTOMER'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS public.profile_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profile_role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.establishment_id_from_barber(_barber_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT establishment_id FROM public.profiles WHERE id = _barber_id
$$;

-- Drop todas as policies existentes e recrie por tabela
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('establishments','profiles','appointments','services','barber_schedules')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_schedules ENABLE ROW LEVEL SECURITY;

-- establishments: SUPER_ADMIN tudo; leitura pública apenas de status=true
CREATE POLICY "establishments_superadmin_all"
ON public.establishments
FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "establishments_public_select"
ON public.establishments
FOR SELECT
USING (status = true);

-- profiles: SUPER_ADMIN tudo
CREATE POLICY "profiles_superadmin_all"
ON public.profiles
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- profiles: CUSTOMER/anon veem barbers/admins apenas em establishments status=true
CREATE POLICY "profiles_customer_anon_read_barbers"
ON public.profiles
FOR SELECT
USING (
  profile_role IN ('BARBER','ADMIN_BARBER')
  AND EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = public.profiles.establishment_id
      AND e.status = true
  )
  AND (public.current_profile_role() IS NULL OR public.current_profile_role() = 'CUSTOMER')
);

-- profiles: ADMIN_BARBER/BARBER veem barbers apenas do próprio establishment
CREATE POLICY "profiles_barbers_own_establishment_read"
ON public.profiles
FOR SELECT
USING (
  profile_role IN ('BARBER','ADMIN_BARBER')
  AND establishment_id = public.current_user_establishment_id()
  AND public.current_profile_role() IN ('ADMIN_BARBER','BARBER')
);

-- profiles: usuário vê/edita o próprio perfil
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ADMIN_BARBER: gerenciar barbers dentro do próprio establishment
CREATE POLICY "profiles_admin_barber_manage_in_est"
ON public.profiles
FOR ALL
USING (
  public.is_admin_barber(auth.uid())
  AND establishment_id = public.current_user_establishment_id()
  AND profile_role IN ('BARBER','ADMIN_BARBER')
)
WITH CHECK (
  public.is_admin_barber(auth.uid())
  AND establishment_id = public.current_user_establishment_id()
  AND profile_role IN ('BARBER','ADMIN_BARBER')
);

-- appointments
CREATE POLICY "appointments_superadmin_all"
ON public.appointments
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- ADMIN_BARBER: CRUD completo na sua unidade
CREATE POLICY "appointments_admin_barber_all"
ON public.appointments
FOR ALL
USING (
  public.is_admin_barber(auth.uid())
  AND establishment_id = public.current_user_establishment_id()
)
WITH CHECK (
  public.is_admin_barber(auth.uid())
  AND establishment_id = public.current_user_establishment_id()
);

-- BARBER: só vê/edita os próprios agendamentos
CREATE POLICY "appointments_barber_own"
ON public.appointments
FOR SELECT
USING (
  public.is_barber(auth.uid())
  AND barber_id = auth.uid()
  AND establishment_id = public.current_user_establishment_id()
);

CREATE POLICY "appointments_barber_update_own"
ON public.appointments
FOR UPDATE
USING (
  public.is_barber(auth.uid())
  AND barber_id = auth.uid()
  AND establishment_id = public.current_user_establishment_id()
)
WITH CHECK (
  public.is_barber(auth.uid())
  AND barber_id = auth.uid()
  AND establishment_id = public.current_user_establishment_id()
);

-- CUSTOMER: criar/agendar e ver apenas os próprios
CREATE POLICY "appointments_customer_insert_own"
ON public.appointments
FOR INSERT
WITH CHECK (
  public.is_customer(auth.uid())
  AND client_id = auth.uid()
  AND establishment_id = public.establishment_id_from_barber(barber_id)
);

CREATE POLICY "appointments_customer_select_own"
ON public.appointments
FOR SELECT
USING (
  public.is_customer(auth.uid())
  AND client_id = auth.uid()
  AND establishment_id = public.establishment_id_from_barber(barber_id)
);

CREATE POLICY "appointments_customer_update_own"
ON public.appointments
FOR UPDATE
USING (
  public.is_customer(auth.uid())
  AND client_id = auth.uid()
  AND establishment_id = public.establishment_id_from_barber(barber_id)
)
WITH CHECK (
  public.is_customer(auth.uid())
  AND client_id = auth.uid()
  AND establishment_id = public.establishment_id_from_barber(barber_id)
);

-- services
CREATE POLICY "services_superadmin_all"
ON public.services
FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "services_admin_barber_all"
ON public.services
FOR ALL
USING (
  public.is_admin_barber(auth.uid())
  AND establishment_id = public.current_user_establishment_id()
)
WITH CHECK (
  public.is_admin_barber(auth.uid())
  AND establishment_id = public.current_user_establishment_id()
);

-- BARBER: só seus serviços
CREATE POLICY "services_barber_all_own"
ON public.services
FOR ALL
USING (
  public.is_barber(auth.uid())
  AND barber_id = auth.uid()
  AND establishment_id = public.current_user_establishment_id()
)
WITH CHECK (
  public.is_barber(auth.uid())
  AND barber_id = auth.uid()
  AND establishment_id = public.current_user_establishment_id()
);

-- CUSTOMER/anon: serviços ativos da unidade ativa
CREATE POLICY "services_customer_anon_public_read"
ON public.services
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = public.services.establishment_id
      AND e.status = true
  )
  AND (public.current_profile_role() IS NULL OR public.current_profile_role() = 'CUSTOMER')
);

-- barber_schedules
CREATE POLICY "schedules_superadmin_all"
ON public.barber_schedules
FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "schedules_admin_barber_all"
ON public.barber_schedules
FOR ALL
USING (
  public.is_admin_barber(auth.uid())
  AND establishment_id = public.current_user_establishment_id()
)
WITH CHECK (
  public.is_admin_barber(auth.uid())
  AND establishment_id = public.current_user_establishment_id()
);

CREATE POLICY "schedules_barber_all_own"
ON public.barber_schedules
FOR ALL
USING (
  public.is_barber(auth.uid())
  AND barber_id = auth.uid()
  AND establishment_id = public.current_user_establishment_id()
)
WITH CHECK (
  public.is_barber(auth.uid())
  AND barber_id = auth.uid()
  AND establishment_id = public.current_user_establishment_id()
);

CREATE POLICY "schedules_customer_anon_public_read"
ON public.barber_schedules
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = public.barber_schedules.establishment_id
      AND e.status = true
  )
  AND (public.current_profile_role() IS NULL OR public.current_profile_role() = 'CUSTOMER')
);

