import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  User,
  Calendar,
  Star,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { AdminPageHeader, AdminTable } from '@/shared/ui/admin';
import { Modal } from '@/shared/ui';
import {
  getTrustAgents,
  getTrustAgentStats,
  createTrustAgent,
  updateTrustAgent,
  deleteTrustAgent,
  activateTrustAgent,
  deactivateTrustAgent,
  type CreateTrustAgentInput,
  type UpdateTrustAgentInput,
} from '@/features/admin/services/adminExtended.api';
import type {
  TrustAgentProfile,
  TrustAgentStats,
  ColumnConfig,
  PaginatedResult,
} from '@/types/admin';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type AgentWithStats = TrustAgentProfile & { stats: TrustAgentStats | null };

export default function TrustAgentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentWithStats | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateTrustAgentInput>({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    certifications: [],
    specializations: [],
  });
  const [updateForm, setUpdateForm] = useState<UpdateTrustAgentInput>({});

  // Vérifier l'accès admin
  useEffect(() => {
    if (!rolesLoading && !isAdmin && user) {
      navigate('/admin/tableau-de-bord');
    }
  }, [isAdmin, user, navigate, rolesLoading]);

  // Récupérer les agents de confiance
  const {
    data: agents = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'trust-agents', page, limit],
    queryFn: async () => {
      const agents = await getTrustAgents();
      // Récupérer les stats pour chaque agent
      const agentsWithStats = await Promise.all(
        agents.map(async (agent) => {
          try {
            const stats = await getTrustAgentStats(agent.id);
            return { ...agent, stats };
          } catch {
            return { ...agent, stats: null };
          }
        })
      );
      return agentsWithStats;
    },
    enabled: isAdmin && !rolesLoading,
  });

  // Mutation pour créer un agent
  const createMutation = useMutation({
    mutationFn: (data: CreateTrustAgentInput) => createTrustAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trust-agents'] });
      setCreateModalOpen(false);
      setCreateForm({
        email: '',
        full_name: '',
        phone: '',
        password: '',
        certifications: [],
        specializations: [],
      });
      toast.success('Agent créé avec succès');
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });

  // Mutation pour mettre à jour un agent
  const updateMutation = useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: UpdateTrustAgentInput }) =>
      updateTrustAgent(agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trust-agents'] });
      setEditModalOpen(false);
      setSelectedAgent(null);
      setUpdateForm({});
      toast.success('Agent mis à jour avec succès');
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });

  // Mutation pour supprimer un agent
  const deleteMutation = useMutation({
    mutationFn: (agentId: string) => deleteTrustAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trust-agents'] });
      toast.success('Agent supprimé avec succès');
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression: " + error.message);
    },
  });

  // Mutation pour activer un agent
  const activateMutation = useMutation({
    mutationFn: (agentId: string) => activateTrustAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trust-agents'] });
      toast.success('Agent activé avec succès');
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de l'activation: " + error.message);
    },
  });

  // Mutation pour désactiver un agent
  const deactivateMutation = useMutation({
    mutationFn: (agentId: string) => deactivateTrustAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trust-agents'] });
      toast.success('Agent désactivé avec succès');
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la désactivation: " + error.message);
    },
  });

  // Filtrer les agents par recherche
  const filteredAgents = agents.filter((agent) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      agent.full_name?.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query) ||
      agent.phone?.toLowerCase().includes(query)
    );
  });

  // Pagination
  const paginatedData: PaginatedResult<AgentWithStats> = {
    data: filteredAgents.slice((page - 1) * limit, page * limit),
    total: filteredAgents.length,
    page,
    limit,
    totalPages: Math.ceil(filteredAgents.length / limit),
    hasNextPage: page * limit < filteredAgents.length,
    hasPreviousPage: page > 1,
  };

  // Actions sur les agents
  const handleViewAgent = (agent: AgentWithStats) => {
    navigate(`/admin/trust-agents/${agent.id}`);
  };

  const handleEditAgent = (agent: AgentWithStats) => {
    setSelectedAgent(agent);
    setUpdateForm({
      full_name: agent.full_name || undefined,
      phone: agent.phone || undefined,
      certifications: agent.certifications,
      specializations: agent.specializations,
    });
    setEditModalOpen(true);
  };

  const handleDeleteAgent = (agent: AgentWithStats) => {
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer l'agent ${agent.full_name || agent.email} ? Cette action désactivera son compte.`
      )
    ) {
      deleteMutation.mutate(agent.id);
    }
  };

  const handleToggleActive = (agent: AgentWithStats) => {
    if (agent.is_active) {
      deactivateMutation.mutate(agent.id);
    } else {
      activateMutation.mutate(agent.id);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast.success('Liste actualisée');
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.full_name || !createForm.password) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    createMutation.mutate(createForm);
  };

  const handleUpdateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    updateMutation.mutate({ agentId: selectedAgent.id, data: updateForm });
  };

  const handleExport = () => {
    const csvContent = [
      [
        'Nom',
        'Email',
        'Téléphone',
        'Missions assignées',
        'Missions complétées',
        'Statut',
        "Date d'inscription",
      ],
      ...filteredAgents.map((agent) => [
        agent.full_name || 'Non renseigné',
        agent.email,
        agent.phone || 'Non renseigné',
        agent.assigned_missions.toString(),
        agent.completed_missions.toString(),
        agent.is_active ? 'Actif' : 'Inactif',
        agent.created_at ? new Date(agent.created_at).toLocaleDateString('fr-FR') : 'N/A',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agents-confiance-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Export CSV généré');
  };

  // Configuration des colonnes
  const columns: ColumnConfig[] = [
    {
      key: 'agent',
      title: 'Agent',
      width: '25%',
      render: (_: unknown, agent: AgentWithStats) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            {agent.avatar_url ? (
              <img
                src={agent.avatar_url}
                alt={agent.full_name || ''}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <p className="font-medium text-[#2C1810]">{agent.full_name || 'Non renseigné'}</p>
            <p className="text-sm text-[#6B5A4E]">{agent.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      title: 'Contact',
      width: '15%',
      render: (_: unknown, agent: AgentWithStats) => (
        <div>
          <p className="text-sm text-[#2C1810]">{agent.phone || 'Non renseigné'}</p>
          <p className="text-xs text-[#6B5A4E]">
            {agent.certifications?.length || 0} certification(s)
          </p>
        </div>
      ),
    },
    {
      key: 'missions',
      title: 'Missions',
      width: '15%',
      align: 'center',
      render: (_: unknown, agent: AgentWithStats) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="text-center">
              <p className="text-lg font-bold text-[#2C1810]">{agent.assigned_missions}</p>
              <p className="text-xs text-[#6B5A4E]">Assignées</p>
            </div>
            <div className="h-6 w-px bg-[#EFEBE9]" />
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{agent.completed_missions}</p>
              <p className="text-xs text-[#6B5A4E]">Terminées</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'performance',
      title: 'Performance',
      width: '15%',
      align: 'center',
      render: (_: unknown, agent: AgentWithStats) => {
        const stats = agent.stats;
        if (!stats) return <span className="text-[#6B5A4E]">N/A</span>;

        const completionRate =
          stats.total_missions > 0
            ? Math.round((stats.completed_missions / stats.total_missions) * 100)
            : 0;

        return (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">{stats.average_rating.toFixed(1)}/5</span>
            </div>
            <p className="text-xs text-[#6B5A4E]">{completionRate}% de réussite</p>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Statut',
      width: '15%',
      align: 'center',
      render: (_: unknown, agent: AgentWithStats) => (
        <div className="flex flex-col items-center">
          <div
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${agent.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
          >
            {agent.is_active ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Actif
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                Inactif
              </>
            )}
          </div>
          <p className="text-xs text-[#6B5A4E] mt-1">
            {agent.created_at ? new Date(agent.created_at).toLocaleDateString('fr-FR') : 'N/A'}
          </p>
        </div>
      ),
    },
  ];

  // Actions sur les lignes
  const rowActions = [
    {
      label: 'Voir détails',
      icon: Eye,
      onClick: handleViewAgent,
    },
    {
      label: 'Modifier',
      icon: Edit,
      onClick: handleEditAgent,
    },
    {
      label: 'Activer/Désactiver',
      icon: CheckCircle,
      onClick: handleToggleActive,
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      onClick: handleDeleteAgent,
      danger: true,
    },
  ];

  // Statistiques globales
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.is_active).length;
  const totalMissions = agents.reduce((sum, a) => sum + a.assigned_missions, 0);
  const completedMissions = agents.reduce((sum, a) => sum + a.completed_missions, 0);
  const completionRate =
    totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;

  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#F16522] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="w-full">
        <AdminPageHeader
          title="Agents de confiance"
          description="Gérez les agents tiers de confiance certifiés ANSUT"
          icon={Shield}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showExport
          onExport={handleExport}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Agents de confiance' },
          ]}
          actions={
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-[#F16522] text-white font-medium rounded-xl hover:bg-[#d9571d] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter un agent
            </button>
          }
        />

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B5A4E]">Agents total</p>
                <p className="text-3xl font-bold text-[#2C1810] mt-2">{totalAgents}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-2 bg-[#EFEBE9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${(activeAgents / Math.max(totalAgents, 1)) * 100}%` }}
                />
              </div>
              <span className="text-sm text-[#6B5A4E]">{activeAgents} actifs</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B5A4E]">Missions totales</p>
                <p className="text-3xl font-bold text-[#2C1810] mt-2">{totalMissions}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-[#6B5A4E]">
                <span className="font-medium text-green-600">{completedMissions}</span> missions
                terminées
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B5A4E]">Taux de réussite</p>
                <p className="text-3xl font-bold text-[#2C1810] mt-2">{completionRate}%</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-[#6B5A4E]">
                Moyenne:{' '}
                {agents.length > 0
                  ? (
                      agents.reduce((sum, a) => sum + (a.average_rating || 0), 0) / agents.length
                    ).toFixed(1)
                  : '0.0'}
                /5
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6B5A4E]">Certifications</p>
                <p className="text-3xl font-bold text-[#2C1810] mt-2">
                  {agents.reduce((sum, a) => sum + (a.certifications?.length || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-[#6B5A4E]">
                {agents.filter((a) => (a.certifications?.length || 0) > 0).length} agents certifiés
              </p>
            </div>
          </div>
        </div>

        {/* Tableau des agents */}
        <div className="mb-8">
          <AdminTable
            columns={columns}
            data={paginatedData.data}
            loading={isLoading}
            emptyMessage="Aucun agent de confiance trouvé"
            rowKey="id"
            onRowClick={handleViewAgent}
            pagination={paginatedData}
            onPageChange={setPage}
            rowActions={rowActions}
            selectable
            selectedKeys={selectedAgents}
            onSelectionChange={setSelectedAgents}
            showHeaderActions
            onSearch={setSearchQuery}
            searchPlaceholder="Rechercher un agent par nom, email ou téléphone..."
          />
        </div>

        {/* Actions groupées */}
        {selectedAgents.length > 0 && (
          <div className="fixed bottom-6 right-6 bg-white rounded-2xl border border-[#EFEBE9] shadow-lg p-4 flex items-center gap-4">
            <span className="text-sm text-[#6B5A4E]">
              {selectedAgents.length} agent(s) sélectionné(s)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  selectedAgents.forEach((id) => activateMutation.mutate(id));
                  setSelectedAgents([]);
                }}
                className="px-3 py-1.5 bg-green-100 text-green-800 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors"
              >
                Activer
              </button>
              <button
                onClick={() => {
                  selectedAgents.forEach((id) => deactivateMutation.mutate(id));
                  setSelectedAgents([]);
                }}
                className="px-3 py-1.5 bg-red-100 text-red-800 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
              >
                Désactiver
              </button>
              <button
                onClick={() => setSelectedAgents([])}
                className="px-3 py-1.5 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de création */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Ajouter un agent de confiance"
      >
        <form onSubmit={handleCreateAgent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="w-full px-3 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              placeholder="agent@exemple.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              placeholder="Jean Dupont"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              placeholder="+225 01 02 03 04 05"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">
              Mot de passe temporaire <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className="w-full px-3 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              placeholder="Minimum 8 caractères"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-[#EFEBE9] rounded-xl hover:bg-[#FAF7F4]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-[#F16522] text-white rounded-xl hover:bg-[#d9571d] disabled:opacity-50 flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer l\'agent'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de modification */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Modifier l'agent de confiance"
      >
        {selectedAgent && (
          <form onSubmit={handleUpdateAgent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-1">Email</label>
              <input
                type="email"
                value={selectedAgent.email}
                disabled
                className="w-full px-3 py-2 border border-[#EFEBE9] rounded-xl bg-gray-100 text-gray-500"
              />
              <p className="text-xs text-[#6B5A4E] mt-1">L'email ne peut pas être modifié</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-1">
                Nom complet
              </label>
              <input
                type="text"
                value={updateForm.full_name ?? selectedAgent.full_name ?? ''}
                onChange={(e) => setUpdateForm({ ...updateForm, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-1">Téléphone</label>
              <input
                type="tel"
                value={updateForm.phone ?? selectedAgent.phone ?? ''}
                onChange={(e) => setUpdateForm({ ...updateForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setSelectedAgent(null);
                  setUpdateForm({});
                }}
                className="px-4 py-2 border border-[#EFEBE9] rounded-xl hover:bg-[#FAF7F4]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-[#F16522] text-white rounded-xl hover:bg-[#d9571d] disabled:opacity-50 flex items-center gap-2"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
