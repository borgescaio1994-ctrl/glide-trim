-- Enable RLS on phone_verifications table
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert phone verifications (for sending codes)
CREATE POLICY "Anyone can insert phone verifications" ON public.phone_verifications
  FOR INSERT WITH CHECK (true);

-- Allow anyone to select phone verifications for verification (temporary, should be restricted)
CREATE POLICY "Anyone can select phone verifications for verification" ON public.phone_verifications
  FOR SELECT USING (true);

-- Allow anyone to update phone verifications (for marking as verified)
CREATE POLICY "Anyone can update phone verifications" ON public.phone_verifications
  FOR UPDATE USING (true);