import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  FileText,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Download,
  Eye,
  UserPlus,
  Loader2,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/Button';
import { ROLES } from '@/shared/constants/roles';

interface Dispute {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dispute_type: string | null;
  created_by: string;
  assigned_to: string | null;
  escalated_to: string | null;
  contract_id: string | null;
  property_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  creator?: {
    full_name: string | null;
    email: string | null;
  };
  assignee?: {
    full_name: string | null;
    email: string | null;
  };
  contract?: {
    contract_number: string | null;
    property?: {
      title: string | null;
      city: string | null;
    };
  };
  _count?: {
    messages: number;
  };
}

type FilterStatus = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
type FilterPriority = 'all' | 'low' | 'medium' | 'high' | 'urgent';

export default function DisputesManagementPage() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [admins, setAdmins] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [stats, setStats] = useState({
    open: 0,
    in_progress: 0,
    resolved: 0,
    escalated: 0,
    total: 0,
    avgResolutionTime: 0,
  });

  useEffect(() => {
    loadDisputes();
    loadStats();
    loadAdmins();
  }, [filterStatus, filterPriority]);

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_type', 'admin');

      if (!error && data) {
        setAdmins(data);
      }
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('status, created_at, resolved_at');

      if (!error && data) {
        const open = data.filter((d) => d.status === 'open').length;
        const inProgress = data.filter((d) => d.status === 'in_progress').length;
        const resolved = data.filter((d) => d.status === 'resolved' || d.status === 'closed').length;
        const escalated = data.filter((d) => d.status === 'escalated').length;

        // Calculate average resolution time (in days)
        const resolvedDisputes = data.filter((d) => d.resolved_at);
        let avgTime = 0;
        if (resolvedDisputes.length > 0) {
          const totalDays = resolvedDisputes.reduce((sum, d) => {
            const created = new Date(d.created_at);
            const resolved = new Date(d.resolved_at!);
            return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          }, 0);
          avgTime = Math.round(totalDays / resolvedDisputes.length);
        }

        setStats({
          open,
          in_progress,
          resolved,
          escalated,
          total: data.length,
          avgResolutionTime: avgTime,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadDisputes = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('disputes')
        .select(`
          *,
          creator:profiles!disputes_created_by_fkey(full_name, email),
          assignee:profiles!disputes_assigned_to_fkey(full_name, email),
          contract:lease_contracts(
            contract_number,
            property:properties(title, city)
          )
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterPriority !== 'all') {
        query = query.eq('priority', filterPriority);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Count messages for each dispute
      const disputesWithCounts = await Promise.all(
        (data || []).map(async (dispute) => {
          const { count } = await supabase
            .from('dispute_messages')
            .select('*', { count: 'exact', head: true })
            .eq('dispute_id', dispute.id);

          return {
            ...dispute,
            _count: { messages: count || 0 },
          };
        })
      );

      setDisputes(disputesWithCounts);
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (disputeId: string) => {
    if (!selectedAdmin) {
      alert('Veuillez sélectionner un administrateur');
      return;
    }

    try {
      setActionLoading(disputeId);
      const { error } = await supabase
        .from('disputes')
        .update({
          assigned_to: selectedAdmin,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId);

      if (error) throw error;

      await loadDisputes();
      await loadStats();
      setAssignModalOpen(false);
      setSelectedAdmin('');
      setSelectedDispute(null);
    } catch (error) {
      console.error('Error assigning dispute:', error);
      alert('Erreur lors de l\'assignation du litige');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (disputeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir clôturer ce litige ?')) return;

    try {
      setActionLoading(disputeId);
      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'closed',
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId);

      if (error) throw error;

      await loadDisputes();
      await loadStats();
      setSelectedDispute(null);
    } catch (error) {
      console.error('Error closing dispute:', error);
      alert('Erreur lors de la clôture du litige');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvData = disputes.map((d) => ({
        ID: d.id,
        Titre: d.title,
        Statut: d.status,
        Priorité: d.priority,
        Type: d.dispute_type || 'N/A',
        Créé_par: d.creator?.full_name || 'N/A',
        Assigné_à: d.assignee?.full_name || 'Non assigné',
        Date_création: format(new Date(d.created_at), 'dd/MM/yyyy'),
        Date_résolution: d.resolved_at ? format(new Date(d.resolved_at), 'dd/MM/yyyy') : 'N/A',
        Messages: d._count?.messages || 0,
      }));

      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map((row) =>
          headers.map((header) => `"${(row as never)[header]}"`).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `litiges-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Erreur lors de l\'export CSV');
    }
  };

  const filteredDisputes = disputes.filter((dispute) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      dispute.title.toLowerCase().includes(query) ||
      dispute.description.toLowerCase().includes(query) ||
      dispute.creator?.full_name?.toLowerCase().includes(query) ||
      dispute.assignee?.full_name?.toLowerCase().includes(query) ||
      dispute.contract?.contract_number?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200',
      escalated: 'bg-red-100 text-red-800 border-red-200',
    };

    const labels = {
      open: 'Ouvert',
      in_progress: 'En cours',
      resolved: 'Résolu',
      closed: 'Clos',
      escalated: 'Éscalé',
    };

    const icons = {
      open: <AlertCircle className="w-3 h-3" />,
      in_progress: <Clock className="w-3 h-3" />,
      resolved: <CheckCircle className="w-3 h-3" />,
      closed: <XCircle className="w-3 h-3" />,
      escalated: <AlertCircle className="w-3 h-3" />,
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 w-fit ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800 border-gray-200',
      medium: 'bg-blue-100 text-blue-800 border-blue-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200',
    };

    const labels = {
      low: 'Basse',
      medium: 'Moyenne',
      high: 'Haute',
      urgent: 'Urgente',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[priority as keyof typeof styles]}`}>
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      {/* Header */}
      <div className="bg-[#2C1810]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
              <Scale className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Gestion des Litiges</h1>
              <p className="text-[#E8D4C5] mt-1">Gérez et résolvez les litiges utilisateurs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-[#EFEBE9]">
            <p className="text-sm text-[#6B5A4E]">Total</p>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.total}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-blue-800">Ouverts</p>
            <p className="text-2xl font-bold text-blue-900">{stats.open}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <p className="text-sm text-yellow-800">En cours</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.in_progress}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <p className="text-sm text-green-800">Résolus</p>
            <p className="text-2xl font-bold text-green-900">{stats.resolved}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <p className="text-sm text-purple-800">Temps moy. résolution</p>
            <p className="text-2xl font-bold text-purple-900">{stats.avgResolutionTime}j</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-[#EFEBE9]">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-5 h-5 text-[#6B5A4E]" />
              <input
                type="text"
                placeholder="Rechercher par titre, description, personne..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#6B5A4E]" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="px-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="open">Ouverts</option>
                <option value="in_progress">En cours</option>
                <option value="resolved">Résolus</option>
                <option value="closed">Clos</option>
                <option value="escalated">Éscalés</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
                className="px-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
              >
                <option value="all">Toutes priorités</option>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Disputes List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#F16522]" />
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-[#EFEBE9]">
            <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-[#2C1810] mb-2">Aucun litige</h3>
            <p className="text-[#6B5A4E]">
              {searchQuery ? 'Aucun litige ne correspond à votre recherche' : 'Aucun litige à traiter'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#EFEBE9] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FAF7F4]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B5A4E] uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B5A4E] uppercase tracking-wider">
                      Titre
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B5A4E] uppercase tracking-wider">
                      Parties
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B5A4E] uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B5A4E] uppercase tracking-wider">
                      Priorité
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B5A4E] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B5A4E] uppercase tracking-wider">
                      Messages
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[#6B5A4E] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEBE9]">
                  {filteredDisputes.map((dispute) => (
                    <tr key={dispute.id} className="hover:bg-[#FAF7F4]/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-[#6B5A4E]">
                          #{dispute.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-[#2C1810] truncate max-w-xs">
                            {dispute.title}
                          </p>
                          {dispute.contract?.contract_number && (
                            <p className="text-xs text-[#6B5A4E]">
                              Contrat: {dispute.contract.contract_number}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-[#6B5A4E]" />
                            <p className="text-sm text-[#2C1810]">
                              {dispute.creator?.full_name || 'Utilisateur'}
                            </p>
                          </div>
                          {dispute.assignee && (
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-3 h-3 text-[#6B5A4E]" />
                              <p className="text-xs text-[#6B5A4E]">
                                → {dispute.assignee.full_name || 'Admin'}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(dispute.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(dispute.priority)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-[#6B5A4E]">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(dispute.created_at), 'd MMM yyyy', { locale: fr })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#FAF7F4] text-[#2C1810]">
                          {dispute._count?.messages || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDispute(dispute)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {(dispute.status === 'open' || dispute.status === 'escalated') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDispute(dispute);
                                setAssignModalOpen(true);
                              }}
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          )}
                          {dispute.status !== 'closed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleClose(dispute.id)}
                              disabled={actionLoading === dispute.id}
                              className="text-green-600 hover:text-green-700"
                            >
                              {actionLoading === dispute.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/moderator/litiges/${dispute.id}`)}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedDispute && !assignModalOpen} onOpenChange={() => setSelectedDispute(null)}>
        <div className="bg-white rounded-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {selectedDispute && (
            <>
              <div className="p-6 border-b border-[#EFEBE9]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#2C1810]">{selectedDispute.title}</h2>
                    <p className="text-sm text-[#6B5A4E] mt-1">
                      ID: {selectedDispute.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedDispute.status)}
                    {getPriorityBadge(selectedDispute.priority)}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-[#6B5A4E] mb-2">Description</p>
                  <p className="text-sm text-[#2C1810] bg-[#FAF7F4] rounded-lg p-4">
                    {selectedDispute.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#FAF7F4] rounded-lg p-4">
                    <p className="text-xs text-[#6B5A4E] mb-1">Créé par</p>
                    <p className="font-semibold text-[#2C1810]">
                      {selectedDispute.creator?.full_name || 'Utilisateur'}
                    </p>
                    <p className="text-sm text-[#6B5A4E]">
                      {selectedDispute.creator?.email || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-[#FAF7F4] rounded-lg p-4">
                    <p className="text-xs text-[#6B5A4E] mb-1">Assigné à</p>
                    <p className="font-semibold text-[#2C1810]">
                      {selectedDispute.assignee?.full_name || 'Non assigné'}
                    </p>
                    <p className="text-sm text-[#6B5A4E]">
                      {selectedDispute.assignee?.email || 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedDispute.contract && (
                  <div className="bg-[#FAF7F4] rounded-lg p-4">
                    <p className="text-xs text-[#6B5A4E] mb-1">Contrat associé</p>
                    <p className="font-semibold text-[#2C1810]">
                      {selectedDispute.contract.contract_number}
                    </p>
                    {selectedDispute.contract.property && (
                      <p className="text-sm text-[#6B5A4E]">
                        {selectedDispute.contract.property.title}, {selectedDispute.contract.property.city}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-[#6B5A4E]">Type de litige</p>
                    <p className="font-semibold text-[#2C1810] capitalize">
                      {selectedDispute.dispute_type || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B5A4E]">Date de création</p>
                    <p className="font-semibold text-[#2C1810]">
                      {format(new Date(selectedDispute.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B5A4E]">Dernière mise à jour</p>
                    <p className="font-semibold text-[#2C1810]">
                      {format(new Date(selectedDispute.updated_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B5A4E]">Messages</p>
                    <p className="font-semibold text-[#2C1810]">{selectedDispute._count?.messages || 0}</p>
                  </div>
                  {selectedDispute.resolved_at && (
                    <div>
                      <p className="text-xs text-[#6B5A4E]">Date de résolution</p>
                      <p className="font-semibold text-[#2C1810]">
                        {format(new Date(selectedDispute.resolved_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-[#EFEBE9] flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setSelectedDispute(null)}
                >
                  Fermer
                </Button>
                <div className="flex gap-3">
                  {selectedDispute.status !== 'closed' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAssignModalOpen(true);
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Réassigner
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/moderator/litiges/${selectedDispute.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Voir détails complets
                  </Button>
                  {selectedDispute.status !== 'closed' && (
                    <Button
                      onClick={() => handleClose(selectedDispute.id)}
                      disabled={actionLoading === selectedDispute.id}
                    >
                      {actionLoading === selectedDispute.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Clôturer le litige
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Dialog>

      {/* Assign Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <div className="bg-white rounded-2xl max-w-md w-full mx-4">
          <div className="p-6 border-b border-[#EFEBE9]">
            <h2 className="text-xl font-bold text-[#2C1810]">Assigner le litige</h2>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-[#6B5A4E]">
              Sélectionnez un administrateur pour assigner ce litige :
            </p>

            <select
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="w-full px-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
            >
              <option value="">Sélectionner un administrateur</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.full_name || admin.email}
                </option>
              ))}
            </select>
          </div>

          <div className="p-6 border-t border-[#EFEBE9] flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setAssignModalOpen(false);
                setSelectedAdmin('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={() => selectedDispute && handleAssign(selectedDispute.id)}
              disabled={!selectedAdmin || actionLoading === selectedDispute?.id}
            >
              {actionLoading === selectedDispute?.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Assigner
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
