import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Key,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/shared/ui/admin/AdminPageHeader';
import { AdminTable } from '@/shared/ui/admin/AdminTable';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { useServiceConfigurations, useUpdateServiceConfiguration } from '@/features/admin/hooks/useServiceConfigurations';
import type { ServiceConfiguration as DbServiceConfiguration } from '@/features/admin/hooks/useServiceConfigurations';
import { ColumnConfig } from '@/types/admin';

// Configuration pour l'affichage des services
const SERVICE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  sms: { label: 'SMS', icon: '📱', color: 'bg-blue-100 text-blue-800' },
  whatsapp: { label: 'WhatsApp', icon: '💬', color: 'bg-green-100 text-green-800' },
  email: { label: 'Email', icon: '📧', color: 'bg-purple-100 text-purple-800' },
  payment: { label: 'Paiement', icon: '💳', color: 'bg-orange-100 text-orange-800' },
  storage: { label: 'Stockage', icon: '🗄️', color: 'bg-yellow-100 text-yellow-800' },
};

const PROVIDER_INFO: Record<string, { label: string; color: string }> = {
  brevo: { label: 'Brevo', color: 'bg-blue-50 text-blue-700' },
  sendgrid: { label: 'SendGrid', color: 'bg-cyan-50 text-cyan-700' },
  intouch: { label: 'InTouch', color: 'bg-orange-50 text-orange-700' },
  sinch: { label: 'Sinch', color: 'bg-purple-50 text-purple-700' },
  stripe: { label: 'Stripe', color: 'bg-indigo-50 text-indigo-700' },
  aws_s3: { label: 'AWS S3', color: 'bg-yellow-50 text-yellow-700' },
  google_maps: { label: 'Google Maps', color: 'bg-green-50 text-green-700' },
  twilio: { label: 'Twilio', color: 'bg-red-50 text-red-700' },
};

export default function ServiceConfigurationPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  // États
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');

  // Requête pour les configurations de services
  const { data: configurations = [], isLoading, isError, refetch } = useServiceConfigurations();
  const updateMutation = useUpdateServiceConfiguration();

  // Redirection si non admin
  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      navigate('/admin/tableau-de-bord');
    }
  }, [isAdmin, rolesLoading, navigate]);

  // Gestionnaires
  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  const handleClearFilters = () => {
    setServiceFilter('');
    setProviderFilter('');
    setSearch('');
    setPage(1);
  };

  const handleExport = () => {
    const headers = [
      'Service',
      'Fournisseur',
      'Activé',
      'Priorité',
      'Dernière modification',
    ];
    const rows = configurations.map((config) => [
      config.service_name,
      config.provider,
      config.is_enabled ? 'Oui' : 'Non',
      config.priority?.toString() || '-',
      config.updated_at ? new Date(config.updated_at).toLocaleString('fr-FR') : '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `service_configurations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export CSV généré avec succès');
  };

  const handleToggleEnabled = (config: DbServiceConfiguration) => {
    updateMutation.mutate({
      id: config.id,
      updates: { is_enabled: !config.is_enabled },
    });
  };

  const handleIncreasePriority = (config: DbServiceConfiguration) => {
    updateMutation.mutate({
      id: config.id,
      updates: { priority: (config.priority || 99) - 1 },
    });
  };

  const handleDecreasePriority = (config: DbServiceConfiguration) => {
    updateMutation.mutate({
      id: config.id,
      updates: { priority: (config.priority || 99) + 1 },
    });
  };

  // Services et fournisseurs uniques
  const services = Array.from(new Set(configurations.map((c) => c.service_name)));
  const providers = Array.from(new Set(configurations.map((c) => c.provider)));

  // Filtrer les données
  const filteredData = configurations.filter((config) => {
    if (serviceFilter && config.service_name !== serviceFilter) return false;
    if (providerFilter && config.provider !== providerFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        config.service_name.toLowerCase().includes(searchLower) ||
        config.provider.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Trier par priorité
  const sortedData = [...filteredData].sort((a, b) => (a.priority || 99) - (b.priority || 99));

  // Colonnes du tableau
  const columns: ColumnConfig[] = [
    {
      key: 'service',
      title: 'Service',
      dataIndex: 'service_name',
      width: '20%',
      sortable: true,
      render: (value: string) => {
        const info = SERVICE_INFO[value] || { label: value, icon: '⚙️', color: 'bg-gray-100 text-gray-800' };
        return (
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${info.color}`}>
              <span className="text-lg">{info.icon}</span>
            </div>
            <span className="font-medium">{info.label}</span>
          </div>
        );
      },
    },
    {
      key: 'provider',
      title: 'Fournisseur',
      dataIndex: 'provider',
      width: '20%',
      sortable: true,
      render: (value: string) => {
        const info = PROVIDER_INFO[value] || { label: value, color: 'bg-gray-50 text-gray-700' };
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${info.color}`}>
            {info.label}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'Statut',
      dataIndex: 'is_enabled',
      width: '15%',
      sortable: true,
      render: (value: boolean | null, record: DbServiceConfiguration) => (
        <button
          onClick={() => handleToggleEnabled(record)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
            value
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {value ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Actif</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Inactif</span>
            </>
          )}
        </button>
      ),
    },
    {
      key: 'priority',
      title: 'Priorité',
      dataIndex: 'priority',
      width: '15%',
      sortable: true,
      render: (value: number | null, record: DbServiceConfiguration) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleDecreasePriority(record)}
            className="p-1 hover:bg-gray-200 rounded"
            title="Diminuer la priorité"
            disabled={(value || 99) >= 99}
          >
            <ArrowDown className="w-3 h-3 text-gray-600" />
          </button>
          <span className="px-2 py-1 bg-[#FAF7F4] rounded text-sm font-mono">
            {value ?? 99}
          </span>
          <button
            onClick={() => handleIncreasePriority(record)}
            className="p-1 hover:bg-gray-200 rounded"
            title="Augmenter la priorité"
            disabled={(value || 99) <= 1}
          >
            <ArrowUp className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      ),
    },
    {
      key: 'config',
      title: 'Configuration',
      dataIndex: 'config',
      width: '20%',
      render: (value: any) => (
        <div className="text-xs text-[#6B5A4E] truncate max-w-xs" title={JSON.stringify(value)}>
          {typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : String(value)}
        </div>
      ),
    },
    {
      key: 'updated',
      title: 'Dernière modification',
      dataIndex: 'updated_at',
      width: '10%',
      sortable: true,
      render: (value: string | null) => (
        <span className="text-sm">
          {value ? new Date(value).toLocaleDateString('fr-FR') : '-'}
        </span>
      ),
    },
  ];

  // Actions par ligne
  const rowActions = [
    {
      label: (config: DbServiceConfiguration) => (config.is_enabled ? 'Désactiver' : 'Activer'),
      icon: (config: DbServiceConfiguration) => (config.is_enabled ? AlertCircle : CheckCircle),
      onClick: handleToggleEnabled,
    },
  ];

  // Statistiques
  const stats = {
    total: configurations.length,
    enabled: configurations.filter((c) => c.is_enabled).length,
    services: services.length,
    providers: providers.length,
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
          title="Configuration des services"
          description="Gérez les priorités et activation des services tiers"
          icon={Settings}
          onRefresh={() => refetch()}
          refreshing={isLoading}
          showExport={true}
          onExport={handleExport}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Configuration' },
          ]}
        />

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Total configurations</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Actives</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.enabled}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Services</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.services}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Fournisseurs</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.providers}</p>
          </div>
        </div>

        {/* Tableau */}
        <AdminTable
          columns={columns}
          data={sortedData}
          loading={isLoading}
          emptyMessage={
            isError
              ? 'Erreur lors du chargement des configurations'
              : 'Aucune configuration trouvée'
          }
          pagination={{
            data: sortedData,
            total: sortedData.length,
            page: page,
            limit: limit,
            totalPages: Math.ceil(sortedData.length / limit),
            hasNextPage: page * limit < sortedData.length,
            hasPreviousPage: page > 1,
          }}
          onPageChange={setPage}
          rowActions={rowActions}
          selectable={true}
          selectedKeys={selectedConfigs}
          onSelectionChange={setSelectedConfigs}
          showHeaderActions={true}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher par service, fournisseur..."
        />
      </div>
    </div>
  );
}
