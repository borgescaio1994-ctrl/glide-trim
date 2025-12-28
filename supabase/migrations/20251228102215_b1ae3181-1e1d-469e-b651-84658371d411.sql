-- Create table for home page settings
CREATE TABLE public.home_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hero_image_url text,
  title text NOT NULL DEFAULT 'BarberPro',
  subtitle text DEFAULT 'Agende seu horário com os melhores barbeiros',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view home settings
CREATE POLICY "Anyone can view home settings"
ON public.home_settings
FOR SELECT
USING (true);

-- Only admins can manage home settings
CREATE POLICY "Admins can manage home settings"
ON public.home_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.home_settings (title, subtitle) VALUES ('BarberPro', 'Agende seu horário com os melhores barbeiros');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_home_settings_updated_at
BEFORE UPDATE ON public.home_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();