-- Drop existing table and recreate with individual view tracking
DROP TABLE IF EXISTS public.profile_views;

-- Create table for individual profile views
CREATE TABLE public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read views (public counter)
CREATE POLICY "Anyone can view profile views"
ON public.profile_views
FOR SELECT
USING (true);

-- Allow anyone to insert a view
CREATE POLICY "Anyone can insert a view"
ON public.profile_views
FOR INSERT
WITH CHECK (true);
