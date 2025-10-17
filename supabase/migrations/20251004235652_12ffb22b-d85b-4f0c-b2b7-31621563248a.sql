-- Add face verification columns to user_verifications table
ALTER TABLE public.user_verifications
ADD COLUMN face_verification_status TEXT DEFAULT 'not_attempted' 
  CHECK (face_verification_status IN ('not_attempted', 'verified', 'failed')),
ADD COLUMN face_similarity_score NUMERIC,
ADD COLUMN face_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN face_verification_attempts INTEGER DEFAULT 0;

-- Add face verification flag to profiles table
ALTER TABLE public.profiles
ADD COLUMN face_verified BOOLEAN DEFAULT FALSE;

-- Create trigger to update profile when face verification succeeds
CREATE OR REPLACE FUNCTION public.update_profile_face_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.face_verification_status = 'verified' AND OLD.face_verification_status != 'verified' THEN
    UPDATE public.profiles
    SET face_verified = TRUE
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_face_verification_success
  AFTER UPDATE ON public.user_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_face_verified();