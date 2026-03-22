-- ============================================================
-- WhatsApp sender por barbearia + onboarding PENDENTE/ATIVO
-- + número MASTER do SUPER_ADMIN (system_settings)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.onboarding_status AS ENUM ('PENDING', 'ACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS onboarding_status public.onboarding_status NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS whatsapp_sender_phone TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_establishments_onboarding_status
ON public.establishments(onboarding_status);

-- System settings (ex.: número master do Super Admin para n8n)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_superadmin_all" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_read_authenticated" ON public.system_settings;

CREATE POLICY "system_settings_superadmin_all"
ON public.system_settings
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "system_settings_read_authenticated"
ON public.system_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

