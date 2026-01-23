import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
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
import { Card, CardContent } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useSafeToast';

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
  // Related data
  contract?: {
    property: {
      title: string;
      address: string;
      city: string;
    };
    tenant: {
      full_name: string;
      email: string;
    };
    owner: {
      full_name: string;
      email: string;
    };
  };
  // Mediation data
  mediation_stage?: string;
  messages_count?: number;
  last_activity?: string;
}

const STATUS_CONFIG: Record<DisputeStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string; icon: React.ElementType }> = {
  assigned: { label: 'Assigné', variant: 'outline', color: 'bg-blue-100 text-blue-700', icon: Clock },
  under_mediation: { label: 'En médiation', variant: 'default', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  awaiting_response: { label: 'En attente de réponse', variant: 'outline', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  resolved: { label: 'Résolu', variant: 'secondary', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  escalated: { label: 'Escaladé', variant: 'outline', color: 'bg-red-100 text-red-700', icon: ArrowUpCircle },
};

const TYPE_CONFIG: Record<DisputeType, { label: string; icon: React.ElementType; color: string }> = {
  deposit: { label: 'Dépôt de garantie', icon: DollarSign, color: 'bg-purple-100 text-purple-700' },
  damage: { label: 'Dommages', icon: Home, color: 'bg-orange-100 text-orange-700' },
  rent: { label: 'Loyer impayé', icon: DollarSign, color: 'bg-red-100 text-red-700' },
  noise: { label: 'Bruit', icon: AlertCircle, color: 'bg-amber-100 text-amber-700' },
  other: { label: 'Autre', icon: MessageSquare, color: 'bg-gray-100 text-gray-700' },
};

const PRIORITY_CONFIG: Record<DisputePriority, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'text-gray-500' },
  medium: { label: 'Moyenne', color: 'text-amber-600' },
  high: { label: 'Haute', color: 'text-red-600' },
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
        .order('created_at', { ascending: false }) as unknown as { data: Dispute[]; error: { code?: string; message?: string } | null };

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

  const filteredDisputes = disputes.filter((dispute) => {
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

  const stats = {
    total: disputes.length,
    assigned: disputes.filter((d) => d.status === 'assigned').length,
    under_mediation: disputes.filter((d) => d.status === 'under_mediation').length,
    awaiting_response: disputes.filter((d) => d.status === 'awaiting_response').length,
    resolved: disputes.filter((d) => d.status === 'resolved').length,
    escalated: disputes.filter((d) => d.status === 'escalated').length,
  };

  const handleDisputeClick = (dispute: Dispute) => {
    navigate(`/trust-agent/disputes/${dispute.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6 text-purple-600" />
            Gestion des Litiges
          </h1>
          <p className="text-muted-foreground">Gérez et résolvez les litiges entre locataires et propriétaires</p>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
              <p className="text-sm text-muted-foreground">Assignés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.under_mediation}</p>
              <p className="text-sm text-muted-foreground">En médiation</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-sm text-muted-foreground">Résolus</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.escalated}</p>
              <p className="text-sm text-muted-foreground">Escaladés</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre ou description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DisputeStatus | 'all')}
                  className="px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="assigned">Assigné</option>
                  <option value="under_mediation">En médiation</option>
                  <option value="awaiting_response">En attente</option>
                  <option value="resolved">Résolu</option>
                  <option value="escalated">Escaladé</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as DisputeType | 'all')}
                  className="px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="all">Tous les types</option>
                  <option value="deposit">Dépôt de garantie</option>
                  <option value="damage">Dommages</option>
                  <option value="rent">Loyer impayé</option>
                  <option value="noise">Bruit</option>
                  <option value="other">Autre</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as DisputePriority | 'all')}
                  className="px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="all">Toutes les priorités</option>
                  <option value="high">Haute</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Basse</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disputes List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : filteredDisputes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun litige trouvé</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDisputes.map((dispute) => {
              const statusConfig = STATUS_CONFIG[dispute.status];
              const StatusIcon = statusConfig.icon;
              const typeConfig = TYPE_CONFIG[dispute.type];
              const TypeIcon = typeConfig.icon;
              const priorityConfig = PRIORITY_CONFIG[dispute.priority];

              return (
                <Card
                  key={dispute.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    dispute.priority === 'high' ? 'border-l-4 border-l-red-500' : ''
                  }`}
                  onClick={() => handleDisputeClick(dispute)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-lg ${typeConfig.color}`}>
                          <TypeIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{dispute.title}</h3>
                            <Badge variant={statusConfig.variant} className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            <span className={`text-xs font-medium ${priorityConfig.color}`}>
                              {dispute.priority === 'high' && (
                                <AlertTriangle className="h-3 w-3 inline mr-1" />
                              )}
                              {priorityConfig.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {dispute.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                            </span>
                            {dispute.contract_id && (
                              <span>Contrat #{dispute.contract_id.slice(0, 8)}...</span>
                            )}
                            {dispute.messages_count !== undefined && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {dispute.messages_count} message(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
