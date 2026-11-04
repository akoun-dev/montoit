/**
 * Bootstrap PostgreSQL local pour Mon Toit CI
 * - Crée les rôles Supabase (cluster-wide)
 * - Crée la base `montoit`
 * - Émule les schémas Supabase: auth (fonctions JWT) + storage (buckets/objects)
 * - Applique les 102 migrations supabase/migrations (transaction par fichier)
 * Usage: node db/bootstrap.mjs
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const HOST = '127.0.0.1';
const PORT = 5432;
const USER = 'postgres';
const DB_NAME = 'montoit';
const ROOT = path.resolve(import.meta.dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

const url = (db) => `postgresql://${USER}@${HOST}:${PORT}/${db}`;

const ROLES = [
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN NOINHERIT; END IF;
     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN NOINHERIT; END IF;
     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN NOINHERIT; END IF;
     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticator') THEN CREATE ROLE authenticator NOLOGIN NOINHERIT; END IF;
     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin LOGIN; END IF;
     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='supabase_storage_admin') THEN CREATE ROLE supabase_storage_admin LOGIN; END IF;
   END $$;
   GRANT anon, authenticated, service_role TO authenticator;
   GRANT service_role TO supabase_auth_admin, supabase_storage_admin;
   ALTER ROLE service_role BYPASSRLS;`,
];

const SUPABASE_EMULATION = `
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS graphql_public;
GRANT USAGE ON SCHEMA extensions, realtime, graphql_public TO anon, authenticated, service_role;

-- ============ AUTH (émulation minimale GoTrue) ============
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS auth.users (
  instance_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aud varchar(255),
  role varchar(255) DEFAULT 'authenticated',
  email varchar(255) UNIQUE,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token varchar(255),
  confirmation_sent_at timestamptz,
  recovery_token varchar(255),
  recovery_sent_at timestamptz,
  email_change_token_new varchar(255),
  email_change varchar(255),
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  is_super_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  phone varchar(15) UNIQUE,
  phone_confirmed_at timestamptz,
  phone_change varchar(15),
  phone_change_token varchar(255),
  phone_change_sent_at timestamptz,
  email_change_token_current varchar(255),
  email_change_confirm_status smallint DEFAULT 0,
  banned_until timestamptz,
  reauthentication_token varchar(255),
  reauthentication_sent_at timestamptz,
  is_sso_user boolean DEFAULT false NOT NULL,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS auth.identities (
  id varchar(255) NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id varchar(255) NOT NULL,
  identity_data jsonb NOT NULL,
  provider varchar(255) NOT NULL,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  email varchar(255) GENERATED ALWAYS AS (identity_data->>'email') STORED,
  PRIMARY KEY (provider, id),
  UNIQUE (provider_id, user_id)
);

CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
  instance_id uuid,
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token varchar(255) UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  revoked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  parent varchar(255),
  session_id uuid
);

CREATE TABLE IF NOT EXISTS auth.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  factor_id varchar(255),
  aal varchar(10),
  not_after timestamptz,
  refreshed_at timestamptz,
  user_agent varchar(512),
  ip varchar(64),
  tag varchar(255)
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(
    coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
      ->> 'sub', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(
    coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
      ->> 'role', '');
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(
    coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
      ->> 'email', '');
$$;

-- ============ STORAGE (émulation minimale) ============
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  owner uuid,
  owner_id text,
  public boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  avif_autodetection boolean DEFAULT false NOT NULL,
  file_size_limit bigint,
  allowed_mime_types text[],
  file_path_template text DEFAULT '\${filename}'::text,
  type text DEFAULT 'STANDARD'::text NOT NULL
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  owner_id text,
  version text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  UNIQUE (bucket_id, name)
);
CREATE INDEX IF NOT EXISTS objects_bucket_id_idx ON storage.objects (bucket_id);
CREATE INDEX IF NOT EXISTS name_idx_storage_objects ON storage.objects (name);

GRANT ALL ON ALL TABLES IN SCHEMA storage TO supabase_storage_admin, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin, service_role;

-- ============ REALTIME (publication requise par les migrations) ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_publication WHERE pubname='supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- ============ STORAGE : fonctions helpers Supabase ============
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT (string_to_array(name, '/'))[1 : greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;

CREATE OR REPLACE FUNCTION storage.filename(name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)]
$$;

CREATE OR REPLACE FUNCTION storage.extension(name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT reverse(split_part(reverse(name), '.', 1))
$$;

-- Table storage.policies (storage-api Supabase)
CREATE TABLE IF NOT EXISTS storage.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id) ON DELETE CASCADE,
  name text NOT NULL,
  definition text,
  "check" text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (bucket_id, name)
);

-- ============ COMPATIBILITÉ LEGACY ============
-- Les migrations de janvier 2026 référencent profiles / lease_contracts / agencies,
-- créées à l'origine par une migration supprimée de l'historique (dette technique).
-- Tables de compatibilité minimales pour que ces migrations + le code legacy passent.
CREATE TABLE IF NOT EXISTS public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  logo_url text,
  description text,
  contact_email text,
  contact_phone text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  phone text,
  full_name text,
  first_name text,
  last_name text,
  avatar_url text,
  user_type text,
  role text,
  is_verified boolean DEFAULT false,
  city text,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  agency_name text,
  agency_logo text,
  agency_description text,
  agency_website text,
  agency_phone text,
  agency_email text,
  verification_documents jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lease_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE,
  property_id text,  -- aligné sur properties.id (text dans la base actuelle)
  owner_id uuid,
  tenant_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'draft',
  owner_signed_at timestamptz,
  tenant_signed_at timestamptz,
  start_date date,
  end_date date,
  rent_amount numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- user_roles : référencée par les policies legacy trust_agent et le code app
-- (28 appels), jamais créée par les migrations (dette technique).
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- cev_missions : référencée par cev_reports (migrations legacy) et le code app
-- (39 appels .from('cev_missions')), jamais créée par les migrations (dette technique).
CREATE TABLE IF NOT EXISTS public.cev_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  mission_type text,
  assigned_agent_id uuid,
  property_id text,  -- aligné sur properties.id (text dans la base actuelle)
  agent_id uuid,
  notes text,
  status text DEFAULT 'pending',
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER DATABASE ${DB_NAME} SET search_path TO '\\$user', public, extensions;
`;

async function main() {
  // ---- Étape A : rôles (cluster-wide) sur la base `postgres`
  const admin = new pg.Client({ connectionString: url('postgres') });
  await admin.connect();
  for (const sql of ROLES) {
    await admin.query(sql);
  }
  console.log('✅ Rôles Supabase créés (anon, authenticated, service_role, authenticator, ...)');

  // ---- Étape B : base montoit
  const dbExists = await admin.query(`SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'`);
  if (dbExists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${DB_NAME} OWNER ${USER}`);
    console.log(`✅ Base « ${DB_NAME} » créée`);
  } else {
    console.log(`ℹ️  Base « ${DB_NAME} » déjà existante`);
  }
  await admin.end();

  // ---- Étape C : émulation Supabase dans montoit
  const db = new pg.Client({ connectionString: url(DB_NAME) });
  await db.connect();
  await db.query(SUPABASE_EMULATION);
  console.log('✅ Schémas auth (users, uid(), jwt()) + storage (buckets, objects) émulés');

  // ---- Étape D : migrations en 2 passes
  // (passe 1 : tout ; passe 2 : retente les échecs — résout l'ordre legacy <-> base)
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const results = [];
  const runFile = async (file, pass) => {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = new pg.Client({ connectionString: url(DB_NAME) });
    try {
      await client.connect();
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      const prev = results.find((r) => r.file === file);
      if (prev) { prev.ok = true; prev.pass = pass; delete prev.error; }
      else results.push({ file, ok: true, pass });
      return true;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      const prev = results.find((r) => r.file === file);
      const msg = String(err.message).slice(0, 300);
      if (prev) { prev.ok = false; prev.pass = pass; prev.error = msg; }
      else results.push({ file, ok: false, pass, error: msg });
      return false;
    } finally {
      try { await client.end(); } catch { /* ignore */ }
    }
  };

  for (const file of files) await runFile(file, 1);

  // ---- Étape D-bis : correctifs de compatibilité (après passe 1)
  // Aligner la table disputes de la nouvelle base avec le schéma legacy
  // (les vues trust_agent référencent contract_id / title / created_by / ...)
  await db.query(`
    ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS contract_id uuid;
    ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS title text;
    ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS created_by uuid;
    ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS assigned_to uuid;
    ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS mediation_stage text;
    ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolution_notes text;
    ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
    ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS escalated_to uuid;
    ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS main_image text;
  `);

  const failedPass1 = results.filter((r) => !r.ok).map((r) => r.file);
  if (failedPass1.length) {
    console.log(`\n🔁 Passe 2 : relance de ${failedPass1.length} migration(s) en échec...`);
    for (const file of failedPass1) await runFile(file, 2);
  }

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n📊 MIGRATIONS : ${ok.length}/${results.length} OK`);
  if (failed.length) {
    console.log('\n❌ Échecs :');
    for (const f of failed) console.log(`   - ${f.file}\n     → ${f.error}`);
  }

  // ---- Étape E : rapport statistique
  const stats = await db.query(`
    SELECT
      (SELECT count(*) FROM pg_tables    WHERE schemaname='public')                    AS tables,
      (SELECT count(*) FROM pg_views     WHERE schemaname='public')                    AS views,
      (SELECT count(*) FROM pg_type t    JOIN pg_namespace n ON n.oid=t.typnamespace
                                          WHERE n.nspname='public' AND t.typtype='e')  AS enums,
      (SELECT count(*) FROM pg_policies  WHERE schemaname='public')                    AS policies,
      (SELECT count(*) FROM pg_proc p    JOIN pg_namespace n ON n.oid=p.pronamespace
                                          WHERE n.nspname='public')                    AS functions,
      (SELECT count(*) FROM pg_trigger tr JOIN pg_class c ON c.oid=tr.tgrelid
                                          JOIN pg_namespace n ON n.oid=c.relnamespace
                                          WHERE n.nspname='public' AND NOT tr.tgisinternal) AS triggers,
      (SELECT count(*) FROM storage.buckets)                                           AS buckets`);
  const s = stats.rows[0];
  console.log(`\n📈 SCHÉMA PUBLIC : ${s.tables} tables | ${s.views} vues | ${s.enums} enums | ${s.policies} policies RLS | ${s.functions} fonctions | ${s.triggers} triggers | ${s.buckets} buckets`);

  fs.writeFileSync(path.join(ROOT, 'db', 'migrations-report.json'), JSON.stringify({ results, stats: s }, null, 2));
  console.log('\n💾 Rapport : db/migrations-report.json');

  await db.end();
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
