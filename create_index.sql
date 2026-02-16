CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_verifications_lookup ON public.phone_verifications (phone_number, verification_code, verified_at);
