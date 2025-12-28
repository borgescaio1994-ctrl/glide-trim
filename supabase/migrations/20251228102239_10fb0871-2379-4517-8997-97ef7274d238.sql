-- Create storage bucket for home hero images
INSERT INTO storage.buckets (id, name, public) VALUES ('home-assets', 'home-assets', true);

-- Allow anyone to view home assets
CREATE POLICY "Anyone can view home assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'home-assets');

-- Only admins can upload home assets
CREATE POLICY "Admins can upload home assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'home-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can update home assets
CREATE POLICY "Admins can update home assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'home-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete home assets
CREATE POLICY "Admins can delete home assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'home-assets' AND has_role(auth.uid(), 'admin'::app_role));