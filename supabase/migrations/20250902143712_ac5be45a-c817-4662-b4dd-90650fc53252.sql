-- Create sitters table
CREATE TABLE public.sitters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  school TEXT NOT NULL,
  grade TEXT NOT NULL,
  address TEXT NOT NULL,
  hourly_rate INTEGER NOT NULL,
  experience TEXT NOT NULL,
  special_skills TEXT,
  reference_contacts TEXT,
  transportation TEXT,
  availability JSONB DEFAULT '[]'::jsonb,
  child_age_groups JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sitters ENABLE ROW LEVEL SECURITY;

-- Create policies for sitter access
CREATE POLICY "Sitters can view their own profile" 
ON public.sitters 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Sitters can create their own profile" 
ON public.sitters 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sitters can update their own profile" 
ON public.sitters 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sitters_updated_at
BEFORE UPDATE ON public.sitters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();