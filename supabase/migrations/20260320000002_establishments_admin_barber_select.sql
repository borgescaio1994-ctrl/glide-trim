-- Permitir que ADMIN_BARBER consulte sua própria barbearia (subscription_status etc.)
-- para aplicar as travas de inadimplência e limites de plano.

DROP POLICY IF EXISTS "establishments_admin_barber_select_own" ON public.establishments;

CREATE POLICY "establishments_admin_barber_select_own"
ON public.establishments
FOR SELECT
USING (
  public.is_admin_barber(auth.uid())
  AND id = public.current_user_establishment_id()
);

