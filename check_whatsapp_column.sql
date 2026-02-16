-- Verificar se a coluna whatsapp_number existe na tabela profiles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'whatsapp_number';
