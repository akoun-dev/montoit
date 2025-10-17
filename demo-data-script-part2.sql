-- ============================================================================
-- PARTIE 2: CANDIDATURES, BAUX, MESSAGES, FAVORIS
-- ============================================================================
-- IMPORTANT: Remplacer tous les UUID par les vrais IDs de votre base
-- ============================================================================

-- ============================================================================
-- 5. CANDIDATURES (25 total)
-- Remplacer LOC1_UUID à LOC10_UUID et les IDs de propriétés
-- ============================================================================

-- Candidatures PENDING (10) - dont 3 >48h pour UrgentActionsCard
INSERT INTO public.rental_applications (property_id, applicant_id, status, application_score, cover_letter, created_at) VALUES
((SELECT id FROM properties WHERE title LIKE 'Villa Moderne 4%' LIMIT 1), 'LOC1_UUID', 'pending', 92, 'Cadre supérieure avec CDI, excellentes références. Très intéressée par cette villa.', NOW() - INTERVAL '3 days'),
((SELECT id FROM properties WHERE title LIKE 'Penthouse Premium%' LIMIT 1), 'LOC2_UUID', 'pending', 88, 'Ingénieur IT, revenus stables. Recherche logement standing.', NOW() - INTERVAL '4 days'),
((SELECT id FROM properties WHERE title LIKE 'Duplex Luxueux%' LIMIT 1), 'LOC3_UUID', 'pending', 90, 'Médecin hospitalier, revenus confortables. Famille de 4 personnes.', NOW() - INTERVAL '5 days'),
((SELECT id FROM properties WHERE title LIKE 'Appartement 3 Pièces - Marcory%' LIMIT 1), 'LOC4_UUID', 'pending', 65, 'Étudiant Master 2, garants solides.', NOW() - INTERVAL '1 day'),
((SELECT id FROM properties WHERE title LIKE '%Standing - Riviera 3%' LIMIT 1), 'LOC5_UUID', 'pending', 58, 'Commerciale, salaire fixe + commissions.', NOW() - INTERVAL '2 days');

-- Candidatures APPROVED (8)
INSERT INTO public.rental_applications (property_id, applicant_id, status, application_score, cover_letter, reviewed_at) VALUES
((SELECT id FROM properties WHERE title LIKE 'Studio Meublé - Plateau%' LIMIT 1), 'LOC1_UUID', 'approved', 92, 'Parfait pour mon travail en centre ville.', NOW() - INTERVAL '10 days'),
((SELECT id FROM properties WHERE title LIKE 'Villa Familiale - Bingerville%' LIMIT 1), 'LOC2_UUID', 'approved', 88, 'Environnement calme pour ma famille.', NOW() - INTERVAL '15 days');

-- Candidatures REJECTED (7)
INSERT INTO public.rental_applications (property_id, applicant_id, status, application_score, cover_letter, reviewed_at) VALUES
((SELECT id FROM properties WHERE title LIKE 'Villa de Prestige%' LIMIT 1), 'LOC8_UUID', 'rejected', 35, 'Très intéressé mais budget serré.', NOW() - INTERVAL '7 days'),
((SELECT id FROM properties WHERE title LIKE 'Penthouse Premium%' LIMIT 1), 'LOC9_UUID', 'rejected', 38, 'Nouveau en Côte d''Ivoire.', NOW() - INTERVAL '8 days');

-- ============================================================================
-- 6. BAUX (6 total - dont 2 certifiés ANSUT)
-- ============================================================================

-- Baux ACTIFS (4)
INSERT INTO public.leases (property_id, landlord_id, tenant_id, start_date, end_date, monthly_rent, deposit_amount, charges_amount, lease_type, status, landlord_signed_at, tenant_signed_at) VALUES
((SELECT id FROM properties WHERE title LIKE 'Studio Meublé - Plateau%' LIMIT 1), 'PROP1_UUID', 'LOC1_UUID', '2024-01-01', '2025-12-31', 120000, 240000, 8000, 'residential', 'active', NOW() - INTERVAL '90 days', NOW() - INTERVAL '88 days'),
((SELECT id FROM properties WHERE title LIKE 'Villa Familiale - Bingerville%' LIMIT 1), 'PROP2_UUID', 'LOC2_UUID', '2024-02-01', '2026-01-31', 280000, 560000, 15000, 'residential', 'active', NOW() - INTERVAL '60 days', NOW() - INTERVAL '58 days');

-- Baux CERTIFIÉS ANSUT (2)
INSERT INTO public.leases (property_id, landlord_id, tenant_id, start_date, end_date, monthly_rent, deposit_amount, charges_amount, lease_type, status, certification_status, ansut_certified_at, landlord_signed_at, tenant_signed_at, certified_by) VALUES
((SELECT id FROM properties WHERE title LIKE 'Villa 4 Chambres avec Piscine%' LIMIT 1), 'PROP2_UUID', 'LOC3_UUID', '2024-03-01', '2026-02-28', 350000, 700000, 20000, 'residential', 'active', 'certified', NOW() - INTERVAL '30 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '33 days', 'ADMIN1_UUID'),
((SELECT id FROM properties WHERE title LIKE 'Duplex Moderne - Cocody Danga%' LIMIT 1), 'AGENCE1_UUID', 'LOC1_UUID', '2024-04-01', '2026-03-31', 480000, 960000, 25000, 'residential', 'active', 'certified', NOW() - INTERVAL '20 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '23 days', 'ADMIN1_UUID');

-- ============================================================================
-- 7. FAVORIS (20 relations)
-- ============================================================================

INSERT INTO public.user_favorites (user_id, property_id) VALUES
('LOC1_UUID', (SELECT id FROM properties WHERE title LIKE 'Villa Moderne 4%' LIMIT 1)),
('LOC1_UUID', (SELECT id FROM properties WHERE title LIKE 'Penthouse Premium%' LIMIT 1)),
('LOC2_UUID', (SELECT id FROM properties WHERE title LIKE 'Duplex Luxueux%' LIMIT 1)),
('LOC3_UUID', (SELECT id FROM properties WHERE title LIKE 'Villa de Prestige%' LIMIT 1)),
('LOC4_UUID', (SELECT id FROM properties WHERE title LIKE 'Studio Meublé - Plateau%' LIMIT 1));

-- ============================================================================
-- 8. MESSAGES (15 conversations)
-- ============================================================================

INSERT INTO public.messages (sender_id, receiver_id, content, application_id) VALUES
('LOC1_UUID', 'PROP1_UUID', 'Bonjour, je suis très intéressée par votre villa à Cocody. Est-elle toujours disponible ?', NULL),
('PROP1_UUID', 'LOC1_UUID', 'Bonjour, oui la villa est disponible. Quand souhaitez-vous la visiter ?', NULL),
('LOC2_UUID', 'AGENCE1_UUID', 'Le penthouse est-il meublé ? J''arrive d''Europe et je cherche du clé en main.', NULL),
('AGENCE1_UUID', 'LOC2_UUID', 'Oui, entièrement meublé avec équipements haut de gamme. Je peux organiser une visite cette semaine.', NULL);

-- ============================================================================
-- 9. HISTORIQUE RECHERCHE (30 entrées)
-- ============================================================================

INSERT INTO public.search_history (user_id, search_filters, result_count) VALUES
('LOC1_UUID', '{"city": "Abidjan", "min_budget": 400000, "max_budget": 600000, "property_type": "villa"}', 5),
('LOC2_UUID', '{"city": "Abidjan", "min_bedrooms": 4, "max_budget": 1000000}', 8),
('LOC3_UUID', '{"city": "Abidjan", "property_type": "duplex", "has_ac": true}', 3);

-- ============================================================================
-- 10. AVIS & RÉPUTATION (10 reviews)
-- ============================================================================

INSERT INTO public.reviews (reviewer_id, reviewee_id, lease_id, review_type, rating, comment, moderation_status) VALUES
('LOC1_UUID', 'PROP1_UUID', (SELECT id FROM leases WHERE tenant_id = 'LOC1_UUID' LIMIT 1), 'tenant_to_landlord', 5, 'Excellent propriétaire, très réactif et arrangeant.', 'approved'),
('PROP1_UUID', 'LOC1_UUID', (SELECT id FROM leases WHERE tenant_id = 'LOC1_UUID' LIMIT 1), 'landlord_to_tenant', 5, 'Locataire parfait, sérieux et respectueux du bien.', 'approved'),
('LOC2_UUID', 'PROP2_UUID', (SELECT id FROM leases WHERE tenant_id = 'LOC2_UUID' LIMIT 1), 'tenant_to_landlord', 4, 'Bonne expérience, quelques réparations tardives.', 'approved');

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
