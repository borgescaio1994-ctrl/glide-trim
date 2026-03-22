-- Cliente: vínculo à loja no cadastro (raw_user_meta_data.establishment_id)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_registered_barber BOOLEAN := false;
  registered_barber_name TEXT;
  meta_role text;
  meta_est text;
  cust_est uuid;
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
  meta_est := NEW.raw_user_meta_data ->> 'establishment_id';
  cust_est := NULL;

  IF meta_est IS NOT NULL
     AND meta_est ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    IF EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = meta_est::uuid AND e.status = true) THEN
      cust_est := meta_est::uuid;
    END IF;
  END IF;

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

  INSERT INTO public.profiles (id, full_name, email, role, profile_role, establishment_id)
  VALUES (
    NEW.id,
    COALESCE(registered_barber_name, NEW.raw_user_meta_data ->> 'full_name', 'Usuário'),
    NEW.email,
    resolved_user_role,
    resolved_profile_role,
    CASE
      WHEN resolved_profile_role = 'CUSTOMER'::public.profile_role THEN cust_est
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;
