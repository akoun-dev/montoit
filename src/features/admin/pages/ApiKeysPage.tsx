import { useState, useEffect } from 'react';
import {
  Key,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  XCircle,
  Activity,
  AlertCircle,
  Plus,
  Settings,
  Shield,
  Zap,
  Globe,
  Database,
  Smartphone,
  Mail,
} from 'lucide-react';

interface ApiKey {
  id: string;
  service_name: string;
  display_name: string;
  description: string;
  keys: Record<string, string>;
  is_active: boolean;
  environment: 'sandbox' | 'production';
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  usage_count: number;
  health_status: 'healthy' | 'warning' | 'error';
}

interface ApiKeyLog {
  id: string;
  service_name: string;
  action: string;
  status: string;
  created_at: string;
  response_time?: number;
}

export default function AdminApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<ApiKeyLog[]>([]);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedService, setSelectedService] = useState<ApiKey | null>(null);
  const [editedKeys, setEditedKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'keys' | 'logs' | 'health'>('keys');

  const serviceIcons = {
    resend: { icon: Mail, color: 'bg-blue-50 text-blue-600', name: 'Resend' },
    brevo: { icon: Mail, color: 'bg-purple-50 text-purple-600', name: 'Brevo' },
    orange_money: { icon: Smartphone, color: 'bg-orange-50 text-orange-600', name: 'Orange Money' },
    mtn_money: { icon: Smartphone, color: 'bg-yellow-50 text-yellow-600', name: 'MTN Money' },
    moov_money: { icon: Smartphone, color: 'bg-blue-50 text-blue-600', name: 'Moov Money' },
    wave: { icon: Smartphone, color: 'bg-indigo-50 text-indigo-600', name: 'Wave' },
    cryptoneo: { icon: Shield, color: 'bg-green-50 text-green-600', name: 'CryptoNeo' },
    mapbox: { icon: Globe, color: 'bg-red-50 text-red-600', name: 'Mapbox' },
    firebase: { icon: Zap, color: 'bg-yellow-50 text-yellow-600', name: 'Firebase' },
    sentry: { icon: AlertCircle, color: 'bg-gray-50 text-gray-600', name: 'Sentry' },
    supabase: { icon: Database, color: 'bg-green-50 text-green-600', name: 'Supabase' },
  };

  useEffect(() => {
    loadApiKeys();
    loadLogs();
  }, []);

  const loadApiKeys = async () => {
    try {
      // Données simulées pour la démonstration
      const mockApiKeys: ApiKey[] = [
        {
          id: '1',
          service_name: 'supabase',
          display_name: 'Supabase Database',
          description: 'Base de données principale de la plateforme',
          keys: {
            anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            service_role_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          is_active: true,
          environment: 'production',
          last_used_at: new Date().toISOString(),
          created_at: '2024-01-01',
          updated_at: '2024-01-15',
          usage_count: 15420,
          health_status: 'healthy',
        },
        {
          id: '2',
          service_name: 'resend',
          display_name: 'Resend Email Service',
          description: "Service d'envoi d'emails transactionnels",
          keys: {
            api_key: 're_1234567890abcdef...',
            webhook_secret: 'whsec_1234567890abcdef...',
          },
          is_active: true,
          environment: 'production',
          last_used_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          created_at: '2024-01-01',
          updated_at: '2024-01-10',
          usage_count: 3240,
          health_status: 'healthy',
        },
        {
          id: '3',
          service_name: 'orange_money',
          display_name: 'Orange Money API',
          description: 'API de paiement mobile Orange Money',
          keys: {
            client_id: 'om_client_123',
            client_secret: 'om_secret_456789',
            merchant_id: 'merchant_789',
          },
          is_active: false,
          environment: 'sandbox',
          last_used_at: null,
          created_at: '2024-01-05',
          updated_at: '2024-01-05',
          usage_count: 0,
          health_status: 'warning',
        },
        {
          id: '4',
          service_name: 'mapbox',
          display_name: 'Mapbox Maps',
          description: 'Service de cartes et géolocalisation',
          keys: {
            public_token: 'pk.eyJ1IjoibW9udG9pdCIsImEiOiJjbGl...',
            secret_token: 'sk.eyJ1IjoibW9udG9pdCIsImEiOiJjbGl...',
          },
          is_active: true,
          environment: 'production',
          last_used_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          created_at: '2024-01-01',
          updated_at: '2024-01-12',
          usage_count: 8920,
          health_status: 'healthy',
        },
      ];

      setApiKeys(mockApiKeys);
    } catch (err: any) {
      console.error('Error loading API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      // Données simulées pour la démonstration
      const mockLogs: ApiKeyLog[] = [
        {
          id: '1',
          service_name: 'supabase',
          action: 'INSERT operation on profiles table',
          status: 'success',
          created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          response_time: 120,
        },
        {
          id: '2',
          service_name: 'resend',
          action: 'Send password reset email',
          status: 'success',
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          response_time: 890,
        },
        {
          id: '3',
          service_name: 'mapbox',
          action: 'Geocoding request for Abidjan',
          status: 'success',
          created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
          response_time: 340,
        },
        {
          id: '4',
          service_name: 'orange_money',
          action: 'Payment initialization',
          status: 'error',
          created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          response_time: 5000,
        },
      ];

      setLogs(mockLogs);
    } catch (err: any) {
      console.error('Error loading logs:', err);
    }
  };

  const handleEditService = (service: ApiKey) => {
    setSelectedService(service);
    setEditedKeys(service.keys);
    setShowKeys({});
  };

  const handleSaveKeys = async () => {
    if (!selectedService) return;

    setSaving(true);

    try {
      // Simulation de la sauvegarde
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mettre à jour les données simulées
      setApiKeys((prev) =>
        prev.map((key) =>
          key.id === selectedService.id
            ? { ...key, keys: editedKeys, updated_at: new Date().toISOString() }
            : key
        )
      );

      setSelectedService(null);
    } catch (err: any) {
      console.error('Error saving keys:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (service: ApiKey) => {
    setApiKeys((prev) =>
      prev.map((key) => (key.id === service.id ? { ...key, is_active: !key.is_active } : key))
    );
  };

  const handleToggleEnvironment = (service: ApiKey) => {
    setApiKeys((prev) =>
      prev.map((key) =>
        key.id === service.id
          ? { ...key, environment: key.environment === 'production' ? 'sandbox' : 'production' }
          : key
      )
    );
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 8) + '••••••••' + key.substring(key.length - 4);
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatResponseTime = (time?: number) => {
    if (!time) return 'N/A';
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`;
  };

  const totalUsage = apiKeys.reduce((sum, key) => sum + key.usage_count, 0);
  const activeServices = apiKeys.filter((key) => key.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Clés API</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configurez et monitor les clés API de tous les services externes
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Nouveau Service</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            <Settings className="w-4 h-4" />
            <span>Paramètres</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Services Totaux</p>
              <p className="text-2xl font-bold text-gray-900">{apiKeys.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Services Actifs</p>
              <p className="text-2xl font-bold text-green-600">{activeServices}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Appels Total (24h)</p>
              <p className="text-2xl font-bold text-purple-600">{totalUsage.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Erreurs (24h)</p>
              <p className="text-2xl font-bold text-red-600">12</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'keys', label: 'Services', icon: Key },
              { id: 'logs', label: 'Logs', icon: Activity },
              { id: 'health', label: 'Santé', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'keys' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {apiKeys.map((service) => {
                const serviceConfig =
                  serviceIcons[service.service_name as keyof typeof serviceIcons] ||
                  serviceIcons.supabase;
                const Icon = serviceConfig.icon;

                return (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${serviceConfig.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{service.display_name}</h3>
                          <p className="text-sm text-gray-600">{service.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(service)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            service.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {service.is_active ? 'Actif' : 'Inactif'}
                        </button>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getHealthColor(service.health_status)}`}
                        >
                          {service.health_status === 'healthy'
                            ? 'Sain'
                            : service.health_status === 'warning'
                              ? 'Attention'
                              : 'Erreur'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {Object.entries(service.keys).map(([keyName, keyValue]) => (
                        <div
                          key={keyName}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium text-gray-700">{keyName}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 font-mono">
                              {keyValue ? maskKey(keyValue as string) : '❌ Non configuré'}
                            </span>
                            <button
                              onClick={() =>
                                setShowKeys((prev) => ({ ...prev, [keyName]: !prev[keyName] }))
                              }
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              {showKeys[keyName] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        <p>Utilisations: {service.usage_count.toLocaleString()}</p>
                        <p>
                          Dernière:{' '}
                          {service.last_used_at
                            ? new Date(service.last_used_at).toLocaleDateString('fr-FR')
                            : 'Jamais'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleEnvironment(service)}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            service.environment === 'production'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {service.environment === 'production' ? 'Prod' : 'Sandbox'}
                        </button>
                        <button
                          onClick={() => handleEditService(service)}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                        >
                          Configurer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Activités Récentes</h3>
                <button className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  <RefreshCw className="w-4 h-4" />
                  <span>Actualiser</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Service
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Temps
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {log.service_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.action}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              log.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {log.status === 'success' ? 'Succès' : 'Erreur'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatResponseTime(log.response_time)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apiKeys.map((service) => (
                <div key={service.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{service.display_name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getHealthColor(service.health_status)}`}
                    >
                      {service.health_status === 'healthy'
                        ? 'Sain'
                        : service.health_status === 'warning'
                          ? 'Attention'
                          : 'Erreur'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Disponibilité</span>
                      <span className="font-medium text-green-600">99.8%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Temps de réponse</span>
                      <span className="font-medium text-gray-900">~120ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Limite quotidienne</span>
                      <span className="font-medium text-gray-900">10,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Utilisation aujourd'hui</span>
                      <span className="font-medium text-gray-900">{service.usage_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Configuration {selectedService.display_name}
                </h2>
                <button
                  onClick={() => setSelectedService(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(editedKeys).map(([keyName, keyValue]) => (
                  <div key={keyName}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {keyName}
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys[keyName] ? 'text' : 'password'}
                        value={keyValue as string}
                        onChange={(e) =>
                          setEditedKeys({ ...editedKeys, [keyName]: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12"
                        placeholder={`Entrez votre ${keyName}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys({ ...showKeys, [keyName]: !showKeys[keyName] })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys[keyName] ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex space-x-4">
                <button
                  onClick={() => setSelectedService(null)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveKeys}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Sauvegarde...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Sauvegarder</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
