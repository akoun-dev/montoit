import { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Search,
  UserPlus,
  MoreVertical,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  Target,
  Award,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Json } from '@/integrations/supabase/types';

interface Agent {
  id: string;
  user_id: string | null;
  role: string | null;
  status: string | null;
  hire_date: string;
  commission_split: number | null;
  target_monthly: number | null;
  phone: string | null;
  email: string | null;
  specialties: string[];
  bio: string | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

function parseJsonArray(data: Json | null): string[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

export default function TeamManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    totalRevenue: 0,
  });

  // Form state for adding agent
  const [newAgent, setNewAgent] = useState({
    email: '',
    phone: '',
    role: 'agent',
    commission_split: 50,
    target_monthly: 0,
    bio: '',
  });

  useEffect(() => {
    loadAgency();
  }, [user]);

  const loadAgency = async () => {
    if (!user) return;

    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (agency) {
      setAgencyId(agency.id);
      loadAgents(agency.id);
    } else {
      setLoading(false);
    }
  };

  const loadAgents = async (agencyIdParam: string) => {
    try {
      const { data, error } = await supabase
        .from('agency_agents')
        .select(
          `
          *,
          profiles:user_id(full_name, avatar_url)
        `
        )
        .eq('agency_id', agencyIdParam)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const agentsData = (data || []).map((agent) => ({
        ...agent,
        specialties: parseJsonArray(agent.specialties),
      }));

      setAgents(agentsData);

      // Calculate stats
      setStats({
        total: agentsData.length,
        active: agentsData.filter((a) => a.status === 'active').length,
        pending: agentsData.filter((a) => a.status === 'pending').length,
        totalRevenue: 0,
      });
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async () => {
    if (!agencyId) return;

    try {
      const { error } = await supabase.from('agency_agents').insert({
        agency_id: agencyId,
        email: newAgent.email,
        phone: newAgent.phone,
        role: newAgent.role,
        commission_split: newAgent.commission_split,
        target_monthly: newAgent.target_monthly,
        bio: newAgent.bio,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Agent ajouté avec succès');
      setShowAddModal(false);
      setNewAgent({
        email: '',
        phone: '',
        role: 'agent',
        commission_split: 50,
        target_monthly: 0,
        bio: '',
      });
      loadAgents(agencyId);
    } catch (error) {
      console.error('Error adding agent:', error);
      toast.error("Erreur lors de l'ajout de l'agent");
    }
  };

  const handleUpdateStatus = async (agentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('agency_agents')
        .update({ status: newStatus })
        .eq('id', agentId);

      if (error) throw error;

      toast.success('Statut mis à jour');
      if (agencyId) loadAgents(agencyId);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
      terminated: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      active: 'Actif',
      pending: 'En attente',
      suspended: 'Suspendu',
      terminated: 'Terminé',
    };
    const s = status || 'pending';
    return <Badge className={styles[s] || styles['pending']}>{labels[s] || s}</Badge>;
  };

  const getRoleBadge = (role: string | null) => {
    const styles: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      agent: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      admin: 'Admin',
      manager: 'Manager',
      agent: 'Agent',
    };
    const r = role || 'agent';
    return (
      <Badge variant="outline" className={styles[r] || styles['agent']}>
        {labels[r] || r}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2C1810]">Gestion de l'équipe</h1>
            <p className="text-[#2C1810]/60 mt-1">Gérez les agents de votre agence</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-[#F16522] hover:bg-[#D14E12]">
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter un agent
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">{stats.total}</p>
                  <p className="text-sm text-[#2C1810]/60">Total agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">{stats.active}</p>
                  <p className="text-sm text-[#2C1810]/60">Actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Target className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">{stats.pending}</p>
                  <p className="text-sm text-[#2C1810]/60">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F16522]/10">
                  <TrendingUp className="w-5 h-5 text-[#F16522]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2C1810]">0</p>
                  <p className="text-sm text-[#2C1810]/60">Revenus ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C1810]/40" />
            <Input
              placeholder="Rechercher un agent..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 border-[#EFEBE9]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 border-[#EFEBE9]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="suspended">Suspendus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Agents Grid */}
        {filteredAgents.length === 0 ? (
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-[#2C1810]/20 mb-4" />
              <h3 className="text-lg font-semibold text-[#2C1810] mb-2">Aucun agent</h3>
              <p className="text-[#2C1810]/60 mb-4">
                Commencez par ajouter des agents à votre équipe
              </p>
              <Button onClick={() => setShowAddModal(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <Card
                key={agent.id}
                className="bg-white border-[#EFEBE9] hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#F16522]/10 flex items-center justify-center">
                        {agent.profiles?.avatar_url ? (
                          <img
                            src={agent.profiles.avatar_url}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-[#F16522]" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#2C1810]">
                          {agent.profiles?.full_name || agent.email || 'Agent'}
                        </h3>
                        <div className="flex gap-2 mt-1">
                          {getStatusBadge(agent.status)}
                          {getRoleBadge(agent.role)}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-md hover:bg-[#FAF7F4] transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/dashboard/agence/agent/${agent.id}`)}
                        >
                          Voir le profil
                        </DropdownMenuItem>
                        {agent.status !== 'active' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(agent.id, 'active')}>
                            Activer
                          </DropdownMenuItem>
                        )}
                        {agent.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(agent.id, 'suspended')}
                          >
                            Suspendre
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3 text-sm">
                    {agent.email && (
                      <div className="flex items-center gap-2 text-[#2C1810]/70">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{agent.email}</span>
                      </div>
                    )}
                    {agent.phone && (
                      <div className="flex items-center gap-2 text-[#2C1810]/70">
                        <Phone className="w-4 h-4" />
                        <span>{agent.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[#2C1810]/70">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Depuis {format(new Date(agent.hire_date), 'MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#EFEBE9] flex justify-between text-sm">
                    <div>
                      <p className="text-[#2C1810]/60">Commission</p>
                      <p className="font-semibold text-[#2C1810]">{agent.commission_split ?? 0}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#2C1810]/60">Objectif mensuel</p>
                      <p className="font-semibold text-[#2C1810]">
                        {(agent.target_monthly ?? 0).toLocaleString()} FCFA
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Agent Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newAgent.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNewAgent({ ...newAgent, email: e.target.value })
                  }
                  placeholder="agent@example.com"
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={newAgent.phone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNewAgent({ ...newAgent, phone: e.target.value })
                  }
                  placeholder="+225 07 XX XX XX XX"
                />
              </div>
              <div>
                <Label>Rôle</Label>
                <Select
                  value={newAgent.role}
                  onValueChange={(v) => setNewAgent({ ...newAgent, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Commission (%)</Label>
                  <Input
                    type="number"
                    value={newAgent.commission_split}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNewAgent({ ...newAgent, commission_split: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Objectif mensuel</Label>
                  <Input
                    type="number"
                    value={newAgent.target_monthly}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNewAgent({ ...newAgent, target_monthly: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Bio (optionnel)</Label>
                <Textarea
                  value={newAgent.bio}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setNewAgent({ ...newAgent, bio: e.target.value })
                  }
                  placeholder="Présentation de l'agent..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddAgent} className="bg-[#F16522] hover:bg-[#D14E12]">
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
