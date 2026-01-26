import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Eye, Edit, Filter, Calendar, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/shared/ui/admin/AdminPageHeader';
import { AdminTable } from '@/shared/ui/admin/AdminTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { getCEVMissions, reassignCEVMission } from '@/features/admin/services/adminExtended.api';
import { CEVMissionWithDetails, CEVMissionStatus, ColumnConfig } from '@/types/admin';

// Fonction pour formater la date
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Fonction pour formater la date et heure
const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function CEVManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  // États
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedMissions, setSelectedMissions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [reassignModal, setReassignModal] = useState<{ open: boolean; missionId?: string }>({
    open: false,
  });
  const [statusFilter, setStatusFilter] = useState<CEVMissionStatus | ''>('');

  // Requête pour les missions CEV
  const {
    data: missionsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['cev-missions', page, limit, statusFilter, search],
    queryFn: () => getCEVMissions({ page, limit }),
    enabled: isAdmin,
  });

  // Mutation pour réassigner une mission
  const reassignMutation = useMutation({
    mutationFn: ({ missionId, newAgentId }: { missionId: string; newAgentId: string }) =>
      reassignCEVMission(missionId, newAgentId),
    onSuccess: () => {
      toast.success('Mission réassignée avec succès');
      queryClient.invalidateQueries({ queryKey: ['cev-missions'] });
      setReassignModal({ open: false });
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la réassignation: ${error.message}`);
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

  const handleClearFilters = () => {
    setStatusFilter('');
    setSearch('');
    setPage(1);
  };

  const handleExport = () => {
    if (!missionsData?.data) return;

    const headers = [
      'ID',
      'Type',
      'Propriété',
      'Agent',
      'Statut',
      'Date planifiée',
      'Date complétion',
    ];
    const rows = missionsData.data.map((m: CEVMissionWithDetails) => [
      m.id,
      m.type,
      m.property_title || '-',
      m.agent_name || '-',
      m.status,
      formatDate(m.scheduled_date),
      formatDate(m.completed_date),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `missions_cev_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export CSV généré avec succès');
  };

  const handleViewMission = (mission: CEVMissionWithDetails) => {
    navigate(`/admin/cev-missions/${mission.id}`);
  };

  const handleEditMission = (mission: CEVMissionWithDetails) => {
    navigate(`/admin/cev-missions/edit/${mission.id}`);
  };

  const handleReassignMission = (missionId: string) => {
    setReassignModal({ open: true, missionId });
  };

  const confirmReassign = () => {
    if (reassignModal.missionId) {
      // Pour l'exemple, on utilise un agent fixe
      reassignMutation.mutate({ missionId: reassignModal.missionId, newAgentId: 'agent-id' });
    }
  };

  // Colonnes du tableau
  const columns: ColumnConfig[] = [
    {
      key: 'property',
      title: 'Propriété',
      dataIndex: 'property_title',
      width: '20%',
      render: (value: string | null, record: CEVMissionWithDetails) => (
        <div className="flex flex-col">
          <span className="font-medium">{value || 'Non spécifiée'}</span>
          <span className="text-xs text-[#6B5A4E]">{record.property_address || '-'}</span>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      dataIndex: 'type',
      width: '12%',
      sortable: true,
      render: (value: string) => {
        const typeLabels: Record<string, string> = {
          inspection: 'Inspection',
          verification: 'Vérification',
          maintenance: 'Maintenance',
          emergency: 'Urgence',
          routine: 'Routine',
        };
        return <span className="capitalize">{typeLabels[value] || value}</span>;
      },
    },
    {
      key: 'agent',
      title: 'Agent',
      dataIndex: 'agent_name',
      width: '15%',
      render: (value: string | null, record: CEVMissionWithDetails) => (
        <div className="flex flex-col">
          <span className="font-medium">{value || 'Non assigné'}</span>
          <span className="text-xs text-[#6B5A4E]">{record.agent_email || '-'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Statut',
      dataIndex: 'status',
      width: '12%',
      sortable: true,
      render: (value: CEVMissionStatus) => {
        const statusConfig: Record<CEVMissionStatus, { label: string; color: string }> = {
          pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
          assigned: { label: 'Assignée', color: 'bg-blue-100 text-blue-800' },
          in_progress: { label: 'En cours', color: 'bg-orange-100 text-orange-800' },
          completed: { label: 'Terminée', color: 'bg-green-100 text-green-800' },
          cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' },
        };
        const config = statusConfig[value] || { label: value, color: 'bg-gray-100 text-gray-800' };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'scheduled',
      title: 'Date planifiée',
      dataIndex: 'scheduled_date',
      width: '14%',
      sortable: true,
      render: (value: string | null) => <span className="text-sm">{formatDate(value)}</span>,
    },
    {
      key: 'completed',
      title: 'Date complétion',
      dataIndex: 'completed_date',
      width: '14%',
      sortable: true,
      render: (value: string | null) => (
        <span className="text-sm">{value ? formatDate(value) : '-'}</span>
      ),
    },
    {
      key: 'created',
      title: 'Créée le',
      dataIndex: 'created_at',
      width: '13%',
      sortable: true,
      render: (value: string | null) => <span className="text-sm">{formatDateTime(value)}</span>,
    },
  ];

  // Actions par ligne
  const rowActions = [
    {
      label: 'Voir détails',
      icon: Eye,
      onClick: handleViewMission,
    },
    {
      label: 'Éditer',
      icon: Edit,
      onClick: handleEditMission,
    },
    {
      label: 'Réassigner',
      icon: RefreshCw,
      onClick: (mission: CEVMissionWithDetails) => handleReassignMission(mission.id),
      disabled: (mission: CEVMissionWithDetails) =>
        mission.status === 'completed' || mission.status === 'cancelled',
    },
  ];

  // Filtrer les données localement
  const filteredData =
    missionsData?.data?.filter((mission: CEVMissionWithDetails) => {
      if (statusFilter && mission.status !== statusFilter) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          mission.property_title?.toLowerCase().includes(searchLower) ||
          mission.agent_name?.toLowerCase().includes(searchLower) ||
          mission.type?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    }) || [];

  // Statistiques
  const stats = {
    total: missionsData?.total || 0,
    pending:
      missionsData?.data?.filter((m: CEVMissionWithDetails) => m.status === 'pending').length || 0,
    inProgress:
      missionsData?.data?.filter((m: CEVMissionWithDetails) => m.status === 'in_progress').length ||
      0,
    completed:
      missionsData?.data?.filter((m: CEVMissionWithDetails) => m.status === 'completed').length ||
      0,
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
          title="Gestion des missions CEV"
          description="Administrez les missions de Contrôle, Évaluation et Vérification"
          icon={Users}
          onRefresh={() => refetch()}
          refreshing={isLoading}
          showExport={true}
          onExport={handleExport}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Missions CEV' },
          ]}
          actions={
            <Button
              onClick={() => navigate('/admin/cev-missions/create')}
              className="bg-[#F16522] hover:bg-[#d9571d] text-white"
            >
              Créer une mission
            </Button>
          }
        />

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Total missions</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">En attente</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">En cours</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.inProgress}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Terminées</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.completed}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EFEBE9] rounded-xl text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtres {statusFilter && '(1)'}
          </button>

          {showFilters && (
            <div className="mt-4 bg-white rounded-2xl border border-[#EFEBE9] p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as CEVMissionStatus | '')}
                  className="w-full rounded-lg border border-[#EFEBE9] bg-white px-4 py-3 text-[#2C1810] placeholder:text-[#A69B95] outline-none transition focus:border-[#F16522] focus:ring-2 focus:ring-[#F16522]/20"
                >
                  <option value="">Tous</option>
                  <option value="pending">En attente</option>
                  <option value="assigned">Assignée</option>
                  <option value="in_progress">En cours</option>
                  <option value="completed">Terminée</option>
                  <option value="cancelled">Annulée</option>
                </select>
              </div>
              <div className="md:col-span-3 flex justify-end gap-2">
                <Button
                  onClick={handleClearFilters}
                  className="border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] bg-white"
                >
                  Réinitialiser
                </Button>
                <Button
                  onClick={() => setShowFilters(false)}
                  className="bg-[#F16522] hover:bg-[#d9571d] text-white"
                >
                  Appliquer
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Tableau */}
        <AdminTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          emptyMessage={
            isError ? 'Erreur lors du chargement des missions' : 'Aucune mission trouvée'
          }
          pagination={
            missionsData
              ? {
                  data: filteredData,
                  total: filteredData.length,
                  page: page,
                  limit: limit,
                  totalPages: Math.ceil(filteredData.length / limit),
                  hasNextPage: page * limit < filteredData.length,
                  hasPreviousPage: page > 1,
                }
              : undefined
          }
          onPageChange={setPage}
          rowActions={rowActions}
          selectable={true}
          selectedKeys={selectedMissions}
          onSelectionChange={setSelectedMissions}
          showHeaderActions={true}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher par propriété, agent, type..."
        />

        {/* Actions en masse */}
        {selectedMissions.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl border border-[#EFEBE9] p-4 flex items-center justify-between">
            <p className="text-[#2C1810]">
              {selectedMissions.length} mission{selectedMissions.length > 1 ? 's' : ''} sélectionnée
              {selectedMissions.length > 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedMissions([])}
                className="border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] bg-white"
              >
                Annuler
              </Button>
              <Button
                onClick={() => {
                  toast.info('Fonctionnalité à implémenter');
                }}
                className="bg-[#F16522] hover:bg-[#d9571d] text-white"
              >
                Exporter sélection
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
