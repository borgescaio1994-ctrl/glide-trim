-- Create table for pre-registered barbers (only admin can add)
CREATE TABLE public.registered_barbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.registered_barbers ENABLE ROW LEVEL SECURITY;

-- Anyone can view registered barbers (to check during signup)
CREATE POLICY "Anyone can view registered barbers"
ON public.registered_barbers
FOR SELECT
USING (true);

-- Only admins can insert registered barbers
CREATE POLICY "Admins can insert registered barbers"
ON public.registered_barbers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update registered barbers
CREATE POLICY "Admins can update registered barbers"
ON public.registered_barbers
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete registered barbers
CREATE POLICY "Admins can delete registered barbers"
ON public.registered_barbers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster email lookups
CREATE INDEX idx_registered_barbers_email ON public.registered_barbers(email);