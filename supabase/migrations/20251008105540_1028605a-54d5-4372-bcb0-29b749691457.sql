-- Corriger le search_path de la fonction pour sécuriser (avec CASCADE)
DROP FUNCTION IF EXISTS public.update_sarah_conversation_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_sarah_conversation_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER update_sarah_conversations_updated_at
  BEFORE UPDATE ON public.sarah_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sarah_conversation_updated_at();