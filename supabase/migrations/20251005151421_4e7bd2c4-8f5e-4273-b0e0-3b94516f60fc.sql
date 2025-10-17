-- Créer fonction pour notifier lors de changement de statut de certification
CREATE OR REPLACE FUNCTION public.notify_certification_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seulement si le statut de certification change
  IF OLD.certification_status IS DISTINCT FROM NEW.certification_status THEN
    
    -- Si le bail est certifié
    IF NEW.certification_status = 'certified' THEN
      -- Notification au propriétaire
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
      VALUES (
        NEW.landlord_id,
        'lease_certified',
        'Bail certifié par ANSUT',
        'Votre bail a été certifié par ANSUT. Vous pouvez maintenant procéder à la signature.',
        '/leases',
        jsonb_build_object('lease_id', NEW.id, 'property_id', NEW.property_id)
      );
      
      -- Notification au locataire
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
      VALUES (
        NEW.tenant_id,
        'lease_certified',
        'Bail certifié par ANSUT',
        'Le bail a été certifié par ANSUT. Vous pouvez maintenant procéder à la signature.',
        '/leases',
        jsonb_build_object('lease_id', NEW.id, 'property_id', NEW.property_id)
      );
    END IF;
    
    -- Si le bail est rejeté
    IF NEW.certification_status = 'rejected' THEN
      -- Notification au propriétaire avec les notes de rejet
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
      VALUES (
        NEW.landlord_id,
        'lease_rejected',
        'Bail refusé par ANSUT',
        COALESCE('Motif : ' || NEW.certification_notes, 'Votre bail a été refusé par ANSUT. Veuillez vérifier les informations et soumettre à nouveau.'),
        '/leases',
        jsonb_build_object('lease_id', NEW.id, 'property_id', NEW.property_id, 'notes', NEW.certification_notes)
      );
      
      -- Notification au locataire avec les notes de rejet
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
      VALUES (
        NEW.tenant_id,
        'lease_rejected',
        'Bail refusé par ANSUT',
        COALESCE('Motif : ' || NEW.certification_notes, 'Le bail a été refusé par ANSUT. Le propriétaire devra soumettre à nouveau.'),
        '/leases',
        jsonb_build_object('lease_id', NEW.id, 'property_id', NEW.property_id, 'notes', NEW.certification_notes)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer trigger pour notifications automatiques
DROP TRIGGER IF EXISTS trigger_notify_certification_status ON public.leases;
CREATE TRIGGER trigger_notify_certification_status
AFTER UPDATE ON public.leases
FOR EACH ROW
EXECUTE FUNCTION public.notify_certification_status_change();