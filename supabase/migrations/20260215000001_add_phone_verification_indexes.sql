-- Adicionar índices para otimizar a consulta de verificação de telefone
-- Índice composto para phone_number + verification_code + verified_at

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_verifications_lookup 
ON public.phone_verifications (phone_number, verification_code, verified_at);

-- Índice separado para phone_number (já existe mas vamos garantir)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_verifications_phone 
ON public.phone_verifications (phone_number);

-- Índice para verification_code
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_verifications_code 
ON public.phone_verifications (verification_code);

-- Índice para verified_at (para consultas de códigos não verificados)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_verifications_verified_at 
ON public.phone_verifications (verified_at);

-- Índice para created_at (para ordenação)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_verifications_created_at 
ON public.phone_verifications (created_at DESC);
