-- ============================================================
-- Plano definitions (BRONZE/PRATA/OURO) para SaaS multi-tenant
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.plan_type AS ENUM ('BRONZE', 'PRATA', 'OURO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.plans (
  plan_type public.plan_type PRIMARY KEY,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  max_barbers INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed padrão (upsert)
INSERT INTO public.plans (plan_type, description, price, payment_method, max_barbers, is_active)
VALUES
  ('BRONZE', 'Plano Bronze: até 1 barbeiro', 49.00, 'PIX', 1, true),
  ('PRATA',  'Plano Prata: até 3 barbeiros', 99.00, 'PIX', 3, true),
  ('OURO',   'Plano Ouro: sem limites', 149.00, 'PIX', 999, true)
ON CONFLICT (plan_type) DO UPDATE
SET
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  payment_method = EXCLUDED.payment_method,
  max_barbers = EXCLUDED.max_barbers,
  is_active = EXCLUDED.is_active;

-- Sync: quando plan muda, atualiza establishments.max_barbers do mesmo plan
CREATE OR REPLACE FUNCTION public.sync_establishments_max_barbers_from_plans()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.establishments
  SET max_barbers = NEW.max_barbers
  WHERE plan_type = NEW.plan_type;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_establishments_max_barbers_from_plans ON public.plans;
CREATE TRIGGER trg_sync_establishments_max_barbers_from_plans
AFTER INSERT OR UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.sync_establishments_max_barbers_from_plans();

-- RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_superadmin_all" ON public.plans;
DROP POLICY IF EXISTS "plans_public_select" ON public.plans;

CREATE POLICY "plans_superadmin_all"
ON public.plans
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "plans_public_select"
ON public.plans
FOR SELECT
USING (true);

