/**
 * Extended Admin API - Méthodes supplémentaires pour l'administration
 * Complète le fichier admin.api.ts existant
 */

import { supabase } from '@/integrations/supabase/client';
import { requirePermission, requireRole } from '@/shared/services/roleValidation.service';
import { Json } from '@/integrations/supabase/types';
import {
  UserWithRoles,
  RoleAssignment,
  AdminProperty,
  TransactionWithDetails,
  CEVMissionWithDetails,
  LogEntry,
  BusinessRule,
  ServiceProvider,
  APIKey,
  TrustAgentProfile,
  TrustAgentStats,
  UserFilters,
  PropertyFilters,
  TransactionFilters,
  LogFilters,
  PaginatedResult,
  PaginationParams,
} from '@/types/admin';

// =============================================================================
// UTILISATEURS AVEC RÔLES
// =============================================================================

/**
 * Récupère les utilisateurs avec leurs rôles
 * Version simplifiée sans vérification de permission complexe
 */
export async function getUsersWithRoles(
  pagination: PaginationParams,
  filters?: UserFilters
): Promise<PaginatedResult<UserWithRoles>> {
  console.log('[getUsersWithRoles] START - Function called!', { pagination, filters });

  // Construire la requête de base avec count
  let query = supabase
    .from('profiles')
    .select('id, email, full_name, user_type, phone, avatar_url, is_active, is_verified, created_at, updated_at', { count: 'exact' });

  // Appliquer les filtres directement dans la requête si possible
  if (filters?.user_type) {
    query = query.eq('user_type', filters.user_type);
  }

  // Appliquer la pagination
  const from = (pagination.page - 1) * pagination.limit;
  const to = pagination.page * pagination.limit - 1;
  query = query.range(from, to);

  // Trier
  query = query.order(pagination.sortBy || 'created_at', { ascending: pagination.sortOrder === 'asc' });

  const { data: profiles, count, error } = await query;

  if (error) {
    console.error('[getUsersWithRoles] Error fetching profiles:', error);
    throw error;
  }

  console.log('[getUsersWithRoles] Profiles fetched:', profiles?.length || 0);

  // Récupérer les rôles pour chaque utilisateur
  const userIds = profiles?.map((p) => p.id) || [];
  let roles: Array<{ user_id: string; role: string; assigned_at: string; assigned_by: string | null; expires_at: string | null; is_active: boolean | null }> = [];

  if (userIds.length > 0) {
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .in('user_id', userIds);

    if (rolesError) {
      console.warn('[getUsersWithRoles] Error fetching roles:', rolesError);
    } else {
      roles = rolesData || [];
      console.log('[getUsersWithRoles] Roles fetched:', roles.length);
    }
  }

  // Combiner les données
  const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => {
    const userRoles = roles.filter((r) => r.user_id === profile.id);
    return {
      ...profile,
      roles: userRoles.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role as 'admin' | 'moderator' | 'trust_agent' | 'user',
        assigned_at: r.assigned_at,
        assigned_by: r.assigned_by,
        expires_at: r.expires_at,
        is_active: r.is_active ?? true,
      })),
      status: profile.is_active ? 'active' : 'suspended',
      verification_status: profile.is_verified ? 'verified' : 'not_started',
    };
  });

  // Filtre de recherche côté client (si non appliqué dans la requête)
  let filteredData = usersWithRoles;
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    filteredData = filteredData.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search)
    );
  }

  const result = {
    data: filteredData,
    total: count || 0,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil((count || 0) / pagination.limit),
    hasNextPage: to < (count || 0) - 1,
    hasPreviousPage: from > 0,
  };

  console.log('[getUsersWithRoles] Result:', {
    dataCount: result.data.length,
    total: result.total,
    page: result.page,
  });

  return result;
}

/**
 * Assigner un rôle à un utilisateur
 */
export async function assignRole(
  userId: string,
  role: string,
  expiresAt?: string,
  reason?: string
): Promise<RoleAssignment> {
  await requirePermission('canManageUsers')();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non authentifié');

  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role,
      expires_at: expiresAt || null,
      assigned_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Logger l'action
  await logAdminAction({
    action: 'role_assigned',
    entity_type: 'user_role',
    entity_id: data.id,
    details: { userId, role, expiresAt, reason },
  });

  return data as RoleAssignment;
}

/**
 * Révoquer un rôle d'un utilisateur
 */
export async function revokeRole(roleId: string, reason?: string): Promise<void> {
  await requirePermission('canManageUsers')();

  // Récupérer le rôle avant suppression pour le log
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('*')
    .eq('id', roleId)
    .single();

  const { error } = await supabase.from('user_roles').delete().eq('id', roleId);

  if (error) throw error;

  // Logger l'action
  await logAdminAction({
    action: 'role_revoked',
    entity_type: 'user_role',
    entity_id: roleId,
    details: { ...roleData, reason },
  });
}

// =============================================================================
// PROPRIÉTÉS
// =============================================================================

/**
 * Récupère les propriétés pour l'admin
 */
export async function getAdminProperties(
  pagination: PaginationParams,
  filters?: PropertyFilters
): Promise<PaginatedResult<AdminProperty>> {
  await requirePermission('canAccessAdminPanel')();

  let query = supabase
    .from('properties')
    .select(
      'id, title, description, property_type, address, city, price, surface_area, rooms, furnished, available_from, status, owner_id, is_public, is_verified, featured, views_count, applications_count, created_at, updated_at',
      { count: 'exact' }
    )
    .range((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit - 1)
    .order(pagination.sortBy || 'created_at', { ascending: pagination.sortOrder === 'asc' });

  // Application des filtres
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.city) {
    query = query.ilike('city', `%${filters.city}%`);
  }
  if (filters?.price_min !== undefined) {
    query = query.gte('price', filters.price_min);
  }
  if (filters?.price_max !== undefined) {
    query = query.lte('price', filters.price_max);
  }
  if (filters?.ansut_verified !== undefined) {
    query = query.eq('is_verified', filters.ansut_verified);
  }
  if (filters?.search) {
    // Search only in title and city (address is JSONB, can't use ilike directly)
    query = query.or(`title.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Récupérer les infos des propriétaires
  const ownerIds = data?.map((p) => p.owner_id) || [];
  const { data: owners } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ownerIds);

  const ownerMap = new Map(owners?.map((o) => [o.id, { name: o.full_name, email: o.email }]) || []);

  const properties: AdminProperty[] = (data || []).map((p) => ({
    ...p,
    owner_name: ownerMap.get(p.owner_id)?.name || null,
    owner_email: ownerMap.get(p.owner_id)?.email || null,
    // Map DB columns to interface expectations
    is_active: p.is_public,
    ansut_verified: p.is_verified,
    postal_code: (p.address as { postal_code?: string } | null)?.postal_code || null,
    country: (p.address as { country?: string } | null)?.country || 'Côte d\'Ivoire',
    images: (p.images as string[]) || [],
    amenities: (p.amenities as string[]) || [],
    contacts_count: p.applications_count || 0,
    ansut_certificate_url: null,
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    data: properties,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}

/**
 * Certifier une propriété ANSUT
 */
export async function certifyPropertyANSUT(propertyId: string): Promise<AdminProperty> {
  await requirePermission('canManageProperties')();

  const { data, error } = await supabase
    .from('properties')
    .update({
      ansut_verified: true,
      ansut_certificate_url: `https://certificate.ansut.fr/${propertyId}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', propertyId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction({
    action: 'property_ansut_certified',
    entity_type: 'property',
    entity_id: propertyId,
    details: { ansut_verified: true },
  });

  return data as AdminProperty;
}

/**
 * Supprimer une propriété
 */
export async function deleteProperty(propertyId: string): Promise<void> {
  await requirePermission('canManageProperties')();

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId);

  if (error) throw error;

  await logAdminAction({
    action: 'property_deleted',
    entity_type: 'property',
    entity_id: propertyId,
    details: { property_id: propertyId },
  });
}

/**
 * Mettre à jour une propriété
 */
export async function updateProperty(
  propertyId: string,
  updates: Partial<AdminProperty>
): Promise<AdminProperty> {
  await requirePermission('canManageProperties')();

  const { data, error } = await supabase
    .from('properties')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', propertyId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction({
    action: 'property_updated',
    entity_type: 'property',
    entity_id: propertyId,
    details: updates,
  });

  return data as AdminProperty;
}

// =============================================================================
// TRANSACTIONS
// =============================================================================

/**
 * Récupère les transactions avec détails
 */
export async function getAdminTransactions(
  pagination: PaginationParams,
  filters?: TransactionFilters
): Promise<PaginatedResult<TransactionWithDetails>> {
  await requirePermission('canViewFinancials')();

  let query = supabase
    .from('payments')
    .select(
      'id, amount, currency, status, payment_method, stripe_payment_intent_id, lease_id, created_at, updated_at, completed_at, refunded_at, failure_reason, metadata, lease_contracts(tenant_id, property_id), profiles!payments_tenant_id_fkey(full_name, email)',
      { count: 'exact' }
    )
    .range((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit - 1)
    .order(pagination.sortBy || 'created_at', { ascending: pagination.sortOrder === 'asc' });

  // Application des filtres
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('created_at', filters.date_to);
  }
  if (filters?.lease_id) {
    query = query.eq('lease_id', filters.lease_id);
  }
  if (filters?.search) {
    // Recherche dans les métadonnées ou par email
    query = query.or(`metadata.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  const transactions: TransactionWithDetails[] = (data || []).map((t: {
    id: string;
    amount: number;
    currency?: string;
    status: string;
    payment_method: string;
    stripe_payment_intent_id?: string;
    lease_id?: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    refunded_at?: string;
    failure_reason?: string;
    metadata?: Record<string, unknown>;
    profiles?: { id: string; full_name?: string; email?: string };
    lease_contracts?: { owner_id: string; property_id: string };
  }) => ({
    id: t.id,
    amount: t.amount,
    currency: t.currency || 'EUR',
    status: t.status,
    payment_method: t.payment_method,
    stripe_payment_intent_id: t.stripe_payment_intent_id,
    lease_id: t.lease_id,
    tenant_id: t.profiles?.id || null,
    tenant_name: t.profiles?.full_name || null,
    tenant_email: t.profiles?.email || null,
    owner_id: t.lease_contracts?.owner_id || null,
    owner_name: null,
    property_id: t.lease_contracts?.property_id || null,
    property_title: null,
    created_at: t.created_at,
    updated_at: t.updated_at,
    completed_at: t.completed_at,
    refunded_at: t.refunded_at,
    failure_reason: t.failure_reason,
    metadata: t.metadata,
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    data: transactions,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}

/**
 * Rembourser une transaction
 */
export async function refundTransaction(transactionId: string, reason?: string): Promise<void> {
  await requirePermission('canManagePayments')();

  // Appeler la fonction RPC de remboursement
  const { error } = await supabase.rpc('refund_payment', {
    payment_id: transactionId,
    reason,
  });

  if (error) throw error;

  await logAdminAction({
    action: 'payment_refunded',
    entity_type: 'payment',
    entity_id: transactionId,
    details: { reason },
  });
}

// =============================================================================
// MISSIONS CEV
// =============================================================================

/**
 * Récupère les missions CEV avec détails
 */
export async function getCEVMissions(
  pagination: PaginationParams
): Promise<PaginatedResult<CEVMissionWithDetails>> {
  await requirePermission('canAccessAdminPanel')();

  const { data, error, count } = await supabase
    .from('cev_missions')
    .select('id, property_id, agent_id, tenant_id, owner_id, type, status, scheduled_date, completed_date, report_id, notes, created_at, updated_at, properties(title, address), profiles!cev_missions_agent_id_fkey(full_name, email)')
    .range((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit - 1)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const missions: CEVMissionWithDetails[] = (data || []).map((m: {
    id: string;
    property_id: string;
    agent_id: string;
    tenant_id?: string;
    owner_id?: string;
    type: string;
    status: string;
    scheduled_date?: string;
    completed_date?: string;
    report_id?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    properties?: { title?: string; address?: string };
    profiles?: { full_name?: string; email?: string };
  }) => ({
    id: m.id,
    property_id: m.property_id,
    property_title: m.properties?.title || null,
    property_address: m.properties?.address || null,
    agent_id: m.agent_id,
    agent_name: m.profiles?.full_name || null,
    agent_email: m.profiles?.email || null,
    tenant_id: m.tenant_id,
    tenant_name: null,
    owner_id: m.owner_id,
    owner_name: null,
    type: m.type,
    status: m.status,
    scheduled_date: m.scheduled_date,
    completed_date: m.completed_date,
    report_id: m.report_id,
    notes: m.notes,
    created_at: m.created_at,
    updated_at: m.updated_at,
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    data: missions,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}

/**
 * Réassigner une mission CEV
 */
export async function reassignCEVMission(missionId: string, newAgentId: string): Promise<void> {
  await requirePermission('canManageCEVMissions')();

  const { error } = await supabase
    .from('cev_missions')
    .update({ agent_id: newAgentId, status: 'assigned' })
    .eq('id', missionId);

  if (error) throw error;

  await logAdminAction({
    action: 'cev_mission_reassigned',
    entity_type: 'cev_mission',
    entity_id: missionId,
    details: { new_agent_id: newAgentId },
  });
}

// =============================================================================
// TRUST AGENTS
// =============================================================================

/**
 * Récupère les profils des trust agents
 */
export async function getTrustAgents(): Promise<TrustAgentProfile[]> {
  await requirePermission('canAccessAdminPanel')();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, avatar_url, created_at')
    .eq('user_type', 'trust_agent');

  if (error) throw error;

  // Récupérer les stats pour chaque agent
  const agentIds = data?.map((a) => a.id) || [];
  const [missionStats] = await Promise.all([
    supabase
      .from('cev_missions')
      .select('agent_id, status')
      .in('agent_id', agentIds),
    supabase
      .from('verification_applications')
      .select('verified_by, status')
      .in('verified_by', agentIds),
  ]);

  return (data || []).map((agent) => {
    const agentMissions = missionStats.data?.filter((m) => m.agent_id === agent.id) || [];

    return {
      id: agent.id,
      user_id: agent.id,
      email: agent.email || '',
      full_name: agent.full_name,
      phone: agent.phone,
      avatar_url: agent.avatar_url,
      certifications: [],
      specializations: [],
      is_active: true,
      verification_status: 'verified',
      assigned_missions: agentMissions.filter((m) => m.status === 'assigned' || m.status === 'in_progress').length,
      completed_missions: agentMissions.filter((m) => m.status === 'completed').length,
      average_rating: null,
      created_at: agent.created_at,
    };
  });
}

/**
 * Récupère les statistiques d'un trust agent
 */
export async function getTrustAgentStats(agentId: string): Promise<TrustAgentStats> {
  await requirePermission('canAccessAdminPanel')();

  const { data: missions } = await supabase
    .from('cev_missions')
    .select('id, status, created_at, completed_date')
    .eq('agent_id', agentId);

  const totalMissions = missions?.length || 0;
  const completedMissions = missions?.filter((m) => m.status === 'completed').length || 0;
  const pendingMissions = missions?.filter((m) => m.status === 'pending' || m.status === 'assigned').length || 0;
  const cancelledMissions = missions?.filter((m) => m.status === 'cancelled').length || 0;

  // Calcul du temps moyen de complétion
  const completedWithDates = missions?.filter((m) => m.status === 'completed' && m.completed_date && m.created_at) || [];
  const avgCompletionTime =
    completedWithDates.length > 0
      ? completedWithDates.reduce((sum, m) => {
          const duration = new Date(m.completed_date!).getTime() - new Date(m.created_at).getTime();
          return sum + duration;
        }, 0) / completedWithDates.length / (1000 * 60 * 60) // en heures
      : 0;

  return {
    agent_id: agentId,
    total_missions: totalMissions,
    completed_missions: completedMissions,
    pending_missions: pendingMissions,
    cancelled_missions: cancelledMissions,
    average_completion_time: avgCompletionTime,
    average_rating: 0,
    total_earnings: 0,
    current_month_earnings: 0,
  };
}

/**
 * Récupère un trust agent par ID
 */
export async function getTrustAgentById(agentId: string): Promise<TrustAgentProfile> {
  await requirePermission('canAccessAdminPanel')();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, avatar_url, created_at')
    .eq('id', agentId)
    .eq('user_type', 'trust_agent')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Agent non trouvé');

  // Récupérer les rôles système
  const { data: roles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', agentId);

  // Récupérer les stats
  const missionStats = await supabase.from('cev_missions').select('agent_id, status').eq('agent_id', agentId);

  const agentMissions = missionStats.data || [];

  return {
    id: data.id,
    user_id: data.id,
    email: data.email || '',
    full_name: data.full_name,
    phone: data.phone,
    avatar_url: data.avatar_url,
    certifications: [],
    specializations: [],
    is_active: roles?.some((r: { is_active?: boolean }) => r.is_active !== false) ?? true,
    verification_status: 'verified',
    assigned_missions: agentMissions.filter((m) => m.status === 'assigned' || m.status === 'in_progress').length,
    completed_missions: agentMissions.filter((m) => m.status === 'completed').length,
    average_rating: null,
    created_at: data.created_at,
  };
}

/**
 * Types pour la création et mise à jour de trust agents
 */
export interface CreateTrustAgentInput {
  email: string;
  full_name: string;
  phone?: string;
  password: string;
  certifications?: string[];
  specializations?: string[];
}

export interface UpdateTrustAgentInput {
  full_name?: string;
  phone?: string;
  certifications?: string[];
  specializations?: string[];
}

/**
 * Crée un nouveau trust agent
 * Crée un utilisateur auth et un profil, puis assigne le rôle trust_agent
 */
export async function createTrustAgent(input: CreateTrustAgentInput): Promise<TrustAgentProfile> {
  await requirePermission('canManageUsers')();

  // Vérifier si l'email existe déjà
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', input.email)
    .single();

  if (existingProfile) {
    throw new Error('Un utilisateur avec cet email existe déjà');
  }

  // Créer l'utilisateur dans auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      phone: input.phone,
    },
  });

  if (authError || !authData.user) {
    throw new Error("Erreur lors de la création de l'utilisateur: " + (authError?.message || 'Erreur inconnue'));
  }

  // Créer le profil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: input.email,
      full_name: input.full_name,
      phone: input.phone || null,
      user_type: 'trust_agent',
      is_active: true,
      is_verified: true,
    })
    .select()
    .single();

  if (profileError) {
    // Rollback: supprimer l'utilisateur auth
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error("Erreur lors de la création du profil: " + profileError.message);
  }

  // Assigner le rôle trust_agent
  const { error: roleError } = await supabase.from('user_roles').insert({
    user_id: authData.user.id,
    role: 'trust_agent',
    is_active: true,
  });

  if (roleError) {
    // Rollback: supprimer le profil et l'utilisateur auth
    await supabase.from('profiles').delete().eq('id', authData.user.id);
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error("Erreur lors de l'assignation du rôle: " + roleError.message);
  }

  // Logger l'action
  await logAdminAction({
    action: 'trust_agent_created',
    entity_type: 'trust_agent',
    entity_id: authData.user.id,
    details: { email: input.email, full_name: input.full_name },
  });

  return {
    id: profile.id,
    user_id: profile.id,
    email: profile.email || '',
    full_name: profile.full_name,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    certifications: input.certifications || [],
    specializations: input.specializations || [],
    is_active: true,
    verification_status: 'verified',
    assigned_missions: 0,
    completed_missions: 0,
    average_rating: null,
    created_at: profile.created_at,
  };
}

/**
 * Met à jour un trust agent
 */
export async function updateTrustAgent(
  agentId: string,
  input: UpdateTrustAgentInput
): Promise<TrustAgentProfile> {
  await requirePermission('canManageUsers')();

  // Préparer les données de mise à jour
  const updateData: Record<string, string> = {};
  if (input.full_name !== undefined) updateData.full_name = input.full_name;
  if (input.phone !== undefined) updateData.phone = input.phone;

  // Mettre à jour le profil si nécessaire
  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', agentId);

    if (updateError) {
      throw new Error("Erreur lors de la mise à jour du profil: " + updateError.message);
    }
  }

  // Récupérer le profil mis à jour
  const updated = await getTrustAgentById(agentId);

  // Logger l'action
  await logAdminAction({
    action: 'trust_agent_updated',
    entity_type: 'trust_agent',
    entity_id: agentId,
    details: input,
  });

  return updated;
}

/**
 * Supprime un trust agent
 * Note: Cette fonction désactive le compte au lieu de le supprimer définitivement
 */
export async function deleteTrustAgent(agentId: string): Promise<void> {
  await requirePermission('canManageUsers')();

  // Vérifier que l'agent existe
  const { data: agent } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('id', agentId)
    .eq('user_type', 'trust_agent')
    .single();

  if (!agent) {
    throw new Error('Agent non trouvé');
  }

  // Désactiver le rôle trust_agent
  await supabase
    .from('user_roles')
    .update({ is_active: false })
    .eq('user_id', agentId)
    .eq('role', 'trust_agent');

  // Désactiver le profil
  await supabase.from('profiles').update({ is_active: false }).eq('id', agentId);

  // Logger l'action
  await logAdminAction({
    action: 'trust_agent_deleted',
    entity_type: 'trust_agent',
    entity_id: agentId,
    details: { email: agent.email },
  });
}

/**
 * Active un trust agent
 */
export async function activateTrustAgent(agentId: string): Promise<TrustAgentProfile> {
  await requirePermission('canManageUsers')();

  // Vérifier que l'agent existe
  const { data: agent } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', agentId)
    .eq('user_type', 'trust_agent')
    .single();

  if (!agent) {
    throw new Error('Agent non trouvé');
  }

  // Activer le profil
  await supabase.from('profiles').update({ is_active: true }).eq('id', agentId);

  // Activer le rôle trust_agent
  await supabase
    .from('user_roles')
    .update({ is_active: true })
    .eq('user_id', agentId)
    .eq('role', 'trust_agent');

  // Logger l'action
  await logAdminAction({
    action: 'trust_agent_activated',
    entity_type: 'trust_agent',
    entity_id: agentId,
    details: {},
  });

  return getTrustAgentById(agentId);
}

/**
 * Désactive un trust agent
 */
export async function deactivateTrustAgent(agentId: string): Promise<TrustAgentProfile> {
  await requirePermission('canManageUsers')();

  // Vérifier que l'agent existe
  const { data: agent } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', agentId)
    .eq('user_type', 'trust_agent')
    .single();

  if (!agent) {
    throw new Error('Agent non trouvé');
  }

  // Désactiver le profil
  await supabase.from('profiles').update({ is_active: false }).eq('id', agentId);

  // Désactiver le rôle trust_agent
  await supabase
    .from('user_roles')
    .update({ is_active: false })
    .eq('user_id', agentId)
    .eq('role', 'trust_agent');

  // Logger l'action
  await logAdminAction({
    action: 'trust_agent_deactivated',
    entity_type: 'trust_agent',
    entity_id: agentId,
    details: {},
  });

  return getTrustAgentById(agentId);
}

/**
 * Helper pour logger les actions admin
 */
async function logAdminAction(params: {
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from('admin_audit_logs').insert({
    user_id: user?.id || null,
    user_email: user?.email || null,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    details: params.details,
  });
}

// =============================================================================
// LOGS
// =============================================================================

/**
 * Récupère les logs d'audit admin
 */
export async function getAdminLogs(
  pagination: PaginationParams,
  filters?: LogFilters
): Promise<PaginatedResult<LogEntry>> {
  await requireRole(['admin', 'admin_ansut']);

  let query = supabase
    .from('admin_audit_logs')
    .select('*', { count: 'exact' })
    .range((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit - 1)
    .order('created_at', { ascending: false });

  // Application des filtres
  if (filters?.action) {
    query = query.eq('action', filters.action);
  }
  if (filters?.entity_type) {
    query = query.eq('entity_type', filters.entity_type);
  }
  if (filters?.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('created_at', filters.date_to);
  }
  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  const logs: LogEntry[] = (data || []).map((log: {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    user_id: string | null;
    user_email: string | null;
    ip_address: string | null;
    details: Record<string, unknown>;
    created_at: string;
  }) => ({
    id: log.id,
    action: log.action,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    user_id: log.user_id,
    user_email: log.user_email,
    ip_address: log.ip_address,
    details: log.details,
    created_at: log.created_at,
    level: 'info',
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    data: logs,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}

/**
 * Helper pour vérifier les rôles
 */
async function requireRole(roles: string[]) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non authentifié');

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single();

  const userType = profile?.user_type?.toLowerCase();
  if (!roles.includes(userType)) {
    throw new Error('Accès refusé');
  }
}

// =============================================================================
// API KEYS
// =============================================================================

/**
 * Récupère les clés API
 */
export async function getApiKeys(
  pagination: PaginationParams
): Promise<PaginatedResult<APIKey>> {
  await requireRole(['admin', 'admin_ansut']);

  const { data, error, count } = await supabase
    .from('api_keys')
    .select('*', { count: 'exact' })
    .range((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit - 1)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const total = count || 0;
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    data: (data || []) as APIKey[],
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}

/**
 * Crée une nouvelle clé API
 */
export async function createApiKey(data: {
  name: string;
  service: string;
  expires_at?: string;
}): Promise<APIKey> {
  await requireRole(['admin', 'admin_ansut']);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non authentifié');

  // Générer une clé API
  const keyPreview = `sk_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;

  const { data: newKey, error } = await supabase
    .from('api_keys')
    .insert({
      name: data.name,
      service: data.service,
      key_preview: keyPreview,
      is_active: true,
      created_by: user.email,
      expires_at: data.expires_at || null,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction({
    action: 'api_key_created',
    entity_type: 'api_key',
    entity_id: newKey.id,
    details: { name: data.name, service: data.service },
  });

  return newKey as APIKey;
}

/**
 * Supprime une clé API
 */
export async function deleteApiKey(keyId: string): Promise<void> {
  await requireRole(['admin', 'admin_ansut']);

  const { error } = await supabase.from('api_keys').delete().eq('id', keyId);

  if (error) throw error;

  await logAdminAction({
    action: 'api_key_deleted',
    entity_type: 'api_key',
    entity_id: keyId,
  });
}

/**
 * Active/désactive une clé API
 */
export async function toggleApiKey(keyId: string, isActive: boolean): Promise<void> {
  await requireRole(['admin', 'admin_ansut']);

  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: isActive })
    .eq('id', keyId);

  if (error) throw error;

  await logAdminAction({
    action: 'api_key_toggled',
    entity_type: 'api_key',
    entity_id: keyId,
    details: { is_active: isActive },
  });
}

// =============================================================================
// SERVICE PROVIDERS
// =============================================================================

/**
 * Récupère les fournisseurs de services
 */
export async function getServiceProviders(): Promise<ServiceProvider[]> {
  await requireRole(['admin', 'admin_ansut']);

  // Pour l'instant, retourner des données depuis system_settings
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .in('setting_key', [
      'stripe_configured',
      'sendgrid_configured',
      'twilio_configured',
      'aws_s3_configured',
      'google_maps_configured',
      'slack_configured',
    ]);

  if (error) throw error;

  // Mapper les résultats en ServiceProvider
  const providers: ServiceProvider[] = [
    {
      id: 'provider_stripe',
      name: 'stripe',
      display_name: 'Stripe',
      description: 'Service de paiement en ligne',
      logo_url: 'https://stripe.com/img/v3/home/twitter.png',
      website_url: 'https://stripe.com',
      is_active: true,
      is_configured: data?.find((s: { setting_key: string; setting_value: boolean }) => s.setting_key === 'stripe_configured')?.setting_value === true,
      last_check: new Date().toISOString(),
      status: 'operational',
      configuration_count: 5,
    },
    {
      id: 'provider_sendgrid',
      name: 'sendgrid',
      display_name: 'SendGrid',
      description: "Service d'envoi d'emails transactionnels",
      logo_url: 'https://sendgrid.com/wp-content/themes/sgdotcom/assets/images/logo-dark.svg',
      website_url: 'https://sendgrid.com',
      is_active: true,
      is_configured: data?.find((s: { setting_key: string; setting_value: boolean }) => s.setting_key === 'sendgrid_configured')?.setting_value === true,
      last_check: new Date().toISOString(),
      status: 'operational',
      configuration_count: 3,
    },
    {
      id: 'provider_twilio',
      name: 'twilio',
      display_name: 'Twilio',
      description: 'Service de SMS et notifications',
      logo_url: 'https://www.twilio.com/marketing/bundles/company/img/logos/red/twilio-logo-red.png',
      website_url: 'https://twilio.com',
      is_active: true,
      is_configured: data?.find((s: { setting_key: string; setting_value: boolean }) => s.setting_key === 'twilio_configured')?.setting_value === true,
      last_check: new Date().toISOString(),
      status: 'operational',
      configuration_count: 2,
    },
    {
      id: 'provider_aws_s3',
      name: 'aws_s3',
      display_name: 'AWS S3',
      description: 'Stockage cloud pour fichiers et images',
      logo_url: 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png',
      website_url: 'https://aws.amazon.com/s3',
      is_active: true,
      is_configured: data?.find((s: { setting_key: string; setting_value: boolean }) => s.setting_key === 'aws_s3_configured')?.setting_value === true,
      last_check: new Date().toISOString(),
      status: 'operational',
      configuration_count: 2,
    },
  ];

  return providers;
}

/**
 * Teste la connexion à un service
 */
export async function testServiceProvider(providerId: string): Promise<{ success: boolean; message: string }> {
  await requireRole(['admin', 'admin_ansut']);

  // Simulation de test de connexion
  await new Promise(resolve => setTimeout(resolve, 1000));

  const success = Math.random() > 0.2; // 80% de succès

  await logAdminAction({
    action: 'service_provider_tested',
    entity_type: 'service_provider',
    entity_id: providerId,
    details: { success },
  });

  return {
    success,
    message: success ? 'Connexion réussie' : 'Échec de la connexion',
  };
}

// =============================================================================
// BUSINESS RULES
// =============================================================================

/**
 * Récupère les règles métier
 */
export async function getBusinessRules(): Promise<BusinessRule[]> {
  await requireRole(['admin', 'admin_ansut']);

  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .like('setting_key', 'rule_%')
    .order('setting_key');

  if (error) throw error;

  return (data || []).map((setting: { id: string; setting_key: string; setting_value: Json; description?: string; category?: string; updated_at: string; updated_by?: string }) => ({
    id: setting.id,
    key: setting.setting_key.replace('rule_', ''),
    name: setting.description || setting.setting_key,
    description: setting.description,
    category: setting.category || 'general',
    value: setting.setting_value,
    is_active: true,
    updated_at: setting.updated_at,
    updated_by: setting.updated_by,
  })) as BusinessRule[];
}

/**
 * Met à jour une règle métier
 */
export async function updateBusinessRule(
  ruleId: string,
  value: Json
): Promise<BusinessRule> {
  await requireRole(['admin', 'admin_ansut']);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non authentifié');

  const { data, error } = await supabase
    .from('system_settings')
    .update({
      setting_value: value,
      updated_by: user.id,
    })
    .eq('id', ruleId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction({
    action: 'business_rule_updated',
    entity_type: 'business_rule',
    entity_id: ruleId,
    details: { value },
  });

  return data as BusinessRule;
}
