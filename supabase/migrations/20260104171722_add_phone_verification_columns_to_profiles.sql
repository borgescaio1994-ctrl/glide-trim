-- Add phone verification columns to profiles table
ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN verification_code TEXT;
ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;