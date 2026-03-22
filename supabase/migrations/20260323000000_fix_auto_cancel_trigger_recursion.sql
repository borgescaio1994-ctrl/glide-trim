-- Corrige recursão infinita no trigger auto_cancel_trigger:
-- UPDATE em appointments dentro do trigger disparava o mesmo trigger de novo.

CREATE OR REPLACE FUNCTION check_and_cancel_past_appointments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  PERFORM auto_cancel_past_appointments();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_and_cancel_past_appointments() IS
  'Trigger: cancela agendamentos passados; pg_trigger_depth evita recursão no UPDATE interno.';
