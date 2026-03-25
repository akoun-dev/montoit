/**
 * Service de gestion des candidatures pour les propriétaires
 */

import { supabase } from '@/integrations/supabase/client';

export interface ApplicationFilters {
  status?: string;
  propertyId?: string;
  searchTerm?: string;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  inProgress: number;
  accepted: number;
  rejected: number;
}

export interface ApplicationWithDetails {
  id: string;
  property_id: string;
  tenant_id: string;
  applicant_id?: string;
  status: string;
  application_message?: string | null;
  cover_letter?: string | null;
  credit_score?: number | null;
  applied_at: string;
  updated_at: string | null;
  created_at?: string | null;
  // Informations sur le contrat associé s'il existe
  contract_id?: string | null;
  contract_status?: string | null;
  property: {
    id: string;
    title: string;
    city: string;
    neighborhood: string | null;
    monthly_rent: number;
    main_image: string | null;
  } | null;
  applicant: {
    user_id?: string;
    id?: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    trust_score: number | null;
    is_verified: boolean | null;
    oneci_verified: boolean | null;
  } | null;
}

type VerificationApplicationLite = {
  user_id: string;
  status: string | null;
  dossier_type: string | null;
  verification_status?: unknown;
  submitted_at?: string | null;
  created_at?: string | null;
};

const DOSSIER_TYPE_ALIASES = ['tenant', 'locataire'];

const matchesDossierType = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return DOSSIER_TYPE_ALIASES.some((alias) => normalized.includes(alias));
};

const fetchApprovedTenantIds = async (tenantIds: string[]): Promise<Set<string>> => {
  if (!tenantIds.length) return new Set();

  const approvedTenantIds = new Set<string>();

  const { data, error } = await supabase
    .from('verification_applications')
    .select('user_id, status, dossier_type, verification_status, submitted_at, created_at')
    .in('user_id', tenantIds)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.warn('Failed to load verification dossiers for applications filter', error);
  }

  (data as VerificationApplicationLite[] | null)?.forEach((row) => {
    if (!matchesDossierType(row.dossier_type)) {
      return;
    }

    const status = row.status;
    const verificationStatus =
      typeof row.verification_status === 'string'
        ? row.verification_status
        : typeof row.verification_status === 'object' && row.verification_status
          ? (row.verification_status as { status?: string })?.status
          : null;

    if (status === 'approved' || verificationStatus === 'approved') {
      approvedTenantIds.add(row.user_id);
    }
  });

  const remainingTenantIds = tenantIds.filter((id) => !approvedTenantIds.has(id));
  if (remainingTenantIds.length > 0) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('tenant_applications')
      .select('user_id, verification_status')
      .in('user_id', remainingTenantIds);

    if (legacyError) {
      console.warn('Failed to load legacy tenant applications for filter', legacyError);
    } else {
      (legacyData as { user_id: string; verification_status: string | null }[] | null)?.forEach(
        (row) => {
          if (row.verification_status === 'approved') {
            approvedTenantIds.add(row.user_id);
          }
        }
      );
    }
  }

  return approvedTenantIds;
};

/**
 * Récupère toutes les candidatures des propriétés d'un propriétaire
 */
export async function getOwnerApplications(
  ownerId: string,
  filters?: ApplicationFilters
): Promise<ApplicationWithDetails[]> {
  // D'abord, récupérer les IDs des propriétés du propriétaire
  const { data: properties } = await supabase
    .from('properties')
    .select('id')
    .eq('owner_id', ownerId);

  if (!properties || properties.length === 0) {
    return [];
  }

  const propertyIds = properties.map((p) => p.id);

  // Construire la requête de base
  let query = supabase
    .from('rental_applications')
    .select(
      `
      id,
      property_id,
      tenant_id,
      status,
      application_message,
      credit_score,
      applied_at,
      updated_at
    `
    )
    .in('property_id', propertyIds)
    .order('applied_at', { ascending: false });

  // Appliquer les filtres
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.propertyId && filters.propertyId !== 'all') {
    query = query.eq('property_id', filters.propertyId);
  }

  const { data: applications, error } = await query;

  if (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }

  if (!applications || applications.length === 0) {
    return [];
  }

  const applicantIds = [...new Set(applications.map((a) => a.tenant_id))];
  const approvedTenantIds = await fetchApprovedTenantIds(applicantIds);
  const visibleApplications = applications.filter((app) => approvedTenantIds.has(app.tenant_id));

  if (visibleApplications.length === 0) {
    return [];
  }

  // Récupérer les détails des propriétés
  const uniquePropertyIds = [...new Set(visibleApplications.map((a) => a.property_id))];
  let propertiesData: Array<Record<string, unknown>> | null = null;
  const { data: propertiesViewData, error: propertiesViewError } = await supabase
    .from('properties_with_monthly_rent')
    .select('id, title, city, neighborhood, monthly_rent, main_image')
    .in('id', uniquePropertyIds);

  if (propertiesViewError) {
    console.warn('properties_with_monthly_rent unavailable, fallback to properties', {
      error: propertiesViewError,
    });
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('properties')
      .select('id, title, city, neighborhood, price, main_image')
      .in('id', uniquePropertyIds);

    if (fallbackError) {
      console.error('Fallback properties query failed', fallbackError);
    } else {
      propertiesData = (fallbackData || []).map((p) => ({
        ...p,
        monthly_rent: p.monthly_rent ?? p.price ?? null,
      }));
    }
  } else {
    propertiesData = propertiesViewData || [];
  }

  const propertiesMap = new Map(propertiesData?.map((p) => [p.id, p]) || []);

  // Récupérer les profils des candidats via RPC
  const { data: profilesData, error: profilesError } = await supabase.rpc('get_public_profiles', {
    profile_user_ids: applicantIds,
  });
  if (profilesError) {
    console.warn('get_public_profiles failed, using profiles fallback', profilesError);
  }

  // Récupérer les profils complets (fallback si RPC incomplet)
  const { data: fullProfiles } = await supabase
    .from('profiles')
    .select(
      'id, email, phone, full_name, avatar_url, trust_score, is_verified, oneci_verified, facial_verification_status'
    )
    .in('id', applicantIds);

  const profilesMap = new Map(
    (profilesData || []).map(
      (p: {
        user_id: string;
        id?: string;
        full_name: string;
        avatar_url: string;
        trust_score: number;
        is_verified: boolean;
        oneci_verified: boolean;
      }) => [p.user_id ?? p.id, p]
    )
  );
  const fallbackProfilesMap = new Map(
    (fullProfiles || []).map((p) => [p.id, p])
  );

  // Map pour suivre les contrats existants (par property_id + tenant_id)
  // Comme application_id n'existe pas, on cherche par combinaison property+tenant
  const existingContractIds = new Map<string, string>(); // key -> contract_id
  if (visibleApplications && visibleApplications.length > 0) {
    const uniquePropertyIds = [...new Set(visibleApplications.map((a) => a.property_id))];

    const { data: allContracts } = await supabase
      .from('lease_contracts')
      .select('id, property_id, tenant_id, status')
      .in('property_id', uniquePropertyIds);

    allContracts?.forEach((contract: { id: string; property_id: string; tenant_id: string }) => {
      const key = `${contract.property_id}-${contract.tenant_id}`;
      existingContractIds.set(key, contract.id);
    });
  }

  // Combiner les données
  let result: ApplicationWithDetails[] = visibleApplications
    .filter((app) => app.status !== null) // Filter out null status
    .map((app) => {
      const profile = profilesMap.get(app.tenant_id) || fallbackProfilesMap.get(app.tenant_id);
      const emailData = fallbackProfilesMap.get(app.tenant_id);

      // Vérifier si un contrat existe pour cette combinaison property+tenant
      const contractKey = `${app.property_id}-${app.tenant_id}`;
      const contractId = existingContractIds.get(contractKey);
      const hasContract = !!contractId;

      return {
        ...app,
        applicant_id: app.tenant_id,
        status: app.status as string,
        applied_at: app.applied_at,
        created_at: app.applied_at,
        contract_id: contractId || null,
        contract_status: hasContract ? 'exists' : null,
        property: propertiesMap.get(app.property_id) || null,
        applicant: profile
          ? {
              user_id: profile.user_id ?? app.tenant_id,
              id: profile.id ?? app.tenant_id,
              full_name: profile.full_name ?? emailData?.full_name ?? null,
              email: emailData?.email || null,
              phone: emailData?.phone || null,
              avatar_url: profile.avatar_url ?? emailData?.avatar_url ?? null,
              trust_score: profile.trust_score ?? emailData?.trust_score ?? null,
              is_verified: profile.is_verified ?? emailData?.is_verified ?? null,
              oneci_verified: profile.oneci_verified ?? emailData?.oneci_verified ?? null,
            }
          : emailData
            ? {
                user_id: app.tenant_id,
                id: app.tenant_id,
                full_name: emailData.full_name ?? null,
                email: emailData.email || null,
                phone: emailData.phone || null,
                avatar_url: emailData.avatar_url ?? null,
                trust_score: emailData.trust_score ?? null,
                is_verified: emailData.is_verified ?? null,
                oneci_verified: emailData.oneci_verified ?? null,
              }
            : null,
      };
    });

  // Filtrer par terme de recherche si présent
  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    result = result.filter(
      (app) =>
        app.applicant?.full_name?.toLowerCase().includes(term) ||
        app.applicant?.email?.toLowerCase().includes(term) ||
        app.property?.title?.toLowerCase().includes(term)
    );
  }

  return result;
}

/**
 * Récupère les statistiques des candidatures
 */
export async function getApplicationStats(ownerId: string): Promise<ApplicationStats> {
  const { data: properties } = await supabase
    .from('properties')
    .select('id')
    .eq('owner_id', ownerId);

  if (!properties || properties.length === 0) {
    return { total: 0, pending: 0, inProgress: 0, accepted: 0, rejected: 0 };
  }

  const propertyIds = properties.map((p) => p.id);

  const { data: applications } = await supabase
    .from('rental_applications')
    .select('status, tenant_id')
    .in('property_id', propertyIds);

  if (!applications) {
    return { total: 0, pending: 0, inProgress: 0, accepted: 0, rejected: 0 };
  }

  const applicantIds = [...new Set(applications.map((a) => a.tenant_id))];
  const approvedTenantIds = await fetchApprovedTenantIds(applicantIds);
  const visibleApplications = applications.filter((a) => approvedTenantIds.has(a.tenant_id));

  return {
    total: visibleApplications.length,
    pending: visibleApplications.filter((a) => a.status === 'pending').length,
    inProgress: visibleApplications.filter((a) => a.status === 'in_progress').length,
    accepted: visibleApplications.filter((a) => a.status === 'accepted').length,
    rejected: visibleApplications.filter((a) => a.status === 'rejected').length,
  };
}

/**
 * Accepter une candidature
 */
export async function acceptApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('rental_applications')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', applicationId);

  if (error) {
    console.error('Error accepting application:', error);
    throw error;
  }

  // Envoyer notification via le service dédié aux candidatures
  try {
    const { notifyApplicationAccepted } = await import('@/services/notifications/applicationNotificationService');
    await notifyApplicationAccepted(applicationId);
  } catch (notifError) {
    console.warn('[acceptApplication] Failed to send notification (non-critical):', notifError);
  }
}

/**
 * Refuser une candidature
 */
export async function rejectApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('rental_applications')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) {
    console.error('Error rejecting application:', error);
    throw error;
  }

  // Envoyer notification via le service dédié aux candidatures
  try {
    const { notifyApplicationRejected } = await import('@/services/notifications/applicationNotificationService');
    await notifyApplicationRejected(applicationId);
  } catch (notifError) {
    console.warn('[rejectApplication] Failed to send notification (non-critical):', notifError);
  }
}

/**
 * Passer une candidature en cours (après planification de visite)
 */
export async function setApplicationInProgress(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('rental_applications')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', applicationId);

  if (error) {
    console.error('Error updating application:', error);
    throw error;
  }
}

/**
 * Rouvrir une candidature refusée
 */
export async function reopenApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('rental_applications')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', applicationId);

  if (error) {
    console.error('Error reopening application:', error);
    throw error;
  }
}

/**
 * Planifier une visite depuis une candidature
 */
export async function scheduleVisitFromApplication(
  applicationId: string,
  visitData: {
    date: string;
    time: string;
    type: 'in_person' | 'virtual';
    notes?: string;
  }
): Promise<string> {
  // Récupérer les détails de la candidature
  const { data: application, error: appError } = await supabase
    .from('rental_applications')
    .select('property_id, tenant_id')
    .eq('id', applicationId)
    .single();

  if (appError || !application) {
    throw new Error('Candidature non trouvée');
  }

  // Récupérer les détails complets de la propriété
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('owner_id, title, city, address')
    .eq('id', application.property_id)
    .single();

  if (propError || !property) {
    throw new Error('Propriété non trouvée');
  }

  // Créer la visite
  const { data: visitDataResult, error: visitError } = await supabase
    .from('visit_requests')
    .insert({
      property_id: application.property_id,
      tenant_id: application.tenant_id,
      owner_id: property.owner_id,
      visit_date: visitData.date,
      visit_time: visitData.time,
      visit_type: visitData.type,
      notes: visitData.notes,
      status: 'confirmed',
    })
    .select('id')
    .single();

  if (visitError) {
    console.error('Error creating visit:', visitError);
    throw visitError;
  }

  const visitId = (visitDataResult as { id: string })?.id;

  // Mettre à jour le statut de la candidature
  await setApplicationInProgress(applicationId);

  // Envoyer notification de visite planifiée
  try {
    await supabase.functions.invoke('send-lease-notifications', {
      body: {
        visitId,
        type: 'visit_scheduled',
        visitDate: visitData.date,
        visitTime: visitData.time,
        propertyTitle: property.title,
        propertyAddress: property.address || property.city,
      },
    });
  } catch (notifError) {
    console.warn('[scheduleVisit] Failed to send visit notification (non-critical):', notifError);
  }

  return visitId;
}

/**
 * Récupérer les propriétés d'un propriétaire (pour le filtre)
 */
export async function getOwnerProperties(
  ownerId: string
): Promise<{ id: string; title: string }[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, title')
    .eq('owner_id', ownerId)
    .order('title');

  if (error) {
    console.error('Error fetching properties:', error);
    return [];
  }

  return data || [];
}

// ============ TENANT APPLICATION FUNCTIONS ============

export interface TenantApplicationWithDetails {
  id: string;
  property_id: string;
  tenant_id: string;
  applicant_id?: string;
  status: string;
  application_message?: string | null;
  credit_score?: number | null;
  applied_at: string;
  updated_at: string | null;
  property: {
    id: string;
    title: string;
    city: string;
    neighborhood: string | null;
    monthly_rent: number;
    main_image: string | null;
    owner_id: string | null;
  } | null;
  owner: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    trust_score: number | null;
    is_verified: boolean | null;
  } | null;
}

/**
 * Récupère toutes les candidatures d'un locataire
 */
export async function getTenantApplications(
  applicantId: string,
  filters?: ApplicationFilters
): Promise<TenantApplicationWithDetails[]> {
  // Construire la requête de base
  let query = supabase
    .from('rental_applications')
    .select(
      `
      id,
      property_id,
      tenant_id,
      status,
      application_message,
      credit_score,
      applied_at,
      updated_at
    `
    )
    .eq('tenant_id', applicantId)
    .order('applied_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false, nullsFirst: false });

  // Appliquer les filtres
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data: applications, error } = await query;

  if (error) {
    console.error('Error fetching tenant applications:', error);
    throw error;
  }

  if (!applications || applications.length === 0) {
    return [];
  }

  // Récupérer les détails des propriétés
  const uniquePropertyIds = [...new Set(applications.map((a) => a.property_id))];
  let propertiesData: Array<Record<string, unknown>> | null = null;
  const { data: propertiesViewData, error: propertiesViewError } = await supabase
    .from('properties_with_monthly_rent')
    .select('id, title, city, neighborhood, monthly_rent, main_image, owner_id')
    .in('id', uniquePropertyIds);

  if (propertiesViewError) {
    console.warn('properties_with_monthly_rent unavailable, fallback to properties', {
      error: propertiesViewError,
    });
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('properties')
      .select('id, title, city, neighborhood, price, main_image, owner_id')
      .in('id', uniquePropertyIds);

    if (fallbackError) {
      console.error('Fallback properties query failed', fallbackError);
    } else {
      propertiesData = (fallbackData || []).map((p) => ({
        ...p,
        monthly_rent: p.monthly_rent ?? p.price ?? null,
      }));
    }
  } else {
    propertiesData = propertiesViewData || [];
  }

  const propertiesMap = new Map(propertiesData?.map((p) => [p.id, p]) || []);

  // Récupérer les profils des propriétaires via RPC
  const ownerIds = [
    ...new Set(
      propertiesData?.map((p) => p.owner_id).filter((id): id is string => id !== null) || []
    ),
  ];
  const { data: ownersData } =
    ownerIds.length > 0
      ? await supabase.rpc('get_public_profiles', { profile_user_ids: ownerIds })
      : { data: [] };

  const ownersMap = new Map(
    (ownersData || []).map(
      (o: {
        user_id: string;
        full_name: string;
        avatar_url: string;
        trust_score: number;
        is_verified: boolean;
      }) => [o.user_id, o]
    )
  );

  // Combiner les données
  let result: TenantApplicationWithDetails[] = applications
    .filter((app) => app.status !== null)
    .map((app) => {
      const property = propertiesMap.get(app.property_id);
      const owner = property?.owner_id ? ownersMap.get(property.owner_id) : null;

      return {
        ...app,
        applicant_id: app.tenant_id,
        status: app.status as string,
        applied_at: app.applied_at,
        property: property || null,
        owner: owner
          ? {
              user_id: owner.user_id,
              full_name: owner.full_name,
              avatar_url: owner.avatar_url,
              trust_score: owner.trust_score,
              is_verified: owner.is_verified,
            }
          : null,
      };
    });

  // Filtrer par terme de recherche si présent
  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    result = result.filter(
      (app) =>
        app.property?.title?.toLowerCase().includes(term) ||
        app.property?.city?.toLowerCase().includes(term) ||
        app.owner?.full_name?.toLowerCase().includes(term)
    );
  }

  return result;
}

/**
 * Récupère les statistiques des candidatures d'un locataire
 */
export async function getTenantApplicationStats(applicantId: string): Promise<ApplicationStats> {
  const { data: applications } = await supabase
    .from('rental_applications')
    .select('status')
    .eq('tenant_id', applicantId);

  if (!applications) {
    return { total: 0, pending: 0, inProgress: 0, accepted: 0, rejected: 0 };
  }

  return {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    inProgress: applications.filter((a) => a.status === 'in_progress').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };
}

/**
 * Annuler une candidature (par le locataire)
 */
export async function cancelApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('rental_applications')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', applicationId);

  if (error) {
    console.error('Error canceling application:', error);
    throw error;
  }
}
