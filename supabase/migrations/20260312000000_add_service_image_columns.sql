-- Foto por serviço: barbeiro pode subir uma imagem por serviço, exibida em miniatura ao cliente
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_name TEXT;

COMMENT ON COLUMN public.services.image_url IS 'URL pública da foto do serviço (storage)';
COMMENT ON COLUMN public.services.image_name IS 'Nome do arquivo no bucket para referência';

-- Bucket para fotos dos serviços (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('services', 'services', true)
ON CONFLICT (id) DO NOTHING;

-- Barbeiros podem fazer upload em service-images/ (path livre por barber_id via RLS se necessário)
-- Leitura pública para exibir miniaturas ao cliente
DROP POLICY IF EXISTS "Anyone can view service images" ON storage.objects;
CREATE POLICY "Anyone can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'services');

DROP POLICY IF EXISTS "Barbers can upload service images" ON storage.objects;
CREATE POLICY "Barbers can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'services');
