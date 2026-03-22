-- ============================================================
-- CRM / Franquias: Plano, Vencimento e Pagamento Pendente
-- ============================================================

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'Bronze';

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS billing_due_at DATE;

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS payment_pending BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_establishments_billing_due_at
  ON public.establishments (billing_due_at);

CREATE INDEX IF NOT EXISTS idx_establishments_payment_pending
  ON public.establishments (payment_pending);

