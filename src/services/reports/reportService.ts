/**
 * Report Service
 *
 * Centralized service for managing user reports on properties, users,
 * messages, reviews, and contracts.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// ============================================================================
// TYPES
// ============================================================================

type ReportRow = Database['public']['Tables']['reports']['Row'];
type _ReportInsert = Database['public']['Tables']['reports']['Insert'];
type ReportUpdate = Database['public']['Tables']['reports']['Update'];

export type ReportType = 'property' | 'user' | 'message' | 'review' | 'contract';

export type ReportReason =
  // Common
  | 'fraud' | 'inappropriate' | 'spam' | 'duplicate'
  // Property
  | 'fake_photos' | 'fake_price' | 'fake_listing' | 'scam'
  // User
  | 'fake_profile' | 'harassment' | 'impersonation'
  // Message
  | 'inappropriate_content' | 'phishing' | 'scam_attempt'
  // Review
  | 'fake_review' | 'conflict_of_interest' | 'defamatory'
  // Contract
  | 'terms_violation' | 'fake_contract';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'escalated';

export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CreateReportParams {
  entityType: ReportType;
  entityId: string;
  reason: ReportReason;
  description?: string;
  evidence?: string[];
}

export interface Report extends ReportRow {
  reporter_name?: string | null;
  assigned_moderator_name?: string | null;
  entity_title?: string | null;
  entity_report_count?: number;
}

export interface ReportFilters {
  status?: ReportStatus;
  type?: ReportType;
  priority?: ReportPriority;
  reason?: ReportReason;
  assignedTo?: string;
  reporterId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ReportStatistics {
  total_reports: number;
  pending_reports: number;
  under_review_reports: number;
  resolved_reports: number;
  high_priority_reports: number;
  urgent_reports: number;
  reports_by_type: Record<string, number>;
  reports_by_reason: Record<string, number>;
}

export interface ReportListItem {
  id: string;
  report_type: ReportType;
  entity_id: string;
  reason: ReportReason;
  status: ReportStatus;
  priority: ReportPriority;
  created_at: string;
  reporter_id: string;
  reporter_name: string | null;
  assigned_to: string | null;
  assigned_moderator_name: string | null;
  entity_title: string | null;
  entity_report_count: number;
  description: string | null;
}

// ============================================================================
// REASON LABELS AND DESCRIPTIONS
// ============================================================================

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  // Common
  fraud: 'Arnaque ou fraude',
  inappropriate: 'Contenu inapproprié',
  spam: 'Spam ou démarchage',
  duplicate: 'Doublon',
  // Property
  fake_photos: 'Photos falsifiées',
  fake_price: 'Prix erroné',
  fake_listing: 'Annonce fictive',
  scam: 'Tentative d\'arnaque',
  // User
  fake_profile: 'Profil fictif',
  harassment: 'Harcèlement',
  impersonation: 'Usurpation d\'identité',
  // Message
  inappropriate_content: 'Contenu inapproprié',
  phishing: 'Tentative de hameçonnage',
  scam_attempt: 'Tentative d\'arnaque',
  // Review
  fake_review: 'Avis fictif',
  conflict_of_interest: 'Conflit d\'intérêts',
  defamatory: 'Contenu diffamatoire',
  // Contract
  terms_violation: 'Violation des conditions',
  fake_contract: 'Contrat fictif',
};

export const REPORT_REASON_DESCRIPTIONS: Record<ReportReason, string> = {
  // Common
  fraud: 'Le contenu semble frauduleux ou trompeur',
  inappropriate: 'Ce contenu ne respecte pas nos règles de communauté',
  spam: 'Contenu promotionnel ou répétitif non sollicité',
  duplicate: 'Ce contenu existe déjà en double',
  // Property
  fake_photos: 'Les photos ne correspondent pas à la réalité',
  fake_price: 'Le prix affiché est faux ou trompeur',
  fake_listing: 'Cette annonce ne correspond à aucun bien réel',
  scam: 'Cette annonce est une tentative d\'arnaque',
  // User
  fake_profile: 'Ce profil utilise des informations fausses ou volées',
  harassment: 'Cet utilisateur harcèle ou intimide d\'autres membres',
  impersonation: 'Cette personne usurpe l\'identité de quelqu\'un d\'autre',
  // Message
  inappropriate_content: 'Ce message contient du contenu inapproprié',
  phishing: 'Tentative d\'obtenir vos informations personnelles',
  scam_attempt: 'Tentative d\'arnaque par message',
  // Review
  fake_review: 'Cet avis est fictif ou a été acheté',
  conflict_of_interest: 'L\'auteur a un conflit d\'intérêts',
  defamatory: 'Cet avis contient des propos diffamatoires',
  // Contract
  terms_violation: 'Violation des conditions du contrat',
  fake_contract: 'Ce contrat est fictif ou falsifié',
};

// Group reasons by entity type
export const REPORT_REASONS_BY_TYPE: Record<ReportType, ReportReason[]> = {
  property: [
    'fake_photos',
    'fake_price',
    'fake_listing',
    'scam',
    'fraud',
    'inappropriate',
    'duplicate',
  ],
  user: [
    'fake_profile',
    'harassment',
    'impersonation',
    'scam',
    'spam',
    'fraud',
  ],
  message: [
    'inappropriate_content',
    'phishing',
    'scam_attempt',
    'harassment',
    'spam',
  ],
  review: [
    'fake_review',
    'conflict_of_interest',
    'defamatory',
    'inappropriate',
    'spam',
  ],
  contract: [
    'terms_violation',
    'fake_contract',
    'fraud',
  ],
};

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new report
 */
export async function createReport(params: CreateReportParams): Promise<Report> {
  const { entityType, entityId, reason, description, evidence } = params;

  // Check if user has already reported this entity
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Vous devez être connecté pour signaler un contenu');
  }

  // Check for duplicate report
  const { data: existingReport } = await supabase
    .from('reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('report_type', entityType)
    .eq('entity_id', entityId)
    .not('status', 'eq', 'dismissed')
    .single();

  if (existingReport) {
    throw new Error('Vous avez déjà signalé ce contenu. Vous pouvez modifier votre signalement si nécessaire.');
  }

  // Determine priority based on reason
  const priority = getPriorityFromReason(reason);

  // Auto-escalate if entity has multiple reports
  const { data: reportCount } = await supabase
    .rpc('get_entity_report_count', {
      p_report_type: entityType,
      p_entity_id: entityId,
      p_days_interval: 30,
    });

  const finalPriority = (reportCount && reportCount > 2) ? 'urgent' : priority;

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      report_type: entityType,
      entity_id: entityId,
      reason,
      description,
      evidence_urls: evidence || [],
      priority: finalPriority,
    })
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(full_name),
      assigned_to_profile:profiles!reports_assigned_to_fkey(full_name)
    `)
    .single();

  if (error) {
    console.error('Error creating report:', error);
    throw new Error('Erreur lors de la création du signalement');
  }

  return enrichReport(data);
}

/**
 * Get paginated list of reports with filters
 */
export async function getReports(
  filters: ReportFilters = {},
  page = 1,
  pageSize = 20
): Promise<{ data: ReportListItem[]; count: number }> {
  let query = supabase
    .from('active_reports_queue')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.type) {
    query = query.eq('report_type', filters.type);
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters.reason) {
    query = query.eq('reason', filters.reason);
  }
  if (filters.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  if (filters.reporterId) {
    query = query.eq('reporter_id', filters.reporterId);
  }
  if (filters.search) {
    query = query.or(`description.ilike.%${filters.search}%,entity_title.ilike.%${filters.search}%`);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching reports:', error);
    throw new Error('Erreur lors du chargement des signalements');
  }

  return {
    data: data || [],
    count: count || 0,
  };
}

/**
 * Get a single report by ID with full details
 */
export async function getReportById(id: string): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(id, full_name, user_type),
      assigned_to_profile:profiles!reports_assigned_to_fkey(id, full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching report:', error);
    throw new Error('Signalement non trouvé');
  }

  return enrichReport(data);
}

/**
 * Get reports created by the current user
 */
export async function getUserReports(userId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user reports:', error);
    throw new Error('Erreur lors du chargement de vos signalements');
  }

  return (data || []).map(enrichReport);
}

/**
 * Get all reports for a specific entity
 */
export async function getEntityReports(
  entityType: ReportType,
  entityId: string
): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('report_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching entity reports:', error);
    throw new Error('Erreur lors du chargement des signalements');
  }

  return (data || []).map(enrichReport);
}

/**
 * Update report status
 */
export async function updateReportStatus(
  id: string,
  status: ReportStatus,
  moderatorNotes?: string,
  resolution?: string
): Promise<Report> {
  const updateData: ReportUpdate = {
    status,
    ...(moderatorNotes && { moderator_notes: moderatorNotes }),
    ...(resolution && { resolution }),
  };

  const { data, error } = await supabase
    .from('reports')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(full_name),
      assigned_to_profile:profiles!reports_assigned_to_fkey(full_name)
    `)
    .single();

  if (error) {
    console.error('Error updating report status:', error);
    throw new Error('Erreur lors de la mise à jour du signalement');
  }

  return enrichReport(data);
}

/**
 * Assign report to a moderator
 */
export async function assignReport(id: string, moderatorId: string): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update({
      assigned_to: moderatorId,
      status: 'under_review',
    })
    .eq('id', id)
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(full_name),
      assigned_to_profile:profiles!reports_assigned_to_fkey(full_name)
    `)
    .single();

  if (error) {
    console.error('Error assigning report:', error);
    throw new Error('Erreur lors de l\'assignation du signalement');
  }

  return enrichReport(data);
}

/**
 * Update report priority
 */
export async function updateReportPriority(
  id: string,
  priority: ReportPriority
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update({ priority })
    .eq('id', id)
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(full_name),
      assigned_to_profile:profiles!reports_assigned_to_fkey(full_name)
    `)
    .single();

  if (error) {
    console.error('Error updating report priority:', error);
    throw new Error('Erreur lors de la mise à jour de la priorité');
  }

  return enrichReport(data);
}

/**
 * Add evidence to an existing report
 */
export async function addReportEvidence(
  id: string,
  evidenceUrls: string[]
): Promise<Report> {
  // First get current evidence
  const { data: currentReport } = await supabase
    .from('reports')
    .select('evidence_urls')
    .eq('id', id)
    .single();

  if (!currentReport) {
    throw new Error('Signalement non trouvé');
  }

  const currentEvidence = (currentReport.evidence_urls as string[]) || [];
  const updatedEvidence = [...currentEvidence, ...evidenceUrls];

  const { data, error } = await supabase
    .from('reports')
    .update({ evidence_urls: updatedEvidence })
    .eq('id', id)
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(full_name),
      assigned_to_profile:profiles!reports_assigned_to_fkey(full_name)
    `)
    .single();

  if (error) {
    console.error('Error adding evidence:', error);
    throw new Error('Erreur lors de l\'ajout des preuves');
  }

  return enrichReport(data);
}

/**
 * Delete a report (only by owner if pending, or by admin)
 */
export async function deleteReport(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Vous devez être connecté');
  }

  // Check if user owns the report or is admin
  const { data: report } = await supabase
    .from('reports')
    .select('reporter_id, status')
    .eq('id', id)
    .single();

  if (!report) {
    throw new Error('Signalement non trouvé');
  }

  if (report.reporter_id !== user.id) {
    // Check if admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRole) {
      throw new Error('Vous n\'avez pas la permission de supprimer ce signalement');
    }
  }

  if (report.status !== 'pending' && report.reporter_id === user.id) {
    throw new Error('Vous ne pouvez supprimer que les signalements en attente');
  }

  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting report:', error);
    throw new Error('Erreur lors de la suppression du signalement');
  }
}

/**
 * Get report statistics for dashboard
 */
export async function getReportStatistics(): Promise<ReportStatistics> {
  const { data, error } = await supabase
    .rpc('get_report_statistics');

  if (error) {
    console.error('Error fetching report statistics:', error);
    throw new Error('Erreur lors du chargement des statistiques');
  }

  return {
    total_reports: data?.total_reports || 0,
    pending_reports: data?.pending_reports || 0,
    under_review_reports: data?.under_review_reports || 0,
    resolved_reports: data?.resolved_reports || 0,
    high_priority_reports: data?.high_priority_reports || 0,
    urgent_reports: data?.urgent_reports || 0,
    reports_by_type: data?.reports_by_type || {},
    reports_by_reason: data?.reports_by_reason || {},
  };
}

/**
 * Check if current user has reported an entity
 */
export async function hasReported(
  entityType: ReportType,
  entityId: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .rpc('has_reported', {
      p_reporter_id: user.id,
      p_report_type: entityType,
      p_entity_id: entityId,
    });

  return data || false;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get priority level based on reason
 */
function getPriorityFromReason(reason: ReportReason): ReportPriority {
  const highPriorityReasons: ReportReason[] = [
    'scam',
    'scam_attempt',
    'phishing',
    'harassment',
    'fake_contract',
  ];

  const urgentReasons: ReportReason[] = [
    'fake_listing',
    'impersonation',
  ];

  if (urgentReasons.includes(reason)) return 'urgent';
  if (highPriorityReasons.includes(reason)) return 'high';
  return 'medium';
}

/**
 * Enrich report with additional data
 */
function enrichReport(data: ReportRow): Report {
  // Handle nested profiles from joins
  const reporter = data.reporter as { full_name?: string | null } | null;
  const assignedTo = data.assigned_to_profile as { full_name?: string | null } | null;

  return {
    ...data,
    reporter_name: reporter?.full_name || null,
    assigned_moderator_name: assignedTo?.full_name || null,
  };
}

/**
 * Get entity title for display
 */
export async function getEntityTitle(
  entityType: ReportType,
  entityId: string
): Promise<string | null> {
  switch (entityType) {
    case 'property': {
      const { data: property } = await supabase
        .from('properties')
        .select('title')
        .eq('id', entityId)
        .single();
      return property?.title || null;
    }

    case 'user': {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', entityId)
        .single();
      return profile?.full_name || null;
    }

    case 'review': {
      const { data: review } = await supabase
        .from('reviews')
        .select('comment')
        .eq('id', entityId)
        .single();
      return review?.comment?.substring(0, 100) || null;
    }

    default:
      return null;
  }
}
