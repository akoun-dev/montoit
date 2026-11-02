/*
  Migration: Create Email Templates System

  Purpose:
    - Setup email template management for automated communications
    - Allow owners and agencies to create and manage email templates
    - Support variable substitution in templates
    - Enable categorized templates for different use cases

  Tables Created:
    - email_templates: Email template definitions

  Dependencies:
    - profiles table must exist (created in first migration)
*/

-- create enum for email template categories
create type email_template_category as enum (
  'welcome',
  'rent_reminder',
  'visit_confirmed',
  'visit_cancelled',
  'visit_reminder',
  'renewal',
  'rent_increase',
  'contract_signed',
  'payment_received',
  'payment_overdue',
  'maintenance_request',
  'custom'
);

-- email_templates table: email template definitions
create table email_templates (
  id uuid primary key default gen_random_uuid(),

  -- template identification
  name text not null,
  slug text unique not null,
  description text,

  -- email content
  subject text not null,
  body_html text not null,
  body_text text not null,

  -- template variables (comma-separated or array)
  variables text[] default '{}',

  -- categorization
  category email_template_category default 'custom',

  -- ownership
  created_by uuid references profiles(id) on delete set null,

  -- template status
  active boolean default true,

  -- usage tracking
  usage_count integer default 0,

  -- preview data (for testing variables)
  preview_data jsonb default '{}',

  -- metadata
  tags text[] default '{}',
  notes text,

  -- timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- create indexes for performance
create index idx_email_templates_slug on email_templates(slug);
create index idx_email_templates_category on email_templates(category);
create index idx_email_templates_created_by on email_templates(created_by);
create index idx_email_templates_active on email_templates(active);

-- enable row level security
alter table email_templates enable row level security;

-- rls policies for email_templates table
-- users can view their own templates and system templates
create policy "users_view_email_templates" on email_templates
  for select using (auth.uid() = created_by);

-- users can create their own templates
create policy "users_create_email_templates" on email_templates
  for insert with check (auth.uid() = created_by);

-- users can update their own templates
create policy "users_update_email_templates" on email_templates
  for update using (auth.uid() = created_by);

-- users can delete their own templates
create policy "users_delete_email_templates" on email_templates
  for delete using (auth.uid() = created_by);

-- create trigger for updated_at column
create trigger update_email_templates_updated_at
  before update on email_templates
  for each row execute function update_updated_at_column();

-- Insert default templates (only if profiles exist)
do $$
begin
  if exists (select 1 from profiles limit 1) then
    insert into email_templates (name, slug, subject, body_html, body_text, variables, category, created_by, active) values
    (
      'Bienvenue',
      'bienvenue',
      'Bienvenue chez MonToit !',
      '<p>Bonjour {prenom},</p><p>Bienvenue sur MonToit ! Nous sommes ravis de vous compter parmi nous.</p><p>Vous pouvez maintenant accéder à votre espace personnel pour gérer vos locations.</p>',
      'Bonjour {prenom}, Bienvenue sur MonToit ! Nous sommes ravis de vous compter parmi nous.',
      ARRAY['prenom', 'nom'],
      'welcome',
      (select id from profiles limit 1),
      true
    ),
    (
      'Relance Loyer',
      'relance_loyer',
      'Rappel de paiement de loyer',
      '<p>Bonjour {prenom},</p><p>Ceci est un rappel pour le paiement de votre loyer de {montant} FCFA pour le mois de {mois}.</p><p>Date d''échéance : {date_echeance}</p>',
      'Rappel de paiement de loyer pour {mois}',
      ARRAY['prenom', 'montant', 'date_echeance', 'mois'],
      'rent_reminder',
      (select id from profiles limit 1),
      true
    ),
    (
      'Visite Confirmée',
      'visite_confirmee',
      'Votre visite est confirmée',
      '<p>Bonjour {prenom},</p><p>Votre visite pour le bien <strong>{propriete}</strong> le {date_visite} à {heure} est confirmée.</p><p>Adresse : {adresse}</p>',
      'Visite confirmée pour {propriete} le {date_visite}',
      ARRAY['prenom', 'propriete', 'date_visite', 'heure', 'adresse'],
      'visit_confirmed',
      (select id from profiles limit 1),
      true
    ),
    (
      'Paiement Reçu',
      'paiement_recu',
      'Confirmation de paiement',
      '<p>Bonjour {prenom},</p><p>Nous avons bien reçu votre paiement de {montant} FCFA pour le loyer de {mois}.</p><p>Merci pour votre régularité !</p>',
      'Confirmation de paiement de {montant} FCFA',
      ARRAY['prenom', 'montant', 'mois'],
      'payment_received',
      (select id from profiles limit 1),
      true
    ),
    (
      'Renouvellement de Bail',
      'renouvellement_bail',
      'Renouvellement de votre bail',
      '<p>Bonjour {prenom},</p><p>Votre bail arrive à échéance le {date_fin}. Souhaitez-vous le renouveler ?</p><p>Nouveau montant : {nouveau_montant} FCFA</p>',
      'Votre bail arrive à échéance le {date_fin}',
      ARRAY['prenom', 'date_fin', 'nouveau_montant'],
      'renewal',
      (select id from profiles limit 1),
      true
    );
  end if;
end
$$;
