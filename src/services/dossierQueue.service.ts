/**
 * Service pour la gestion de la file d'attente et des SLA des dossiers de vérification
 */

import { supabase } from '@/integrations/supabase/client';
import type { DossierType, DossierStatus } from '@/features/verification/services/verificationApplications.service';

// Configuration SLA par type de dossier (en heures)
const SLA_CONFIG: Record<DossierType, { standard: number; urgent: number }> = {
  tenant: { standard: 48, urgent: 24 }, // 48h standard, 24h urgent
  owner: { standard: 72, urgent: 36 }, // 72h standard, 36h urgent
  agency: { standard: 120, urgent: 48 }, // 5 jours standard, 48h urgent
};

export type SLAPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SLAStatus = 'on_track' | 'at_risk' | 'overdue';

export interface QueueMetrics {
  totalInQueue: number;
  byStatus: Record<DossierStatus, number>;
  byPriority: Record<SLAPriority, number>;
  byType: Record<DossierType, number>;
  overdueCount: number;
  atRiskCount: number;
  avgWaitTime: number;
}

export interface DossierQueueItem {
  id: string;
  user_id: string;
  dossier_type: DossierType;
  status: DossierStatus;
  sla_priority: SLAPriority | null;
  sla_status: SLAStatus | null;
  sla_deadline: string | null;
  queue_position: number | null;
  submitted_at: string;
  assigned_at: string | null;
  full_name: string;
  email: string;
}

/**
 * Service de gestion de la file d'attente et SLA
 */
export const dossierQueueService = {
  /**
   * Ajouter un dossier à la file d'attente avec SLA
   */
  async addToQueue(
    applicationId: string,
    dossierType: DossierType,
    priority: SLAPriority = 'normal'
  ): Promise<void> {
    const slaHours = priority === 'urgent' ? SLA_CONFIG[dossierType].urgent : SLA_CONFIG[dossierType].standard;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    // Récupérer la position actuelle dans la queue
    const { data: lastPosition } = await supabase
      .from('verification_applications')
      .select('queue_position')
      .not('queue_position', 'is', null)
      .eq('status', 'pending')
      .order('queue_position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (lastPosition?.queue_position || 0) + 1;

    await supabase
      .from('verification_applications')
      .update({
        sla_priority: priority,
        sla_deadline: slaDeadline.toISOString(),
        sla_status: 'on_track',
        queue_position: nextPosition,
      })
      .eq('id', applicationId);

    // Enregistrer l'événement dans l'historique SLA
    await dossierQueueService.recordSLAEvent(applicationId, 'submitted', null, 'pending', slaDeadline);
  },

  /**
   * Assigner un dossier à un agent
   */
  async assignToAgent(
    applicationId: string,
    agentId: string
  ): Promise<void> {
    const { data: application } = await supabase
      .from('verification_applications')
      .select('status, sla_status')
      .eq('id', applicationId)
      .single();

    await supabase
      .from('verification_applications')
      .update({
        assigned_agent_id: agentId,
        assigned_at: new Date().toISOString(),
        status: 'in_review',
        queue_position: null, // Retirer de la queue
      })
      .eq('id', applicationId);

    // Enregistrer l'événement
    await dossierQueueService.recordSLAEvent(
      applicationId,
      'assigned',
      application?.status,
      'in_review',
      undefined,
      agentId
    );
  },

  /**
   * Récupérer la file d'attente
   */
  async getQueue(filters?: {
    dossierType?: DossierType;
    slaStatus?: SLAStatus;
    priority?: SLAPriority;
  }): Promise<DossierQueueItem[]> {
    let query = supabase
      .from('verification_applications')
      .select('*, profiles!inner(full_name, email)')
      .eq('status', 'pending')
      .not('queue_position', 'is', null)
      .order('queue_position', { ascending: true });

    if (filters?.dossierType) {
      query = query.eq('dossier_type', filters.dossierType);
    }

    if (filters?.slaStatus) {
      query = query.eq('sla_status', filters.slaStatus);
    }

    if (filters?.priority) {
      query = query.eq('sla_priority', filters.priority);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((item: unknown) => {
      const app = item as Record<string, unknown>;
      const profile = app.profiles as Record<string, unknown> | null;
      return {
        id: app.id as string,
        user_id: app.user_id as string,
        dossier_type: app.dossier_type as DossierType,
        status: app.status as DossierStatus,
        sla_priority: app.sla_priority as SLAPriority | null,
        sla_status: app.sla_status as SLAStatus | null,
        sla_deadline: app.sla_deadline as string | null,
        queue_position: app.queue_position as number | null,
        submitted_at: app.submitted_at as string,
        assigned_at: app.assigned_at as string | null,
        full_name: profile?.full_name as string || '',
        email: profile?.email as string || '',
      };
    });
  },

  /**
   * Récupérer les métriques de la file d'attente
   */
  async getQueueMetrics(): Promise<QueueMetrics> {
    const { data: applications } = await supabase
      .from('verification_applications')
      .select('status, sla_status, sla_priority, dossier_type, submitted_at, sla_deadline')
      .eq('status', 'pending');

    const metrics: QueueMetrics = {
      totalInQueue: 0,
      byStatus: { pending: 0, in_review: 0, approved: 0, rejected: 0, more_info_requested: 0 },
      byPriority: { low: 0, normal: 0, high: 0, urgent: 0 },
      byType: { tenant: 0, owner: 0, agency: 0 },
      overdueCount: 0,
      atRiskCount: 0,
      avgWaitTime: 0,
    };

    if (!applications) return metrics;

    metrics.totalInQueue = applications.length;
    const waitTimes: number[] = [];
    const now = Date.now();

    for (const app of applications) {
      // Compter par statut
      if (app.status in metrics.byStatus) {
        metrics.byStatus[app.status as DossierStatus]++;
      }

      // Compter par priorité
      if (app.sla_priority && app.sla_priority in metrics.byPriority) {
        metrics.byPriority[app.sla_priority as SLAPriority]++;
      }

      // Compter par type
      if (app.dossier_type in metrics.byType) {
        metrics.byType[app.dossier_type as DossierType]++;
      }

      // Compter SLA
      if (app.sla_status === 'overdue') {
        metrics.overdueCount++;
      } else if (app.sla_status === 'at_risk') {
        metrics.atRiskCount++;
      }

      // Calculer temps d'attente
      if (app.submitted_at) {
        const waitHours = (now - new Date(app.submitted_at).getTime()) / (1000 * 60 * 60);
        waitTimes.push(waitHours);
      }
    }

    // Calculer moyenne
    if (waitTimes.length > 0) {
      metrics.avgWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
    }

    return metrics;
  },

  /**
   * Mettre à jour les statuts SLA (cron job)
   */
  async updateSLAStatuses(): Promise<void> {
    const { data: applications } = await supabase
      .from('verification_applications')
      .select('id, sla_deadline, sla_status, submitted_at')
      .in('status', ['pending', 'in_review'])
      .not('sla_deadline', 'is', null);

    if (!applications) return;

    const now = new Date();
    const updates: Array<{ id: string; sla_status: SLAStatus }> = [];

    for (const app of applications) {
      const deadline = new Date(app.sla_deadline || 0);
      const timeUntilDeadline = deadline.getTime() - now.getTime();
      const hoursUntilDeadline = timeUntilDeadline / (1000 * 60 * 60);

      let newStatus: SLAStatus;

      if (hoursUntilDeadline < 0) {
        newStatus = 'overdue';
      } else if (hoursUntilDeadline < 12) {
        // Moins de 12h = à risque
        newStatus = 'at_risk';
      } else if (app.sla_status === 'overdue' || app.sla_status === 'at_risk') {
        newStatus = 'on_track'; // Retour à la normale
      } else {
        continue; // Pas de changement
      }

      updates.push({ id: app.id, sla_status: newStatus });
    }

    // Appliquer les mises à jour
    for (const update of updates) {
      await supabase
        .from('verification_applications')
        .update({ sla_status: update.sla_status })
        .eq('id', update.id);
    }
  },

  /**
   * Enregistrer un événement SLA
   */
  async recordSLAEvent(
    applicationId: string,
    eventType: string,
    previousStatus: string | null,
    newStatus: string,
    slaDeadline?: Date,
    actorId?: string
  ): Promise<void> {
    await supabase.from('verification_sla_history').insert({
      application_id: applicationId,
      event_type: eventType,
      previous_status: previousStatus,
      new_status: newStatus,
      sla_deadline: slaDeadline?.toISOString(),
      actor_id: actorId,
    });
  },

  /**
   * Enregistrer les statistiques SLA quotidiennes (cron job)
   */
  async recordDailyStats(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const dossierType of ['tenant', 'owner', 'agency'] as DossierType[]) {
      // Récupérer les statistiques du jour
      const { data: stats } = await supabase
        .from('verification_sla_history')
        .select('event_timestamp, application_id')
        .eq('event_type', 'submitted')
        .gte('event_timestamp', today.toISOString());

      const totalSubmitted = stats?.length || 0;

      const { data: processedStats } = await supabase
        .from('verification_sla_history')
        .select('event_timestamp, application_id')
        .in('event_type', ['approved', 'rejected'])
        .gte('event_timestamp', today.toISOString());

      const totalProcessed = processedStats?.length || 0;

      // Calculer ceux dans les délais
      const { data: withinSLA } = await supabase
        .from('verification_sla_history')
        .select('application_id')
        .gte('event_timestamp', today.toISOString());

      const totalWithinSLA = withinSLA?.length || 0;
      const totalOverdue = Math.max(0, totalProcessed - totalWithinSLA);

      // Calculer temps moyen
      const { data: apps } = await supabase
        .from('verification_applications')
        .select('resolution_time_hours')
        .eq('dossier_type', dossierType)
        .gte('updated_at', today.toISOString())
        .not('resolution_time_hours', 'is', null);

      const avgTime = apps && apps.length > 0
        ? apps.reduce((sum, app) => sum + (app.resolution_time_hours || 0), 0) / apps.length
        : 0;

      // Insérer ou mettre à jour
      await supabase
        .from('verification_sla_stats')
        .upsert({
          date: today.toISOString().split('T')[0],
          dossier_type: dossierType,
          total_submitted: totalSubmitted,
          total_processed: totalProcessed,
          total_within_sla: totalWithinSLA,
          total_overdue: totalOverdue,
          avg_resolution_time_hours: avgTime,
        });
    }
  },

  /**
   * Récupérer les dossiers en retard
   */
  async getOverdueDossiers(): Promise<DossierQueueItem[]> {
    return this.getQueue({ slaStatus: 'overdue' });
  },

  /**
   * Récupérer les dossiers à risque
   */
  async getAtRiskDossiers(): Promise<DossierQueueItem[]> {
    return this.getQueue({ slaStatus: 'at_risk' });
  },

  /**
   * Calculer le temps de résolution final
   */
  async calculateResolutionTime(applicationId: string): Promise<number> {
    const { data: application } = await supabase
      .from('verification_applications')
      .select('submitted_at, approved_at, rejected_at')
      .eq('id', applicationId)
      .single();

    if (!application) return 0;

    const endTime = application.approved_at || application.rejected_at;
    if (!endTime) return 0;

    const hours = (new Date(endTime).getTime() - new Date(application.submitted_at).getTime()) / (1000 * 60 * 60);

    await supabase
      .from('verification_applications')
      .update({ resolution_time_hours: Math.round(hours) })
      .eq('id', applicationId);

    return Math.round(hours);
  },
};

export default dossierQueueService;
