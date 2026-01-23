/*
  Migration: Create Trust Agent (Tiers de Confiance) tables

  This migration creates all tables needed for the Trust Agent functionality:
  - Dispute management system (disputes, messages, evidence, proposals)
  - CEV reports table
  - Tenant applications table for dossier validation
  - Proper RLS policies for trust_agent role
  - Views for trust agent operations
*/

-- =====================================================
-- DISPUTE MANAGEMENT TABLES
-- =====================================================

-- Main disputes table
create table disputes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid,
  type text not null check (type in ('deposit', 'damage', 'rent', 'noise', 'other')),
  status text not null default 'assigned' check (status in ('assigned', 'under_mediation', 'awaiting_response', 'resolved', 'escalated')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  title text not null,
  description text not null,
  created_by uuid not null,
  assigned_to uuid,
  mediation_stage text check (mediation_stage in ('reception', 'analysis', 'negotiation', 'proposal', 'resolution')),
  resolution_notes text,
  resolved_at timestamptz,
  escalated_at timestamptz,
  escalated_to uuid,
  escalation_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  foreign key (contract_id) references lease_contracts(id) on delete set null,
  foreign key (created_by) references profiles(id) on delete cascade,
  foreign key (assigned_to) references profiles(id) on delete set null,
  foreign key (escalated_to) references profiles(id) on delete set null
);

-- Dispute messages table
create table dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null,
  sender_id uuid not null,
  sender_role text not null check (sender_role in ('tenant', 'owner', 'trust_agent', 'admin')),
  content text not null,
  attachments text[] default '{}',
  is_internal boolean default false,
  read_at timestamptz,
  created_at timestamptz default now(),
  foreign key (dispute_id) references disputes(id) on delete cascade,
  foreign key (sender_id) references profiles(id) on delete cascade
);

-- Dispute evidence/documents table
create table dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null,
  uploaded_by uuid not null,
  uploader_role text not null check (uploader_role in ('tenant', 'owner', 'trust_agent', 'admin')),
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size integer,
  description text,
  is_public boolean default false,
  created_at timestamptz default now(),
  foreign key (dispute_id) references disputes(id) on delete cascade,
  foreign key (uploaded_by) references profiles(id) on delete cascade
);

-- Dispute resolution proposals table
create table dispute_proposals (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null,
  proposed_by uuid not null,
  proposal_type text not null check (proposal_type in ('refund', 'compensation', 'payment_plan', 'other')),
  amount numeric,
  description text not null,
  tenant_accepted boolean,
  owner_accepted boolean,
  tenant_response_notes text,
  owner_response_notes text,
  expires_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz default now(),
  foreign key (dispute_id) references disputes(id) on delete cascade,
  foreign key (proposed_by) references profiles(id) on delete cascade
);

-- =====================================================
-- CEV REPORTS TABLE
-- =====================================================

create table cev_reports (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null,
  report_type text check (report_type in ('verification', 'inspection', 'mediation', 'documentation', 'etat_lieux')),
  report_content jsonb not null,
  attachments text[] default '{}',
  findings jsonb,
  recommendations jsonb,
  submitted_by uuid not null,
  submitted_at timestamptz default now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  foreign key (mission_id) references cev_missions(id) on delete cascade,
  foreign key (submitted_by) references profiles(id) on delete cascade,
  foreign key (reviewed_by) references profiles(id) on delete set null
);

-- =====================================================
-- TENANT APPLICATIONS TABLE (for dossier validation)
-- =====================================================

create table tenant_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  full_name text not null,
  email text not null,
  phone text,
  date_of_birth date,
  national_id text,
  occupation text,
  monthly_income numeric,
  employment_status text,
  employer_name text,
  employer_contact text,
  current_address text,
  has_pets boolean default false,
  pets_description text,
  family_size integer default 1,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  -- Document URLs
  id_document_url text,
  id_document_verified boolean default false,
  id_document_verified_at timestamptz,
  income_proof_url text,
  income_proof_verified boolean default false,
  income_proof_verified_at timestamptz,
  employment_proof_url text,
  employment_proof_verified boolean default false,
  employment_proof_verified_at timestamptz,
  bank_statement_url text,
  bank_statement_verified boolean default false,
  bank_statement_verified_at timestamptz,
  rental_history_url text,
  rental_history_verified boolean default false,
  rental_history_verified_at timestamptz,
  -- Verification status
  verification_status text default 'pending' check (verification_status in ('pending', 'in_review', 'approved', 'rejected')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  notes text,
  reference_data jsonb default '[]'::jsonb,
  foreign key (user_id) references profiles(id) on delete cascade,
  foreign key (reviewed_by) references profiles(id) on delete set null
);

-- =====================================================
-- OWNER APPLICATIONS TABLE
-- =====================================================

create table owner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  full_name text not null,
  email text not null,
  phone text,
  date_of_birth date,
  national_id text,
  address text,
  city text,
  country text default 'Côte d''Ivoire',
  -- Document URLs
  id_document_url text,
  id_document_verified boolean default false,
  id_document_verified_at timestamptz,
  property_proof_url text,
  property_proof_verified boolean default false,
  property_proof_verified_at timestamptz,
  income_proof_url text,
  income_proof_verified boolean default false,
  income_proof_verified_at timestamptz,
  -- Verification status
  verification_status text default 'pending' check (verification_status in ('pending', 'in_review', 'approved', 'rejected')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  notes text,
  foreign key (user_id) references profiles(id) on delete cascade,
  foreign key (reviewed_by) references profiles(id) on delete set null
);

-- =====================================================
-- AGENCY APPLICATIONS TABLE
-- =====================================================

create table agency_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  agency_name text not null,
  email text not null,
  phone text,
  address text,
  city text,
  country text default 'Côte d''Ivoire',
  registration_number text,
  tax_id text,
  -- Document URLs
  registration_document_url text,
  registration_document_verified boolean default false,
  registration_document_verified_at timestamptz,
  tax_certificate_url text,
  tax_certificate_verified boolean default false,
  tax_certificate_verified_at timestamptz,
  insurance_proof_url text,
  insurance_proof_verified boolean default false,
  insurance_proof_verified_at timestamptz,
  -- Verification status
  verification_status text default 'pending' check (verification_status in ('pending', 'in_review', 'approved', 'rejected')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  notes text,
  foreign key (user_id) references profiles(id) on delete cascade,
  foreign key (reviewed_by) references profiles(id) on delete set null
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Disputes indexes
create index disputes_contract_id_idx on disputes(contract_id);
create index disputes_status_idx on disputes(status);
create index disputes_assigned_to_idx on disputes(assigned_to);
create index disputes_created_by_idx on disputes(created_by);
create index disputes_created_at_idx on disputes(created_at);

-- Dispute messages indexes
create index dispute_messages_dispute_id_idx on dispute_messages(dispute_id);
create index dispute_messages_sender_id_idx on dispute_messages(sender_id);
create index dispute_messages_created_at_idx on dispute_messages(created_at);

-- Dispute evidence indexes
create index dispute_evidence_dispute_id_idx on dispute_evidence(dispute_id);
create index dispute_evidence_uploaded_by_idx on dispute_evidence(uploaded_by);

-- Dispute proposals indexes
create index dispute_proposals_dispute_id_idx on dispute_proposals(dispute_id);
create index dispute_proposals_proposed_by_idx on dispute_proposals(proposed_by);

-- CEV reports indexes
create index cev_reports_mission_id_idx on cev_reports(mission_id);
create index cev_reports_submitted_by_idx on cev_reports(submitted_by);

-- Tenant applications indexes
create index tenant_applications_user_id_idx on tenant_applications(user_id);
create index tenant_applications_verification_status_idx on tenant_applications(verification_status);
create index tenant_applications_submitted_at_idx on tenant_applications(submitted_at);

-- Owner applications indexes
create index owner_applications_user_id_idx on owner_applications(user_id);
create index owner_applications_verification_status_idx on owner_applications(verification_status);

-- Agency applications indexes
create index agency_applications_user_id_idx on agency_applications(user_id);
create index agency_applications_verification_status_idx on agency_applications(verification_status);

-- =====================================================
-- RLS POLICIES FOR TRUST_AGENT
-- =====================================================

-- Enable RLS on all tables
alter table disputes enable row level security;
alter table dispute_messages enable row level security;
alter table dispute_evidence enable row level security;
alter table dispute_proposals enable row level security;
alter table cev_reports enable row level security;
alter table tenant_applications enable row level security;
alter table owner_applications enable row level security;
alter table agency_applications enable row level security;

-- Disputes policies
-- Trust agents can view all disputes (for assignment purposes)
create policy "Trust agents can view all disputes"
on disputes for select
to authenticated
using (
  exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

-- Trust agents can update disputes assigned to them
create policy "Trust agents can update assigned disputes"
on disputes for update
to authenticated
using (
  assigned_to = auth.uid()
  and exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

-- Anyone can create disputes (tenants, owners, admins)
create policy "Authenticated users can create disputes"
on disputes for insert
to authenticated
with check (created_by = auth.uid());

-- Dispute messages policies
create policy "Participants can view dispute messages"
on dispute_messages for select
to authenticated
using (
  exists (
    select 1 from disputes d
    join lease_contracts lc on d.contract_id = lc.id
    where d.id = dispute_messages.dispute_id
    and (lc.tenant_id = auth.uid() or lc.owner_id = auth.uid())
  )
  or exists (
    select 1 from disputes
    where id = dispute_messages.dispute_id
    and (assigned_to = auth.uid() or created_by = auth.uid())
  )
  or exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role in ('trust_agent', 'admin')
  )
);

create policy "Dispute participants can send messages"
on dispute_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from disputes
    where id = dispute_messages.dispute_id
  )
);

-- Dispute evidence policies
create policy "Participants can view dispute evidence"
on dispute_evidence for select
to authenticated
using (
  exists (
    select 1 from disputes d
    join lease_contracts lc on d.contract_id = lc.id
    where d.id = dispute_evidence.dispute_id
    and (lc.tenant_id = auth.uid() or lc.owner_id = auth.uid())
  )
  or exists (
    select 1 from disputes
    where id = dispute_evidence.dispute_id
    and assigned_to = auth.uid()
  )
  or exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role in ('trust_agent', 'admin')
  )
);

create policy "Dispute participants can upload evidence"
on dispute_evidence for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from disputes
    where id = dispute_evidence.dispute_id
  )
);

-- Dispute proposals policies
create policy "Trust agents can create proposals"
on dispute_proposals for insert
to authenticated
with check (
  proposed_by = auth.uid()
  and exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

create policy "Dispute participants can view proposals"
on dispute_proposals for select
to authenticated
using (
  exists (
    select 1 from disputes d
    join lease_contracts lc on d.contract_id = lc.id
    where d.id = dispute_proposals.dispute_id
    and (lc.tenant_id = auth.uid() or lc.owner_id = auth.uid())
  )
  or exists (
    select 1 from disputes
    where id = dispute_proposals.dispute_id
    and assigned_to = auth.uid()
  )
  or exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role in ('trust_agent', 'admin')
  )
);

-- CEV reports policies
create policy "Trust agents can create reports"
on cev_reports for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

create policy "Trust agents can view their reports"
on cev_reports for select
to authenticated
using (
  submitted_by = auth.uid()
  or exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role in ('trust_agent', 'admin')
  )
);

-- Tenant applications policies
create policy "Users can view their own applications"
on tenant_applications for select
to authenticated
using (user_id = auth.uid());

create policy "Trust agents can view all tenant applications"
on tenant_applications for select
to authenticated
using (
  exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

create policy "Trust agents can update applications"
on tenant_applications for update
to authenticated
using (
  exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

create policy "Users can create their own applications"
on tenant_applications for insert
to authenticated
with check (user_id = auth.uid());

-- Owner applications policies (similar to tenant)
create policy "Users can view their own owner applications"
on owner_applications for select
to authenticated
using (user_id = auth.uid());

create policy "Trust agents can view all owner applications"
on owner_applications for select
to authenticated
using (
  exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

create policy "Trust agents can update owner applications"
on owner_applications for update
to authenticated
using (
  exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

create policy "Users can create their own owner applications"
on owner_applications for insert
to authenticated
with check (user_id = auth.uid());

-- Agency applications policies (similar to tenant)
create policy "Users can view their own agency applications"
on agency_applications for select
to authenticated
using (user_id = auth.uid());

create policy "Trust agents can view all agency applications"
on agency_applications for select
to authenticated
using (
  exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

create policy "Trust agents can update agency applications"
on agency_applications for update
to authenticated
using (
  exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

create policy "Users can create their own agency applications"
on agency_applications for insert
to authenticated
with check (user_id = auth.uid());

-- =====================================================
-- CEV MISSIONS RLS POLICIES
-- =====================================================

-- Enable RLS on cev_missions if not already enabled
alter table cev_missions enable row level security;

-- Drop existing policies if any
drop policy if exists "Trust agents can view their missions" on cev_missions;
drop policy if exists "Trust agents can update their missions" on cev_missions;
drop policy if exists "All can view missions" on cev_missions;

-- Trust agents can view all missions (for assignment and overview)
create policy "Trust agents can view all missions"
on cev_missions for select
to authenticated
using (
  exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

-- Trust agents can update missions assigned to them
create policy "Trust agents can update their assigned missions"
on cev_missions for update
to authenticated
using (
  assigned_agent_id = auth.uid()
  and exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'trust_agent'
  )
);

-- Property owners can view missions for their properties
create policy "Property owners can view their property missions"
on cev_missions for select
to authenticated
using (
  exists (
    select 1 from properties p
    where p.id = cev_missions.property_id
    and p.owner_id = auth.uid()
  )
);

-- Admins can view all missions
create policy "Admins can view all missions"
on cev_missions for select
to authenticated
using (
  exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'admin'
  )
);

-- =====================================================
-- VIEWS FOR TRUST AGENT OPERATIONS
-- =====================================================

-- View for trust agent dashboard stats
create or replace view trust_agent_dashboard_stats as
select
  auth.uid() as agent_id,
  (select count(*) from cev_missions where assigned_agent_id = auth.uid()) as total_missions,
  (select count(*) from cev_missions where assigned_agent_id = auth.uid() and status = 'pending') as pending_missions,
  (select count(*) from cev_missions where assigned_agent_id = auth.uid() and status = 'in_progress') as in_progress_missions,
  (select count(*) from cev_missions where assigned_agent_id = auth.uid() and status = 'completed') as completed_missions,
  (select count(*) from disputes where assigned_to = auth.uid()) as total_disputes,
  (select count(*) from disputes where assigned_to = auth.uid() and status = 'open') as open_disputes,
  (select count(*) from disputes where assigned_to = auth.uid() and status = 'resolved') as resolved_disputes,
  (select count(*) from tenant_applications where verification_status in ('pending', 'in_review')) as pending_tenant_dossiers,
  (select count(*) from owner_applications where verification_status in ('pending', 'in_review')) as pending_owner_dossiers,
  (select count(*) from agency_applications where verification_status in ('pending', 'in_review')) as pending_agency_dossiers;

-- View for disputes with contract details
create or replace view disputes_with_details as
select
  d.id,
  d.type,
  d.status,
  d.priority,
  d.title,
  d.description,
  d.created_by,
  d.assigned_to,
  d.mediation_stage,
  d.resolution_notes,
  d.resolved_at,
  d.escalated_at,
  d.escalated_to,
  d.escalation_reason,
  d.created_at,
  d.updated_at,
  -- Contract details
  d.contract_id,
  lc.tenant_id,
  lc.owner_id,
  lc.property_id,
  p.title as property_title,
  p.address as property_address,
  p.city as property_city,
  tenant_profile.full_name as tenant_name,
  tenant_profile.email as tenant_email,
  owner_profile.full_name as owner_name,
  owner_profile.email as owner_email
from disputes d
left join lease_contracts lc on d.contract_id = lc.id
left join properties p on lc.property_id = p.id
left join profiles tenant_profile on lc.tenant_id = tenant_profile.id
left join profiles owner_profile on lc.owner_id = owner_profile.id;

-- View for tenant applications with user details
create or replace view tenant_applications_with_details as
select
  ta.id,
  ta.user_id,
  ta.full_name,
  ta.email as application_email,
  ta.phone as application_phone,
  ta.date_of_birth,
  ta.national_id,
  ta.occupation,
  ta.monthly_income,
  ta.employment_status,
  ta.employer_name,
  ta.employer_contact,
  ta.current_address,
  ta.has_pets,
  ta.pets_description,
  ta.family_size,
  ta.emergency_contact_name,
  ta.emergency_contact_phone,
  ta.emergency_contact_relationship,
  ta.id_document_url,
  ta.id_document_verified,
  ta.id_document_verified_at,
  ta.income_proof_url,
  ta.income_proof_verified,
  ta.income_proof_verified_at,
  ta.employment_proof_url,
  ta.employment_proof_verified,
  ta.employment_proof_verified_at,
  ta.bank_statement_url,
  ta.bank_statement_verified,
  ta.bank_statement_verified_at,
  ta.rental_history_url,
  ta.rental_history_verified,
  ta.rental_history_verified_at,
  ta.verification_status,
  ta.submitted_at,
  ta.reviewed_at,
  ta.reviewed_by,
  ta.rejection_reason,
  ta.notes,
  ta.reference_data,
  u.email as user_email,
  u.avatar_url,
  u.phone as user_phone,
  u.city as user_city
from tenant_applications ta
left join profiles u on ta.user_id = u.id;

-- View for owner applications with user details
create or replace view owner_applications_with_details as
select
  oa.id,
  oa.user_id,
  oa.full_name,
  oa.email as application_email,
  oa.phone as application_phone,
  oa.date_of_birth,
  oa.national_id,
  oa.address,
  oa.city,
  oa.country,
  oa.id_document_url,
  oa.id_document_verified,
  oa.id_document_verified_at,
  oa.property_proof_url,
  oa.property_proof_verified,
  oa.property_proof_verified_at,
  oa.income_proof_url,
  oa.income_proof_verified,
  oa.income_proof_verified_at,
  oa.verification_status,
  oa.submitted_at,
  oa.reviewed_at,
  oa.reviewed_by,
  oa.rejection_reason,
  oa.notes,
  u.email as user_email,
  u.avatar_url,
  u.phone as user_phone
from owner_applications oa
left join profiles u on oa.user_id = u.id;

-- View for agency applications with user details
create or replace view agency_applications_with_details as
select
  aa.id,
  aa.user_id,
  aa.agency_name,
  aa.email as application_email,
  aa.phone as application_phone,
  aa.address,
  aa.city,
  aa.country,
  aa.registration_number,
  aa.tax_id,
  aa.registration_document_url,
  aa.registration_document_verified,
  aa.registration_document_verified_at,
  aa.tax_certificate_url,
  aa.tax_certificate_verified,
  aa.tax_certificate_verified_at,
  aa.insurance_proof_url,
  aa.insurance_proof_verified,
  aa.insurance_proof_verified_at,
  aa.verification_status,
  aa.submitted_at,
  aa.reviewed_at,
  aa.reviewed_by,
  aa.rejection_reason,
  aa.notes,
  u.email as user_email,
  u.avatar_url,
  u.phone as user_phone
from agency_applications aa
left join profiles u on aa.user_id = u.id;

-- View for trust agent missions with property details
create or replace view trust_agent_missions_with_details as
select
  cm.*,
  p.title as property_title,
  p.address as property_address,
  p.city as property_city,
  p.main_image as property_image,
  owner_profile.full_name as owner_name,
  owner_profile.email as owner_email,
  owner_profile.phone as owner_phone
from cev_missions cm
left join properties p on cm.property_id = p.id
left join profiles owner_profile on p.owner_id = owner_profile.id
where cm.assigned_agent_id = auth.uid();

-- Grant access to views
grant select on trust_agent_dashboard_stats to authenticated;
grant select on disputes_with_details to authenticated;
grant select on tenant_applications_with_details to authenticated;
grant select on owner_applications_with_details to authenticated;
grant select on agency_applications_with_details to authenticated;
grant select on trust_agent_missions_with_details to authenticated;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for tables with updated_at
create trigger update_disputes_updated_at before update on disputes
  for each row execute function update_updated_at_column();

create trigger update_cev_reports_updated_at before update on cev_reports
  for each row execute function update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to assign dispute to available trust agent
create or replace function assign_dispute_to_agent(
  dispute_id uuid,
  agent_id uuid default null
)
returns uuid as $$
declare
  v_agent_id uuid;
begin
  -- If agent_id is provided, use it
  if agent_id is not null then
    v_agent_id := agent_id;
  else
    -- Find an available trust agent (with fewest active disputes)
    select user_id into v_agent_id
    from user_roles
    where role = 'trust_agent'
    order by (
      select count(*)
      from disputes
      where assigned_to = user_roles.user_id
      and status in ('assigned', 'under_mediation', 'awaiting_response')
    ) asc
    limit 1;
  end if;

  -- Update the dispute
  update disputes
  set assigned_to = v_agent_id,
      status = 'assigned',
      updated_at = now()
  where id = dispute_id;

  return v_agent_id;
end;
$$ language plpgsql security definer;

-- Function to get dispute statistics
create or replace function get_dispute_statistics(
  p_agent_id uuid default null
)
returns json as $$
declare
  v_result json;
begin
  if p_agent_id is not null then
    select json_build_object(
      'total', count(*),
      'assigned', count(*) filter (where status = 'assigned'),
      'under_mediation', count(*) filter (where status = 'under_mediation'),
      'awaiting_response', count(*) filter (where status = 'awaiting_response'),
      'resolved', count(*) filter (where status = 'resolved'),
      'escalated', count(*) filter (where status = 'escalated'),
      'avg_resolution_time_days', avg(extract(day from (resolved_at - created_at)))
    ) into v_result
    from disputes
    where assigned_to = p_agent_id;
  else
    select json_build_object(
      'total', count(*),
      'assigned', count(*) filter (where status = 'assigned'),
      'under_mediation', count(*) filter (where status = 'under_mediation'),
      'awaiting_response', count(*) filter (where status = 'awaiting_response'),
      'resolved', count(*) filter (where status = 'resolved'),
      'escalated', count(*) filter (where status = 'escalated'),
      'avg_resolution_time_days', avg(extract(day from (resolved_at - created_at)))
    ) into v_result
    from disputes;
  end if;

  return v_result;
end;
$$ language plpgsql security definer;

-- Grant execute on functions
grant execute on function assign_dispute_to_agent to authenticated;
grant execute on function get_dispute_statistics to authenticated;
