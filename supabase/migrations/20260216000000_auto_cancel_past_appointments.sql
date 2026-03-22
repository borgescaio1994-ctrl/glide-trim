-- Cancelar automaticamente agendamentos passados (trigger em INSERT/UPDATE apenas;
-- PostgreSQL não suporta BEFORE SELECT em tabela.)

CREATE OR REPLACE FUNCTION auto_cancel_past_appointments()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.appointments
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE status = 'scheduled'
    AND (
      appointment_date < CURRENT_DATE
      OR (
        appointment_date = CURRENT_DATE
        AND end_time <= CURRENT_TIME
      )
    );
END;
$$;

CREATE OR REPLACE FUNCTION check_and_cancel_past_appointments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Evita recursão infinita: o UPDATE dentro de auto_cancel_past_appointments()
  -- dispara este trigger de novo; sem este guard, estoura max_stack_depth.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  PERFORM auto_cancel_past_appointments();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_cancel_trigger ON public.appointments;
CREATE TRIGGER auto_cancel_trigger
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH STATEMENT
EXECUTE FUNCTION check_and_cancel_past_appointments();

COMMENT ON FUNCTION auto_cancel_past_appointments() IS 'Cancela automaticamente agendamentos que já passaram';
COMMENT ON FUNCTION check_and_cancel_past_appointments() IS 'Trigger que verifica e cancela agendamentos passados';
