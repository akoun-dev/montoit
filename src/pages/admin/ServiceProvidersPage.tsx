import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Server, Globe, Database, Mail, CreditCard, CheckCircle, XCircle, Settings, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/shared/ui/admin/AdminPageHeader';
import { AdminTable } from '@/shared/ui/admin/AdminTable';
import Button from '@/components/ui/Button';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { ServiceProvider, ServiceStatusType, ColumnConfig } from '@/types/admin';
import { getServiceProviders, testServiceProvider } from '@/features/admin/services/adminExtended.api';

export default function ServiceProvidersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  // États
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<ServiceStatusType | ''>('');

  // Requête pour les fournisseurs
  const {
    data: providersData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['service-providers'],
    queryFn: getServiceProviders,
    enabled: isAdmin,
  });

  // Mutations
  const testConnectionMutation = useMutation({
    mutationFn: async (providerId: string) => {
      return await testServiceProvider(providerId);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Test de connexion réussi');
      } else {
        toast.error(`Échec du test de connexion: ${result.message}`);
      }
      queryClient.invalidateQueries({ queryKey: ['service-providers'] });
    },
    onError: (error: Error) => {
      toast.error(`Échec du test de connexion: ${error.message}`);
    },
  });

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

  const handleExport = () => {
    if (!providersData) return;

    const headers = ['Nom', 'Description', 'Statut', 'Configuré', 'Dernière vérification', 'URL'];
    const rows = providersData.map((provider) => [
      provider.display_name,
      provider.description || '',
      provider.status,
      provider.is_configured ? 'Oui' : 'Non',
      provider.last_check ? new Date(provider.last_check).toLocaleString('fr-FR') : '-',
      provider.website_url || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fournisseurs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export CSV généré avec succès');
  };

  const handleConfigureProvider = (providerId: string) => {
    navigate(`/admin/service-providers/configure/${providerId}`);
  };

  const handleTestConnection = (providerId: string) => {
    testConnectionMutation.mutate(providerId);
  };

  // Filtrer les données
  const filteredData = providersData?.filter((provider) => {
    if (statusFilter && provider.status !== statusFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        provider.display_name.toLowerCase().includes(searchLower) ||
        provider.description?.toLowerCase().includes(searchLower) ||
        provider.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  // Configuration des statuts
  const statusConfig: Record<ServiceStatusType, { label: string; color: string; icon: any }> = {
    operational: { label: 'Opérationnel', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    degraded: { label: 'Dégradé', color: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
    down: { label: 'Indisponible', color: 'bg-red-100 text-red-800', icon: XCircle },
    unknown: { label: 'Inconnu', color: 'bg-gray-100 text-gray-800', icon: Server },
  };

  // Configuration des icônes par type
  const providerIcons: Record<string, any> = {
    stripe: CreditCard,
    sendgrid: Mail,
    twilio: Mail,
    aws_s3: Database,
    google_maps: Globe,
    slack: Globe,
    postmark: Mail,
    cloudinary: Database,
  };

  // Colonnes du tableau
  const columns: ColumnConfig[] = [
    {
      key: 'provider',
      title: 'Fournisseur',
      dataIndex: 'display_name',
      width: '25%',
      render: (value: string, record: ServiceProvider) => {
        const Icon = providerIcons[record.name] || Server;
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FAF7F4] rounded-lg">
              <Icon className="w-6 h-6 text-[#6B5A4E]" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-[#2C1810]">{value}</span>
              <span className="text-xs text-[#6B5A4E]">{record.description}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Statut',
      dataIndex: 'status',
      width: '15%',
      sortable: true,
      render: (value: ServiceStatusType) => {
        const config = statusConfig[value] || statusConfig.unknown;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
        );
      },
    },
    {
      key: 'configuration',
      title: 'Configuration',
      dataIndex: 'is_configured',
      width: '15%',
      sortable: true,
      render: (value: boolean, record: ServiceProvider) => (
        <div className="flex flex-col">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {value ? 'Configuré' : 'Non configuré'}
          </span>
          {record.configuration_count > 0 && (
            <span className="text-xs text-[#6B5A4E] mt-1">
              {record.configuration_count} paramètre{record.configuration_count > 1 ? 's' : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'last_check',
      title: 'Dernière vérification',
      dataIndex: 'last_check',
      width: '20%',
      sortable: true,
      render: (value: string | null) => (
        <div className="flex flex-col">
          <span className="text-sm">
            {value ? new Date(value).toLocaleDateString('fr-FR') : 'Jamais'}
          </span>
          <span className="text-xs text-[#6B5A4E]">
            {value ? new Date(value).toLocaleTimeString('fr-FR') : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'active',
      title: 'Actif',
      dataIndex: 'is_active',
      width: '10%',
      sortable: true,
      render: (value: boolean) => (
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {value ? 'Oui' : 'Non'}
        </div>
      ),
    },
    {
      key: 'website',
      title: 'Site web',
      dataIndex: 'website_url',
      width: '15%',
      render: (value: string | null) => (
        <a
          href={value || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#F16522] hover:underline text-sm truncate block"
        >
          {value ? new URL(value).hostname : '-'}
        </a>
      ),
    },
  ];

  // Actions par ligne
  const rowActions = [
    {
      label: 'Configurer',
      icon: Settings,
      onClick: (provider: ServiceProvider) => handleConfigureProvider(provider.id),
      disabled: (provider: ServiceProvider) => !provider.is_active,
    },
    {
      label: 'Tester connexion',
      icon: RefreshCw,
      onClick: (provider: ServiceProvider) => handleTestConnection(provider.id),
      disabled: (provider: ServiceProvider) => !provider.is_configured,
    },
  ];

  // Statistiques
  const stats = {
    total: providersData?.length || 0,
    active: providersData?.filter(p => p.is_active).length || 0,
    configured: providersData?.filter(p => p.is_configured).length || 0,
    operational: providersData?.filter(p => p.status === 'operational').length || 0,
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
          title="Fournisseurs de services"
          description="Gérez les intégrations avec les services tiers et surveillez leur statut"
          icon={Server}
          onRefresh={() => refetch()}
          refreshing={isLoading}
          showExport={true}
          onExport={handleExport}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Fournisseurs' },
          ]}
        />

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Total fournisseurs</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Actifs</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.active}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Configurés</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.configured}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Opérationnels</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.operational}</p>
          </div>
        </div>

        {/* Tableau */}
        <AdminTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          emptyMessage={isError ? 'Erreur lors du chargement des fournisseurs' : 'Aucun fournisseur trouvé'}
          pagination={{
            data: filteredData,
            total: filteredData.length,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          }}
          onPageChange={setPage}
          rowActions={rowActions}
          selectable={true}
          selectedKeys={selectedProviders}
          onSelectionChange={setSelectedProviders}
          showHeaderActions={true}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher par nom, description..."
        />
      </div>
    </div>
  );
}
