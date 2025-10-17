-- Phase 3: Enhanced Tenant Dashboard RPC Function
-- Agrège toutes les données du locataire en une seule requête optimisée

CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_summary(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary JSONB;
BEGIN
  -- Vérifier que l'utilisateur demande ses propres données
  IF auth.uid() != p_tenant_id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  SELECT jsonb_build_object(
    'applications', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'approved', COUNT(*) FILTER (WHERE status = 'approved'),
        'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
        'recent', COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', ra.id,
            'property_id', ra.property_id,
            'property_title', p.title,
            'status', ra.status,
            'created_at', ra.created_at,
            'application_score', ra.application_score
          )
          ORDER BY ra.created_at DESC
        ) FILTER (WHERE ra.id IS NOT NULL), '[]'::jsonb)
      )
      FROM (
        SELECT * FROM rental_applications
        WHERE applicant_id = p_tenant_id
        ORDER BY created_at DESC
        LIMIT 5
      ) ra
      LEFT JOIN properties p ON p.id = ra.property_id
    ),
    'leases', (
      SELECT jsonb_build_object(
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'total', COUNT(*),
        'current', (
          SELECT jsonb_build_object(
            'id', l.id,
            'property_id', l.property_id,
            'property_title', p.title,
            'monthly_rent', l.monthly_rent,
            'start_date', l.start_date,
            'end_date', l.end_date,
            'status', l.status
          )
          FROM leases l
          LEFT JOIN properties p ON p.id = l.property_id
          WHERE l.tenant_id = p_tenant_id 
            AND l.status = 'active'
          ORDER BY l.start_date DESC
          LIMIT 1
        )
      )
      FROM leases
      WHERE tenant_id = p_tenant_id
    ),
    'payments', (
      SELECT jsonb_build_object(
        'total_paid', COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0),
        'pending', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
        'count', COUNT(*),
        'recent', COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', id,
            'amount', amount,
            'payment_type', payment_type,
            'status', status,
            'created_at', created_at,
            'completed_at', completed_at
          )
          ORDER BY created_at DESC
        ) FILTER (WHERE id IS NOT NULL), '[]'::jsonb)
      )
      FROM (
        SELECT * FROM payments
        WHERE payer_id = p_tenant_id
        ORDER BY created_at DESC
        LIMIT 5
      ) p
    ),
    'maintenance', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'recent', COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', mr.id,
            'property_id', mr.property_id,
            'title', mr.title,
            'status', mr.status,
            'urgency', mr.urgency,
            'created_at', mr.created_at
          )
          ORDER BY mr.created_at DESC
        ) FILTER (WHERE mr.id IS NOT NULL), '[]'::jsonb)
      )
      FROM (
        SELECT * FROM maintenance_requests
        WHERE requester_id = p_tenant_id
        ORDER BY created_at DESC
        LIMIT 5
      ) mr
    )
  ) INTO v_summary;

  RETURN v_summary;
END;
$$;

COMMENT ON FUNCTION public.get_tenant_dashboard_summary(UUID) IS 
'Agrège toutes les données du tableau de bord locataire en une seule requête optimisée';