-- Criar tabela phone_verifications se não existir
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_code ON phone_verifications(verification_code);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);

-- Habilitar RLS
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção
CREATE POLICY "Allow insert for phone verification" ON phone_verifications
  FOR INSERT WITH CHECK (true);

-- Política para permitir seleção
CREATE POLICY "Allow select for phone verification" ON phone_verifications
  FOR SELECT USING (true);

-- Política para permitir update
CREATE POLICY "Allow update for phone verification" ON phone_verifications
  FOR UPDATE WITH CHECK (true);
