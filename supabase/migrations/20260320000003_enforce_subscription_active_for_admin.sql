-- Enforce: ADMIN_BARBER só acessa gestão se subscription_status=true.
-- (SUPER_ADMIN continua com acesso total.)

DO $$
BEGIN
  -- appointments
  DROP POLICY IF EXISTS "appointments_admin_barber_all" ON public.appointments;

  CREATE POLICY "appointments_admin_barber_all"
  ON public.appointments
  FOR ALL
  USING (
    public.is_admin_barber(auth.uid())
    AND establishment_id = public.current_user_establishment_id()
    AND EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id = public.current_user_establishment_id()
        AND e.subscription_status = true
    )
  )
  WITH CHECK (
    public.is_admin_barber(auth.uid())
    AND establishment_id = public.current_user_establishment_id()
    AND EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id = public.current_user_establishment_id()
        AND e.subscription_status = true
    )
  );

  -- services
  DROP POLICY IF EXISTS "services_admin_barber_all" ON public.services;

  CREATE POLICY "services_admin_barber_all"
  ON public.services
  FOR ALL
  USING (
    public.is_admin_barber(auth.uid())
    AND establishment_id = public.current_user_establishment_id()
    AND EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id = public.current_user_establishment_id()
        AND e.subscription_status = true
    )
  )
  WITH CHECK (
    public.is_admin_barber(auth.uid())
    AND establishment_id = public.current_user_establishment_id()
    AND EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id = public.current_user_establishment_id()
        AND e.subscription_status = true
    )
  );

  -- barber_schedules
  DROP POLICY IF EXISTS "schedules_admin_barber_all" ON public.barber_schedules;

  CREATE POLICY "schedules_admin_barber_all"
  ON public.barber_schedules
  FOR ALL
  USING (
    public.is_admin_barber(auth.uid())
    AND establishment_id = public.current_user_establishment_id()
    AND EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id = public.current_user_establishment_id()
        AND e.subscription_status = true
    )
  )
  WITH CHECK (
    public.is_admin_barber(auth.uid())
    AND establishment_id = public.current_user_establishment_id()
    AND EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id = public.current_user_establishment_id()
        AND e.subscription_status = true
    )
  );
END $$;

