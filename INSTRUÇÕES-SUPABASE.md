# 🚨 INSTRUÇÕES PARA CORRIGIR ERRO DE VERIFICAÇÃO

## PROBLEMA:
O processo está travando na inserção do banco de dados.

## SOLUÇÃO:

### 1. ACESSAR SUPABASE DASHBOARD
- Vá para: https://supabase.com/dashboard
- Faça login com sua conta
- Selecione o seu projeto

### 2. CRIAR TABELA PHONE_VERIFICATIONS
- No menu lateral, clique em "**SQL Editor**"
- Clique em "**New Query**"
- Cole o código abaixo:

```sql
-- Criar tabela phone_verifications se não existir
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_code ON phone_verifications(verification_code);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir operações
CREATE POLICY "Allow insert for phone verification" ON phone_verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for phone verification" ON phone_verifications
  FOR SELECT USING (true);

CREATE POLICY "Allow update for phone verification" ON phone_verifications
  FOR UPDATE WITH CHECK (true);
```

### 3. EXECUTAR O SQL
- Clique no botão "**Run**" (▶️)
- Aguarde a confirmação "Success"

### 4. VERIFICAR TABELA
- No menu lateral, clique em "**Table Editor**"
- Procure pela tabela "**phone_verifications**"
- Se aparecer, a tabela foi criada com sucesso!

### 5. TESTAR NOVAMENTE
- Volte para o aplicativo
- Tente enviar o código novamente
- Deve funcionar agora!

## SE A TABELA JÁ EXISTIR:
Se receber erro "relation already exists", execute apenas:

```sql
-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'phone_verifications' 
ORDER BY ordinal_position;
```

## CONTATO:
Se ainda tiver problemas, envie o erro exato que aparecer no console.
