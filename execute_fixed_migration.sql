-- Execute este SQL diretamente no painel do Supabase (Database > SQL Editor)

-- 1. Remover trigger antigo se existir
DROP TRIGGER IF EXISTS auto_cancel_trigger ON public.appointments;

-- 2. Remover função antiga se existir
DROP FUNCTION IF EXISTS auto_cancel_past_appointments();

-- 3. Criar função para cancelar automaticamente agendamentos passados
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
      -- Data igual a hoje mas horário já passado
      (appointment_date = CURRENT_DATE AND end_time <= CURRENT_TIME)
    );
END;
$$;

-- 4. Criar trigger para executar em INSERT e UPDATE (não SELECT)
CREATE OR REPLACE FUNCTION check_and_cancel_past_appointments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Executa a função de cancelamento antes de inserir/atualizar
  PERFORM auto_cancel_past_appointments();
  RETURN NEW;
END;
$$;

-- 5. Criar trigger para INSERT e UPDATE
CREATE TRIGGER auto_cancel_trigger
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH STATEMENT
EXECUTE FUNCTION check_and_cancel_past_appointments();

-- 6. Testar a função imediatamente
SELECT auto_cancel_past_appointments();

-- 7. Verificar se funcionou (mostra agendamentos cancelados recentemente)
SELECT 
  id, 
  appointment_date, 
  start_time, 
  end_time, 
  status,
  updated_at
FROM public.appointments 
WHERE status = 'cancelled' 
  AND updated_at > NOW() - INTERVAL '1 minute'
ORDER BY updated_at DESC;

-- 8. Mostrar agendamentos ativos restantes
SELECT 
  id, 
  appointment_date, 
  start_time, 
  end_time, 
  status
FROM public.appointments 
WHERE status = 'scheduled'
ORDER BY appointment_date, start_time;

-- Comentários para documentação
COMMENT ON FUNCTION auto_cancel_past_appointments() IS 'Cancela automaticamente agendamentos que já passados';
COMMENT ON FUNCTION check_and_cancel_past_appointments() IS 'Trigger que verifica e cancela agendamentos passados';
