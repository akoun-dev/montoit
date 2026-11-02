import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ServiceConfig {
  provider: string;
  is_enabled: boolean;
  priority: number;
  config: Record<string, any>;
}

export class ServiceManager {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  /**
   * Récupère la configuration des services pour un service donné
   * @param serviceName - Nom du service (ex: 'chatbot', 'sms', 'maps')
   * @returns Liste des configurations triées par priorité
   */
  async getServiceConfigs(serviceName: string): Promise<ServiceConfig[]> {
    const { data, error } = await this.supabase
      .from('service_configurations')
      .select('provider, is_enabled, priority, config')
      .eq('service_name', serviceName)
      .eq('is_enabled', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error(`[ServiceManager] Error fetching configs for ${serviceName}:`, error);
      return [];
    }

    return (data || []) as ServiceConfig[];
  }

  /**
   * Exécute une fonction avec fallback automatique
   * @param serviceName - Nom du service
   * @param handlers - Map de handlers par provider
   * @param params - Paramètres à passer aux handlers
   * @returns Résultat du handler ou erreur
   */
  async executeWithFallback<T>(
    serviceName: string,
    handlers: Record<string, (config: ServiceConfig, params: any) => Promise<T>>,
    params: any
  ): Promise<T> {
    const configs = await this.getServiceConfigs(serviceName);

    if (configs.length === 0) {
      throw new Error(`No enabled providers found for service: ${serviceName}`);
    }

    const errors: Array<{ provider: string; error: any }> = [];

    for (const config of configs) {
      const handler = handlers[config.provider];

      if (!handler) {
        console.warn(`[ServiceManager] No handler found for provider: ${config.provider}`);
        continue;
      }

      try {
        console.log(`[ServiceManager] Trying ${config.provider} for ${serviceName}...`);
        const startTime = Date.now();
        const result = await handler(config, params);
        const duration = Date.now() - startTime;

        console.log(`[ServiceManager] ✅ Success with ${config.provider} (${duration}ms)`);

        await this.logServiceUsage(serviceName, config.provider, 'success', null, duration);

        return result;
      } catch (error: any) {
        console.error(`[ServiceManager] ❌ Failed with ${config.provider}:`, error);
        errors.push({ provider: config.provider, error: error.message });

        await this.logServiceUsage(serviceName, config.provider, 'failure', error.message, 0);

        continue;
      }
    }

    throw new Error(
      `All providers failed for service ${serviceName}. Errors: ${JSON.stringify(errors)}`
    );
  }

  /**
   * Enregistre l'utilisation d'un service dans les logs
   */
  private async logServiceUsage(
    serviceName: string,
    provider: string,
    status: 'success' | 'failure',
    errorMessage: string | null,
    responseTimeMs: number
  ) {
    try {
      await this.supabase.from('service_usage_logs').insert({
        service_name: serviceName,
        provider: provider,
        status: status,
        error_message: errorMessage,
        response_time_ms: responseTimeMs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ServiceManager] Failed to log usage:', error);
    }
  }

  /**
   * Récupère les statistiques d'un service
   */
  async getServiceStats(serviceName: string | null = null, timeRange: string = '24 hours') {
    const { data, error } = await this.supabase.rpc('get_service_stats', {
      service_filter: serviceName,
      time_range: timeRange,
    });

    if (error) {
      console.error(`[ServiceManager] Error fetching stats:`, error);
      return null;
    }

    return data;
  }

  /**
   * Optimise automatiquement les coûts en basculant vers le service le moins cher
   */
  async optimizeServiceCosts() {
    const { error } = await this.supabase.rpc('optimize_service_costs');

    if (error) {
      console.error('[ServiceManager] Error optimizing costs:', error);
      return false;
    }

    console.log('[ServiceManager] Service costs optimized');
    return true;
  }

  /**
   * Récupère les services en échec
   */
  async getFailingServices(threshold: number = 80, timeRange: string = '1 hour') {
    const { data, error } = await this.supabase.rpc('get_failing_services', {
      threshold,
      time_range: timeRange,
    });

    if (error) {
      console.error(`[ServiceManager] Error fetching failing services:`, error);
      return [];
    }

    return data || [];
  }
}
