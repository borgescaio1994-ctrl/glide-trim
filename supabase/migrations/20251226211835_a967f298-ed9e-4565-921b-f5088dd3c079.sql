-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true);

-- Create table to track gallery images
CREATE TABLE public.barber_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.barber_gallery ENABLE ROW LEVEL SECURITY;

-- Anyone can view gallery images
CREATE POLICY "Anyone can view gallery images"
ON public.barber_gallery
FOR SELECT
USING (true);

-- Barbers can manage their own gallery
CREATE POLICY "Barbers can insert own gallery images"
ON public.barber_gallery
FOR INSERT
WITH CHECK (auth.uid() = barber_id);

CREATE POLICY "Barbers can delete own gallery images"
ON public.barber_gallery
FOR DELETE
USING (auth.uid() = barber_id);

-- Storage policies for gallery bucket
CREATE POLICY "Anyone can view gallery images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Barbers can upload gallery images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Barbers can delete own gallery images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);