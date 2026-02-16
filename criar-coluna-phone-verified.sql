-- CRIAR COLUNA phone_verified SE NÃO EXISTIR
ALTER TABLE profiles ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;

-- VERIFICAR SE A COLUNA FOI CRIADA CORRETAMENTE
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
AND column_name IN ('phone', 'phone_verified')
ORDER BY column_name;

-- ATUALIZAR REGISTROS EXISTENTES PARA phone_verified = true
-- SE JÁ TIVEREM TELEFONE, CONSIDERAR COMO VERIFICADOS
UPDATE profiles 
SET phone_verified = true 
WHERE phone IS NOT NULL 
AND phone != '';

-- VERIFICAR RESULTADO DA ATUALIZAÇÃO
SELECT 
    id,
    phone,
    phone_verified
FROM profiles 
WHERE phone IS NOT NULL 
LIMIT 5;
