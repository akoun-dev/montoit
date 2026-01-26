import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Server,
  Database,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/shared/ui/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import { useUserRoles } from '@/hooks/shared/useUserRoles';

// Types pour les services
interface ServiceStatus {
  id: string;
  name: string;
  type: 'api' | 'database' | 'queue' | 'cache' | 'storage';
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  uptime: number; // pourcentage
  responseTime: number; // ms
  lastCheck: string;
  endpoint?: string;
  description?: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  activeUsers: number;
  requestsPerMinute: number;
  errorRate: number;
}

export default function ServiceMonitoringPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  // États
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Données simulées pour les services
  const services: ServiceStatus[] = [
    {
      id: 'api-gateway',
      name: 'API Gateway',
      type: 'api',
      status: 'healthy',
      uptime: 99.9,
      responseTime: 45,
      lastCheck: new Date().toISOString(),
      endpoint: 'https://api.montoit.ci',
      description: "Point d'entrée principal des API",
    },
    {
      id: 'auth-service',
      name: "Service d'authentification",
      type: 'api',
      status: 'healthy',
      uptime: 99.8,
      responseTime: 32,
      lastCheck: new Date().toISOString(),
      endpoint: 'https://auth.montoit.ci',
      description: 'Gestion des utilisateurs et authentification',
    },
    {
      id: 'postgres-db',
      name: 'Base de données principale',
      type: 'database',
      status: 'healthy',
      uptime: 99.95,
      responseTime: 12,
      lastCheck: new Date().toISOString(),
      description: 'Base de données PostgreSQL',
    },
    {
      id: 'redis-cache',
      name: 'Cache Redis',
      type: 'cache',
      status: 'degraded',
      uptime: 98.5,
      responseTime: 5,
      lastCheck: new Date().toISOString(),
      description: 'Cache en mémoire pour les performances',
    },
    {
      id: 'storage-service',
      name: 'Service de stockage',
      type: 'storage',
      status: 'healthy',
      uptime: 99.7,
      responseTime: 120,
      lastCheck: new Date().toISOString(),
      endpoint: 'https://storage.montoit.ci',
      description: 'Stockage des fichiers et images',
    },
    {
      id: 'payment-service',
      name: 'Service de paiement',
      type: 'api',
      status: 'healthy',
      uptime: 99.6,
      responseTime: 85,
      lastCheck: new Date().toISOString(),
      endpoint: 'https://payments.montoit.ci',
      description: 'Intégration Stripe et gestion des transactions',
    },
    {
      id: 'notification-service',
      name: 'Service de notifications',
      type: 'queue',
      status: 'down',
      uptime: 95.2,
      responseTime: 250,
      lastCheck: new Date().toISOString(),
      description: "Envoi d'emails et notifications push",
    },
    {
      id: 'search-service',
      name: 'Service de recherche',
      type: 'api',
      status: 'maintenance',
      uptime: 99.0,
      responseTime: 65,
      lastCheck: new Date().toISOString(),
      endpoint: 'https://search.montoit.ci',
      description: 'Recherche plein texte des propriétés',
    },
  ];

  // Métriques système simulées
  const systemMetrics: SystemMetrics = {
    cpu: 42,
    memory: 68,
    disk: 34,
    activeUsers: 1247,
    requestsPerMinute: 2450,
    errorRate: 0.8,
  };

  // Redirection si non admin
  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      navigate('/admin/tableau-de-bord');
    }
  }, [isAdmin, rolesLoading, navigate]);

  // Gestionnaires
  const handleRefresh = () => {
    toast.success('Statut des services actualisé');
  };

  const handleServiceClick = (serviceId: string) => {
    setSelectedService(serviceId === selectedService ? null : serviceId);
  };

  const handleRestartService = (serviceId: string) => {
    toast.info(`Redémarrage du service ${serviceId} demandé`);
  };

  // Configuration des statuts
  const statusConfig = {
    healthy: { label: 'Sain', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    degraded: { label: 'Dégradé', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
    down: { label: 'Indisponible', color: 'bg-red-100 text-red-800', icon: XCircle },
    maintenance: { label: 'Maintenance', color: 'bg-blue-100 text-blue-800', icon: AlertTriangle },
  };

  const typeConfig = {
    api: { label: 'API', color: 'bg-purple-100 text-purple-800', icon: Globe },
    database: { label: 'Base de données', color: 'bg-blue-100 text-blue-800', icon: Database },
    queue: { label: "File d'attente", color: 'bg-orange-100 text-orange-800', icon: Activity },
    cache: { label: 'Cache', color: 'bg-pink-100 text-pink-800', icon: Server },
    storage: { label: 'Stockage', color: 'bg-teal-100 text-teal-800', icon: Server },
  };

  // Calcul des statistiques
  const stats = {
    total: services.length,
    healthy: services.filter((s) => s.status === 'healthy').length,
    degraded: services.filter((s) => s.status === 'degraded').length,
    down: services.filter((s) => s.status === 'down').length,
    maintenance: services.filter((s) => s.status === 'maintenance').length,
    averageUptime: services.reduce((sum, s) => sum + s.uptime, 0) / services.length,
  };

  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#F16522] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="w-full">
        {/* En-tête */}
        <AdminPageHeader
          title="Surveillance des services"
          description="Surveillez l'état de santé et les performances de tous les services de la plateforme"
          icon={Activity}
          onRefresh={handleRefresh}
          refreshing={false}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Surveillance' },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-[#EFEBE9] text-[#F16522] focus:ring-[#F16522]"
                />
                <label htmlFor="auto-refresh" className="text-sm text-[#6B5A4E]">
                  Actualisation automatique
                </label>
              </div>
              <Button
                onClick={handleRefresh}
                className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white"
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </Button>
            </div>
          }
        />

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Services sains</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.healthy}</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full"
                  style={{ width: `${(stats.healthy / stats.total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[#6B5A4E]">
                {Math.round((stats.healthy / stats.total) * 100)}%
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Services dégradés</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.degraded}</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-yellow-500 h-1.5 rounded-full"
                  style={{ width: `${(stats.degraded / stats.total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[#6B5A4E]">
                {Math.round((stats.degraded / stats.total) * 100)}%
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Services indisponibles</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.down}</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-red-500 h-1.5 rounded-full"
                  style={{ width: `${(stats.down / stats.total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[#6B5A4E]">
                {Math.round((stats.down / stats.total) * 100)}%
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Uptime moyen</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.averageUptime.toFixed(2)}%</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${stats.averageUptime}%` }}
                />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Utilisateurs actifs</p>
            <p className="text-2xl font-bold text-[#2C1810]">{systemMetrics.activeUsers}</p>
            <p className="text-xs text-[#6B5A4E] mt-1">En temps réel</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Taux d'erreur</p>
            <p className="text-2xl font-bold text-[#2C1810]">{systemMetrics.errorRate}%</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-red-500 h-1.5 rounded-full"
                  style={{ width: `${systemMetrics.errorRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Métriques système */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <h3 className="text-lg font-bold text-[#2C1810] mb-4">Utilisation CPU</h3>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-[#2C1810]">{systemMetrics.cpu}%</p>
                <p className="text-sm text-[#6B5A4E]">Utilisation moyenne</p>
              </div>
              <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#EFEBE9" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#F16522"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${systemMetrics.cpu * 2.83} 283`}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-[#2C1810]">{systemMetrics.cpu}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <h3 className="text-lg font-bold text-[#2C1810] mb-4">Utilisation mémoire</h3>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-[#2C1810]">{systemMetrics.memory}%</p>
                <p className="text-sm text-[#6B5A4E]">Mémoire utilisée</p>
              </div>
              <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#EFEBE9" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${systemMetrics.memory * 2.83} 283`}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-[#2C1810]">{systemMetrics.memory}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <h3 className="text-lg font-bold text-[#2C1810] mb-4">Requêtes par minute</h3>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-[#2C1810]">
                  {systemMetrics.requestsPerMinute.toLocaleString()}
                </p>
                <p className="text-sm text-[#6B5A4E]">Trafic actuel</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">+12%</div>
                <p className="text-sm text-[#6B5A4E]">vs hier</p>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des services */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
          <div className="p-6 border-b border-[#EFEBE9]">
            <h3 className="text-xl font-bold text-[#2C1810]">Services et statuts</h3>
            <p className="text-[#6B5A4E] mt-1">
              Statut en temps réel de tous les services de la plateforme
            </p>
          </div>

          <div className="divide-y divide-[#EFEBE9]">
            {services.map((service) => {
              const StatusIcon = statusConfig[service.status].icon;
              const TypeIcon = typeConfig[service.type].icon;
              const status = statusConfig[service.status];
              const type = typeConfig[service.type];

              return (
                <div
                  key={service.id}
                  className={`p-6 hover:bg-[#FAF7F4] transition-colors cursor-pointer ${
                    selectedService === service.id ? 'bg-[#FFF5F0]' : ''
                  }`}
                  onClick={() => handleServiceClick(service.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${type.color}`}>
                        <TypeIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#2C1810]">{service.name}</h4>
                        <p className="text-sm text-[#6B5A4E]">{service.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <StatusIcon
                            className={`w-5 h-5 ${status.color.replace('bg-', 'text-').split(' ')[0]}`}
                          />
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B5A4E] mt-1">
                          Dernière vérification:{' '}
                          {new Date(service.lastCheck).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-[#2C1810]">{service.uptime.toFixed(1)}%</p>
                        <p className="text-xs text-[#6B5A4E]">Uptime</p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-[#2C1810]">{service.responseTime}ms</p>
                        <p className="text-xs text-[#6B5A4E]">Temps de réponse</p>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestartService(service.id);
                        }}
                        variant="ghost"
                        size="sm"
                        disabled={service.status === 'down'}
                        className="text-[#6B5A4E] hover:text-[#F16522]"
                      >
                        Redémarrer
                      </Button>
                    </div>
                  </div>

                  {selectedService === service.id && (
                    <div className="mt-4 pt-4 border-t border-[#EFEBE9]">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-[#6B5A4E]">Endpoint</p>
                          <p className="font-medium">{service.endpoint || 'Non applicable'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-[#6B5A4E]">Type</p>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${type.color}`}
                          >
                            {type.label}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-[#6B5A4E]">Statut détaillé</p>
                          <p className="font-medium">
                            {service.status === 'healthy'
                              ? 'Opérationnel'
                              : service.status === 'degraded'
                                ? 'Performances réduites'
                                : service.status === 'down'
                                  ? 'Indisponible'
                                  : 'En maintenance'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#6B5A4E]">Actions</p>
                          <div className="flex gap-2 mt-1">
                            <Button size="sm" variant="ghost">
                              Voir logs
                            </Button>
                            <Button size="sm" variant="ghost">
                              Métriques
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
