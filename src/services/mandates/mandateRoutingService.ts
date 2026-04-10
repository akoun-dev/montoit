/**
 * Service de routage pour les mandats agence
 * Détermine si les visites/candidatures doivent être routées vers l'agence ou le propriétaire
 */

import { supabase } from '@/integrations/supabase/client';

export interface AgencyMandateRouting {
  hasActiveMandate: boolean;
  recipientId: string; // ID du destinataire (agence ou propriétaire)
  agencyId?: string; // ID de l'agence si mandat existe
  ownerId: string; // ID du propriétaire
  canManage: boolean; // L'agence peut gérer les visites/candidatures
  canView: boolean; // L'agence peut voir les visites/candidatures
  shouldNotifyAgency: boolean; // L'agence doit être notifiée
  shouldNotifyOwner: boolean; // Le propriétaire doit être notifié
}

/**
 * Vérifie si un bien a un mandat actif avec une agence
 * et retourne les informations de routage appropriées
 */
export async function getRoutingForProperty(
  propertyId: string,
  permissionType: 'can_manage_applications' | 'can_view_applications'
): Promise<AgencyMandateRouting> {
  try {
    // Récupérer les informations du bien
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, owner_id, managed_by_agency')
      .eq('id', propertyId)
      .maybeSingle();

    if (propertyError || !property) {
      console.error('[MandateRouting] Property not found:', propertyError);
      return {
        hasActiveMandate: false,
        recipientId: property?.owner_id || '',
        ownerId: property?.owner_id || '',
        canManage: false,
        canView: false,
        shouldNotifyAgency: false,
        shouldNotifyOwner: true,
      };
    }

    // Vérifier s'il y a un mandat actif pour ce bien
    // Deux types de mandats possibles :
    // 1. mandate_scope = 'single_property' avec property_id correspondant
    // 2. mandate_scope = 'all_properties' avec property_id = NULL (couvre tous les biens du propriétaire)
    const { data: mandate, error: mandateError } = await supabase
      .from('agency_mandates')
      .select(`
        id,
        agency_id,
        owner_id,
        status,
        mandate_scope,
        property_id,
        can_manage_applications,
        can_view_applications,
        can_communicate_tenants
      `)
      .or(`property_id.eq.${propertyId},and(mandate_scope.eq.all_properties,property_id.is.null)`)
      .eq('status', 'active')
      .eq('owner_id', property.owner_id) // S'assurer que le mandat appartient au bon propriétaire
      .maybeSingle();

    console.log('[MandateRouting] Mandate query result:', {
      propertyId,
      ownerId: property.owner_id,
      mandateFound: !!mandate,
      mandate: mandate ? {
        id: mandate.id,
        mandate_scope: mandate.mandate_scope,
        property_id: mandate.property_id,
        agency_id: mandate.agency_id,
        can_manage_applications: mandate.can_manage_applications,
      } : null,
      error: mandateError,
    });

    if (mandateError) {
      console.error('[MandateRouting] Mandate query error:', mandateError);
    }

    // Si pas de mandat actif, router vers le propriétaire
    if (!mandate) {
      return {
        hasActiveMandate: false,
        recipientId: property.owner_id,
        ownerId: property.owner_id,
        canManage: false,
        canView: false,
        shouldNotifyAgency: false,
        shouldNotifyOwner: true,
      };
    }

    // Mandat actif trouvé - déterminer le routage selon les permissions
    const canManage = mandate.can_manage_applications || false;
    const canView = mandate.can_view_applications || false;
    const canCommunicate = mandate.can_communicate_tenants || false;

    // Le destinataire principal est l'agence si elle peut gérer
    const recipientId = canManage ? mandate.agency_id : property.owner_id;

    // L'agence doit être notifiée si elle peut voir ou gérer
    const shouldNotifyAgency = canView || canManage || canCommunicate;

    // Le propriétaire doit être notifié si l'agence ne gère pas exclusivement
    const shouldNotifyOwner = !canManage;

    const routing = {
      hasActiveMandate: true,
      recipientId,
      agencyId: mandate.agency_id,
      ownerId: property.owner_id,
      canManage,
      canView,
      shouldNotifyAgency,
      shouldNotifyOwner,
    };

    console.log('[MandateRouting] Routing decision:', {
      ...routing,
      mandate_scope: mandate.mandate_scope,
      can_communicate_tenants: canCommunicate,
    });

    return routing;
  } catch (error) {
    console.error('[MandateRouting] Error:', error);
    // En cas d'erreur, router vers le propriétaire par défaut
    return {
      hasActiveMandate: false,
      recipientId: '',
      ownerId: '',
      canManage: false,
      canView: false,
      shouldNotifyAgency: false,
      shouldNotifyOwner: true,
    };
  }
}

/**
 * Récupère les destinataires de notification pour une visite/candidature
 */
export async function getNotificationRecipients(
  propertyId: string
): Promise<{ agencyIds: string[]; ownerIds: string[] }> {
  const routing = await getRoutingForProperty(propertyId, 'can_view_applications');

  const agencyIds: string[] = [];
  const ownerIds: string[] = [];

  if (routing.shouldNotifyAgency && routing.agencyId) {
    agencyIds.push(routing.agencyId);
  }

  if (routing.shouldNotifyOwner) {
    ownerIds.push(routing.ownerId);
  }

  return { agencyIds, ownerIds };
}

/**
 * Détermine si un utilisateur peut voir une visite/candidature
 */
export async function canUserSeeVisitOrApplication(
  propertyId: string,
  userId: string
): Promise<boolean> {
  const routing = await getRoutingForProperty(propertyId, 'can_view_applications');

  // L'utilisateur peut voir si c'est le propriétaire ou l'agence du mandat
  return userId === routing.ownerId || userId === routing.agencyId;
}
