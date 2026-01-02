-- Create table for profile views counter
CREATE TABLE public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the view count (public counter)
CREATE POLICY "Anyone can view profile views count" 
ON public.profile_views 
FOR SELECT 
USING (true);

-- Allow anyone to update the counter (for incrementing)
CREATE POLICY "Anyone can increment view count" 
ON public.profile_views 
FOR UPDATE 
USING (true);

-- Insert initial row
INSERT INTO public.profile_views (id, view_count) 
VALUES ('00000000-0000-0000-0000-000000000001', 0);