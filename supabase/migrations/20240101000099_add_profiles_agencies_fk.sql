-- Migration: Add FK constraint from profiles to agencies
-- Description: This must run after both profiles and agencies tables exist
-- This resolves the circular dependency between profiles and agencies

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_agency_id_fkey
FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;
