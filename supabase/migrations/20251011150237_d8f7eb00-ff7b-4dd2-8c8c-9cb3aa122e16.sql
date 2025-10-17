-- Fonction pour récupérer les analytics d'un propriétaire
CREATE OR REPLACE FUNCTION public.get_owner_analytics(owner_user_id UUID)
RETURNS TABLE (
  property_id UUID,
  property_title TEXT,
  property_image TEXT,
  monthly_rent NUMERIC,
  views_7d BIGINT,
  views_30d BIGINT,
  applications_count BIGINT,
  conversion_rate NUMERIC,
  status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS property_id,
    p.title AS property_title,
    p.main_image AS property_image,
    p.monthly_rent,
    -- Views derniers 7 jours (simulation via view_count pour MVP)
    GREATEST(0, p.view_count - (p.view_count / 4))::BIGINT AS views_7d,
    p.view_count::BIGINT AS views_30d,
    COUNT(DISTINCT ra.id)::BIGINT AS applications_count,
    CASE 
      WHEN p.view_count > 0 
      THEN ROUND((COUNT(DISTINCT ra.id)::NUMERIC / p.view_count) * 100, 2)
      ELSE 0
    END AS conversion_rate,
    p.status
  FROM public.properties p
  LEFT JOIN public.rental_applications ra ON p.id = ra.property_id
  WHERE p.owner_id = owner_user_id
  GROUP BY p.id, p.title, p.main_image, p.monthly_rent, p.view_count, p.status
  ORDER BY p.view_count DESC;
END;
$$;