-- 1) Evita vazamento multi-tenant: perfil NULL ou legado não deve usar a política de "cliente"
--    para ler barbeiros de TODAS as lojas (status=true).
DROP POLICY IF EXISTS "profiles_customer_anon_read_barbers" ON public.profiles;

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
  AND (
    auth.uid() IS NULL
    OR public.current_profile_role() = 'CUSTOMER'
    OR (
      public.current_profile_role() IS NULL
      AND NOT (
        public.is_admin_barber(auth.uid())
        OR public.is_barber(auth.uid())
        OR public.is_super_admin(auth.uid())
      )
    )
  )
);

-- 2) Lista legada por unidade (evita "cadastro aparecer em todas as lojas" no painel)
ALTER TABLE public.registered_barbers
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_registered_barbers_establishment_id ON public.registered_barbers(establishment_id);

ALTER TABLE public.registered_barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registered_barbers_superadmin_all" ON public.registered_barbers;
DROP POLICY IF EXISTS "registered_barbers_admin_read" ON public.registered_barbers;
DROP POLICY IF EXISTS "registered_barbers_admin_delete" ON public.registered_barbers;
DROP POLICY IF EXISTS "registered_barbers_admin_insert" ON public.registered_barbers;
DROP POLICY IF EXISTS "registered_barbers_admin_update" ON public.registered_barbers;

CREATE POLICY "registered_barbers_superadmin_all"
ON public.registered_barbers
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "registered_barbers_admin_read"
ON public.registered_barbers
FOR SELECT
USING (
  public.is_admin_barber(auth.uid())
  AND establishment_id IS NOT NULL
  AND establishment_id = public.current_user_establishment_id()
);

CREATE POLICY "registered_barbers_admin_delete"
ON public.registered_barbers
FOR DELETE
USING (
  public.is_admin_barber(auth.uid())
  AND establishment_id IS NOT NULL
  AND establishment_id = public.current_user_establishment_id()
);
