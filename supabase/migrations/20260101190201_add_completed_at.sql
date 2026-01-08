-- Add completed_at column to track when appointment was completed
ALTER TABLE public.appointments ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;