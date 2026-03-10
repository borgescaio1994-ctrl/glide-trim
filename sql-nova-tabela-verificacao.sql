-- CRIAR NOVA TABELA SIMPLES PARA VERIFICAÇÃO
-- Estrutura limpa e simples sem complexidades

-- 1. REMOVER TABELA ANTIGA (SE EXISTIR)
DROP TABLE IF EXISTS phone_verification_requests;

-- 2. CRIAR NOVA TABELA SIMPLES
CREATE TABLE phone_verification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' -- pending, verified, expired
);

-- 3. INSERIR ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_phone_verification_user_id ON phone_verification_requests(user_id);
CREATE INDEX idx_phone_verification_phone ON phone_verification_requests(phone_number);
CREATE INDEX idx_phone_verification_status ON phone_verification_requests(status);

-- 4. RLS POLICY SIMPLES
ALTER TABLE phone_verification_requests ENABLE ROW LEVEL SECURITY;

-- POLICY: Usuários podem ver apenas seus próprios registros
CREATE POLICY "Users can view own phone verification requests" ON phone_verification_requests
  FOR SELECT USING (auth.uid() = user_id);

-- POLICY: Usuários podem inserir seus próprios registros
CREATE POLICY "Users can insert own phone verification requests" ON phone_verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- POLICY: Usuários podem atualizar seus próprios registros
CREATE POLICY "Users can update own phone verification requests" ON phone_verification_requests
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. LIMPAR REGISTROS ANTIGOS (OPCIONAL - PODE SER UM JOB)
-- DELETE FROM phone_verification_requests WHERE created_at < NOW() - INTERVAL '24 hours';
