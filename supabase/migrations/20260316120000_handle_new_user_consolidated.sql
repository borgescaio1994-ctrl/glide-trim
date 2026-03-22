-- Consolida handle_new_user: profile_role, lista registered_barbers e metadata role=barber

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_registered_barber BOOLEAN := false;
  registered_barber_name TEXT;
  meta_role text;
  resolved_user_role public.user_role;
  resolved_profile_role public.profile_role;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.registered_barbers rb
    WHERE LOWER(rb.email) = LOWER(NEW.email)
  ) INTO is_registered_barber;

  SELECT rb.full_name INTO registered_barber_name
  FROM public.registered_barbers rb
  WHERE LOWER(rb.email) = LOWER(NEW.email)
  LIMIT 1;

  meta_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'client');

  IF is_registered_barber OR LOWER(TRIM(meta_role)) = 'barber' THEN
    resolved_user_role := 'barber'::public.user_role;
    resolved_profile_role := 'BARBER'::public.profile_role;
  ELSE
    BEGIN
      resolved_user_role := COALESCE((meta_role)::public.user_role, 'client'::public.user_role);
    EXCEPTION WHEN OTHERS THEN
      resolved_user_role := 'client'::public.user_role;
    END;

    IF resolved_user_role = 'barber'::public.user_role THEN
      resolved_profile_role := 'BARBER'::public.profile_role;
    ELSE
      resolved_profile_role := 'CUSTOMER'::public.profile_role;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, profile_role)
  VALUES (
    NEW.id,
    COALESCE(registered_barber_name, NEW.raw_user_meta_data ->> 'full_name', 'Usuário'),
    NEW.email,
    resolved_user_role,
    resolved_profile_role
  );
  RETURN NEW;
END;
$$;
