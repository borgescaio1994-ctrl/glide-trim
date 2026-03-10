-- Opcional: coluna para o n8n marcar quando o lembrete (1h antes) foi enviado ao cliente
-- Evita enviar o mesmo lembrete mais de uma vez

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.appointments.reminder_sent_at IS 'Quando o lembrete (ex.: 1h antes) foi enviado ao cliente via WhatsApp/n8n';
