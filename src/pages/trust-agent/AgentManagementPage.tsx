/**
 * Page de gestion des agents de confiance
 *
 * Permet de:
 * - Voir la charge de travail des agents
 * - Créer de nouveaux agents de confiance
 * - Modifier les détails des agents
 * - Supprimer le rôle d'agent
 * - Réassigner les tâches
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  Scale,
  TrendingUp,
  ArrowRight,
  Search,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Shuffle,
  Plus,
  Edit,
  Trash2,
  Shield,
  UserPlus,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { TrustAgentPageHeader, KPICard, EmptyState } from '@/shared/ui/trust-agent';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/shared/ui/dialog';
import Input from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from '@/hooks/shared/useSafeToast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { agentAssignmentService, type AgentWorkload, type AvailableAgent } from '@/features/trust-agent/services/agentAssignment.service';
import { cn } from '@/shared/lib/utils';

type ReassignmentDialogState = {
  isOpen: boolean;
  type: 'mission' | 'dispute' | null;
  itemId: string;
  itemName: string;
  currentAgentId: string;
} | null;

type AutoReassignDialogState = {
  isOpen: boolean;
  agentId: string;
  agentName: string;
} | null;

type CreateAgentDialogState = {
  isOpen: boolean;
  mode: 'promote' | 'create';
};

type NewAgentForm = {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: 'manager' | 'agent';
};

type PromoteAgentForm = {
  email: string;
  role: 'manager' | 'agent';
};

type EditAgentDialogState = {
  isOpen: boolean;
  agentId: string;
  fullName: string;
  email: string;
} | null;

type DeleteAgentDialogState = {
  isOpen: boolean;
  agentId: string;
  agentName: string;
} | null;

export default function AgentManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentWorkload[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [reassignmentDialog, setReassignmentDialog] = useState<ReassignmentDialogState>(null);
  const [autoReassignDialog, setAutoReassignDialog] = useState<AutoReassignDialogState>(null);
  const [createAgentDialog, setCreateAgentDialog] = useState<CreateAgentDialogState>({ isOpen: false, mode: 'promote' });
  const [editAgentDialog, setEditAgentDialog] = useState<EditAgentDialogState>(null);
  const [deleteAgentDialog, setDeleteAgentDialog] = useState<DeleteAgentDialogState>(null);

  // Form states
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [promoteAgentForm, setPromoteAgentForm] = useState<PromoteAgentForm>({
    email: '',
    role: 'agent',
  });
  const [newAgentForm, setNewAgentForm] = useState<NewAgentForm>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'agent',
  });
  const [reassignmentReason, setReassignmentReason] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Available users to promote to trust agent
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; email: string; full_name: string }>>([]);

  useEffect(() => {
    loadAgentsWorkload();
    loadAvailableUsers();
  }, []);

  const loadAgentsWorkload = async () => {
    try {
      setLoading(true);
      const data = await agentAssignmentService.getAgentsWorkload();
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents workload:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      // Get users that are NOT trust agents yet
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .not('id', 'in', `(${agents.map(a => a.user_id).join(',')})`)
        .order('full_name', { ascending: true })
        .limit(100);

      if (!error && data) {
        setAvailableUsers(data);
      }
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  };

  const openCreateDialog = (mode: 'promote' | 'create' = 'promote') => {
    if (mode === 'promote') {
      loadAvailableUsers();
    }
    setCreateAgentDialog({ isOpen: true, mode });
    setNewAgentEmail('');
    setNewAgentForm({
      email: '',
      password: '',
      full_name: '',
      phone: '',
    });
  };

  const resetCreateDialog = () => {
    setCreateAgentDialog({ isOpen: false, mode: 'promote' });
    setNewAgentEmail('');
    setPromoteAgentForm({ email: '', role: 'agent' });
    setNewAgentForm({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      role: 'agent',
    });
  };

  const handleCreateAgent = async () => {
    try {
      setIsProcessing(true);

      if (createAgentDialog.mode === 'promote') {
        // Promote existing user
        if (!promoteAgentForm.email) {
          toast.error('Veuillez sélectionner un utilisateur');
          return;
        }

        // Get user ID from email
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', promoteAgentForm.email)
          .single();

        if (userError || !userData) {
          toast.error('Utilisateur introuvable');
          return;
        }

        // Check if user is already a trust agent
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', userData.id)
          .eq('role', 'trust_agent')
          .single();

        if (existingRole) {
          toast.error('Cet utilisateur est déjà un agent de confiance');
          return;
        }

        // Promote user to trust agent
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userData.id,
            role: 'trust_agent',
          });

        if (insertError) throw insertError;

        // Create trust agent profile with role
        const { error: profileError } = await supabase
          .from('trust_agent_profiles')
          .insert({
            user_id: userData.id,
            role: promoteAgentForm.role,
          });

        if (profileError) {
          console.warn('Failed to create trust agent profile:', profileError);
        }

        // Create notification for the new agent
        await supabase
          .from('trust_agent_notifications')
          .insert({
            user_id: userData.id,
            type: 'dossier_approved',
            title: `Vous êtes maintenant ${promoteAgentForm.role === 'manager' ? 'Manager' : 'Agent'} de Confiance`,
            message: `Félicitations ! Vous avez été promu au rôle d'${promoteAgentForm.role === 'manager' ? 'Manager' : 'Agent'} de Confiance ANSUT.`,
            priority: 'high',
          })
          .then(({ error }) => {
            if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
              console.warn('Failed to create notification:', error);
            }
          });

        toast.success(`${promoteAgentForm.role === 'manager' ? 'Manager' : 'Agent'} de confiance créé avec succès`);
      } else {
        // Create new user and promote to trust agent
        if (!newAgentForm.email || !newAgentForm.password || !newAgentForm.full_name) {
          toast.error('Veuillez remplir tous les champs requis');
          return;
        }

        // Store current session to restore it later
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = user;

        // Create auth user with user_type in metadata
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: newAgentForm.email,
          password: newAgentForm.password,
          options: {
            data: {
              full_name: newAgentForm.full_name,
              phone: newAgentForm.phone || '',
              user_type: 'trust_agent',
            },
          },
        });

        if (authError) {
          // Check if user already exists
          if (authError.message.includes('User already registered')) {
            toast.error('Un utilisateur avec cet email existe déjà');
          } else {
            throw authError;
          }
          return;
        }

        if (!authData.user) {
          toast.error('Erreur lors de la création du compte');
          return;
        }

        // Wait for profile to be created by trigger with correct user_type
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verify and update the profile if needed (fallback)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', authData.user.id)
          .single();

        if (profileData?.user_type !== 'trust_agent') {
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({
              user_type: 'trust_agent',
              full_name: newAgentForm.full_name,
              phone: newAgentForm.phone || null,
            })
            .eq('id', authData.user.id);

          if (updateProfileError) {
            console.warn('Failed to update profile user_type:', updateProfileError);
          }
        }

        // Add trust_agent role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'trust_agent',
          });

        if (roleError) {
          console.warn('Failed to assign trust_agent role:', roleError);
        }

        // Create trust agent profile with role
        const { error: profileError } = await supabase
          .from('trust_agent_profiles')
          .insert({
            user_id: authData.user.id,
            role: newAgentForm.role,
          });

        if (profileError) {
          console.warn('Failed to create trust agent profile:', profileError);
        }

        // Sign back in with the original user to restore session
        if (session?.access_token && currentUser) {
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        }

        toast.success(`${newAgentForm.role === 'manager' ? 'Manager' : 'Agent'} de confiance créé avec succès. Un email de confirmation a été envoyé.`);
      }

      resetCreateDialog();
      loadAgentsWorkload();
    } catch (error: unknown) {
      console.error('Error creating agent:', error);
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? (error.message as string)
        : 'Erreur lors de la création de l\'agent';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditDialog = (agent: AgentWorkload) => {
    setEditAgentDialog({
      isOpen: true,
      agentId: agent.user_id,
      fullName: agent.full_name,
      email: agent.email,
    });
  };

  const handleEditAgent = async () => {
    if (!editAgentDialog) return;

    try {
      setIsProcessing(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editAgentDialog.fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editAgentDialog.agentId);

      if (error) throw error;

      toast.success('Agent mis à jour avec succès');
      setEditAgentDialog(null);
      loadAgentsWorkload();
    } catch (error: unknown) {
      console.error('Error updating agent:', error);
      toast.error('Erreur lors de la mise à jour de l\'agent');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDeleteDialog = (agent: AgentWorkload) => {
    setDeleteAgentDialog({
      isOpen: true,
      agentId: agent.user_id,
      agentName: agent.full_name,
    });
  };

  const handleDeleteAgent = async () => {
    if (!deleteAgentDialog || deleteAgentDialog.agentId === user?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre rôle');
      return;
    }

    try {
      setIsProcessing(true);

      // Remove trust_agent role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', deleteAgentDialog.agentId)
        .eq('role', 'trust_agent');

      if (deleteError) throw deleteError;

      toast.success('Rôle d\'agent de confiance supprimé');
      setDeleteAgentDialog(null);
      loadAgentsWorkload();
    } catch (error: unknown) {
      console.error('Error deleting agent:', error);
      toast.error('Erreur lors de la suppression du rôle');
    } finally {
      setIsProcessing(false);
    }
  };

  const openAutoReassignDialog = (agentId: string, agentName: string) => {
    setAutoReassignDialog({
      isOpen: true,
      agentId,
      agentName,
    });
    setReassignmentReason('');
  };

  const handleReassign = async () => {
    if (!reassignmentDialog || !selectedAgentId) return;

    try {
      setIsProcessing(true);

      if (reassignmentDialog.type === 'mission') {
        await agentAssignmentService.reassignMission(
          reassignmentDialog.itemId,
          selectedAgentId,
          reassignmentReason
        );
        toast.success('Mission réassignée avec succès');
      } else {
        await agentAssignmentService.reassignDispute(
          reassignmentDialog.itemId,
          selectedAgentId,
          reassignmentReason
        );
        toast.success('Litige réassigné avec succès');
      }

      setReassignmentDialog(null);
      loadAgentsWorkload();
    } catch (error) {
      console.error('Error reassigning:', error);
      toast.error('Erreur lors de la réassignment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoReassign = async () => {
    if (!autoReassignDialog) return;

    try {
      setIsProcessing(true);

      const result = await agentAssignmentService.autoReassignAgentWorkload(
        autoReassignDialog.agentId,
        reassignmentReason || 'Agent indisponible'
      );

      toast.success(
        `${result.missions} missions et ${result.disputes} litiges ont été réassignés`
      );

      setAutoReassignDialog(null);
      loadAgentsWorkload();
    } catch (error) {
      console.error('Error auto reassigning:', error);
      toast.error('Erreur lors de la réassignment automatique');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter agents by search query
  const filteredAgents = agents.filter(
    (agent) =>
      agent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate overall stats
  const stats = {
    totalAgents: agents.length,
    totalActiveMissions: agents.reduce((sum, a) => sum + a.active_missions, 0),
    totalActiveDisputes: agents.reduce((sum, a) => sum + a.active_disputes, 0),
    avgCompletionRate:
      agents.length > 0
        ? Math.round(agents.reduce((sum, a) => sum + a.completion_rate, 0) / agents.length)
        : 0,
  };

  // KPIs
  const kpiData = [
    { title: 'Total Agents', value: stats.totalAgents, icon: <Users />, variant: 'default' as const },
    { title: 'Missions en cours', value: stats.totalActiveMissions, icon: <Briefcase />, variant: 'info' as const },
    { title: 'Litiges en cours', value: stats.totalActiveDisputes, icon: <Scale />, variant: 'warning' as const },
    { title: 'Taux complétion moyen', value: `${stats.avgCompletionRate}%`, icon: <TrendingUp />, variant: 'success' as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <TrustAgentPageHeader
        title="Gestion des Agents"
        subtitle="Gérez votre équipe d'agents de confiance"
        badges={[
          { label: `${stats.totalAgents} agents`, variant: 'default' as any },
          { label: `${stats.totalActiveMissions + stats.totalActiveDisputes} tâches`, variant: 'info' as any },
        ]}
        actions={[
          {
            label: 'Nouvel Agent',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => openCreateDialog('create'),
            variant: 'primary',
          },
          {
            label: 'Promouvoir',
            icon: <UserPlus className="h-4 w-4" />,
            onClick: () => openCreateDialog('promote'),
            variant: 'outline',
          },
          {
            label: 'Actualiser',
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: () => {
              loadAgentsWorkload();
              loadAvailableUsers();
              toast.success('Liste actualisée');
            },
            variant: 'ghost',
          },
        ]}
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiData.map((kpi, index) => (
            <KPICard key={index} {...kpi} />
          ))}
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un agent par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Agents List */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={searchQuery ? 'Aucun agent trouvé' : 'Aucun agent de confiance'}
            description={
              searchQuery
                ? 'Essayez d\'ajuster votre recherche'
                : 'Commencez par ajouter un agent de confiance à votre équipe'
            }
            action={
              !searchQuery
                ? {
                    label: 'Ajouter un agent',
                    onClick: openCreateDialog,
                    icon: <Plus className="h-4 w-4" />,
                  }
                : undefined
            }
            variant="filter"
          />
        ) : (
          <div className="grid gap-4">
            {filteredAgents.map((agent) => {
              const totalWorkload = agent.active_missions + agent.active_disputes;
              const workloadLevel =
                totalWorkload >= 15 ? 'high' : totalWorkload >= 8 ? 'medium' : 'low';

              return (
                <Card
                  key={agent.user_id}
                  className={cn(
                    'transition-all duration-200',
                    workloadLevel === 'high' && 'border-l-4 border-l-red-500'
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                          <UserCheck className="h-6 w-6" />
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{agent.full_name}</h3>
                            <Badge
                              className={cn(
                                'text-xs',
                                workloadLevel === 'high'
                                  ? 'bg-red-100 text-red-700 border-0'
                                  : workloadLevel === 'medium'
                                    ? 'bg-yellow-100 text-yellow-700 border-0'
                                    : 'bg-green-100 text-green-700 border-0'
                              )}
                            >
                              {workloadLevel === 'high' ? 'Charge élevée' : workloadLevel === 'medium' ? 'Charge moyenne' : 'Disponible'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mb-3">{agent.email}</p>

                          {/* Workload Stats */}
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-400">Missions actives</p>
                              <p className="text-lg font-semibold text-gray-900">{agent.active_missions}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Litiges actifs</p>
                              <p className="text-lg font-semibold text-gray-900">{agent.active_disputes}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Complétées</p>
                              <p className="text-lg font-semibold text-green-600">
                                {agent.completed_missions + agent.resolved_disputes}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Taux de complétion</p>
                              <p className="text-lg font-semibold text-primary-600">{agent.completion_rate}%</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => navigate(`/trust-agent/agents/${agent.user_id}`)}
                        >
                          Voir détails
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => openEditDialog(agent)}
                          title="Modifier"
                          className="p-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => openAutoReassignDialog(agent.user_id, agent.full_name)}
                          disabled={totalWorkload === 0}
                          title="Réassigner toutes les tâches"
                          className="p-2"
                        >
                          <Shuffle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => openDeleteDialog(agent)}
                          disabled={agent.user_id === user?.id}
                          title="Supprimer le rôle"
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Agent Dialog */}
      <Dialog open={createAgentDialog.isOpen} onOpenChange={(open) => {
        if (!open) resetCreateDialog();
        else setCreateAgentDialog({ ...createAgentDialog, isOpen: open });
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-6 w-6 text-primary-500" />
              {createAgentDialog.mode === 'create' ? 'Créer un Agent de Confiance' : 'Promouvoir un Agent de Confiance'}
            </DialogTitle>
            <DialogDescription className="text-base">
              {createAgentDialog.mode === 'create'
                ? 'Créez un compte utilisateur avec le rôle Agent de Confiance ANSUT'
                : 'Attribuez le rôle d\'Agent de Confiance à un utilisateur existant'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl mb-6">
            <button
              onClick={() => setCreateAgentDialog({ ...createAgentDialog, mode: 'create' })}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                createAgentDialog.mode === 'create'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Créer un nouveau compte
            </button>
            <button
              onClick={() => setCreateAgentDialog({ ...createAgentDialog, mode: 'promote' })}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                createAgentDialog.mode === 'promote'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Promouvoir un existant
            </button>
          </div>

          <div className="space-y-5 py-4">
            {createAgentDialog.mode === 'create' ? (
              <>
                {/* Create New User Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      type="email"
                      value={newAgentForm.email}
                      onChange={(e) => setNewAgentForm({ ...newAgentForm, email: e.target.value })}
                      placeholder="agent@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Mot de passe *</label>
                    <Input
                      type="password"
                      value={newAgentForm.password}
                      onChange={(e) => setNewAgentForm({ ...newAgentForm, password: e.target.value })}
                      placeholder="Min. 8 caractères"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nom complet *</label>
                    <Input
                      value={newAgentForm.full_name}
                      onChange={(e) => setNewAgentForm({ ...newAgentForm, full_name: e.target.value })}
                      placeholder="Jean Kouassi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Téléphone</label>
                    <Input
                      value={newAgentForm.phone}
                      onChange={(e) => setNewAgentForm({ ...newAgentForm, phone: e.target.value })}
                      placeholder="+225 01 02 03 04 05"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium mb-3">Rôle dans l'équipe *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewAgentForm({ ...newAgentForm, role: 'manager' })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        newAgentForm.role === 'manager'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          newAgentForm.role === 'manager' ? 'border-primary-500' : 'border-gray-300'
                        }`}>
                          {newAgentForm.role === 'manager' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Manager</p>
                          <p className="text-xs text-gray-500">Voit toutes les missions et gère l'équipe</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAgentForm({ ...newAgentForm, role: 'agent' })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        newAgentForm.role === 'agent'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          newAgentForm.role === 'agent' ? 'border-primary-500' : 'border-gray-300'
                        }`}>
                          {newAgentForm.role === 'agent' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Agent</p>
                          <p className="text-xs text-gray-500">Voit uniquement ses missions assignées</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Capabilities Info */}
                <div className="bg-gradient-to-r from-primary-50 to-primary-50/30 rounded-xl p-5 border border-primary-100">
                  <div className="flex items-start gap-4">
                    <Shield className="h-8 w-8 text-primary-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-primary-900 mb-2">
                        {newAgentForm.role === 'manager' ? 'Rôle de Manager' : 'Rôle d\'Agent'}
                      </h4>
                      <p className="text-sm text-primary-700 mb-3">
                        {newAgentForm.role === 'manager'
                          ? 'Le manager aura accès à toutes les fonctionnalités de gestion :'
                          : 'L\'agent aura un accès limité à ses propres missions :'
                        }
                      </p>
                      <ul className="space-y-2">
                        {newAgentForm.role === 'manager' ? (
                          <>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Voir toutes les missions de l'équipe
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Gérer tous les agents de terrain
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Créer et modifier toutes les missions
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Résolution des litiges
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Validation des dossiers
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Gestion des autres agents de confiance
                            </li>
                          </>
                        ) : (
                          <>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Voir uniquement ses missions assignées
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Gérer ses propres agents de terrain
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Créer des missions pour ses agents
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Modifier ses missions
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Voir les dossiers assignés
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Account Info */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Compte créé automatiquement</p>
                      <p className="mt-1">
                        Un email de confirmation sera envoyé à <strong>{newAgentForm.email || 'l\'adresse email'}</strong>.
                        L'utilisateur sera créé avec le rôle <strong>{newAgentForm.role === 'manager' ? 'Manager' : 'Agent'}</strong> et pourra se connecter immédiatement.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Promote Existing User */
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Sélectionner un utilisateur</label>
                  <select
                    value={promoteAgentForm.email}
                    onChange={(e) => setPromoteAgentForm({ ...promoteAgentForm, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">-- Choisir un utilisateur à promouvoir --</option>
                    {availableUsers.length === 0 ? (
                      <option disabled>Aucun utilisateur disponible</option>
                    ) : (
                      availableUsers.map((user) => (
                        <option key={user.id} value={user.email}>
                          {user.full_name || user.email}
                        </option>
                      ))
                    )}
                  </select>
                  {availableUsers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Tous les utilisateurs sont déjà des agents de confiance
                    </p>
                  )}
                </div>

                {/* Selected User Preview */}
                {promoteAgentForm.email && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-lg">
                        {availableUsers.find(u => u.email === promoteAgentForm.email)?.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {availableUsers.find(u => u.email === promoteAgentForm.email)?.full_name || 'Utilisateur'}
                        </p>
                        <p className="text-sm text-gray-500">{promoteAgentForm.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Role Selection */}
                {promoteAgentForm.email && (
                  <div>
                    <label className="block text-sm font-medium mb-3">Rôle dans l'équipe *</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPromoteAgentForm({ ...promoteAgentForm, role: 'manager' })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          promoteAgentForm.role === 'manager'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            promoteAgentForm.role === 'manager' ? 'border-primary-500' : 'border-gray-300'
                          }`}>
                            {promoteAgentForm.role === 'manager' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Manager</p>
                            <p className="text-xs text-gray-500">Voit toutes les missions et gère l'équipe</p>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromoteAgentForm({ ...promoteAgentForm, role: 'agent' })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          promoteAgentForm.role === 'agent'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            promoteAgentForm.role === 'agent' ? 'border-primary-500' : 'border-gray-300'
                          }`}>
                            {promoteAgentForm.role === 'agent' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Agent</p>
                            <p className="text-xs text-gray-500">Voit uniquement ses missions assignées</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Capabilities Info */}
                <div className="bg-gradient-to-r from-primary-50 to-primary-50/30 rounded-xl p-5 border border-primary-100">
                  <div className="flex items-start gap-4">
                    <Shield className="h-8 w-8 text-primary-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-primary-900 mb-2">
                        {promoteAgentForm.role === 'manager' ? 'Rôle de Manager' : 'Rôle d\'Agent'}
                      </h4>
                      <p className="text-sm text-primary-700 mb-3">
                        {promoteAgentForm.role === 'manager'
                          ? 'L\'utilisateur recevra les permissions complètes de gestion :'
                          : 'L\'utilisateur recevra un accès limité à ses propres missions :'
                        }
                      </p>
                      <ul className="space-y-2">
                        {promoteAgentForm.role === 'manager' ? (
                          <>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Voir toutes les missions de l'équipe
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Gérer tous les agents de terrain
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Créer et modifier toutes les missions
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Résolution des litiges
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Validation des dossiers
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Gestion des autres agents de confiance
                            </li>
                          </>
                        ) : (
                          <>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Voir uniquement ses missions assignées
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Gérer ses propres agents de terrain
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Créer des missions pour ses agents
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Modifier ses missions
                            </li>
                            <li className="flex items-center gap-2 text-sm text-primary-700">
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                              Voir les dossiers assignés
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Notification Info */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Notification automatique</p>
                      <p className="mt-1">
                        Un email sera envoyé à l'utilisateur pour l'informer de sa nouvelle nomination en tant que {promoteAgentForm.role === 'manager' ? 'Manager' : 'Agent'} de Confiance ANSUT.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={resetCreateDialog} disabled={isProcessing} className="min-w-[100px]">
              Annuler
            </Button>
            <Button
              onClick={handleCreateAgent}
              disabled={isProcessing || (createAgentDialog.mode === 'create' && (!newAgentForm.email || !newAgentForm.password || !newAgentForm.full_name)) || (createAgentDialog.mode === 'promote' && !promoteAgentForm.email)}
              loading={isProcessing}
              className="min-w-[150px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  {createAgentDialog.mode === 'create' ? (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Créer {newAgentForm.role === 'manager' ? 'le manager' : 'l\'agent'}
                    </>
                  ) : (
                    <>
                      <Briefcase className="h-4 w-4 mr-2" />
                      Promouvoir en {promoteAgentForm.role === 'manager' ? 'manager' : 'agent'}
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={editAgentDialog?.isOpen || false} onOpenChange={() => setEditAgentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'Agent</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nom complet</label>
              <Input
                value={editAgentDialog?.fullName || ''}
                onChange={(e) => setEditAgentDialog(prev => prev ? { ...prev, fullName: e.target.value } : null)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                value={editAgentDialog?.email || ''}
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAgentDialog(null)} disabled={isProcessing}>
              Annuler
            </Button>
            <Button
              onClick={handleEditAgent}
              disabled={isProcessing}
              loading={isProcessing}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Agent Dialog */}
      <Dialog open={deleteAgentDialog?.isOpen || false} onOpenChange={() => setDeleteAgentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le rôle d'Agent de Confiance</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Attention</p>
                <p className="text-sm text-red-700 mt-1">
                  Vous êtes sur le point de supprimer le rôle d'Agent de Confiance à <strong>{deleteAgentDialog?.agentName}</strong>.
                  Cette action révoquera tous ses accès aux fonctionnalités d'agent de confiance.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAgentDialog(null)} disabled={isProcessing}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAgent}
              disabled={isProcessing}
              loading={isProcessing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer le rôle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassignment Dialog */}
      <Dialog open={!!reassignmentDialog} onOpenChange={() => setReassignmentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Réassigner {reassignmentDialog?.type === 'mission' ? 'la mission' : 'le litige'}
            </DialogTitle>
            <DialogDescription>
              Sélectionnez un agent pour reprendre: <strong>{reassignmentDialog?.itemName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Reason */}
            <div>
              <label className="text-sm font-medium">Raison de la réassignment (optionnel)</label>
              <Textarea
                value={reassignmentReason}
                onChange={(e) => setReassignmentReason(e.target.value)}
                placeholder="Expliquez pourquoi cette tâche est réassignée..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Agent Selection */}
            <div>
              <label className="text-sm font-medium">Sélectionner un agent</label>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {availableAgents.map((agent) => {
                  const isSelected = selectedAgentId === agent.id;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold">
                          {agent.full_name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm">{agent.full_name}</p>
                          <p className="text-xs text-gray-500">{agent.workload.total} tâches en cours</p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          agent.availability === 'high'
                            ? 'bg-green-100 text-green-700 border-0'
                            : agent.availability === 'medium'
                              ? 'bg-yellow-100 text-yellow-700 border-0'
                              : 'bg-red-100 text-red-700 border-0'
                        )}
                      >
                        {agent.availability === 'high' ? 'Disponible' : agent.availability === 'medium' ? 'Modérément disponible' : 'Peu disponible'}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignmentDialog(null)} disabled={isProcessing}>
              Annuler
            </Button>
            <Button
              onClick={handleReassign}
              disabled={!selectedAgentId || isProcessing}
              loading={isProcessing}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Réassigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto Reassign Dialog */}
      <Dialog open={!!autoReassignDialog} onOpenChange={() => setAutoReassignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réassigner toutes les tâches</DialogTitle>
            <DialogDescription>
              Réassigner toutes les missions et litiges de <strong>{autoReassignDialog?.agentName}</strong> aux autres agents disponibles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Attention</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Cette action va réassigner toutes les tâches en cours de cet agent aux autres agents disponibles.
                  Assurez-vous d'avoir suffisamment d'agents disponibles.
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Raison de la réassignment</label>
              <Textarea
                value={reassignmentReason}
                onChange={(e) => setReassignmentReason(e.target.value)}
                placeholder="Ex: Agent en congé, agent indisponible, etc."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoReassignDialog(null)} disabled={isProcessing}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleAutoReassign}
              disabled={isProcessing}
              loading={isProcessing}
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Réassigner tout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
