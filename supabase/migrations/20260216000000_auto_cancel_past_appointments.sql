-- Criar função para cancelar automaticamente agendamentos passados
CREATE OR REPLACE FUNCTION auto_cancel_past_appointments()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Atualiza agendamentos que já passaram e ainda estão como 'scheduled'
  UPDATE public.appointments 
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE status = 'scheduled' 
    AND (
      -- Data anterior a hoje
      appointment_date < CURRENT_DATE 
      OR 
      -- Data igual a hoje mas horário já passou
      (appointment_date = CURRENT_DATE AND end_time <= CURRENT_TIME)
    );
END;
$$;

-- Criar trigger para executar a função periodicamente (quando há consultas)
-- Nota: Em produção, seria melhor usar um job agendado, mas para fins de demonstração:
CREATE OR REPLACE FUNCTION check_and_cancel_past_appointments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Executa a função de cancelamento antes de qualquer consulta
  PERFORM auto_cancel_past_appointments();
  RETURN NEW;
END;
$$;

-- Criar trigger para executar quando há consultas na tabela appointments
DROP TRIGGER IF EXISTS auto_cancel_trigger ON public.appointments;
CREATE TRIGGER auto_cancel_trigger
BEFORE SELECT OR INSERT OR UPDATE ON public.appointments
FOR EACH STATEMENT
EXECUTE FUNCTION check_and_cancel_past_appointments();

-- Comentário para documentação
COMMENT ON FUNCTION auto_cancel_past_appointments() IS 'Cancela automaticamente agendamentos que já passaram';
COMMENT ON FUNCTION check_and_cancel_past_appointments() IS 'Trigger que verifica e cancela agendamentos passados';
