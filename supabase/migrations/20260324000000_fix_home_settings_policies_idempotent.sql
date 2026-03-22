-- ============================================================
-- Fix: ensure home settings + storage policies are present
-- (idempotent, safe to re-apply across environments)
-- ============================================================

-- 1) Columns (if not exist)
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS home_title TEXT,
  ADD COLUMN IF NOT EXISTS home_subtitle TEXT;

-- 2) ADMIN_BARBER can update own establishment home fields (requires active subscription)
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

-- 3) Storage policies for home-assets bucket
-- Any user can view assets in bucket 'home-assets'
DROP POLICY IF EXISTS "home_assets_public_select" ON storage.objects;
DROP POLICY IF EXISTS "home_assets_admin_barber_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "home_assets_admin_barber_update_own" ON storage.objects;
DROP POLICY IF EXISTS "home_assets_admin_barber_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "home_assets_superadmin_all" ON storage.objects;

CREATE POLICY "home_assets_public_select"
ON storage.objects
FOR SELECT
USING (bucket_id = 'home-assets');

-- ADMIN_BARBER can insert/update/delete only under their establishment folder
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

-- SUPER_ADMIN: all
CREATE POLICY "home_assets_superadmin_all"
ON storage.objects
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

