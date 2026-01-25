import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  DollarSign,
  Home,
  AlertCircle,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  ArrowUpCircle,
  Clock,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/Card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useSafeToast';
import { cn } from '@/shared/lib/utils';

// New Trust Agent UI Components
import {
  KPICard,
  EmptyState,
  FilterBar,
  TrustAgentPageHeader,
} from '@/shared/ui/trust-agent';

type DisputeType = 'deposit' | 'damage' | 'rent' | 'noise' | 'other';
type DisputeStatus = 'assigned' | 'under_mediation' | 'awaiting_response' | 'resolved' | 'escalated';
type DisputePriority = 'low' | 'medium' | 'high';

interface Dispute {
  id: string;
  contract_id: string | null;
  type: DisputeType;
  status: DisputeStatus;
  priority: DisputePriority;
  title: string;
  description: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolution_notes: string | null;
  mediation_stage?: string;
  messages_count?: number;
  last_activity?: string;
}

const STATUS_CONFIG = {
  assigned: { label: 'Assigné', variant: 'secondary' as const, bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  under_mediation: { label: 'En médiation', variant: 'default' as const, bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle },
  awaiting_response: { label: 'En attente', variant: 'secondary' as const, bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  resolved: { label: 'Résolu', variant: 'secondary' as const, bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  escalated: { label: 'Escaladé', variant: 'outline' as const, bg: 'bg-red-100', text: 'text-red-700', icon: ArrowUpCircle },
};

const TYPE_CONFIG = {
  deposit: { label: 'Dépôt de garantie', icon: DollarSign, color: 'bg-purple-100 text-purple-700' },
  damage: { label: 'Dommages', icon: Home, color: 'bg-orange-100 text-orange-700' },
  rent: { label: 'Loyer impayé', icon: DollarSign, color: 'bg-red-100 text-red-700' },
  noise: { label: 'Bruit', icon: AlertCircle, color: 'bg-amber-100 text-amber-700' },
  other: { label: 'Autre', icon: MessageSquare, color: 'bg-gray-100 text-gray-700' },
};

export default function DisputesListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DisputeType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<DisputePriority | 'all'>('all');
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('disputes' as never)
        .select('*')
        .order('created_at', { ascending: false }) as unknown as { data: Dispute[]; error: { code?: string } | null };

      if (error) {
        if (error.code === 'PGRST204' || error.code === 'PGRST116') {
          setDisputes([]);
          return;
        }
        throw error;
      }

      setDisputes(data || []);
    } catch (error) {
      console.error('Error loading disputes:', error);
      toast.error('Erreur lors du chargement des litiges');
    } finally {
      setLoading(false);
    }
  };

  const filteredDisputes = useMemo(() => {
    return disputes.filter((dispute) => {
      if (statusFilter !== 'all' && dispute.status !== statusFilter) return false;
      if (typeFilter !== 'all' && dispute.type !== typeFilter) return false;
      if (priorityFilter !== 'all' && dispute.priority !== priorityFilter) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          dispute.title.toLowerCase().includes(query) ||
          dispute.description.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [disputes, statusFilter, typeFilter, priorityFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: disputes.length,
    assigned: disputes.filter((d) => d.status === 'assigned').length,
    under_mediation: disputes.filter((d) => d.status === 'under_mediation').length,
    resolved: disputes.filter((d) => d.status === 'resolved').length,
    escalated: disputes.filter((d) => d.status === 'escalated').length,
  }), [disputes]);

  const handleDisputeClick = (dispute: Dispute) => {
    navigate(`/trust-agent/disputes/${dispute.id}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPriorityFilter('all');
  };

  const activeFiltersCount = (
    (statusFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (priorityFilter !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0)
  );

  // KPI Cards Data
  const kpiData = [
    { title: 'Total', value: stats.total, icon: <Scale />, variant: 'default' as const },
    { title: 'Assignés', value: stats.assigned, icon: <Clock />, variant: 'info' as const },
    { title: 'En médiation', value: stats.under_mediation, icon: <AlertTriangle />, variant: 'warning' as const },
    { title: 'Résolus', value: stats.resolved, icon: <CheckCircle2 />, variant: 'success' as const },
    { title: 'Escaladés', value: stats.escalated, icon: <ArrowUpCircle />, variant: 'danger' as const },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <TrustAgentPageHeader
        title="Gestion des Litiges"
        subtitle="Gérez et résolvez les litiges entre locataires et propriétaires"
        badges={[
          { label: `${stats.under_mediation} en médiation`, variant: stats.under_mediation > 0 ? 'warning' : 'secondary' },
          { label: `${stats.resolved} résolus`, variant: 'success' },
        ]}
        showSearch
        onSearch={setSearchQuery}
        searchPlaceholder="Rechercher par titre ou description..."
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {kpiData.map((kpi, index) => (
            <KPICard key={index} {...kpi} />
          ))}
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchPlaceholder="Rechercher par titre ou description..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          groups={[
            {
              id: 'status',
              label: 'Statut',
              type: 'radio',
              options: [
                { value: 'all', label: 'Tous', count: stats.total },
                { value: 'assigned', label: 'Assignés', count: stats.assigned, icon: <Clock className="h-3 w-3" /> },
                { value: 'under_mediation', label: 'En médiation', count: stats.under_mediation, icon: <AlertTriangle className="h-3 w-3" /> },
                { value: 'resolved', label: 'Résolus', count: stats.resolved, icon: <CheckCircle2 className="h-3 w-3" /> },
                { value: 'escalated', label: 'Escaladés', count: stats.escalated, icon: <ArrowUpCircle className="h-3 w-3" /> },
              ],
              selected: statusFilter === 'all' ? [] : [statusFilter],
              onChange: (values) => setStatusFilter((values[0] || 'all') as DisputeStatus | 'all'),
            },
            {
              id: 'type',
              label: 'Type',
              type: 'radio',
              options: [
                { value: 'all', label: 'Tous les types' },
                { value: 'deposit', label: 'Dépôt de garantie', icon: <DollarSign className="h-3 w-3" /> },
                { value: 'damage', label: 'Dommages', icon: <Home className="h-3 w-3" /> },
                { value: 'rent', label: 'Loyer impayé', icon: <DollarSign className="h-3 w-3" /> },
                { value: 'noise', label: 'Bruit', icon: <AlertCircle className="h-3 w-3" /> },
                { value: 'other', label: 'Autre', icon: <MessageSquare className="h-3 w-3" /> },
              ],
              selected: typeFilter === 'all' ? [] : [typeFilter],
              onChange: (values) => setTypeFilter((values[0] || 'all') as DisputeType | 'all'),
            },
            {
              id: 'priority',
              label: 'Priorité',
              type: 'radio',
              options: [
                { value: 'all', label: 'Toutes' },
                { value: 'high', label: 'Haute priorité' },
                { value: 'medium', label: 'Moyenne' },
                { value: 'low', label: 'Basse' },
              ],
              selected: priorityFilter === 'all' ? [] : [priorityFilter],
              onChange: (values) => setPriorityFilter((values[0] || 'all') as DisputePriority | 'all'),
            },
          ]}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={handleClearFilters}
        />

        {/* Disputes List */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredDisputes.length === 0 ? (
          <EmptyState
            icon={<Scale />}
            title={activeFiltersCount > 0 ? 'Aucun litige trouvé' : 'Aucun litige'}
            description={
              activeFiltersCount > 0
                ? 'Essayez d\'ajuster vos critères de recherche'
                : 'Aucun litige en cours pour le moment'
            }
            actionLabel={activeFiltersCount > 0 ? 'Effacer les filtres' : undefined}
            onAction={activeFiltersCount > 0 ? handleClearFilters : undefined}
            variant={activeFiltersCount > 0 ? 'filter' : 'success'}
          />
        ) : (
          <div className="space-y-3">
            {filteredDisputes.map((dispute) => {
              const statusConfig = STATUS_CONFIG[dispute.status];
              const StatusIcon = statusConfig.icon;
              const typeConfig = TYPE_CONFIG[dispute.type];
              const TypeIcon = typeConfig.icon;

              return (
                <Card
                  key={dispute.id}
                  className={cn(
                    'cursor-pointer hover:shadow-lg transition-all duration-200 border-gray-200 hover:border-primary-200',
                    dispute.priority === 'high' && 'border-l-4 border-l-red-500'
                  )}
                  onClick={() => handleDisputeClick(dispute)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-xl ${typeConfig.color}`}>
                          <TypeIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold text-gray-900">{dispute.title}</h3>
                            <Badge className={statusConfig.bg + ' ' + statusConfig.text + ' border-0'}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            {dispute.priority === 'high' && (
                              <Badge className="bg-red-100 text-red-700 border-0">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Prioritaire
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2">{dispute.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                            </span>
                            {dispute.messages_count !== undefined && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {dispute.messages_count} message(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
