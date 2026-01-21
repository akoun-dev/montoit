/**
 * Service stub pour Mon Artisan
 * Ce service gère les demandes d'artisans pour les travaux de maintenance
 */

export interface CreateJobRequestData {
  maintenance_request_id: string;
  job_type: string;
  job_description: string;
  urgency_level: 'low' | 'medium' | 'high' | 'emergency';
  preferred_date?: string;
  preferred_time_slot?: string;
  budget_max?: number;
}

export interface JobRequest {
  id: string;
  maintenance_request_id: string;
  job_type: string;
  job_description: string;
  urgency_level: string;
  status: 'pending' | 'sent' | 'quoted' | 'accepted' | 'completed' | 'cancelled';
  created_at: string;
}

export const monartisanService = {
  /**
   * Crée une nouvelle demande d'artisan
   */
  createJobRequest: async (data: CreateJobRequestData): Promise<JobRequest> => {
    // Simulation - à remplacer par l'appel API réel
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      id: `job-${Date.now()}`,
      maintenance_request_id: data.maintenance_request_id,
      job_type: data.job_type,
      job_description: data.job_description,
      urgency_level: data.urgency_level,
      status: 'sent',
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Récupère les demandes d'artisans pour une maintenance
   */
  getJobRequestsByMaintenance: async (maintenanceRequestId: string): Promise<JobRequest[]> => {
    // Simulation - à remplacer par l'appel API réel
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [];
  },

  /**
   * Annule une demande d'artisan
   */
  cancelJobRequest: async (jobRequestId: string): Promise<void> => {
    // Simulation - à remplacer par l'appel API réel
    await new Promise((resolve) => setTimeout(resolve, 500));
  },
};

export default monartisanService;
