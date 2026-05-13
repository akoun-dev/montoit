-- Migration: Create visit_slots table
-- Description: Owner-defined availability slots for property visits
-- Sprint 7: Gestion créneaux visites

-- Create visit_slots enum
CREATE TYPE visit_slot_status AS ENUM ('available', 'booked', 'blocked', 'cancelled');

CREATE TABLE IF NOT EXISTS public.visit_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  visit_type visit_type DEFAULT 'in_person'::visit_type,
  status visit_slot_status DEFAULT 'available'::visit_slot_status,
  booked_by uuid,
  visit_request_id uuid,
  max_attendees integer DEFAULT 5,
  current_attendees integer DEFAULT 0,
  notes text,
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb,
  parent_slot_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  booked_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  CONSTRAINT visit_slots_pkey PRIMARY KEY (id),
  CONSTRAINT visit_slots_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT visit_slots_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT visit_slots_booked_by_fkey FOREIGN KEY (booked_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT visit_slots_visit_request_id_fkey FOREIGN KEY (visit_request_id) REFERENCES public.visit_requests(id) ON DELETE SET NULL,
  CONSTRAINT visit_slots_parent_slot_id_fkey FOREIGN KEY (parent_slot_id) REFERENCES public.visit_slots(id) ON DELETE CASCADE,
  CONSTRAINT visit_slots_time_range_valid CHECK (end_time > start_time),
  CONSTRAINT visit_slots_attendees_valid CHECK (current_attendees <= max_attendees),
  CONSTRAINT visit_slots_no_self_booking CHECK (owner_id != booked_by)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visit_slots_property_id ON public.visit_slots(property_id);
CREATE INDEX IF NOT EXISTS idx_visit_slots_owner_id ON public.visit_slots(owner_id);
CREATE INDEX IF NOT EXISTS idx_visit_slots_start_time ON public.visit_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_visit_slots_status ON public.visit_slots(status);
CREATE INDEX IF NOT EXISTS idx_visit_slots_visit_type ON public.visit_slots(visit_type);
CREATE INDEX IF NOT EXISTS idx_visit_slots_booked_by ON public.visit_slots(booked_by);
CREATE INDEX IF NOT EXISTS idx_visit_slots_parent_slot_id ON public.visit_slots(parent_slot_id);

-- Composite index for property availability queries
CREATE INDEX IF NOT EXISTS idx_visit_slots_property_time_status ON public.visit_slots(property_id, start_time, status);

-- Comments
COMMENT ON TABLE public.visit_slots IS 'Owner-defined availability slots for property visits';
COMMENT ON COLUMN public.visit_slots.status IS 'Status: available, booked, blocked, cancelled';
COMMENT ON COLUMN public.visit_slots.visit_type IS 'Type: in_person, video_call, virtual';
COMMENT ON COLUMN public.visit_slots.recurrence_pattern IS 'Recurrence pattern: {frequency: daily|weekly|monthly, interval: N, days: [1,2,3], until: date}';
COMMENT ON COLUMN public.visit_slots.parent_slot_id IS 'For recurring slots, references the parent slot that generated this one';

-- RLS Policies
ALTER TABLE public.visit_slots ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access visit_slots" ON public.visit_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Owners can view their own slots
CREATE POLICY "Owners can view own visit_slots" ON public.visit_slots
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Owners can insert their own slots
CREATE POLICY "Owners can insert visit_slots" ON public.visit_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their own slots
CREATE POLICY "Owners can update visit_slots" ON public.visit_slots
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owners can delete their own slots
CREATE POLICY "Owners can delete visit_slots" ON public.visit_slots
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Everyone can view available slots for properties
CREATE POLICY "Everyone can view available visit_slots" ON public.visit_slots
  FOR SELECT
  TO authenticated
  USING (status = 'available');

-- Updated at trigger
CREATE TRIGGER update_visit_slots_updated_at
  BEFORE UPDATE ON public.visit_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check slot availability and book it
CREATE OR REPLACE FUNCTION book_visit_slot(
  p_slot_id uuid,
  p_visit_request_id uuid,
  p_tenant_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot visit_slots;
  v_result jsonb;
BEGIN
  -- Lock the slot for update
  SELECT * INTO v_slot
  FROM visit_slots
  WHERE id = p_slot_id
  AND status = 'available'
  AND start_time > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Slot not available or does not exist'
    );
  END IF;

  -- Check max attendees
  IF v_slot.current_attendees >= v_slot.max_attendees THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Slot is fully booked'
    );
  END IF;

  -- Update slot
  UPDATE visit_slots
  SET
    status = 'booked',
    booked_by = p_tenant_id,
    visit_request_id = p_visit_request_id,
    current_attendees = current_attendees + 1,
    booked_at = now(),
    updated_at = now()
  WHERE id = p_slot_id;

  -- If slot is now full, mark as booked
  IF (v_slot.current_attendees + 1) >= v_slot.max_attendees THEN
    UPDATE visit_slots
    SET status = 'booked'
    WHERE id = p_slot_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'slot_id', p_slot_id,
    'attendee_number', v_slot.current_attendees + 1
  );
END;
$$;

-- Function to cancel a booking
CREATE OR REPLACE FUNCTION cancel_visit_slot_booking(
  p_slot_id uuid,
  p_tenant_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot visit_slots;
BEGIN
  SELECT * INTO v_slot
  FROM visit_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Slot not found'
    );
  END IF;

  IF v_slot.status != 'booked' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Slot is not booked'
    );
  END IF;

  IF v_slot.booked_by != p_tenant_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to cancel this booking'
    );
  END IF;

  -- Update slot
  UPDATE visit_slots
  SET
    status = 'available',
    booked_by = NULL,
    visit_request_id = NULL,
    current_attendees = GREATEST(0, current_attendees - 1),
    cancelled_at = now(),
    updated_at = now()
  WHERE id = p_slot_id;

  RETURN jsonb_build_object(
    'success', true,
    'slot_id', p_slot_id
  );
END;
$$;

-- Function to generate recurring slots
CREATE OR REPLACE FUNCTION generate_recurring_visit_slots(
  p_property_id uuid,
  p_owner_id uuid,
  p_start_date date,
  p_end_date date,
  p_start_time time,
  p_end_time time,
  p_days_of_week integer[],
  p_visit_type visit_type,
  p_max_attendees integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_date date;
  v_slot_start timestamp with time zone;
  v_slot_end timestamp with time zone;
  v_parent_slot_id uuid;
  v_count integer := 0;
BEGIN
  -- Create parent slot (template)
  INSERT INTO visit_slots (
    property_id, owner_id, start_time, end_time,
    visit_type, status, is_recurring, recurrence_pattern
  )
  VALUES (
    p_property_id, p_owner_id,
    (p_start_date || ' ' || p_start_time::text)::timestamp with time zone,
    (p_start_date || ' ' || p_end_time::text)::timestamp with time zone,
    p_visit_type, 'blocked', true,
    jsonb_build_object(
      'frequency', 'weekly',
      'days', p_days_of_week,
      'start_time', p_start_time::text,
      'end_time', p_end_time::text
    )
  )
  RETURNING id INTO v_parent_slot_id;

  -- Generate slots for each date
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    IF EXTRACT(DOW FROM v_current_date) = ANY(p_days_of_week) THEN
      v_slot_start := (v_current_date || ' ' || p_start_time::text)::timestamp with time zone;
      v_slot_end := (v_current_date || ' ' || p_end_time::text)::timestamp with time zone;

      INSERT INTO visit_slots (
        property_id, owner_id, start_time, end_time,
        visit_type, status, max_attendees, parent_slot_id
      )
      VALUES (
        p_property_id, p_owner_id, v_slot_start, v_slot_end,
        p_visit_type, 'available', p_max_attendees, v_parent_slot_id
      );

      v_count := v_count + 1;
    END IF;

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'parent_slot_id', v_parent_slot_id,
    'slots_created', v_count
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION book_visit_slot(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_visit_slot_booking(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_recurring_visit_slots(uuid, uuid, date, date, time, time, integer[], visit_type, integer) TO authenticated;
