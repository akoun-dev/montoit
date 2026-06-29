-- 000_enums.sql
-- Migration: Create custom enum types for the Mon Toit platform
-- This file defines all enum types used across the database schema.
-- All enums are created in the public schema.

-- drop enums if they already exist (idempotent via if not exists)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('LOCATAIRE', 'PROPRIETAIRE', 'AGENCE', 'ADMIN', 'TIERS_CONFIANCE');
  end if;
  if not exists (select 1 from pg_type where typname = 'otp_type') then
    create type otp_type as enum ('LOGIN', 'EMAIL_VERIFY', 'PASSWORD_RESET', 'BAIL_SIGNATURE');
  end if;
  if not exists (select 1 from pg_type where typname = 'property_type') then
    create type property_type as enum ('APPARTEMENT', 'MAISON', 'STUDIO', 'DUPLEX', 'PENTHOUSE', 'VILLA');
  end if;
  if not exists (select 1 from pg_type where typname = 'property_status') then
    create type property_status as enum ('DRAFT', 'PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED', 'RENTED');
  end if;
  if not exists (select 1 from pg_type where typname = 'rental_status') then
    create type rental_status as enum ('disponible', 'loue', 'reserve');
  end if;
  if not exists (select 1 from pg_type where typname = 'rental_file_status') then
    create type rental_file_status as enum ('DRAFT', 'SUBMITTED', 'TC_REVIEW', 'VALIDATED', 'ACCEPTED', 'REJECTED', 'EXPIRED');
  end if;
  if not exists (select 1 from pg_type where typname = 'employment_type') then
    create type employment_type as enum ('CDI', 'CDD', 'FREELANCE', 'RETIRED', 'OTHER');
  end if;
  if not exists (select 1 from pg_type where typname = 'tenant_category') then
    create type tenant_category as enum ('SALARIE', 'ENTREPRENEUR', 'ETUDIANT');
  end if;
  if not exists (select 1 from pg_type where typname = 'document_type') then
    create type document_type as enum (
      'ID_CARD', 'PASSPORT', 'PAY_SLIP', 'EMPLOYMENT_CONTRACT', 'WORK_CERTIFICATE',
      'BANK_STATEMENT', 'GUARANTOR_ID', 'GUARANTOR_INCOME_PROOF', 'PROOF_OF_ADDRESS',
      'PARENT_ADDRESS_PROOF', 'RCCM_REGISTRATION', 'TAX_DECLARATION', 'SCHOOL_CERTIFICATE',
      'SCHOLARSHIP_CERTIFICATE', 'PROPERTY_TITLE', 'UTILITY_BILL', 'BANK_ACCOUNT_DETAILS', 'OTHER'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type document_status as enum ('PENDING', 'VALIDATED', 'REJECTED');
  end if;
  if not exists (select 1 from pg_type where typname = 'ownership_doc_type') then
    create type ownership_doc_type as enum ('TITRE_FONCIER', 'ACTE_NOTARIE', 'ATTESTATION_PROPRIETE', 'RCCM', 'AGREMENT');
  end if;
  if not exists (select 1 from pg_type where typname = 'visit_type') then
    create type visit_type as enum ('PHYSICAL', 'VIRTUAL');
  end if;
  if not exists (select 1 from pg_type where typname = 'visit_request_status') then
    create type visit_request_status as enum ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTER_PROPOSED', 'COMPLETED', 'CANCELLED');
  end if;
  if not exists (select 1 from pg_type where typname = 'lease_status') then
    create type lease_status as enum ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'TERMINATED', 'EXPIRED');
  end if;
  if not exists (select 1 from pg_type where typname = 'dispute_type') then
    create type dispute_type as enum ('UNPAID_RENT', 'PROPERTY_DAMAGE', 'HARASSMENT', 'FRAUD', 'OTHER');
  end if;
  if not exists (select 1 from pg_type where typname = 'fraud_alert_status') then
    create type fraud_alert_status as enum ('OPEN', 'INVESTIGATING', 'CONFIRMED', 'DISMISSED');
  end if;
  if not exists (select 1 from pg_type where typname = 'dispute_status') then
    create type dispute_status as enum ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
  end if;
  if not exists (select 1 from pg_type where typname = 'validation_sla_entity_type') then
    create type validation_sla_entity_type as enum ('RENTAL_FILE', 'OWNER_PROFILE', 'AGENCY');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('PENDING', 'PAID', 'LATE', 'PARTIAL', 'CANCELLED', 'PROCESSING');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY', 'WAVE');
  end if;
  if not exists (select 1 from pg_type where typname = 'maintenance_status') then
    create type maintenance_status as enum ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
  end if;
  if not exists (select 1 from pg_type where typname = 'maintenance_priority') then
    create type maintenance_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type notification_type as enum (
      'MESSAGE', 'DOSSIER_UPDATE', 'VISIT_REMINDER', 'PAYMENT_ALERT', 'PROMOTION',
      'SYSTEM', 'MISSION_ASSIGNED', 'MISSION_COMPLETED', 'DISPUTE_ASSIGNED',
      'DISPUTE_UPDATE', 'PROPERTY_VERIFICATION', 'VERIFICATION_RESULT', 'MAINTENANCE',
      'LEASE_UPDATE', 'SECURITY', 'APPLICATION', 'REVIEW', 'FRAUD_ALERT', 'CERTIFICATION'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'inventory_type') then
    create type inventory_type as enum ('INVENTORY_ENTRANCE', 'INVENTORY_EXIT');
  end if;
  if not exists (select 1 from pg_type where typname = 'inventory_status') then
    create type inventory_status as enum ('DRAFT', 'COMPLETED', 'SIGNED_OWNER', 'SIGNED_TENANT', 'SIGNED_BOTH');
  end if;
  if not exists (select 1 from pg_type where typname = 'room_condition') then
    create type room_condition as enum ('BON', 'MAUVAIS');
  end if;
  if not exists (select 1 from pg_type where typname = 'mission_status') then
    create type mission_status as enum ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  end if;
  if not exists (select 1 from pg_type where typname = 'dossier_priority') then
    create type dossier_priority as enum ('NORMAL', 'HIGH', 'URGENT');
  end if;
  if not exists (select 1 from pg_type where typname = 'certification_type') then
    create type certification_type as enum ('USER_IDENTITY', 'PROPERTY', 'AGENCY');
  end if;
  if not exists (select 1 from pg_type where typname = 'certification_status') then
    create type certification_status as enum ('PENDING', 'GRANTED', 'REVOKED', 'EXPIRED');
  end if;
  if not exists (select 1 from pg_type where typname = 'mission_type') then
    create type mission_type as enum ('PROPERTY_VERIFICATION', 'INVENTORY_REPORT');
  end if;
  if not exists (select 1 from pg_type where typname = 'property_doc_type') then
    create type property_doc_type as enum (
      'DIAGNOSTIC_DPE', 'DIAGNOSTIC_AMIANTE', 'DIAGNOSTIC_PLOMB', 'DIAGNOSTIC_GAZ',
      'DIAGNOSTIC_ELECTRICITE', 'DIAGNOSTIC_ERP', 'ASSURANCE_HABITATION', 'ASSURANCE_RC',
      'PERMIS_CONSTRUIRE', 'ATTESTATION_CONFORMITE', 'PLAN_BATIMENT', 'AUTRE'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'mandat_status') then
    create type mandat_status as enum ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'TERMINATED', 'EXPIRED');
  end if;
  if not exists (select 1 from pg_type where typname = 'mandat_type') then
    create type mandat_type as enum ('GESTION_COMPLETE', 'GESTION_LOCATION', 'MANDAT_SIMPLE');
  end if;
  if not exists (select 1 from pg_type where typname = 'agency_agent_role') then
    create type agency_agent_role as enum ('ADMIN', 'AGENT', 'READ_ONLY');
  end if;
  if not exists (select 1 from pg_type where typname = 'agency_agent_status') then
    create type agency_agent_status as enum ('ACTIVE', 'INACTIVE');
  end if;
  if not exists (select 1 from pg_type where typname = 'commission_status') then
    create type commission_status as enum ('PENDING', 'PAID', 'CANCELLED');
  end if;
  if not exists (select 1 from pg_type where typname = 'signalement_status') then
    create type signalement_status as enum ('PENDING', 'IN_REVIEW', 'VALIDATED', 'REJECTED', 'ESCALATED', 'RESOLVED');
  end if;
  if not exists (select 1 from pg_type where typname = 'signalement_reason') then
    create type signalement_reason as enum ('INAPPROPRIATE_CONTENT', 'FRAUD', 'SPAM', 'HARASSMENT', 'FALSE_INFORMATION', 'OTHER');
  end if;
end $$;

-- Add missing otp_type enum values used by profile change endpoints
alter type otp_type add value if not exists 'EMAIL_CHANGE';
alter type otp_type add value if not exists 'PHONE_CHANGE';
alter type otp_type add value if not exists 'PHONE_VERIFY';
