-- GARANTIR PERMISSÃO TOTAL PARA USUÁRIOS AUTENTICADOS
-- Execute este comando se as políticas acima não funcionarem

-- 1. REMOVER POLÍTICAS ANTIGAS (SE NECESSÁRIO)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile enhanced" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 2. CRIAR POLÍTICA SIMPLIFICADA E GARANTIDA
CREATE POLICY "Users can manage own profile"
ON profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. VERIFICAR SE A POLÍTICA FOI CRIADA
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'profiles'
AND policyname = 'Users can manage own profile';

-- 4. TESTAR PERMISSÃO DO USUÁRIO ATUAL
-- Este comando deve retornar o perfil do usuário logado
SELECT 
    id,
    email,
    phone,
    full_name,
    created_at
FROM profiles 
WHERE id = auth.uid();

-- 5. VERIFICAR SE RLS ESTÁ ATIVO
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';
