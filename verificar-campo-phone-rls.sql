-- VERIFICAR ESTRUTURA DA TABELA PROFILES
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- VERIFICAR SE CAMPO PHONE EXISTE
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
AND column_name = 'phone';

-- VERIFICAR POLÍTICAS RLS ATUAIS
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
WHERE tablename = 'profiles'
ORDER BY policyname;

-- VERIFICAR SE RLS ESTÁ ATIVADO
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- CRIAR POLÍTICA RLS SE NÃO EXISTIR
-- Esta política permite que usuários autenticados atualizem seu próprio perfil
CREATE POLICY IF NOT EXISTS "Users can update own profile enhanced"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- VERIFICAR SE USUÁRIO TEM PERMISSÃO (TESTE)
-- Substitua 'SEU_USER_ID' pelo ID real do usuário
SELECT 
    auth.uid() as current_user_id,
    id,
    phone,
    email
FROM profiles 
WHERE id = 'SEU_USER_ID';

-- VERIFICAR CONEXÃO DO USUÁRIO ATUAL
SELECT 
    auth.uid() as current_auth_uid,
    auth.role() as current_auth_role,
    auth.email() as current_auth_email;
