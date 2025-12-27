-- Create table for phone verification tokens
CREATE TABLE public.phone_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create verification tokens (no auth required)
CREATE POLICY "Anyone can create phone verifications" 
ON public.phone_verifications 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to read their verification by phone
CREATE POLICY "Anyone can read phone verifications" 
ON public.phone_verifications 
FOR SELECT 
USING (true);

-- Allow anyone to update their verification (mark as verified)
CREATE POLICY "Anyone can update phone verifications" 
ON public.phone_verifications 
FOR UPDATE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications(phone_number);
CREATE INDEX idx_phone_verifications_token ON public.phone_verifications(token);