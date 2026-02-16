-- Verificar estrutura da tabela phone_verifications
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name = 'phone_verifications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar se tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'phone_verifications'
) AS table_exists;

-- Verificar dados recentes
SELECT 
    id,
    phone_number,
    verification_code,
    expires_at,
    created_at,
    used_at
FROM phone_verifications 
ORDER BY created_at DESC 
LIMIT 10;
