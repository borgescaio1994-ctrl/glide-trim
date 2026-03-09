-- Criar tabela para verificações de telefone
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
  used_at TIMESTAMP WITH TIME ZONE NULL,
  is_used BOOLEAN DEFAULT FALSE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_number ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON phone_verifications(expires_at);

-- Habilitar RLS
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Política RLS para usuários só verem suas próprias verificações
CREATE POLICY "Users can view their own phone verifications" ON phone_verifications
  FOR SELECT USING (auth.uid() = user_id);

-- Política RLS para usuários criarem suas próprias verificações
CREATE POLICY "Users can create their own phone verifications" ON phone_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política RLS para usuários atualizarem suas próprias verificações
CREATE POLICY "Users can update their own phone verifications" ON phone_verifications
  FOR UPDATE USING (auth.uid() = user_id);
