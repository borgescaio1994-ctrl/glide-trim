-- ============================================================
-- Establishments: domínio customizado por unidade (anti-mistura)
-- ============================================================

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- Evita duplicidade (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS establishments_custom_domain_unique
ON public.establishments (lower(custom_domain))
WHERE custom_domain IS NOT NULL AND custom_domain <> '';

