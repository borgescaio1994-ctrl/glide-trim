-- Corrigir verificação do telefone no perfil
UPDATE profiles 
SET is_verified = phone_verified 
WHERE phone_verified = true AND is_verified = false;

-- Verificar resultado
SELECT id, phone, phone_number, whatsapp_number, phone_verified, is_verified 
FROM profiles 
WHERE phone IS NOT NULL;
