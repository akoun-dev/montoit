import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, Eye, EyeOff, Copy, Trash2, Plus, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/shared/ui/admin/AdminPageHeader';
import { AdminTable } from '@/shared/ui/admin/AdminTable';
import Button from '@/components/ui/Button';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { APIKey, ColumnConfig } from '@/types/admin';
import { getApiKeys, deleteApiKey, toggleApiKey } from '@/features/admin/services/adminExtended.api';

export default function ApiKeysPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  // États
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Requête pour les clés API
  const {
    data: apiKeysData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['api-keys', page, limit],
    queryFn: () => getApiKeys({ page, limit }),
    enabled: isAdmin,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await deleteApiKey(keyId);
    },
    onSuccess: () => {
      toast.success('Clé API supprimée avec succès');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    },
  });

  const toggleKeyMutation = useMutation({
    mutationFn: async ({ keyId, active }: { keyId: string; active: boolean }) => {
      await toggleApiKey(keyId, active);
    },
    onSuccess: ({ active }) => {
      toast.success(`Clé API ${active ? 'activée' : 'désactivée'} avec succès`);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la modification: ${error.message}`);
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
    if (!apiKeysData?.data) return;

    const headers = ['Nom', 'Service', 'Utilisations', 'Limite', 'Dernière utilisation', 'Expiration', 'Statut'];
    const rows = apiKeysData.data.map((key) => [
      key.name,
      key.service,
      key.usage_count?.toString() || '0',
      key.quota_limit?.toString() || 'N/A',
      key.last_used ? new Date(key.last_used).toLocaleDateString('fr-FR') : 'Jamais',
      key.expires_at ? new Date(key.expires_at).toLocaleDateString('fr-FR') : 'Jamais',
      key.is_active ? 'Active' : 'Inactive',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cles_api_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export CSV généré avec succès');
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Clé copiée dans le presse-papier');
  };

  const handleToggleKeyVisibility = (keyId: string) => {
    setShowKey(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const handleDeleteKey = (keyId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette clé API ? Cette action est irréversible.')) {
      deleteMutation.mutate(keyId);
    }
  };

  const handleToggleKeyStatus = (keyId: string, currentStatus: boolean) => {
    toggleKeyMutation.mutate({ keyId, active: !currentStatus });
  };

  const handleCreateKey = () => {
    toast.info('Création de clé API - À implémenter avec modal');
  };

  // Filtrer les données
  const filteredData = apiKeysData?.data?.filter((key) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        key.name.toLowerCase().includes(searchLower) ||
        key.key_preview.toLowerCase().includes(searchLower) ||
        (key.created_by && key.created_by.toLowerCase().includes(searchLower))
      );
    }
    return true;
  }) || [];

  // Colonnes du tableau
  const columns: ColumnConfig[] = [
    {
      key: 'name',
      title: 'Nom',
      dataIndex: 'name',
      width: '25%',
      render: (value: string, record: APIKey) => (
        <div className="flex flex-col">
          <span className="font-medium text-[#2C1810]">{value}</span>
          <span className="text-xs text-[#6B5A4E]">Créée par {record.created_by || 'Système'}</span>
        </div>
      ),
    },
    {
      key: 'key',
      title: 'Clé API',
      dataIndex: 'key_preview',
      width: '30%',
      render: (value: string, record: APIKey) => (
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm bg-[#FAF7F4] px-2 py-1 rounded">
            {showKey[record.id] ? value : '•'.repeat(20)}
          </code>
          <button
            onClick={() => handleToggleKeyVisibility(record.id)}
            className="p-1 hover:bg-[#EFEBE9] rounded"
            title={showKey[record.id] ? 'Masquer' : 'Afficher'}
          >
            {showKey[record.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => handleCopyKey(value)}
            className="p-1 hover:bg-[#EFEBE9] rounded"
            title="Copier"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      ),
    },
    {
      key: 'service',
      title: 'Service',
      dataIndex: 'service',
      width: '20%',
      render: (value: string) => (
        <span className="text-sm capitalize">{value.replace(/-/g, ' ')}</span>
      ),
    },
    {
      key: 'status',
      title: 'Statut',
      dataIndex: 'is_active',
      width: '15%',
      sortable: true,
      render: (value: boolean) => (
        <div className="flex items-center gap-2">
          {value ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-700">Active</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Inactive</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'expires',
      title: 'Expire le',
      dataIndex: 'expires_at',
      width: '15%',
      sortable: true,
      render: (value: string | null) => (
        <span className="text-sm">
          {value ? new Date(value).toLocaleDateString('fr-FR') : 'Jamais'}
        </span>
      ),
    },
  ];

  // Actions par ligne
  const rowActions = [
    {
      label: 'Copier',
      icon: Copy,
      onClick: (key: APIKey) => handleCopyKey(key.key_preview),
    },
    {
      label: (key: APIKey) => key.is_active ? 'Désactiver' : 'Activer',
      icon: (key: APIKey) => key.is_active ? XCircle : CheckCircle,
      onClick: (key: APIKey) => handleToggleKeyStatus(key.id, key.is_active),
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      onClick: (key: APIKey) => handleDeleteKey(key.id),
      danger: true,
    },
  ];

  // Statistiques
  const stats = {
    total: apiKeysData?.total || 0,
    active: apiKeysData?.data?.filter(k => k.is_active).length || 0,
    expired: apiKeysData?.data?.filter(k => k.expires_at && new Date(k.expires_at) < new Date()).length || 0,
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
          title="Gestion des clés API"
          description="Créez et gérez les clés API pour l'intégration avec des services tiers"
          icon={Key}
          onRefresh={() => refetch()}
          refreshing={isLoading}
          showExport={true}
          onExport={handleExport}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Clés API' },
          ]}
          actions={
            <Button
              onClick={handleCreateKey}
              className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white"
            >
              <Plus className="w-4 h-4" />
              Nouvelle clé API
            </Button>
          }
        />

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Total clés</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Clés actives</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.active}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Expirées</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.expired}</p>
          </div>
        </div>

        {/* Tableau */}
        <AdminTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          emptyMessage={isError ? 'Erreur lors du chargement des clés API' : 'Aucune clé API trouvée'}
          pagination={apiKeysData ? {
            data: filteredData,
            total: filteredData.length,
            page,
            limit,
            totalPages: Math.ceil(filteredData.length / limit),
            hasNextPage: page * limit < filteredData.length,
            hasPreviousPage: page > 1,
          } : undefined}
          onPageChange={setPage}
          rowActions={rowActions}
          selectable={true}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          showHeaderActions={true}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher par nom, clé, créateur..."
        />
      </div>
    </div>
  );
}
