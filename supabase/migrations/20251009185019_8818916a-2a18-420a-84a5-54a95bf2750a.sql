-- Add ui_density column to profiles table for user interface density preferences
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ui_density TEXT DEFAULT 'comfortable' 
CHECK (ui_density IN ('comfortable', 'compact', 'dense'));

-- Create index for better performance on ui_density queries
CREATE INDEX IF NOT EXISTS idx_profiles_ui_density ON public.profiles(ui_density);

COMMENT ON COLUMN public.profiles.ui_density IS 'User preference for UI density: comfortable (default), compact, or dense';