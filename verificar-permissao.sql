-- VERIFICAR ESTRUTURA COMPLETA DA TABELA PROFILES
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- VERIFICAR POLÍTICAS RLS ATIVAS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- VERIFICAR SE RLS ESTÁ ATIVADO
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- VERIFICAR DADOS ATUAIS DO USUÁRIO
SELECT 
    id,
    email,
    phone,
    created_at,
    updated_at
FROM profiles 
WHERE email = 'cantandocomjesus1@gmail.com';
