-- ============================================================
-- Home settings por unidade (establishments) + policies storage
-- ============================================================

-- 1) Campos por unidade para página inicial
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS home_title TEXT,
  ADD COLUMN IF NOT EXISTS home_subtitle TEXT;

-- 2) Permitir ADMIN_BARBER atualizar a própria unidade
DROP POLICY IF EXISTS "establishments_admin_barber_update_own" ON public.establishments;

CREATE POLICY "establishments_admin_barber_update_own"
ON public.establishments
FOR UPDATE
USING (
  public.is_admin_barber(auth.uid())
  AND id = public.current_user_establishment_id()
  AND EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = public.current_user_establishment_id()
      AND e.subscription_status = true
  )
)
WITH CHECK (
  public.is_admin_barber(auth.uid())
  AND id = public.current_user_establishment_id()
  AND EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = public.current_user_establishment_id()
      AND e.subscription_status = true
  )
);

-- 3) Storage: home-assets com pasta por establishment_id
-- Remove policies antigas (baseadas em has_role/app_role)
DROP POLICY IF EXISTS "Anyone can view home assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload home assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update home assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete home assets" ON storage.objects;

-- Idempotente: políticas podem já existir (deploy parcial / ambiente remoto)
DROP POLICY IF EXISTS "home_assets_public_select" ON storage.objects;
DROP POLICY IF EXISTS "home_assets_admin_barber_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "home_assets_admin_barber_update_own" ON storage.objects;
DROP POLICY IF EXISTS "home_assets_admin_barber_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "home_assets_superadmin_all" ON storage.objects;

-- Qualquer um pode ver imagens (bucket público)
CREATE POLICY "home_assets_public_select"
ON storage.objects
FOR SELECT
USING (bucket_id = 'home-assets');

-- ADMIN_BARBER pode inserir/atualizar/deletar apenas na sua pasta <establishment_id>/*
CREATE POLICY "home_assets_admin_barber_insert_own"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'home-assets'
  AND public.is_admin_barber(auth.uid())
  AND (storage.foldername(name))[1] = public.current_user_establishment_id()::text
  AND EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = public.current_user_establishment_id()
      AND e.subscription_status = true
  )
);

CREATE POLICY "home_assets_admin_barber_update_own"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'home-assets'
  AND public.is_admin_barber(auth.uid())
  AND (storage.foldername(name))[1] = public.current_user_establishment_id()::text
  AND EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = public.current_user_establishment_id()
      AND e.subscription_status = true
  )
);

CREATE POLICY "home_assets_admin_barber_delete_own"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'home-assets'
  AND public.is_admin_barber(auth.uid())
  AND (storage.foldername(name))[1] = public.current_user_establishment_id()::text
  AND EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = public.current_user_establishment_id()
      AND e.subscription_status = true
  )
);

-- SUPER_ADMIN: livre
CREATE POLICY "home_assets_superadmin_all"
ON storage.objects
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

