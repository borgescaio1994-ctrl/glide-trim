-- VERIFICAR SE A COLUNA phone_verified EXISTE NA TABELA PROFILES
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
AND column_name IN ('phone', 'phone_verified', 'verified')
ORDER BY column_name;

-- VERIFICAR ESTRUTURA COMPLETA DA TABELA PROFILES
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- SE phone_verified NÃO EXISTIR, CRIAR A COLUNA
-- DESCOMENTE A LINHA ABAIXO SE NECESSÁRIO
-- ALTER TABLE profiles ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;

-- VERIFICAR DADOS ATUAIS PARA VER SE phone_verified EXISTE
SELECT 
    id,
    phone,
    phone_verified,
    verified
FROM profiles 
WHERE id = 'SEU_USER_ID_AQUI'
LIMIT 1;
