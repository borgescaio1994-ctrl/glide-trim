-- Adicionar colunas que podem estar faltando para compatibilidade total
-- Execute este SQL se necessário

-- 1. Adicionar coluna whatsapp_number se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- 2. Adicionar coluna phone_verified se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- 3. Sincronizar dados existentes
UPDATE public.profiles 
SET whatsapp_number = phone_number 
WHERE whatsapp_number IS NULL AND phone_number IS NOT NULL;

UPDATE public.profiles 
SET phone_verified = is_verified 
WHERE phone_verified IS NULL AND is_verified IS NOT NULL;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON public.profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp_number ON public.profiles(whatsapp_number);

-- 5. Verificar estrutura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('phone', 'phone_number', 'whatsapp_number', 'is_verified', 'phone_verified')
ORDER BY column_name;
