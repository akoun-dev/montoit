-- Create saved_searches table for user search preferences
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved searches
CREATE POLICY "Users can view their own saved searches"
ON public.saved_searches
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own saved searches
CREATE POLICY "Users can create their own saved searches"
ON public.saved_searches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved searches
CREATE POLICY "Users can update their own saved searches"
ON public.saved_searches
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own saved searches
CREATE POLICY "Users can delete their own saved searches"
ON public.saved_searches
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);

-- Create updated_at trigger
CREATE TRIGGER update_saved_searches_updated_at
BEFORE UPDATE ON public.saved_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();