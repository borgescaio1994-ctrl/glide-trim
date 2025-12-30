-- Update the handle_new_user function to check registered_barbers table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_registered_barber BOOLEAN := false;
  registered_barber_name TEXT;
BEGIN
  -- Check if the email is in registered_barbers table
  SELECT true, full_name INTO is_registered_barber, registered_barber_name
  FROM public.registered_barbers
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  -- Insert profile with appropriate role
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(registered_barber_name, NEW.raw_user_meta_data ->> 'full_name', 'Usuário'),
    NEW.email,
    CASE 
      WHEN is_registered_barber = true THEN 'barber'::user_role
      ELSE COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'client'::user_role)
    END
  );
  
  RETURN NEW;
END;
$$;