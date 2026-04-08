-- Visibilidade na vitrine do cliente: quando false, o profissional não aparece na home pública
-- nem pode ser agendado por clientes (RLS + app). Dono pode ficar só administrador sem atuar como barbeiro na vitrine.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS visible_on_client_home boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.visible_on_client_home IS
  'Se true, o profissional aparece na vitrine e pode receber agendamentos públicos. ADMIN_BARBER com false atua só como admin no app.';

-- Clientes/anônimos só enxergam profissionais marcados como visíveis
DROP POLICY IF EXISTS "profiles_customer_anon_read_barbers" ON public.profiles;

CREATE POLICY "profiles_customer_anon_read_barbers"
ON public.profiles
FOR SELECT
USING (
  profile_role IN ('BARBER','ADMIN_BARBER')
  AND COALESCE(visible_on_client_home, true) = true
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

-- Barbeiros não podem alterar a própria visibilidade na vitrine (só admin da unidade ou super admin)
CREATE OR REPLACE FUNCTION public.profiles_enforce_visible_on_client_home_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.visible_on_client_home IS DISTINCT FROM OLD.visible_on_client_home THEN
    IF auth.uid() IS NOT NULL
       AND NOT (public.is_admin_barber(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
      RAISE EXCEPTION 'Apenas o administrador da loja pode alterar a visibilidade na vitrine.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_visible_on_client_home ON public.profiles;
CREATE TRIGGER trg_profiles_visible_on_client_home
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_enforce_visible_on_client_home_update();
