-- Allow all users to view appointments for booking purposes
CREATE POLICY "Anyone can view appointments for booking" ON public.appointments
  FOR SELECT USING (true);