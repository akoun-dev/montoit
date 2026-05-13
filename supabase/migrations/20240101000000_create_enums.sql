-- Migration: Create all enums
-- Description: All custom enum types for the database
-- Order: This must run first before any table creation

-- Chatbot enums
CREATE TYPE chatbot_conversation_status AS ENUM ('active', 'archived', 'closed');
CREATE TYPE chatbot_conversation_type AS ENUM ('general', 'property', 'application', 'contract', 'support');

-- Email enums
CREATE TYPE email_template_category AS ENUM (
  'welcome', 'rent_reminder', 'visit_confirmed', 'visit_cancelled',
  'visit_reminder', 'renewal', 'rent_increase', 'contract_signed',
  'payment_received', 'payment_overdue', 'maintenance_request', 'custom'
);

-- Lease enums
CREATE TYPE lease_contract_status AS ENUM ('draft', 'pending_signature', 'active', 'terminated', 'cancelled', 'expired');
CREATE TYPE lease_status AS ENUM ('draft', 'pending', 'active', 'terminated', 'cancelled', 'expired');
CREATE TYPE lease_type AS ENUM ('long_term', 'short_term', 'seasonal', 'furnished', 'commercial');
CREATE TYPE payment_method AS ENUM (
  'bank_transfer', 'cash', 'check', 'card',
  'mobile_money', 'orange_money', 'mtn_money', 'moov_money', 'wave'
);

-- Message enums
CREATE TYPE message_type AS ENUM ('text', 'image', 'document', 'audio', 'video', 'system', 'location');

-- Payment enums
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'overdue', 'partial', 'cancelled', 'refunded');
CREATE TYPE payment_type AS ENUM ('rent', 'security_deposit', 'service_charges', 'fees', 'reservation', 'refund');

-- Property enums
CREATE TYPE property_status AS ENUM ('available', 'rented', 'unavailable', 'pending', 'maintenance', 'inactive');
CREATE TYPE property_type_enum AS ENUM (
  'apartment', 'house', 'studio', 'villa', 'duplex',
  'room', 'office', 'retail', 'warehouse', 'land'
);

-- User enums
CREATE TYPE user_type AS ENUM ('tenant', 'owner', 'agency', 'trust_agent', 'admin');

-- Application enums
CREATE TYPE application_status AS ENUM ('pending', 'in_progress', 'accepted', 'rejected', 'cancelled');

-- Visit enums
CREATE TYPE visit_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE visit_request_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled', 'completed');
CREATE TYPE visit_type AS ENUM ('in_person', 'video_call', 'virtual');

-- Verification enums
CREATE TYPE verification_status AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'expired');
CREATE TYPE verification_type AS ENUM ('identity', 'income', 'employment', 'bank', 'rental_history', 'property', 'agency');

-- Notification enums
CREATE TYPE notification_type AS ENUM (
  'info', 'success', 'warning', 'error',
  'rent_due', 'rent_overdue', 'lease_expiry', 'lease_renewal',
  'application', 'message', 'visit', 'contract', 'payment', 'maintenance'
);

-- Dispute enums
CREATE TYPE dispute_type AS ENUM ('deposit', 'damage', 'rent', 'noise', 'other');
CREATE TYPE dispute_status AS ENUM ('assigned', 'under_mediation', 'awaiting_response', 'resolved', 'escalated');
CREATE TYPE dispute_priority AS ENUM ('low', 'medium', 'high');

-- Agency enums
CREATE TYPE agency_status AS ENUM ('pending', 'active', 'suspended', 'rejected');

-- Role enum (from user_roles table)
CREATE TYPE user_role AS ENUM ('admin', 'trust_agent');

-- Mediation stage
CREATE TYPE mediation_stage AS ENUM ('reception', 'analysis', 'negotiation', 'proposal', 'resolution');

-- Signature status
CREATE TYPE signature_status AS ENUM ('pending', 'owner_signed', 'agency_signed', 'completed', 'failed', 'expired');
