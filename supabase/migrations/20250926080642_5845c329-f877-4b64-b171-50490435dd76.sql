-- Create schools table for Frankfurt international schools
CREATE TABLE public.schools (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  short_name text,
  type text NOT NULL DEFAULT 'international',
  city text NOT NULL DEFAULT 'Frankfurt am Main',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read schools
CREATE POLICY "Authenticated users can view schools" 
ON public.schools 
FOR SELECT 
TO authenticated
USING (true);

-- Insert Frankfurt international schools
INSERT INTO public.schools (name, short_name, type) VALUES
('International School of Frankfurt', 'ISF', 'international'),
('Frankfurt International School', 'FIS', 'international'),
('Metropolitan School Frankfurt', 'MSF', 'international'),
('European School Frankfurt', 'ESF', 'international'),
('Strothoff International School', 'SIS', 'international'),
('International Bilingual School', 'IBS', 'international'),
('Frankfurt American School', 'FAS', 'international'),
('Lycée Français Victor Hugo', 'LFVH', 'international'),
('Phorms Frankfurt City', 'Phorms', 'international'),
('Frankfurt International Montessori School', 'FIMS', 'international'),
('International Gymnasium Walldorf', 'IGW', 'international'),
('English Theatre Frankfurt International School', 'ETF', 'international'),
('Goethe University Frankfurt', 'GUF', 'university'),
('Frankfurt University of Applied Sciences', 'FUAS', 'university'),
('European Business School', 'EBS', 'university'),
('Städel Academy', 'Städel', 'university'),
('Frankfurt School of Finance & Management', 'FS', 'university');

-- Create an index for faster searching
CREATE INDEX idx_schools_name ON public.schools(name);
CREATE INDEX idx_schools_short_name ON public.schools(short_name);