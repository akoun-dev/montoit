-- Migration: Add custom equipment column to properties
-- Description: Allow property owners to add their own equipment beyond the predefined list

-- Add custom_equipment column as JSONB array
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS custom_equipment JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN public.properties.custom_equipment IS 'Array of custom equipment items added by property owner beyond predefined options';
