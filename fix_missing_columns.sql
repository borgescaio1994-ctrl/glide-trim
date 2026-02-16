-- Adicionar colunas faltantes na tabela profiles
-- Estas colunas são referenciadas no código frontend mas não existem no banco

-- 1. Adicionar coluna phone_verified (para compatibilidade com is_verified)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- 2. Adicionar coluna whatsapp_number (para armazenar número do WhatsApp)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- 3. Sincronizar dados existentes (copiar phone_number para whatsapp_number se estiver vazio)
UPDATE public.profiles 
SET whatsapp_number = phone_number 
WHERE whatsapp_number IS NULL AND phone_number IS NOT NULL;

-- 4. Sincronizar phone_verified com is_verified
UPDATE public.profiles 
SET phone_verified = is_verified 
WHERE phone_verified IS NULL AND is_verified IS NOT NULL;

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON public.profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp_number ON public.profiles(whatsapp_number);

-- 6. Adicionar comentários para documentação
COMMENT ON COLUMN public.profiles.phone_verified IS 'Flag adicional para verificação de telefone (compatibilidade)';
COMMENT ON COLUMN public.profiles.whatsapp_number IS 'Número do WhatsApp para verificação e comunicação';
