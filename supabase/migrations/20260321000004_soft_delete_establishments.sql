-- ============================================================
-- Soft delete de barbearias (para sair da lista do SUPER_ADMIN)
-- ============================================================

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_establishments_deleted_at
ON public.establishments(deleted_at);

