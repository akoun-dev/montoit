/**
 * Service pour la gestion des demandes de documents complémentaires
 */

import { supabase } from '@/integrations/supabase/client';
import { notificationService } from './notification.service';

export interface DocumentRequest {
  id: string;
  application_id: string;
  requested_by: string;
  documents_requested: Array<{
    type: string;
    description: string;
    required: boolean;
  }>;
  deadline: string;
  status: 'pending' | 'partial' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentSubmission {
  id: string;
  request_id: string;
  document_type: string;
  document_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  verification_notes: string | null;
  uploaded_at: string;
  verified_by: string | null;
  verified_at: string | null;
}

export interface CreateDocumentRequestOptions {
  applicationId: string;
  requestedBy: string; // User ID du TC
  documents: Array<{
    type: string;
    description: string;
    required: boolean;
  }>;
  deadlineDays: number; // Délai en jours
  notes?: string;
}

/**
 * Service de gestion des demandes de documents complémentaires
 */
export const additionalDocumentsService = {
  /**
   * Créer une demande de documents complémentaires
   */
  async createRequest(options: CreateDocumentRequestOptions): Promise<DocumentRequest> {
    const { applicationId, requestedBy, documents, deadlineDays, notes } = options;

    // Calculer la date limite
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + deadlineDays);

    // Créer la demande
    const { data, error } = await supabase
      .from('additional_document_requests')
      .insert({
        application_id: applicationId,
        requested_by: requestedBy,
        documents_requested: documents,
        deadline: deadline.toISOString(),
        status: 'pending',
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour le statut du dossier
    await supabase
      .from('verification_applications')
      .update({ status: 'more_info_requested' })
      .eq('id', applicationId);

    // Récupérer l'utilisateur pour la notification
    const { data: application } = await supabase
      .from('verification_applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (application?.user_id) {
      // Envoyer la notification
      await notificationService.sendAdditionalDocumentsRequest({
        userId: application.user_id,
        dossierId: applicationId,
        requiredDocuments: documents.map((d) => d.description),
        deadline,
      });
    }

    return data as DocumentRequest;
  },

  /**
   * Récupérer les demandes pour un dossier
   */
  async getRequestsForApplication(applicationId: string): Promise<DocumentRequest[]> {
    const { data, error } = await supabase
      .from('additional_document_requests')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as DocumentRequest[];
  },

  /**
   * Récupérer une demande avec ses soumissions
   */
  async getRequestWithSubmissions(requestId: string): Promise<{
    request: DocumentRequest;
    submissions: DocumentSubmission[];
  }> {
    const { data: request, error: requestError } = await supabase
      .from('additional_document_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) throw new Error('Demande non trouvée');

    const { data: submissions, error: submissionsError } = await supabase
      .from('additional_document_submissions')
      .select('*')
      .eq('request_id', requestId)
      .order('uploaded_at', { ascending: false });

    if (submissionsError) throw submissionsError;

    return {
      request: request as DocumentRequest,
      submissions: (submissions || []) as DocumentSubmission[],
    };
  },

  /**
   * Soumettre un document
   */
  async submitDocument(options: {
    requestId: string;
    documentType: string;
    documentUrl: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  }): Promise<DocumentSubmission> {
    const { requestId, documentType, documentUrl, fileName, fileSize, mimeType } = options;

    const { data, error } = await supabase
      .from('additional_document_submissions')
      .insert({
        request_id: requestId,
        document_type: documentType,
        document_url: documentUrl,
        file_name: fileName || null,
        file_size: fileSize || null,
        mime_type: mimeType || null,
        verification_status: 'pending',
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour le statut de la demande si tous les documents requis sont soumis
    await this.updateRequestStatus(requestId);

    return data as DocumentSubmission;
  },

  /**
   * Vérifier un document soumis
   */
  async verifyDocument(options: {
    submissionId: string;
    verifiedBy: string;
    status: 'approved' | 'rejected';
    notes?: string;
  }): Promise<DocumentSubmission> {
    const { submissionId, verifiedBy, status, notes } = options;

    const { data, error } = await supabase
      .from('additional_document_submissions')
      .update({
        verification_status: status,
        verification_notes: notes || null,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour le statut de la demande
    const submission = data as DocumentSubmission;
    await this.updateRequestStatus(submission.request_id);

    // Si rejeté, notifier l'utilisateur
    if (status === 'rejected') {
      await this.notifyDocumentRejection(submission, notes);
    }

    return data as DocumentSubmission;
  },

  /**
   * Mettre à jour le statut d'une demande
   */
  async updateRequestStatus(requestId: string): Promise<void> {
    const { request, submissions } = await this.getRequestWithSubmissions(requestId);

    // Compter les documents requis et soumis
    const requiredDocs = request.documents_requested.filter((d) => d.required);
    const requiredTypes = new Set(requiredDocs.map((d) => d.type));

    const submittedRequiredTypes = new Set(
      submissions
        .filter((s) => requiredTypes.has(s.document_type) && s.verification_status === 'approved')
        .map((s) => s.document_type)
    );

    const allRequiredSubmitted = requiredTypes.size === submittedRequiredTypes.size;
    const hasAnySubmission = submissions.length > 0;

    let newStatus: 'pending' | 'partial' | 'completed';

    if (allRequiredSubmitted) {
      newStatus = 'completed';
    } else if (hasAnySubmission) {
      newStatus = 'partial';
    } else {
      newStatus = 'pending';
    }

    await supabase
      .from('additional_document_requests')
      .update({ status: newStatus })
      .eq('id', requestId);

    // Si complété, réactiver le dossier
    if (newStatus === 'completed') {
      await supabase
        .from('verification_applications')
        .update({ status: 'in_review' })
        .eq('id', request.application_id);
    }
  },

  /**
   * Notifier le rejet d'un document
   */
  async notifyDocumentRejection(
    submission: DocumentSubmission,
    notes?: string
  ): Promise<void> {
    const { data: request } = await supabase
      .from('additional_document_requests')
      .select('application_id')
      .eq('id', submission.request_id)
      .single();

    if (!request) return;

    const { data: application } = await supabase
      .from('verification_applications')
      .select('user_id')
      .eq('id', request.application_id)
      .single();

    if (!application?.user_id) return;

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', application.user_id)
      .single();

    // Envoyer la notification
    await notificationService.sendNotification({
      userId: application.user_id,
      templateCode: 'document_rejected',
      channels: ['email', 'in_app'],
      data: {
        full_name: profile?.full_name || 'Utilisateur',
        document_name: submission.document_type,
        rejection_reason: notes || 'Document non conforme',
        rejection_type: 'additional',
      },
      priority: 'high',
    });
  },

  /**
   * Annuler une demande
   */
  async cancelRequest(requestId: string): Promise<void> {
    await supabase
      .from('additional_document_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId);
  },

  /**
   * Prolonger le délai d'une demande
   */
  async extendDeadline(requestId: string, additionalDays: number): Promise<DocumentRequest> {
    const { data: current } = await supabase
      .from('additional_document_requests')
      .select('deadline')
      .eq('id', requestId)
      .single();

    if (!current) throw new Error('Demande non trouvée');

    const newDeadline = new Date(current.deadline);
    newDeadline.setDate(newDeadline.getDate() + additionalDays);

    const { data, error } = await supabase
      .from('additional_document_requests')
      .update({ deadline: newDeadline.toISOString() })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    // Notifier l'utilisateur de la prolongation
    const { data: request } = await supabase
      .from('additional_document_requests')
      .select('application_id')
      .eq('id', requestId)
      .single();

    if (request) {
      const { data: application } = await supabase
        .from('verification_applications')
        .select('user_id')
        .eq('id', request.application_id)
        .single();

      if (application?.user_id) {
        await notificationService.sendAdditionalDocumentsRequest({
          userId: application.user_id,
          dossierId: request.application_id,
          requiredDocuments: ['Documents complémentaires (délai prolongé)'],
          deadline: newDeadline,
        });
      }
    }

    return data as DocumentRequest;
  },

  /**
   * Récupérer les demandes en attente de réponse
   */
  async getPendingRequests(): Promise<Array<DocumentRequest & { user_email: string; user_name: string }>> {
    const { data, error } = await supabase
      .from('additional_document_requests')
      .select('*, profiles!inner(email, full_name)')
      .in('status', ['pending', 'partial'])
      .order('deadline', { ascending: true });

    if (error) throw error;

    return (data || []).map((item: unknown) => {
      const req = item as Record<string, unknown>;
      const profile = req.profiles as Record<string, unknown>;
      return {
        id: req.id as string,
        application_id: req.application_id as string,
        requested_by: req.requested_by as string,
        documents_requested: req.documents_requested as Array<{
          type: string;
          description: string;
          required: boolean;
        }>,
        deadline: req.deadline as string,
        status: req.status as 'pending' | 'partial' | 'completed' | 'cancelled',
        notes: req.notes as string | null,
        created_at: req.created_at as string,
        updated_at: req.updated_at as string,
        user_email: profile.email as string,
        user_name: profile.full_name as string,
      };
    });
  },

  /**
   * Vérifier et mettre à jour les demandes dépassées (cron job)
   */
  async checkOverdueRequests(): Promise<void> {
    const now = new Date();

    const { data: overdueRequests } = await supabase
      .from('additional_document_requests')
      .select('id, application_id')
      .in('status', ['pending', 'partial'])
      .lt('deadline', now.toISOString());

    if (!overdueRequests) return;

    // Les demandes restent en "pending" mais sont marquées comme en retard
    // Une alerte pourrait être envoyée aux TC
    console.log(`${overdueRequests.length} demandes de documents dépassées`);
  },
};

export default additionalDocumentsService;
