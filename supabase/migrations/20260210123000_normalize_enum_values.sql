-- Normalize enum values to English and align roles
-- This migration is safe to re-run on already-normalized schemas.

-- 1) Rename French enum labels to English
DO $$
BEGIN
  -- application_status
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'en_attente'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE application_status RENAME VALUE 'en_attente' TO 'pending';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'en_cours'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'in_progress'
  ) THEN
    ALTER TYPE application_status RENAME VALUE 'en_cours' TO 'in_progress';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'accepte'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'accepted'
  ) THEN
    ALTER TYPE application_status RENAME VALUE 'accepte' TO 'accepted';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'refuse'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'rejected'
  ) THEN
    ALTER TYPE application_status RENAME VALUE 'refuse' TO 'rejected';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'annule'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE application_status RENAME VALUE 'annule' TO 'cancelled';
  END IF;

  -- lease_contract_status
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_contract_status' AND e.enumlabel = 'brouillon'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_contract_status' AND e.enumlabel = 'draft'
  ) THEN
    ALTER TYPE lease_contract_status RENAME VALUE 'brouillon' TO 'draft';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_contract_status' AND e.enumlabel = 'en_attente_signature'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_contract_status' AND e.enumlabel = 'pending_signature'
  ) THEN
    ALTER TYPE lease_contract_status RENAME VALUE 'en_attente_signature' TO 'pending_signature';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_contract_status' AND e.enumlabel = 'actif'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_contract_status' AND e.enumlabel = 'active'
  ) THEN
    ALTER TYPE lease_contract_status RENAME VALUE 'actif' TO 'active';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_contract_status' AND e.enumlabel = 'resilie'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_contract_status' AND e.enumlabel = 'terminated'
  ) THEN
    ALTER TYPE lease_contract_status RENAME VALUE 'resilie' TO 'terminated';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_contract_status' AND e.enumlabel = 'annule'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_contract_status' AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE lease_contract_status RENAME VALUE 'annule' TO 'cancelled';
  END IF;

  -- lease_status
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_status' AND e.enumlabel = 'brouillon'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_status' AND e.enumlabel = 'draft'
  ) THEN
    ALTER TYPE lease_status RENAME VALUE 'brouillon' TO 'draft';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_status' AND e.enumlabel = 'en_attente'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_status' AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE lease_status RENAME VALUE 'en_attente' TO 'pending';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_status' AND e.enumlabel = 'actif'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_status' AND e.enumlabel = 'active'
  ) THEN
    ALTER TYPE lease_status RENAME VALUE 'actif' TO 'active';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_status' AND e.enumlabel = 'resilie'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_status' AND e.enumlabel = 'terminated'
  ) THEN
    ALTER TYPE lease_status RENAME VALUE 'resilie' TO 'terminated';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_status' AND e.enumlabel = 'annule'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_status' AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE lease_status RENAME VALUE 'annule' TO 'cancelled';
  END IF;

  -- lease_type
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_type' AND e.enumlabel = 'longue_duree'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_type' AND e.enumlabel = 'long_term'
  ) THEN
    ALTER TYPE lease_type RENAME VALUE 'longue_duree' TO 'long_term';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_type' AND e.enumlabel = 'courte_duree'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_type' AND e.enumlabel = 'short_term'
  ) THEN
    ALTER TYPE lease_type RENAME VALUE 'courte_duree' TO 'short_term';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_type' AND e.enumlabel = 'saisonniere'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_type' AND e.enumlabel = 'seasonal'
  ) THEN
    ALTER TYPE lease_type RENAME VALUE 'saisonniere' TO 'seasonal';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_type' AND e.enumlabel = 'meuble'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lease_type' AND e.enumlabel = 'furnished'
  ) THEN
    ALTER TYPE lease_type RENAME VALUE 'meuble' TO 'furnished';
  END IF;

  -- payment_method
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'virement'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'bank_transfer'
  ) THEN
    ALTER TYPE payment_method RENAME VALUE 'virement' TO 'bank_transfer';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'especes'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'cash'
  ) THEN
    ALTER TYPE payment_method RENAME VALUE 'especes' TO 'cash';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'cheque'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'check'
  ) THEN
    ALTER TYPE payment_method RENAME VALUE 'cheque' TO 'check';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'carte_bancaire'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'card'
  ) THEN
    ALTER TYPE payment_method RENAME VALUE 'carte_bancaire' TO 'card';
  END IF;

  -- payment_status
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'en_attente'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE payment_status RENAME VALUE 'en_attente' TO 'pending';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'complete'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'completed'
  ) THEN
    ALTER TYPE payment_status RENAME VALUE 'complete' TO 'completed';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'en_retard'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'overdue'
  ) THEN
    ALTER TYPE payment_status RENAME VALUE 'en_retard' TO 'overdue';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'partiel'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'partial'
  ) THEN
    ALTER TYPE payment_status RENAME VALUE 'partiel' TO 'partial';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'annule'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE payment_status RENAME VALUE 'annule' TO 'cancelled';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'rembourse'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_status' AND e.enumlabel = 'refunded'
  ) THEN
    ALTER TYPE payment_status RENAME VALUE 'rembourse' TO 'refunded';
  END IF;

  -- payment_type
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_type' AND e.enumlabel = 'loyer'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_type' AND e.enumlabel = 'rent'
  ) THEN
    ALTER TYPE payment_type RENAME VALUE 'loyer' TO 'rent';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_type' AND e.enumlabel = 'depot_garantie'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_type' AND e.enumlabel = 'security_deposit'
  ) THEN
    ALTER TYPE payment_type RENAME VALUE 'depot_garantie' TO 'security_deposit';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_type' AND e.enumlabel = 'charges'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_type' AND e.enumlabel = 'service_charges'
  ) THEN
    ALTER TYPE payment_type RENAME VALUE 'charges' TO 'service_charges';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_type' AND e.enumlabel = 'honoraires'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_type' AND e.enumlabel = 'fees'
  ) THEN
    ALTER TYPE payment_type RENAME VALUE 'honoraires' TO 'fees';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_type' AND e.enumlabel = 'remboursement'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_type' AND e.enumlabel = 'refund'
  ) THEN
    ALTER TYPE payment_type RENAME VALUE 'remboursement' TO 'refund';
  END IF;

  -- property_status
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_status' AND e.enumlabel = 'disponible'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_status' AND e.enumlabel = 'available'
  ) THEN
    ALTER TYPE property_status RENAME VALUE 'disponible' TO 'available';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_status' AND e.enumlabel = 'loue'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_status' AND e.enumlabel = 'rented'
  ) THEN
    ALTER TYPE property_status RENAME VALUE 'loue' TO 'rented';
  END IF;

  -- property_type_enum
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_type_enum' AND e.enumlabel = 'appartement'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_type_enum' AND e.enumlabel = 'apartment'
  ) THEN
    ALTER TYPE property_type_enum RENAME VALUE 'appartement' TO 'apartment';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_type_enum' AND e.enumlabel = 'maison'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_type_enum' AND e.enumlabel = 'house'
  ) THEN
    ALTER TYPE property_type_enum RENAME VALUE 'maison' TO 'house';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_type_enum' AND e.enumlabel = 'terrain'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_type_enum' AND e.enumlabel = 'land'
  ) THEN
    ALTER TYPE property_type_enum RENAME VALUE 'terrain' TO 'land';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_type_enum' AND e.enumlabel = 'bureau'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_type_enum' AND e.enumlabel = 'office'
  ) THEN
    ALTER TYPE property_type_enum RENAME VALUE 'bureau' TO 'office';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_type_enum' AND e.enumlabel = 'local-commercial'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'property_type_enum' AND e.enumlabel = 'retail'
  ) THEN
    ALTER TYPE property_type_enum RENAME VALUE 'local-commercial' TO 'retail';
  END IF;

  -- verification_status
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'verification_status' AND e.enumlabel = 'en_attente'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'verification_status' AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE verification_status RENAME VALUE 'en_attente' TO 'pending';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'verification_status' AND e.enumlabel = 'en_cours'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'verification_status' AND e.enumlabel = 'in_progress'
  ) THEN
    ALTER TYPE verification_status RENAME VALUE 'en_cours' TO 'in_progress';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'verification_status' AND e.enumlabel = 'approuve'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'verification_status' AND e.enumlabel = 'approved'
  ) THEN
    ALTER TYPE verification_status RENAME VALUE 'approuve' TO 'approved';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'verification_status' AND e.enumlabel = 'refuse'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'verification_status' AND e.enumlabel = 'rejected'
  ) THEN
    ALTER TYPE verification_status RENAME VALUE 'refuse' TO 'rejected';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'verification_status' AND e.enumlabel = 'expire'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'verification_status' AND e.enumlabel = 'expired'
  ) THEN
    ALTER TYPE verification_status RENAME VALUE 'expire' TO 'expired';
  END IF;

  -- visit_status
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'planifie'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'scheduled'
  ) THEN
    ALTER TYPE visit_status RENAME VALUE 'planifie' TO 'scheduled';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'confirme'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'confirmed'
  ) THEN
    ALTER TYPE visit_status RENAME VALUE 'confirme' TO 'confirmed';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'en_cours'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'in_progress'
  ) THEN
    ALTER TYPE visit_status RENAME VALUE 'en_cours' TO 'in_progress';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'termine'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'completed'
  ) THEN
    ALTER TYPE visit_status RENAME VALUE 'termine' TO 'completed';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'annule'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE visit_status RENAME VALUE 'annule' TO 'cancelled';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'absent'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_status' AND e.enumlabel = 'no_show'
  ) THEN
    ALTER TYPE visit_status RENAME VALUE 'absent' TO 'no_show';
  END IF;

  -- visit_request_status
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_request_status' AND e.enumlabel = 'en_attente'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_request_status' AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE visit_request_status RENAME VALUE 'en_attente' TO 'pending';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_request_status' AND e.enumlabel = 'confirme'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_request_status' AND e.enumlabel = 'confirmed'
  ) THEN
    ALTER TYPE visit_request_status RENAME VALUE 'confirme' TO 'confirmed';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_request_status' AND e.enumlabel = 'refuse'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_request_status' AND e.enumlabel = 'rejected'
  ) THEN
    ALTER TYPE visit_request_status RENAME VALUE 'refuse' TO 'rejected';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_request_status' AND e.enumlabel = 'annule'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_request_status' AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE visit_request_status RENAME VALUE 'annule' TO 'cancelled';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_request_status' AND e.enumlabel = 'termine'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_request_status' AND e.enumlabel = 'completed'
  ) THEN
    ALTER TYPE visit_request_status RENAME VALUE 'termine' TO 'completed';
  END IF;

  -- visit_type
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_type' AND e.enumlabel = 'physique'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_type' AND e.enumlabel = 'in_person'
  ) THEN
    ALTER TYPE visit_type RENAME VALUE 'physique' TO 'in_person';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_type' AND e.enumlabel = 'visio'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_type' AND e.enumlabel = 'video_call'
  ) THEN
    ALTER TYPE visit_type RENAME VALUE 'visio' TO 'video_call';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_type' AND e.enumlabel = 'virtuelle'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'visit_type' AND e.enumlabel = 'virtual'
  ) THEN
    ALTER TYPE visit_type RENAME VALUE 'virtuelle' TO 'virtual';
  END IF;
END $$;

-- 2) Add missing enum values (safe if already present)
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'mobile_money';
ALTER TYPE property_type_enum ADD VALUE IF NOT EXISTS 'duplex';
ALTER TYPE property_type_enum ADD VALUE IF NOT EXISTS 'room';
ALTER TYPE property_type_enum ADD VALUE IF NOT EXISTS 'warehouse';

-- 3) Migrate user_type (remove admin_ansut/moderator, keep only 5 roles)
DROP TABLE IF EXISTS tmp_user_type_policies;
CREATE TEMP TABLE tmp_user_type_policies AS
SELECT schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual,
       with_check
FROM pg_policies
WHERE qual ILIKE '%::user_type%'
   OR with_check ILIKE '%::user_type%';

DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
  sql text;
  role_list text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_type'
      AND e.enumlabel IN ('locataire', 'proprietaire', 'agence', 'admin_ansut', 'moderator')
  ) THEN
    -- Drop policies referencing user_type to allow type change
    FOR r IN SELECT schemaname, tablename, policyname FROM tmp_user_type_policies LOOP
      EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;

    DROP TYPE IF EXISTS user_type_new;
    CREATE TYPE user_type_new AS ENUM ('tenant', 'owner', 'agency', 'trust_agent', 'admin');

    ALTER TABLE public.profiles ALTER COLUMN user_type DROP DEFAULT;
    ALTER TABLE public.profiles
      ALTER COLUMN user_type TYPE user_type_new
      USING (
        CASE user_type::text
          WHEN 'locataire' THEN 'tenant'
          WHEN 'proprietaire' THEN 'owner'
          WHEN 'agence' THEN 'agency'
          WHEN 'admin_ansut' THEN 'admin'
          WHEN 'moderator' THEN 'admin'
          WHEN 'trust_agent' THEN 'trust_agent'
          WHEN 'tenant' THEN 'tenant'
          WHEN 'owner' THEN 'owner'
          WHEN 'agency' THEN 'agency'
          WHEN 'admin' THEN 'admin'
          ELSE 'tenant'
        END
      )::user_type_new;
    ALTER TABLE public.profiles ALTER COLUMN user_type SET DEFAULT 'tenant';

    -- Update role-like text columns if present
    UPDATE public.user_active_roles
      SET active_role = CASE active_role
        WHEN 'locataire' THEN 'tenant'
        WHEN 'proprietaire' THEN 'owner'
        WHEN 'agence' THEN 'agency'
        WHEN 'admin_ansut' THEN 'admin'
        WHEN 'moderator' THEN 'admin'
        WHEN 'trust_agent' THEN 'trust_agent'
        ELSE active_role
      END
      WHERE active_role IN ('locataire', 'proprietaire', 'agence', 'admin_ansut', 'moderator');

    UPDATE public.user_active_roles
      SET available_roles = (
        SELECT array_agg(
          CASE role
            WHEN 'locataire' THEN 'tenant'
            WHEN 'proprietaire' THEN 'owner'
            WHEN 'agence' THEN 'agency'
            WHEN 'admin_ansut' THEN 'admin'
            WHEN 'moderator' THEN 'admin'
            WHEN 'trust_agent' THEN 'trust_agent'
            ELSE role
          END
        )
        FROM unnest(available_roles) AS role
      )
      WHERE available_roles && ARRAY['locataire', 'proprietaire', 'agence', 'admin_ansut', 'moderator'];

    UPDATE public.agency_agents
      SET role = CASE role
        WHEN 'locataire' THEN 'tenant'
        WHEN 'proprietaire' THEN 'owner'
        WHEN 'agence' THEN 'agency'
        WHEN 'admin_ansut' THEN 'admin'
        WHEN 'moderator' THEN 'admin'
        WHEN 'trust_agent' THEN 'trust_agent'
        ELSE role
      END
      WHERE role IN ('locataire', 'proprietaire', 'agence', 'admin_ansut', 'moderator');

    UPDATE public.agent_invitations
      SET role = CASE role
        WHEN 'locataire' THEN 'tenant'
        WHEN 'proprietaire' THEN 'owner'
        WHEN 'agence' THEN 'agency'
        WHEN 'admin_ansut' THEN 'admin'
        WHEN 'moderator' THEN 'admin'
        WHEN 'trust_agent' THEN 'trust_agent'
        ELSE role
      END
      WHERE role IN ('locataire', 'proprietaire', 'agence', 'admin_ansut', 'moderator');

    UPDATE public.dispute_evidence
      SET uploader_role = CASE uploader_role
        WHEN 'locataire' THEN 'tenant'
        WHEN 'proprietaire' THEN 'owner'
        WHEN 'agence' THEN 'agency'
        WHEN 'admin_ansut' THEN 'admin'
        WHEN 'moderator' THEN 'admin'
        WHEN 'trust_agent' THEN 'trust_agent'
        ELSE uploader_role
      END
      WHERE uploader_role IN ('locataire', 'proprietaire', 'agence', 'admin_ansut', 'moderator');

    UPDATE public.dispute_messages
      SET sender_role = CASE sender_role
        WHEN 'locataire' THEN 'tenant'
        WHEN 'proprietaire' THEN 'owner'
        WHEN 'agence' THEN 'agency'
        WHEN 'admin_ansut' THEN 'admin'
        WHEN 'moderator' THEN 'admin'
        WHEN 'trust_agent' THEN 'trust_agent'
        ELSE sender_role
      END
      WHERE sender_role IN ('locataire', 'proprietaire', 'agence', 'admin_ansut', 'moderator');

    UPDATE public.suta_messages
      SET role = CASE role
        WHEN 'locataire' THEN 'tenant'
        WHEN 'proprietaire' THEN 'owner'
        WHEN 'agence' THEN 'agency'
        WHEN 'admin_ansut' THEN 'admin'
        WHEN 'moderator' THEN 'admin'
        WHEN 'trust_agent' THEN 'trust_agent'
        ELSE role
      END
      WHERE role IN ('locataire', 'proprietaire', 'agence', 'admin_ansut', 'moderator');

    UPDATE public.trust_agent_profiles
      SET role = CASE role
        WHEN 'locataire' THEN 'tenant'
        WHEN 'proprietaire' THEN 'owner'
        WHEN 'agence' THEN 'agency'
        WHEN 'admin_ansut' THEN 'admin'
        WHEN 'moderator' THEN 'admin'
        WHEN 'trust_agent' THEN 'trust_agent'
        ELSE role
      END
      WHERE role IN ('locataire', 'proprietaire', 'agence', 'admin_ansut', 'moderator');

    -- Recreate policies with updated values + new enum type
    FOR r IN SELECT * FROM tmp_user_type_policies LOOP
      new_qual := r.qual;
      new_check := r.with_check;

      IF new_qual IS NOT NULL THEN
        new_qual := replace(new_qual, '''admin_ansut''::user_type', '''admin''::user_type');
        new_qual := replace(new_qual, '''moderator''::user_type', '''admin''::user_type');
        new_qual := replace(new_qual, '::user_type', '::user_type_new');
      END IF;

      IF new_check IS NOT NULL THEN
        new_check := replace(new_check, '''admin_ansut''::user_type', '''admin''::user_type');
        new_check := replace(new_check, '''moderator''::user_type', '''admin''::user_type');
        new_check := replace(new_check, '::user_type', '::user_type_new');
      END IF;

      SELECT string_agg(format('%I', role), ', ')
      INTO role_list
      FROM unnest(r.roles) AS role;

      sql := format('CREATE POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
      IF r.permissive = 'RESTRICTIVE' THEN
        sql := sql || ' AS RESTRICTIVE';
      END IF;
      sql := sql || format(' FOR %s', r.cmd);
      IF role_list IS NOT NULL THEN
        sql := sql || format(' TO %s', role_list);
      END IF;
      IF new_qual IS NOT NULL THEN
        sql := sql || format(' USING (%s)', new_qual);
      END IF;
      IF new_check IS NOT NULL THEN
        sql := sql || format(' WITH CHECK (%s)', new_check);
      END IF;

      EXECUTE sql;
    END LOOP;

    DROP TYPE user_type;
    ALTER TYPE user_type_new RENAME TO user_type;
  END IF;
END $$;

DROP TABLE IF EXISTS tmp_user_type_policies;

-- 4) Migrate user_role enum (admin + trust_agent only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role'
      AND e.enumlabel IN ('user', 'moderator')
  ) THEN
    DROP TYPE IF EXISTS user_role_new;
    CREATE TYPE user_role_new AS ENUM ('admin', 'trust_agent');

    DELETE FROM public.user_roles WHERE role NOT IN ('admin', 'trust_agent');
    ALTER TABLE public.user_roles
      ALTER COLUMN role TYPE user_role_new
      USING role::text::user_role_new;

    DROP TYPE user_role;
    ALTER TYPE user_role_new RENAME TO user_role;
  END IF;
END $$;

-- 5) Refresh comments for role columns
COMMENT ON COLUMN public.profiles.user_type IS 'User type: tenant, owner, agency, trust_agent, admin';
COMMENT ON COLUMN public.user_roles.role IS 'Role: admin, trust_agent';
