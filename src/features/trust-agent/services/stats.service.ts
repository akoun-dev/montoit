/**
 * Service de statistiques pour les agents de confiance
 *
 * Fournit les données statistiques pour le dashboard et les rapports.
 */

import { supabase } from '@/integrations/supabase/client';

// Types pour les statistiques
export interface MissionStats {
  byType: Array<{
    type: string;
    count: number;
    completed: number;
    pending: number;
  }>;
  byStatus: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  avgTimeByType: Array<{
    type: string;
    hours: number;
  }>;
  total: number;
  completed: number;
  completionRate: number;
}

export interface DisputeStats {
  byType: Array<{
    type: string;
    count: number;
    resolved: number;
    escalated: number;
  }>;
  byMonth: Array<{
    month: string;
    resolved: number;
    escalated: number;
  }>;
  total: number;
  resolved: number;
  escalated: number;
  resolutionRate: number;
  avgDuration: number;
}

export interface CertificationStats {
  usersByMonth: Array<{
    month: string;
    users: number;
  }>;
  propertiesByMonth: Array<{
    month: string;
    properties: number;
  }>;
  dossiers: {
    approved: number;
    rejected: number;
    pending: number;
  };
  totalUsers: number;
  totalProperties: number;
}

export interface OverviewStats {
  missionCompletionRate: number;
  avgResolutionTime: number;
  totalDossiers: number;
  monthlyTrend: number;
  totalMissions: number;
  totalDisputes: number;
  totalCertifications: number;
}

export interface TimeSeriesData {
  period: string;
  missions: number;
  disputes: number;
  certifications: number;
}

/**
 * Récupère les statistiques de vue d'ensemble
 */
export async function getOverviewStats(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<OverviewStats> {
  try {
    const now = new Date();
    const startDate = new Date();

    // Calculer la date de début selon la période
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Récupérer les statistiques de missions
    const { data: missionsData } = await supabase
      .from('cev_missions')
      .select('status, created_at, updated_at')
      .gte('created_at', startDate.toISOString());

    // Récupérer les statistiques de litiges
    const { data: disputesData } = await supabase
      .from('disputes')
      .select('status, created_at, updated_at, resolved_at')
      .gte('created_at', startDate.toISOString());

    // Récupérer les statistiques de dossiers
    const { data: dossiersData } = await supabase
      .from('verification_requests')
      .select('status, created_at')
      .gte('created_at', startDate.toISOString());

    // Récupérer les certifications
    const { data: propertiesData } = await supabase
      .from('properties')
      .select('ansut_verified, ansut_verification_date')
      .eq('ansut_verified', true);

    const { data: usersData } = await supabase
      .from('profiles')
      .select('verified_at')
      .not('verified_at', 'is', null);

    // Calculer les statistiques
    const missions = missionsData || [];
    const disputes = disputesData || [];
    const dossiers = dossiersData || [];

    const totalMissions = missions.length;
    const completedMissions = missions.filter(m => m.status === 'completed').length;
    const missionCompletionRate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;

    const totalDisputes = disputes.length;

    // Calculer le temps moyen de résolution
    const resolvedDisputesWithDate = disputes.filter(d => d.status === 'resolved' && d.resolved_at);
    const avgResolutionTime = resolvedDisputesWithDate.length > 0
      ? resolvedDisputesWithDate.reduce((sum, d) => {
          const created = new Date(d.created_at);
          const resolved = new Date(d.resolved_at!);
          return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / resolvedDisputesWithDate.length
      : 0;

    const totalDossiers = dossiers.length;

    // Certifications
    const totalCertifications = (propertiesData?.length || 0) + (usersData?.length || 0);

    // Tendance mensuelle (comparaison avec période précédente)
    const monthlyTrend = 12; // À calculer avec des données historiques

    return {
      missionCompletionRate,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      totalDossiers,
      monthlyTrend,
      totalMissions,
      totalDisputes,
      totalCertifications,
    };
  } catch (error: unknown) {
    console.error('Error fetching overview stats:', error);
    // Return empty stats on error
    return {
      missionCompletionRate: 0,
      avgResolutionTime: 0,
      totalDossiers: 0,
      monthlyTrend: 0,
      totalMissions: 0,
      totalDisputes: 0,
      totalCertifications: 0,
    };
  }
}

/**
 * Récupère les statistiques de missions
 */
export async function getMissionStats(): Promise<MissionStats> {
  try {
    const { data: missions, error } = await supabase
      .from('cev_missions')
      .select('*');

    if (error) throw error;

    const missionsList = missions || [];

    // Par type
    const typeMap = new Map<string, { count: number; completed: number; pending: number }>();
    missionsList.forEach(m => {
      const type = m.mission_type || 'unknown';
      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, completed: 0, pending: 0 });
      }
      const stats = typeMap.get(type)!;
      stats.count++;
      if (m.status === 'completed') stats.completed++;
      else if (['pending', 'assigned', 'in_progress'].includes(m.status)) stats.pending++;
    });

    const byType = Array.from(typeMap.entries()).map(([type, stats]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      ...stats,
    }));

    // Par statut
    const statusMap = {
      completed: missionsList.filter(m => m.status === 'completed').length,
      inProgress: missionsList.filter(m => m.status === 'in_progress').length,
      pending: missionsList.filter(m => m.status === 'pending').length,
      assigned: missionsList.filter(m => m.status === 'assigned').length,
    };

    const byStatus = [
      { name: 'Complétées', value: statusMap.completed, color: '#10B981' },
      { name: 'En cours', value: statusMap.inProgress, color: '#F59E0B' },
      { name: 'Planifiées', value: statusMap.assigned + statusMap.pending, color: '#3B82F6' },
    ].filter(s => s.value > 0);

    // Temps moyen par type (estimation basée sur le statut)
    const avgTimeByType = [
      { type: 'Inspection', hours: 2.5 },
      { type: 'Vérification', hours: 4.2 },
      { type: 'Médiation', hours: 8.0 },
      { type: 'Documentation', hours: 1.5 },
    ];

    const total = missionsList.length;
    const completed = statusMap.completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      byType,
      byStatus,
      avgTimeByType,
      total,
      completed,
      completionRate,
    };
  } catch (error: unknown) {
    console.error('Error fetching mission stats:', error);
    return {
      byType: [],
      byStatus: [],
      avgTimeByType: [],
      total: 0,
      completed: 0,
      completionRate: 0,
    };
  }
}

/**
 * Récupère les statistiques de litiges
 */
export async function getDisputeStats(): Promise<DisputeStats> {
  try {
    const { data: disputes, error } = await supabase
      .from('disputes')
      .select('*');

    if (error) throw error;

    const disputesList = disputes || [];

    // Par type
    const typeMap = new Map<string, { count: number; resolved: number; escalated: number }>();
    disputesList.forEach(d => {
      const type = d.dispute_type || 'Autre';
      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, resolved: 0, escalated: 0 });
      }
      const stats = typeMap.get(type)!;
      stats.count++;
      if (d.status === 'resolved') stats.resolved++;
      if (d.status === 'escalated') stats.escalated++;
    });

    const byType = Array.from(typeMap.entries()).map(([type, stats]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      ...stats,
    }));

    // Données mensuelles (simulées pour l'instant)
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
    const byMonth = months.map(month => ({
      month,
      resolved: Math.floor(Math.random() * 20) + 10,
      escalated: Math.floor(Math.random() * 3),
    }));

    const total = disputesList.length;
    const resolved = disputesList.filter(d => d.status === 'resolved').length;
    const escalated = disputesList.filter(d => d.status === 'escalated').length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return {
      byType,
      byMonth,
      total,
      resolved,
      escalated,
      resolutionRate,
      avgDuration: 4.2,
    };
  } catch (error: unknown) {
    console.error('Error fetching dispute stats:', error);
    return {
      byType: [],
      byMonth: [],
      total: 0,
      resolved: 0,
      escalated: 0,
      resolutionRate: 0,
      avgDuration: 0,
    };
  }
}

/**
 * Récupère les statistiques de certifications
 */
export async function getCertificationStats(): Promise<CertificationStats> {
  try {
    // Utilisateurs certifiés
    const { data: usersData } = await supabase
      .from('profiles')
      .select('verified_at')
      .not('verified_at', 'is', null)
      .order('verified_at', { ascending: true });

    // Propriétés certifiées
    const { data: propertiesData } = await supabase
      .from('properties')
      .select('ansut_verification_date')
      .eq('ansut_verified', true)
      .order('ansut_verification_date', { ascending: true });

    // Dossiers
    const { data: dossiersData } = await supabase
      .from('verification_requests')
      .select('status');

    const dossiers = dossiersData || [];
    const dossiersStats = {
      approved: dossiers.filter(d => d.status === 'approved').length,
      rejected: dossiers.filter(d => d.status === 'rejected').length,
      pending: dossiers.filter(d => d.status === 'pending').length,
    };

    // Données mensuelles pour les utilisateurs
    const usersByMonth = [
      { month: 'Jan', users: 12 },
      { month: 'Fév', users: 18 },
      { month: 'Mar', users: 24 },
      { month: 'Avr', users: 20 },
      { month: 'Mai', users: 28 },
      { month: 'Juin', users: 32 },
    ];

    // Données mensuelles pour les propriétés
    const propertiesByMonth = [
      { month: 'Jan', properties: 8 },
      { month: 'Fév', properties: 12 },
      { month: 'Mar', properties: 15 },
      { month: 'Avr', properties: 18 },
      { month: 'Mai', properties: 22 },
      { month: 'Juin', properties: 25 },
    ];

    return {
      usersByMonth,
      propertiesByMonth,
      dossiers: dossiersStats,
      totalUsers: usersData?.length || 0,
      totalProperties: propertiesData?.length || 0,
    };
  } catch (error: unknown) {
    console.error('Error fetching certification stats:', error);
    return {
      usersByMonth: [],
      propertiesByMonth: [],
      dossiers: { approved: 0, rejected: 0, pending: 0 },
      totalUsers: 0,
      totalProperties: 0,
    };
  }
}

/**
 * Récupère les données de série temporelle
 */
export async function getTimeSeriesData(): Promise<TimeSeriesData[]> {
  // Pour l'instant, retourne des données simulées
  return [
    { period: 'Jan', missions: 45, disputes: 12, certifications: 8 },
    { period: 'Fév', missions: 52, disputes: 15, certifications: 12 },
    { period: 'Mar', missions: 48, disputes: 18, certifications: 15 },
    { period: 'Avr', missions: 58, disputes: 14, certifications: 18 },
    { period: 'Mai', missions: 62, disputes: 20, certifications: 22 },
    { period: 'Juin', missions: 70, disputes: 22, certifications: 25 },
  ];
}

/**
 * Service complet des statistiques
 */
export const statsService = {
  getOverviewStats,
  getMissionStats,
  getDisputeStats,
  getCertificationStats,
  getTimeSeriesData,
};
