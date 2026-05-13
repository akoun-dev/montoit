/**
 * Service d'intégration TC (Tiers de Confiance) avec les candidatures locatives
 *
 * Ce service gère le workflow de soumission au TC pour les dossiers locatifs
 */

import { supabase } from '@/integrations/supabase/client';
import {
  verificationApplicationsService,
  VerificationApplication,
  DossierType,
} from '@/features/verification/services/verificationApplications.service';

// Types
export interface TCSubmissionResult {
  success: boolean;
  verificationApplicationId?: string;
  rentalApplicationLinked?: boolean;
  message: string;
  nextStep?: string;
}

export interface RentalApplicationWithTC {
  id: string;
  property_id: string;
  tenant_id: string;
  status: string;
  verification_application_id?: string | null;
  tc_submission_status?: 'pending' | 'submitted' | 'in_review' | 'approved' | 'rejected' | null;
  verification_status?: VerificationApplication | null;
}

/**
 * Soumet une candidature au TC (Tiers de Confiance)
 *
 * Workflow:
 * 1. Vérifie si un dossier de vérification existe déjà pour le locataire
 * 2. Sinon, crée un nouveau dossier de vérification
 * 3. Lie le dossier à la candidature locative
 * 4. Met à jour le statut de la candidature
 */
export async function submitToTC(
  rentalApplicationId: string,
  tenantId: string
): Promise<TCSubmissionResult> {
  try {
    // Récupérer la candidature locative
    const { data: rentalApp, error: rentalError } = await supabase
      .from('rental_applications')
      .select('id, property_id, tenant_id, status, verification_application_id')
      .eq('id', rentalApplicationId)
      .single();

    if (rentalError || !rentalApp) {
      return {
        success: false,
        message: 'Candidature locative non trouvée',
      };
    }

    // Vérifier si un dossier de vérification existe déjà
    let verificationApp: VerificationApplication | null = null;
    const existingApps = await verificationApplicationsService.getUserVerificationApplications(
      tenantId,
      'tenant'
    );

    // Chercher un dossier approuvé ou en cours
    verificationApp =
      existingApps.find(
        (app) => app.status === 'approved'
      ) ||
      existingApps.find(
        (app) => ['pending', 'in_review', 'more_info_requested'].includes(app.status)
      ) ||
      null;

    // Si aucun dossier n'existe, en créer un nouveau
    if (!verificationApp) {
      try {
        verificationApp = await verificationApplicationsService.createVerificationApplication(
          tenantId,
          {
            dossier_type: 'tenant',
            personal_info: {},
            financial_info: {},
            property_info: {},
            documents: {},
          }
        );
      } catch (error) {
        console.error('Error creating verification application:', error);
        return {
          success: false,
          message: 'Erreur lors de la création du dossier de vérification',
        };
      }
    }

    // Lier le dossier à la candidature locative
    const { error: updateError } = await supabase
      .from('rental_applications')
      .update({
        verification_application_id: verificationApp.id,
        tc_submission_status: mapVerificationStatusToTC(verificationApp.status),
      })
      .eq('id', rentalApplicationId);

    if (updateError) {
      console.error('Error linking verification to rental application:', updateError);
      return {
        success: false,
        message: 'Erreur lors de la liaison du dossier',
      };
    }

    // Si le dossier est déjà approuvé, la candidature peut passer au statut 'pending'
    // Sinon, elle reste en attente de validation TC
    const nextStep = verificationApp.status === 'approved'
      ? 'Dossier validé, candidature prête pour examen'
      : verificationApp.status === 'pending'
        ? 'Dossier soumis au TC, en attente de traitement'
        : verificationApp.status === 'in_review'
          ? 'Dossier en cours de vérification par le TC'
          : verificationApp.status === 'more_info_requested'
            ? 'Dossier incomplet, informations supplémentaires requises'
            : 'Dossier refusé, veuillez créer un nouveau dossier';

    return {
      success: true,
      verificationApplicationId: verificationApp.id,
      rentalApplicationLinked: true,
      message: 'Candidature soumise au TC avec succès',
      nextStep,
    };
  } catch (error) {
    console.error('Error submitting to TC:', error);
    return {
      success: false,
      message: 'Erreur lors de la soumission au TC',
    };
  }
}

/**
 * Met à jour le statut TC d'une candidature locative
 */
export async function updateTCStatus(
  rentalApplicationId: string,
  verificationStatus: string
): Promise<void> {
  const tcStatus = mapVerificationStatusToTC(verificationStatus);

  const { error } = await supabase
    .from('rental_applications')
    .update({
      tc_submission_status: tcStatus,
    })
    .eq('id', rentalApplicationId);

  if (error) {
    console.error('Error updating TC status:', error);
    throw error;
  }
}

/**
 * Récupère les candidatures avec leur statut TC
 */
export async function getRentalApplicationsWithTC(
  tenantId?: string,
  ownerId?: string
): Promise<RentalApplicationWithTC[]> {
  let query = supabase
    .from('rental_applications')
    .select('*, verification_applications(*)');

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }
  if (ownerId) {
    query = query.in('property_id', supabase
      .from('properties')
      .select('id')
      .eq('owner_id', ownerId)
    );
  }

  const { data, error } = await query
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rental applications with TC:', error);
    return [];
  }

  return (data || []).map((app: Record<string, unknown>) => ({
    id: app.id,
    property_id: app.property_id,
    tenant_id: app.tenant_id,
    status: app.status,
    verification_application_id: app.verification_application_id,
    tc_submission_status: app.tc_submission_status,
    verification_status: app.verification_applications,
  }));
}

/**
 * Récupère les candidatures en attente de validation TC pour un propriétaire
 */
export async function getPendingTCApplicationsForOwner(
  ownerId: string
): Promise<RentalApplicationWithTC[]> {
  const { data, error } = await supabase
    .from('rental_applications')
    .select('*, properties!inner(owner_id), verification_applications(*)')
    .eq('properties.owner_id', ownerId)
    .in('tc_submission_status', ['pending', 'submitted', 'in_review'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending TC applications:', error);
    return [];
  }

  return (data || []).map((app: Record<string, unknown>) => ({
    id: app.id,
    property_id: app.property_id,
    tenant_id: app.tenant_id,
    status: app.status,
    verification_application_id: app.verification_application_id,
    tc_submission_status: app.tc_submission_status,
    verification_status: app.verification_applications,
  }));
}

/**
 * Vérifie si une candidature peut être envoyée au propriétaire
 * (dossier TC validé)
 */
export async function canSendToOwner(rentalApplicationId: string): Promise<{
  canSend: boolean;
  reason?: string;
  tcStatus?: string;
}> {
  const { data: application, error } = await supabase
    .from('rental_applications')
    .select('tc_submission_status, verification_application_id')
    .eq('id', rentalApplicationId)
    .single();

  if (error || !application) {
    return { canSend: false, reason: 'Candidature non trouvée' };
  }

  if (!application.verification_application_id) {
    return { canSend: false, reason: 'Aucun dossier TC associé' };
  }

  if (application.tc_submission_status !== 'approved') {
    return {
      canSend: false,
      reason: 'Le dossier TC n\'est pas validé',
      tcStatus: application.tc_submission_status,
    };
  }

  return { canSend: true, tcStatus: application.tc_submission_status };
}

/**
 * Envoie la candidature au propriétaire (après validation TC)
 */
export async function sendToOwner(
  rentalApplicationId: string
): Promise<{ success: boolean; message: string }> {
  // Vérifier si le dossier TC est validé
  const checkResult = await canSendToOwner(rentalApplicationId);

  if (!checkResult.canSend) {
    return {
      success: false,
      message: checkResult.reason || 'Impossible d\'envoyer au propriétaire',
    };
  }

  // Mettre à jour le statut de la candidature
  const { error } = await supabase
    .from('rental_applications')
    .update({
      status: 'pending', // En attente de décision du propriétaire
    })
    .eq('id', rentalApplicationId);

  if (error) {
    console.error('Error sending to owner:', error);
    return {
      success: false,
      message: 'Erreur lors de l\'envoi au propriétaire',
    };
  }

  return {
    success: true,
    message: 'Candidature envoyée au propriétaire',
  };
}

/**
 * Map le statut de vérification au statut TC
 */
function mapVerificationStatusToTC(
  verificationStatus: string
): 'pending' | 'submitted' | 'in_review' | 'approved' | 'rejected' | null {
  switch (verificationStatus) {
    case 'pending':
      return 'submitted';
    case 'in_review':
      return 'in_review';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'more_info_requested':
      return 'in_review';
    default:
      return null;
  }
}

/**
 * Synchronise les statuts TC depuis les applications de vérification
 * Utile pour mettre à jour les candidatures locatives après un changement de statut TC
 */
export async function syncTCStatuses(): Promise<{
  updated: number;
  errors: number;
}> {
  // Récupérer toutes les candidatures avec un dossier TC lié
  const { data: applications, error } = await supabase
    .from('rental_applications')
    .select('id, verification_application_id')
    .not('verification_application_id', 'is', null);

  if (error || !applications) {
    console.error('Error fetching applications for sync:', error);
    return { updated: 0, errors: 1 };
  }

  let updated = 0;
  let errors = 0;

  for (const app of applications) {
    try {
      // Récupérer le statut du dossier TC
      const { data: verificationApp } = await supabase
        .from('verification_applications')
        .select('status')
        .eq('id', app.verification_application_id)
        .single();

      if (verificationApp) {
        const tcStatus = mapVerificationStatusToTC(verificationApp.status);

        // Mettre à jour si différent
        await supabase
          .from('rental_applications')
          .update({ tc_submission_status: tcStatus })
          .eq('id', app.id)
          .neq('tc_submission_status', tcStatus);

        updated++;
      }
    } catch (err) {
      console.error(`Error syncing application ${app.id}:`, err);
      errors++;
    }
  }

  return { updated, errors };
}

// Export du service complet
export const tcIntegrationService = {
  submitToTC,
  updateTCStatus,
  getRentalApplicationsWithTC,
  getPendingTCApplicationsForOwner,
  canSendToOwner,
  sendToOwner,
  syncTCStatuses,
};

export default tcIntegrationService;
