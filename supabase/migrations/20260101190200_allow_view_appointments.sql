-- Allow all users to view appointments for booking purposes
CREATE POLICY "Anyone can view appointments for booking" ON public.appointments
  FOR SELECT USING (true);

-- Allow authenticated users to insert appointments
CREATE POLICY "Authenticated users can insert appointments" ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own appointments
CREATE POLICY "Users can update their own appointments" ON public.appointments
  FOR UPDATE USING (auth.uid() = client_id);