/**
 * Service pour l'automatisation du statut des propriétés
 *
 * Ce service gère automatiquement le changement de statut des propriétés
 * entre "disponible" et "loué" en fonction des contrats de location actifs.
 */

import { supabase } from '@/integrations/supabase/client';
import { callEdgeFunction } from '@/api/client';

export type PropertyStatus = 'available' | 'rented' | 'pending' | 'maintenance' | 'unavailable' | 'inactive';

export interface PropertyStatusUpdate {
  propertyId: string;
  oldStatus: PropertyStatus;
  newStatus: PropertyStatus;
  reason: string;
  relatedContractId?: string;
  relatedApplicationId?: string;
}

/**
 * Service pour l'automatisation du statut des propriétés
 */
export const propertyStatusService = {
  /**
   * Met à jour automatiquement le statut d'une propriété
   * basé sur les contrats de location actifs
   */
  async updatePropertyStatus(propertyId: string): Promise<PropertyStatusUpdate | null> {
    // Récupérer la propriété
    const { data: property } = await supabase
      .from('properties')
      .select('id, status, owner_id')
      .eq('id', propertyId)
      .single();

    if (!property) {
      console.error(`Propriété ${propertyId} non trouvée`);
      return null;
    }

    const currentStatus = property.status as PropertyStatus;
    let newStatus: PropertyStatus = currentStatus;
    let reason = '';
    let relatedContractId: string | undefined;
    let relatedApplicationId: string | undefined;

    // Vérifier les contrats de location actifs pour cette propriété
    const { data: activeLeases } = await supabase
      .from('lease_contracts')
      .select('id, status, start_date, end_date, rental_application_id')
      .eq('property_id', propertyId)
      .eq('status', 'active')
      .order('start_date', { ascending: false });

    const hasActiveLease = activeLeases && activeLeases.length > 0;
    const now = new Date();

    // Déterminer le nouveau statut
    if (hasActiveLease) {
      // Vérifier si le bail actuel est toujours en cours
      const latestLease = activeLeases[0];
      const startDate = new Date(latestLease.start_date);
      const endDate = latestLease.end_date ? new Date(latestLease.end_date) : null;

      if (endDate && now > endDate) {
        // Le bail est expiré
        newStatus = 'available';
        reason = 'Bail de location expiré';
        relatedContractId = latestLease.id;
      } else if (now < startDate) {
        // Le bail n'a pas encore commencé
        newStatus = 'pending';
        reason = 'Location débutant le ' + startDate.toLocaleDateString('fr-FR');
        relatedContractId = latestLease.id;
      } else {
        // Le bail est actif
        newStatus = 'rented';
        reason = 'Bail de location actif';
        relatedContractId = latestLease.id;
      }
    } else {
      // Pas de bail actif
      // Vérifier s'il y a des candidatures acceptées en attente de bail
      const { data: acceptedApplications } = await supabase
        .from('rental_applications')
        .select('id, status, created_at')
        .eq('property_id', propertyId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (acceptedApplications && acceptedApplications.length > 0) {
        newStatus = 'pending';
        reason = 'Candidature acceptée, en attente de bail';
        relatedApplicationId = acceptedApplications[0].id;
      } else if (currentStatus === 'rented') {
        newStatus = 'available';
        reason = 'Location terminée';
      }
    }

    // Si le statut n'a pas changé, ne rien faire
    if (newStatus === currentStatus) {
      return null;
    }

    // Mettre à jour le statut
    const { error } = await supabase
      .from('properties')
      .update({
        status: newStatus,
        status_updated_at: now.toISOString(),
        status_reason: reason,
      })
      .eq('id', propertyId);

    if (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }

    // Enregistrer l'historique du changement de statut
    await propertyStatusService.recordStatusChange({
      propertyId,
      oldStatus: currentStatus,
      newStatus,
      reason,
      relatedContractId,
      relatedApplicationId,
    });

    //Notifier le propriétaire du changement
    await propertyStatusService.notifyStatusChange(propertyId, currentStatus, newStatus, property.owner_id, reason);

    return {
      propertyId,
      oldStatus: currentStatus,
      newStatus,
      reason,
      relatedContractId,
      relatedApplicationId,
    };
  },

  /**
   * Met à jour le statut de toutes les propriétés
   * (cron job ou appel manuel)
   */
  async updateAllPropertiesStatus(): Promise<PropertyStatusUpdate[]> {
    const updates: PropertyStatusUpdate[] = [];

    // Récupérer toutes les propriétés actives
    const { data: properties } = await supabase
      .from('properties')
      .select('id, status, owner_id')
      .in('status', ['available', 'rented', 'pending']);

    if (!properties) return updates;

    // Traiter chaque propriété
    for (const property of properties) {
      try {
        const update = await this.updatePropertyStatus(property.id);
        if (update) {
          updates.push(update);
        }
      } catch (error) {
        console.error(`Erreur lors de la mise à jour de la propriété ${property.id}:`, error);
      }
    }

    return updates;
  },

  /**
   * Mettre manuellement une propriété en maintenance
   */
  async setPropertyMaintenance(
    propertyId: string,
    reason: string
  ): Promise<void> {
    await supabase
      .from('properties')
      .update({
        status: 'maintenance',
        status_updated_at: new Date().toISOString(),
        status_reason: reason,
      })
      .eq('id', propertyId);
  },

  /**
   * Réactiver une propriété (retourner en disponible)
   */
  async reactivateProperty(propertyId: string): Promise<void> {
    // Vérifier d'abord s'il y a un bail actif
    const update = await this.updatePropertyStatus(propertyId);

    // Si update est null, c'est qu'il n'y a pas de bail actif
    // On peut donc forcer le statut à available
    if (!update) {
      await supabase
        .from('properties')
        .update({
          status: 'available',
          status_updated_at: new Date().toISOString(),
          status_reason: 'Propriété réactivée manuellement',
        })
        .eq('id', propertyId);
    }
  },

  /**
   * Désactiver une propriété (retirer de la publication)
   */
  async deactivateProperty(propertyId: string, reason: string): Promise<void> {
    const { data: property } = await supabase
      .from('properties')
      .select('status')
      .eq('id', propertyId)
      .single();

    if (!property) throw new Error('Propriété non trouvée');

    await propertyStatusService.recordStatusChange({
      propertyId,
      oldStatus: property.status as PropertyStatus,
      newStatus: 'inactive',
      reason: reason || 'Propriété désactivée manuellement',
    });

    await supabase
      .from('properties')
      .update({
        status: 'inactive',
        status_updated_at: new Date().toISOString(),
        status_reason: reason,
      })
      .eq('id', propertyId);
  },

  /**
   * Enregistrer un changement de statut dans l'historique
   */
  async recordStatusChange(change: {
    propertyId: string;
    oldStatus: PropertyStatus;
    newStatus: PropertyStatus;
    reason: string;
    relatedContractId?: string;
    relatedApplicationId?: string;
  }): Promise<void> {
    await supabase.from('property_status_history').insert({
      property_id: change.propertyId,
      old_status: change.oldStatus,
      new_status: change.newStatus,
      reason: change.reason,
      related_contract_id: change.relatedContractId || null,
      related_application_id: change.relatedApplicationId || null,
      changed_at: new Date().toISOString(),
    });
  },

  /**
   * Notifier le propriétaire d'un changement de statut
   */
  async notifyStatusChange(
    propertyId: string,
    oldStatus: PropertyStatus,
    newStatus: PropertyStatus,
    ownerId: string,
    reason: string
  ): Promise<void> {
    // Récupérer les détails de la propriété
    const { data: property } = await supabase
      .from('properties')
      .select('id, title, city')
      .eq('id', propertyId)
      .single();

    if (!property) return;

    // Récupérer le profil du propriétaire
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', ownerId)
      .single();

    if (!profile) return;

    // Créer une notification in-app
    await supabase.from('notifications').insert({
      user_id: ownerId,
      type: 'property_status',
      title: `Statut de votre propriété mis à jour`,
      message: `Votre propriété "${property.title}" à ${property.city} est maintenant "${newStatus}"`,
      data: {
        propertyId,
        oldStatus,
        newStatus,
        propertyTitle: property.title,
        propertyCity: property.city,
      },
      read: false,
      created_at: new Date().toISOString(),
    });

    // Envoyer un email si les préférences le permettent
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('email_enabled')
      .eq('user_id', ownerId)
      .maybeSingle();

    const allowEmail = (prefs?.email_enabled ?? true) && !!profile?.email;

    if (allowEmail && profile?.email) {
      const siteUrl = import.meta.env.SITE_URL ?? 'https://mon-toit.ci';
      const subject = `Statut mis à jour — ${property.title}`;
      const html = `
        <p>Bonjour ${profile.full_name || 'Propriétaire'},</p>
        <p>
          Le statut de votre propriété "${property.title}" à ${property.city || 'votre localité'}
          a évolué de <strong>${oldStatus}</strong> à <strong>${newStatus}</strong>.
        </p>
        ${reason ? `<p>Raison : ${reason}</p>` : ''}
        <p>
          <a href="${siteUrl}/proprietes/${propertyId}" target="_blank" rel="noopener">
            Voir la fiche détaillée
          </a>
        </p>
        <p>— L'équipe Mon Toit</p>
      `;

      const { error: emailError } = await callEdgeFunction('send-email', {
        to: profile.email,
        subject,
        html,
        data: {
          propertyTitle: property.title,
          city: property.city,
          oldStatus,
          newStatus,
          reason,
        },
      });

      if (emailError) {
        console.error('Error sending property status email:', emailError);
      }
    }
  },

  /**
   * Obtenir l'historique des changements de statut d'une propriété
   */
  async getStatusHistory(propertyId: string): Promise<
    Array<{
      id: string;
      oldStatus: PropertyStatus;
      newStatus: PropertyStatus;
      reason: string;
      changedAt: string;
    }>
  > {
    const { data } = await supabase
      .from('property_status_history')
      .select('*')
      .eq('property_id', propertyId)
      .order('changed_at', { ascending: false });

    return (data || []).map((item) => ({
      id: item.id,
      oldStatus: item.old_status as PropertyStatus,
      newStatus: item.new_status as PropertyStatus,
      reason: item.reason,
      changedAt: item.changed_at,
    }));
  },

  /**
   * Obtenir les statistiques de statut pour un propriétaire
   */
  async getOwnerStatusStats(ownerId: string): Promise<{
    total: number;
    available: number;
    rented: number;
    pending: number;
    maintenance: number;
    unavailable: number;
  }> {
    const { data: properties } = await supabase
      .from('properties')
      .select('status')
      .eq('owner_id', ownerId);

    const stats = {
      total: 0,
      available: 0,
      rented: 0,
      pending: 0,
      maintenance: 0,
      unavailable: 0,
    };

    if (!properties) return stats;

    stats.total = properties.length;
    for (const property of properties) {
      const status = property.status as PropertyStatus;
      if (status in stats) {
        stats[status]++;
      } else {
        stats.unavailable++;
      }
    }

    return stats;
  },
};

export default propertyStatusService;
