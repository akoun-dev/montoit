-- ============================================================================
-- SCRIPT D'AMÉLIORATION DES DONNÉES DE DÉMO - MON TOIT
-- ============================================================================
-- Ce script améliore les données existantes pour la démo DG
-- Il ajoute des candidatures récentes, met à jour les agences, et crée un bail en attente
-- ============================================================================

-- ============================================================================
-- 1. CRÉER 3 NOUVELLES CANDIDATURES RÉCENTES (AUJOURD'HUI)
-- ============================================================================

-- Récupérer les IDs nécessaires
DO $$
DECLARE
  v_prop_cocody_id UUID;
  v_prop_penthouse_id UUID;
  v_prop_riviera3_id UUID;
  v_locataire1_id UUID;
  v_locataire2_id UUID;
  v_locataire3_id UUID;
BEGIN
  -- Récupérer les IDs de propriétés disponibles
  SELECT id INTO v_prop_cocody_id 
  FROM properties 
  WHERE title LIKE '%Villa Moderne%Cocody%' 
    AND status = 'disponible' 
  LIMIT 1;
  
  SELECT id INTO v_prop_penthouse_id 
  FROM properties 
  WHERE title LIKE '%Penthouse%' 
    AND status = 'disponible' 
  LIMIT 1;
  
  SELECT id INTO v_prop_riviera3_id 
  FROM properties 
  WHERE title LIKE '%Riviera 3%' 
    AND status = 'disponible' 
  LIMIT 1;

  -- Récupérer 3 locataires avec différents niveaux de vérification
  -- Locataire très vérifié (ONECI + CNAM)
  SELECT p.id INTO v_locataire1_id
  FROM profiles p
  WHERE p.user_type = 'locataire'
    AND p.oneci_verified = true
    AND p.cnam_verified = true
  LIMIT 1;

  -- Locataire moyennement vérifié (ONECI seulement)
  SELECT p.id INTO v_locataire2_id
  FROM profiles p
  WHERE p.user_type = 'locataire'
    AND p.oneci_verified = true
    AND (p.cnam_verified = false OR p.cnam_verified IS NULL)
    AND p.id != v_locataire1_id
  LIMIT 1;

  -- Locataire peu vérifié (aucune vérification)
  SELECT p.id INTO v_locataire3_id
  FROM profiles p
  WHERE p.user_type = 'locataire'
    AND (p.oneci_verified = false OR p.oneci_verified IS NULL)
    AND (p.cnam_verified = false OR p.cnam_verified IS NULL)
    AND p.id NOT IN (v_locataire1_id, v_locataire2_id)
  LIMIT 1;

  -- Si pas assez de locataires vérifiés, en prendre n'importe lesquels
  IF v_locataire1_id IS NULL THEN
    SELECT id INTO v_locataire1_id FROM profiles WHERE user_type = 'locataire' LIMIT 1;
  END IF;
  
  IF v_locataire2_id IS NULL THEN
    SELECT id INTO v_locataire2_id 
    FROM profiles 
    WHERE user_type = 'locataire' AND id != v_locataire1_id 
    LIMIT 1;
  END IF;
  
  IF v_locataire3_id IS NULL THEN
    SELECT id INTO v_locataire3_id 
    FROM profiles 
    WHERE user_type = 'locataire' 
      AND id NOT IN (v_locataire1_id, v_locataire2_id) 
    LIMIT 1;
  END IF;

  -- Candidature 1: Score élevé (92) - Créée aujourd'hui
  IF v_prop_cocody_id IS NOT NULL AND v_locataire1_id IS NOT NULL THEN
    INSERT INTO rental_applications (
      property_id, 
      applicant_id, 
      status, 
      application_score,
      cover_letter,
      created_at
    ) VALUES (
      v_prop_cocody_id,
      v_locataire1_id,
      'pending',
      92,
      'Cadre supérieur dans une multinationale, CDI depuis 5 ans. Revenus stables 3x le loyer. Excellentes références employeur et ancien propriétaire. Recherche logement familial de qualité.',
      NOW()
    );
    RAISE NOTICE 'Candidature haute qualité créée (score 92)';
  END IF;

  -- Candidature 2: Score moyen (65) - Créée aujourd'hui
  IF v_prop_penthouse_id IS NOT NULL AND v_locataire2_id IS NOT NULL THEN
    INSERT INTO rental_applications (
      property_id, 
      applicant_id, 
      status, 
      application_score,
      cover_letter,
      created_at
    ) VALUES (
      v_prop_penthouse_id,
      v_locataire2_id,
      'pending',
      65,
      'Consultant indépendant, revenus réguliers. Garants disponibles. Très intéressé par ce bien d''exception.',
      NOW()
    );
    RAISE NOTICE 'Candidature moyenne créée (score 65)';
  END IF;

  -- Candidature 3: Score faible (38) - Créée aujourd'hui
  IF v_prop_riviera3_id IS NOT NULL AND v_locataire3_id IS NOT NULL THEN
    INSERT INTO rental_applications (
      property_id, 
      applicant_id, 
      status, 
      application_score,
      cover_letter,
      created_at
    ) VALUES (
      v_prop_riviera3_id,
      v_locataire3_id,
      'pending',
      38,
      'Jeune professionnel, nouveau poste. Motivé et sérieux. Parents peuvent se porter garants.',
      NOW()
    );
    RAISE NOTICE 'Candidature basse qualité créée (score 38)';
  END IF;

END $$;

-- ============================================================================
-- 2. METTRE À JOUR LES AGENCES AVEC VÉRIFICATIONS ONECI
-- ============================================================================

UPDATE profiles
SET 
  oneci_verified = true,
  bio = CASE 
    WHEN full_name LIKE '%Immobilier CI%' THEN 
      '🏆 Agence certifiée ANSUT - Leader du marché avec 15 ans d''expérience. Portfolio de 50+ biens haut de gamme. Vérification ONECI complète. Service professionnel garanti.'
    WHEN full_name LIKE '%Abidjan Prestige%' THEN 
      '✨ Agence certifiée ANSUT - Spécialiste locations standing. Vérification ONECI validée. Suivi client premium et transparence totale.'
    WHEN full_name LIKE '%Agence%' THEN 
      '✅ Agence immobilière certifiée ANSUT avec vérification ONECI. Service professionnel et sécurisé.'
    ELSE bio
  END,
  avatar_url = CASE 
    WHEN avatar_url IS NULL OR avatar_url = '' THEN 
      'https://api.dicebear.com/7.x/initials/svg?seed=' || encode(gen_random_bytes(8), 'hex')
    ELSE avatar_url
  END
WHERE user_type = 'agence'
  AND (oneci_verified = false OR oneci_verified IS NULL);

-- Mettre à jour aussi les vérifications dans user_verifications si la table existe
UPDATE user_verifications uv
SET 
  oneci_status = 'verified',
  oneci_verified_at = NOW() - INTERVAL '30 days'
FROM profiles p
WHERE uv.user_id = p.id
  AND p.user_type = 'agence'
  AND (uv.oneci_status != 'verified' OR uv.oneci_status IS NULL);

RAISE NOTICE 'Agences mises à jour avec vérifications ONECI';

-- ============================================================================
-- 3. CRÉER 1 BAIL EN ATTENTE DE SIGNATURE
-- ============================================================================

DO $$
DECLARE
  v_property_id UUID;
  v_landlord_id UUID;
  v_tenant_id UUID;
  v_application_id UUID;
BEGIN
  -- Trouver une propriété disponible avec une candidature approuvée
  SELECT ra.property_id, p.owner_id, ra.applicant_id, ra.id
  INTO v_property_id, v_landlord_id, v_tenant_id, v_application_id
  FROM rental_applications ra
  JOIN properties p ON p.id = ra.property_id
  WHERE ra.status = 'approved'
    AND p.status = 'disponible'
    AND NOT EXISTS (
      SELECT 1 FROM leases l 
      WHERE l.property_id = ra.property_id 
        AND l.status IN ('draft', 'pending_signatures', 'active')
    )
  LIMIT 1;

  -- Si pas de candidature approuvée, en approuver une
  IF v_property_id IS NULL THEN
    -- Approuver une candidature pending avec bon score
    UPDATE rental_applications
    SET status = 'approved', reviewed_at = NOW()
    WHERE status = 'pending'
      AND application_score >= 70
      AND id IN (
        SELECT ra2.id FROM rental_applications ra2
        JOIN properties p2 ON p2.id = ra2.property_id
        WHERE p2.status = 'disponible'
          AND NOT EXISTS (
            SELECT 1 FROM leases l2 
            WHERE l2.property_id = ra2.property_id 
              AND l2.status IN ('draft', 'pending_signatures', 'active')
          )
        LIMIT 1
      )
    RETURNING property_id, applicant_id, id, (SELECT owner_id FROM properties WHERE id = property_id)
    INTO v_property_id, v_tenant_id, v_application_id, v_landlord_id;
  END IF;

  -- Créer le bail en attente de signature
  IF v_property_id IS NOT NULL AND v_landlord_id IS NOT NULL AND v_tenant_id IS NOT NULL THEN
    INSERT INTO leases (
      property_id,
      landlord_id,
      tenant_id,
      start_date,
      end_date,
      monthly_rent,
      deposit_amount,
      charges_amount,
      lease_type,
      status,
      certification_status
    )
    SELECT 
      v_property_id,
      v_landlord_id,
      v_tenant_id,
      CURRENT_DATE + INTERVAL '15 days', -- Début dans 15 jours
      CURRENT_DATE + INTERVAL '2 years 15 days', -- 2 ans
      p.monthly_rent,
      p.deposit_amount,
      p.charges_amount,
      'residential',
      'draft',
      'not_requested'
    FROM properties p
    WHERE p.id = v_property_id;

    RAISE NOTICE 'Bail en attente de signature créé pour la propriété %', v_property_id;
  ELSE
    RAISE NOTICE 'Impossible de créer un bail - pas de candidature appropriée trouvée';
  END IF;
END $$;

-- ============================================================================
-- 4. METTRE À JOUR LES SCORES DE VÉRIFICATION DES LOCATAIRES
-- ============================================================================

-- Mettre à jour les scores dans user_verifications basés sur les vérifications du profil
UPDATE user_verifications uv
SET 
  tenant_score = CASE
    WHEN p.oneci_verified AND p.cnam_verified THEN 
      GREATEST(COALESCE(uv.tenant_score, 0), 85 + (RANDOM() * 10)::INT)
    WHEN p.oneci_verified THEN 
      GREATEST(COALESCE(uv.tenant_score, 0), 60 + (RANDOM() * 15)::INT)
    WHEN p.cnam_verified THEN 
      GREATEST(COALESCE(uv.tenant_score, 0), 55 + (RANDOM() * 10)::INT)
    ELSE 
      LEAST(COALESCE(uv.tenant_score, 0), 30 + (RANDOM() * 15)::INT)
  END
FROM profiles p
WHERE uv.user_id = p.id
  AND p.user_type = 'locataire';

-- ============================================================================
-- 5. VÉRIFIER ET CONFIGURER LES COMPTES DE TEST
-- ============================================================================

-- S'assurer que admin@montoit.ci a les rôles admin
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Récupérer l'ID de l'admin
  SELECT au.id INTO v_admin_id
  FROM auth.users au
  WHERE au.email = 'admin@montoit.ci';

  IF v_admin_id IS NOT NULL THEN
    -- Ajouter les rôles si manquants
    INSERT INTO user_roles (user_id, role)
    VALUES 
      (v_admin_id, 'super_admin'),
      (v_admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Rôles admin configurés pour admin@montoit.ci';
  ELSE
    RAISE NOTICE 'Compte admin@montoit.ci non trouvé';
  END IF;
END $$;

-- Mettre à jour le profil du locataire principal
DO $$
DECLARE
  v_locataire1_id UUID;
BEGIN
  SELECT au.id INTO v_locataire1_id
  FROM auth.users au
  WHERE au.email = 'locataire1@montoit.ci';

  IF v_locataire1_id IS NOT NULL THEN
    -- S'assurer qu'il est bien vérifié
    UPDATE profiles
    SET 
      oneci_verified = true,
      cnam_verified = true,
      is_verified = true,
      bio = '👤 Profil vérifié ANSUT - Cadre supérieur avec excellentes références. ONECI et CNAM vérifiés.'
    WHERE id = v_locataire1_id;

    -- Mettre à jour les vérifications
    INSERT INTO user_verifications (
      user_id,
      oneci_status,
      cnam_status,
      tenant_score,
      oneci_verified_at,
      cnam_verified_at
    ) VALUES (
      v_locataire1_id,
      'verified',
      'verified',
      92,
      NOW() - INTERVAL '60 days',
      NOW() - INTERVAL '55 days'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      oneci_status = 'verified',
      cnam_status = 'verified',
      tenant_score = GREATEST(EXCLUDED.tenant_score, 92),
      oneci_verified_at = COALESCE(user_verifications.oneci_verified_at, NOW() - INTERVAL '60 days'),
      cnam_verified_at = COALESCE(user_verifications.cnam_verified_at, NOW() - INTERVAL '55 days');

    RAISE NOTICE 'Profil locataire1@montoit.ci mis à jour et vérifié';
  ELSE
    RAISE NOTICE 'Compte locataire1@montoit.ci non trouvé';
  END IF;
END $$;

-- ============================================================================
-- 6. AJOUTER QUELQUES MESSAGES RÉCENTS POUR LA DÉMO
-- ============================================================================

DO $$
DECLARE
  v_sender_id UUID;
  v_receiver_id UUID;
BEGIN
  -- Trouver un locataire et un propriétaire
  SELECT id INTO v_sender_id FROM profiles WHERE user_type = 'locataire' LIMIT 1;
  SELECT id INTO v_receiver_id FROM profiles WHERE user_type = 'proprietaire' LIMIT 1;

  IF v_sender_id IS NOT NULL AND v_receiver_id IS NOT NULL THEN
    -- Ajouter une conversation récente
    INSERT INTO messages (sender_id, receiver_id, content, created_at)
    VALUES 
      (v_sender_id, v_receiver_id, 
       'Bonjour, je viens de compléter ma vérification ANSUT (ONECI + CNAM). Puis-je visiter votre bien cette semaine ?',
       NOW() - INTERVAL '2 hours'),
      (v_receiver_id, v_sender_id,
       'Parfait ! Je vois que votre profil est certifié ANSUT avec un excellent score. Je peux vous proposer une visite demain à 15h ?',
       NOW() - INTERVAL '1 hour'),
      (v_sender_id, v_receiver_id,
       'Demain 15h me convient parfaitement. Merci !',
       NOW() - INTERVAL '30 minutes');
    
    RAISE NOTICE 'Messages de démo ajoutés';
  END IF;
END $$;

-- ============================================================================
-- 7. STATISTIQUES FINALES
-- ============================================================================

DO $$
DECLARE
  v_total_applications INT;
  v_recent_applications INT;
  v_verified_agencies INT;
  v_pending_leases INT;
  v_certified_leases INT;
BEGIN
  SELECT COUNT(*) INTO v_total_applications FROM rental_applications;
  SELECT COUNT(*) INTO v_recent_applications FROM rental_applications WHERE created_at > NOW() - INTERVAL '24 hours';
  SELECT COUNT(*) INTO v_verified_agencies FROM profiles WHERE user_type = 'agence' AND oneci_verified = true;
  SELECT COUNT(*) INTO v_pending_leases FROM leases WHERE status = 'draft';
  SELECT COUNT(*) INTO v_certified_leases FROM leases WHERE certification_status = 'certified';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'AMÉLIORATION DES DONNÉES TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total candidatures: %', v_total_applications;
  RAISE NOTICE 'Candidatures récentes (<24h): %', v_recent_applications;
  RAISE NOTICE 'Agences vérifiées ONECI: %', v_verified_agencies;
  RAISE NOTICE 'Baux en attente signature: %', v_pending_leases;
  RAISE NOTICE 'Baux certifiés ANSUT: %', v_certified_leases;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- FIN DU SCRIPT D'AMÉLIORATION
-- ============================================================================
