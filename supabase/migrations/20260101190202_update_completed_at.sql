-- Update existing completed appointments to set completed_at
UPDATE public.appointments
SET completed_at = updated_at
WHERE status = 'completed' AND completed_at IS NULL;