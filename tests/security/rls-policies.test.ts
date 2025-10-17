/**
 * RLS Security Tests for Mon Toit Platform
 * 
 * Tests critiques pour valider l'isolation des données et la sécurité des politiques RLS.
 * Ces tests doivent être exécutés régulièrement pour détecter les régressions de sécurité.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

describe('RLS Security Tests - Leases Isolation', () => {
  let userAClient: SupabaseClient;
  let userBClient: SupabaseClient;
  let userAId: string;
  let userBId: string;
  let leaseId: string;

  beforeAll(async () => {
    // Créer deux utilisateurs de test
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Authentifier User A
    const { data: userA } = await clientA.auth.signUp({
      email: `test-a-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    });
    userAId = userA.user!.id;
    userAClient = clientA;

    // Authentifier User B
    const { data: userB } = await clientB.auth.signUp({
      email: `test-b-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    });
    userBId = userB.user!.id;
    userBClient = clientB;

    // Créer un bail pour User A
    const { data: lease } = await userAClient.from('leases').insert({
      landlord_id: userAId,
      tenant_id: userBId,
      property_id: '00000000-0000-0000-0000-000000000000', // Mock property
      lease_type: 'residential',
      monthly_rent: 500000,
      start_date: '2025-01-01',
      end_date: '2026-01-01',
      status: 'draft',
    }).select().single();

    leaseId = lease!.id;
  });

  afterAll(async () => {
    // Nettoyer les données de test
    await userAClient.auth.signOut();
    await userBClient.auth.signOut();
  });

  test('Utilisateur A (landlord) peut voir son bail', async () => {
    const { data, error } = await userAClient
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.landlord_id).toBe(userAId);
  });

  test('Utilisateur B (tenant) peut voir le bail où il est locataire', async () => {
    const { data, error } = await userBClient
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.tenant_id).toBe(userBId);
  });

  test('Utilisateur non autorisé NE PEUT PAS voir les baux d\'autrui', async () => {
    const unauthorizedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    await unauthorizedClient.auth.signUp({
      email: `test-unauthorized-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    });

    const { data, error } = await unauthorizedClient
      .from('leases')
      .select('*')
      .eq('id', leaseId);

    // Doit retourner 0 résultats (pas d'erreur, mais données filtrées par RLS)
    expect(data).toHaveLength(0);
    
    await unauthorizedClient.auth.signOut();
  });
});

describe('RLS Security Tests - Profiles Public Access', () => {
  let authenticatedClient: SupabaseClient;
  let unauthenticatedClient: SupabaseClient;

  beforeAll(async () => {
    authenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    unauthenticatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    await authenticatedClient.auth.signUp({
      email: `test-auth-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    });
  });

  afterAll(async () => {
    await authenticatedClient.auth.signOut();
  });

  test('Utilisateur authentifié peut accéder aux profils publics via RPC', async () => {
    const { data, error } = await authenticatedClient.rpc('get_public_profile', {
      target_user_id: '00000000-0000-0000-0000-000000000000',
    });

    // Peut retourner null si profil inexistant, mais pas d'erreur RLS
    expect(error).toBeNull();
  });

  test('Visiteur NON authentifié NE PEUT PAS accéder aux profils publics', async () => {
    const { data, error } = await unauthenticatedClient.rpc('get_public_profile', {
      target_user_id: '00000000-0000-0000-0000-000000000000',
    });

    // Doit retourner null (RLS bloque l'accès non authentifié)
    expect(data).toBeNull();
  });

  test('Accès direct à profiles_public sans authentification doit être VIDE', async () => {
    const { data, error } = await unauthenticatedClient
      .from('profiles_public')
      .select('*')
      .limit(10);

    // RLS doit empêcher l'accès -> 0 résultats
    expect(data).toHaveLength(0);
  });
});

describe('RLS Security Tests - Sensitive Data Access Monitoring', () => {
  let adminClient: SupabaseClient;
  let userClient: SupabaseClient;

  beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Créer un admin
    const { data: admin } = await adminClient.auth.signUp({
      email: `test-admin-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    });

    // Attribuer le rôle admin (nécessite une fonction RPC ou migration SQL)
    await adminClient.from('user_roles').insert({
      user_id: admin.user!.id,
      role: 'admin',
    });

    // Créer un utilisateur normal
    await userClient.auth.signUp({
      email: `test-user-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    });
  });

  afterAll(async () => {
    await adminClient.auth.signOut();
    await userClient.auth.signOut();
  });

  test('Utilisateur normal NE PEUT PAS accéder aux logs d\'accès sensibles', async () => {
    const { data, error } = await userClient
      .from('sensitive_data_access_log')
      .select('*')
      .limit(10);

    // RLS doit bloquer -> 0 résultats
    expect(data).toHaveLength(0);
  });

  test('Admin peut accéder aux logs d\'accès sensibles', async () => {
    const { data, error } = await adminClient
      .from('sensitive_data_access_log')
      .select('*')
      .limit(10);

    // Admin doit pouvoir lire (peut être vide si aucun log)
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});

describe('Audit Logging Tests - Admin Guest Messages Access', () => {
  let adminClient: SupabaseClient;
  let adminId: string;

  beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: admin } = await adminClient.auth.signUp({
      email: `test-admin-audit-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    });
    adminId = admin.user!.id;

    // Attribuer rôle admin
    await adminClient.from('user_roles').insert({
      user_id: adminId,
      role: 'admin',
    });
  });

  afterAll(async () => {
    await adminClient.auth.signOut();
  });

  test('Appel à admin_get_guest_messages() doit logger l\'action', async () => {
    // Appeler la fonction RPC
    await adminClient.rpc('admin_get_guest_messages', {
      p_property_id: null,
      p_limit: 10,
    });

    // Vérifier qu'un log a été créé dans admin_audit_logs
    const { data: logs } = await adminClient
      .from('admin_audit_logs')
      .select('*')
      .eq('admin_id', adminId)
      .eq('action_type', 'guest_messages_bulk_accessed')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(logs).toBeDefined();
    expect(logs!.length).toBeGreaterThan(0);
    expect(logs![0].notes).toContain('Admin accessed all guest messages');
  });
});

describe('Permission Tests - Role Management', () => {
  let userClient: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: user } = await userClient.auth.signUp({
      email: `test-perm-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    });
    userId = user.user!.id;
  });

  afterAll(async () => {
    await userClient.auth.signOut();
  });

  test('Utilisateur normal NE PEUT PAS s\'auto-promouvoir admin', async () => {
    const { error } = await userClient.from('user_roles').insert({
      user_id: userId,
      role: 'admin',
    });

    // RLS doit bloquer l'insertion
    expect(error).toBeDefined();
    expect(error!.message).toContain('row-level security');
  });

  test('Utilisateur normal NE PEUT PAS promouvoir autrui à super_admin', async () => {
    const { error } = await userClient.rpc('promote_to_super_admin', {
      target_user_id: '00000000-0000-0000-0000-000000000000',
    });

    // Doit échouer (seuls les super_admins peuvent promouvoir)
    expect(error).toBeDefined();
    expect(error!.message).toContain('super-admin');
  });
});
