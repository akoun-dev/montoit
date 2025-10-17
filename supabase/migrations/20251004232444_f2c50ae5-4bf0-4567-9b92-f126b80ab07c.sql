-- Enable realtime for messages table (already in publication)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Utilisateurs peuvent voir leurs notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Système peut créer notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Utilisateurs peuvent marquer comme lu"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to create notification on new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create notification for receiver
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.receiver_id,
    'new_message',
    'Nouveau message',
    LEFT(NEW.content, 100),
    '/messages',
    jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.sender_id)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for message notifications
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- Add index for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);