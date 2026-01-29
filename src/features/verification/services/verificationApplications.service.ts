/**
 * Service pour la gestion des demandes de verification (dossiers)
 *
 * Gère les demandes de verification pour les locataires, propriétaires et agences.
 */

import { supabase } from '@/integrations/supabase/client';

// Types pour les demandes de verification
export type DossierType = 'tenant' | 'owner' | 'agency';
export type DossierStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'more_info_requested';
export type DocumentVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface VerificationApplication {
  id: string;
  user_id: string;
  dossier_type: DossierType;
  status: DossierStatus;
  verification_status: Record<string, unknown>;
  completion_percentage: number;
  personal_info: Record<string, unknown>;
  financial_info: Record<string, unknown>;
  property_info: Record<string, unknown>;
  documents: Record<string, unknown>;
  assigned_agent_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationDocument {
  id: string;
  application_id: string;
  document_type: string;
  document_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  verification_status: DocumentVerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  uploaded_at: string;
  created_at: string;
}

export interface CreateApplicationData {
  dossier_type: DossierType;
  personal_info?: Record<string, unknown>;
  financial_info?: Record<string, unknown>;
  property_info?: Record<string, unknown>;
  documents?: Record<string, unknown>;
}

export interface UpdateApplicationData extends Partial<CreateApplicationData> {
  status?: DossierStatus;
  completion_percentage?: number;
  rejection_reason?: string;
}

export interface DossierFilters {
  dossier_type?: DossierType | 'all';
  status?: DossierStatus | 'all';
  user_id?: string;
  assigned_agent_id?: string;
}

/**
 * Créer une nouvelle demande de verification
 */
export async function createVerificationApplication(
  userId: string,
  data: CreateApplicationData
): Promise<VerificationApplication> {
  const { data: application, error } = await supabase
    .from('verification_applications')
    .insert({
      user_id: userId,
      dossier_type: data.dossier_type,
      personal_info: data.personal_info || {},
      financial_info: data.financial_info || {},
      property_info: data.property_info || {},
      documents: data.documents || {},
      status: 'pending',
      completion_percentage: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return application as VerificationApplication;
}

/**
 * Récupérer une demande par ID
 */
export async function getVerificationApplication(
  applicationId: string
): Promise<VerificationApplication | null> {
  const { data, error } = await supabase
    .from('verification_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();

  if (error) throw error;
  return data as VerificationApplication | null;
}

/**
 * Récupérer les demandes d'un utilisateur
 */
export async function getUserVerificationApplications(
  userId: string,
  dossierType?: DossierType
): Promise<VerificationApplication[]> {
  let query = supabase
    .from('verification_applications')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (dossierType) {
    query = query.eq('dossier_type', dossierType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as VerificationApplication[];
}

/**
 * Récupérer toutes les demandes (pour trust agents)
 */
export async function getVerificationApplications(
  filters?: DossierFilters
): Promise<VerificationApplication[]> {
  let query = supabase
    .from('verification_applications')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (filters?.dossier_type && filters.dossier_type !== 'all') {
    query = query.eq('dossier_type', filters.dossier_type);
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  if (filters?.assigned_agent_id) {
    query = query.eq('assigned_agent_id', filters.assigned_agent_id);
  }

  const { data, error } = await query;

  if (error) {
    // Silent fallback if table doesn't exist
    if (error.code === 'PGRST116' || error.code === 'PGRST205') {
      return [];
    }
    throw error;
  }

  return (data || []) as VerificationApplication[];
}

/**
 * Mettre à jour une demande
 */
export async function updateVerificationApplication(
  applicationId: string,
  data: UpdateApplicationData
): Promise<VerificationApplication> {
  const updateData: Record<string, unknown> = { ...data };

  // Mise à jour automatique du timestamp
  if (data.status === 'in_review' && !data.reviewed_at) {
    updateData.reviewed_at = new Date().toISOString();
  }

  if (data.status === 'approved' && !data.approved_at) {
    updateData.approved_at = new Date().toISOString();
  }

  const { data: application, error } = await supabase
    .from('verification_applications')
    .update(updateData)
    .eq('id', applicationId)
    .select()
    .single();

  if (error) throw error;
  return application as VerificationApplication;
}

/**
 * Soumettre une demande (marquer comme soumise)
 */
export async function submitVerificationApplication(
  applicationId: string
): Promise<VerificationApplication> {
  console.log('[submitVerificationApplication] Starting submit for:', applicationId);

  const { data: application, error } = await supabase
    .from('verification_applications')
    .update({
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single();

  console.log('[submitVerificationApplication] Result:', { application, error });

  if (error) {
    console.error('[submitVerificationApplication] Error:', error);
    throw error;
  }

  if (!application) {
    console.error('[submitVerificationApplication] No data returned');
    throw new Error('Failed to submit application: no data returned');
  }

  console.log('[submitVerificationApplication] Success:', application);
  return application as VerificationApplication;
}

/**
 * Assigner un agent à une demande
 */
export async function assignAgentToApplication(
  applicationId: string,
  agentId: string
): Promise<VerificationApplication> {
  const { data: application, error } = await supabase
    .from('verification_applications')
    .update({ assigned_agent_id: agentId, status: 'in_review' })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) throw error;
  return application as VerificationApplication;
}

/**
 * Approuver une demande
 */
export async function approveVerificationApplication(
  applicationId: string
): Promise<VerificationApplication> {
  return updateVerificationApplication(applicationId, {
    status: 'approved',
    approved_at: new Date().toISOString(),
  });
}

/**
 * Rejeter une demande
 */
export async function rejectVerificationApplication(
  applicationId: string,
  reason: string
): Promise<VerificationApplication> {
  return updateVerificationApplication(applicationId, {
    status: 'rejected',
    rejection_reason: reason,
  });
}

/**
 * Demander des informations supplémentaires
 */
export async function requestMoreInfo(
  applicationId: string,
  reason: string
): Promise<VerificationApplication> {
  return updateVerificationApplication(applicationId, {
    status: 'more_info_requested',
    rejection_reason: reason,
  });
}

/**
 * Supprimer une demande (brouillon uniquement)
 */
export async function deleteVerificationApplication(
  applicationId: string
): Promise<void> {
  const { error } = await supabase
    .from('verification_applications')
    .delete()
    .eq('id', applicationId);

  if (error) throw error;
}

/**
 * Ajouter un document à une demande
 */
export async function addDocumentToApplication(
  applicationId: string,
  documentData: {
    document_type: string;
    document_url: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
  }
): Promise<VerificationDocument> {
  const { data: document, error } = await supabase
    .from('verification_documents')
    .insert({
      application_id: applicationId,
      ...documentData,
      verification_status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return document as VerificationDocument;
}

/**
 * Récupérer les documents d'une demande
 */
export async function getApplicationDocuments(
  applicationId: string
): Promise<VerificationDocument[]> {
  const { data, error } = await supabase
    .from('verification_documents')
    .select('*')
    .eq('application_id', applicationId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return (data || []) as VerificationDocument[];
}

/**
 * Mettre à jour le statut de verification d'un document
 */
export async function updateDocumentVerificationStatus(
  documentId: string,
  status: DocumentVerificationStatus,
  notes?: string
): Promise<VerificationDocument> {
  const { data: document, error } = await supabase
    .from('verification_documents')
    .update({
      verification_status: status,
      verification_notes: notes,
      verified_at: status === 'verified' ? new Date().toISOString() : null,
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) throw error;
  return document as VerificationDocument;
}

/**
 * Supprimer un document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('verification_documents')
    .delete()
    .eq('id', documentId);

  if (error) throw error;
}

/**
 * Uploader un fichier vers Supabase Storage
 */
export async function uploadDocumentFile(
  userId: string,
  dossierType: DossierType,
  file: File,
  documentType: string
): Promise<string> {
  // Déterminer le bucket selon le type de dossier
  const bucketMap: Record<DossierType, string> = {
    tenant: 'dossiers-locataires',
    owner: 'dossiers-proprietaires',
    agency: 'dossiers-agences',
  };

  const bucket = bucketMap[dossierType];
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${documentType}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

/**
 * Supprimer un fichier de Supabase Storage
 */
export async function deleteDocumentFile(
  dossierType: DossierType,
  fileUrl: string
): Promise<void> {
  const bucketMap: Record<DossierType, string> = {
    tenant: 'dossiers-locataires',
    owner: 'dossiers-proprietaires',
    agency: 'dossiers-agences',
  };

  const bucket = bucketMap[dossierType];
  // Extraire le chemin du fichier de l'URL
  const url = new URL(fileUrl);
  const pathParts = url.pathname.split('/');
  const fileName = pathParts.slice(pathParts.indexOf(bucket) + 1).join('/');

  const { error } = await supabase.storage
    .from(bucket)
    .remove([fileName]);

  if (error) throw error;
}

/**
 * Service complet des demandes de verification
 */
export const verificationApplicationsService = {
  create: createVerificationApplication,
  get: getVerificationApplication,
  getUserApplications: getUserVerificationApplications,
  getAll: getVerificationApplications,
  update: updateVerificationApplication,
  submit: submitVerificationApplication,
  assign: assignAgentToApplication,
  approve: approveVerificationApplication,
  reject: rejectVerificationApplication,
  requestMoreInfo,
  delete: deleteVerificationApplication,
  addDocument: addDocumentToApplication,
  getDocuments: getApplicationDocuments,
  updateDocumentStatus: updateDocumentVerificationStatus,
  deleteDocument,
  uploadFile: uploadDocumentFile,
  deleteFile: deleteDocumentFile,
};

export default verificationApplicationsService;
