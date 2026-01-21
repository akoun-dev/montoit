import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/shared/ui';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Target,
  TrendingUp,
  Building2,
  FileText,
  Award,
  Edit,
  Coins,
  Home,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Json } from '@/integrations/supabase/types';

interface AgentDetail {
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
  certifications: string[];
  bio: string | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Transaction {
  id: string;
  transaction_type: string;
  description: string | null;
  gross_amount: number;
  agent_share: number | null;
  status: string | null;
  transaction_date: string | null;
}

interface Assignment {
  id: string;
  status: string | null;
  properties: {
    id: string;
    title: string;
    city: string | null;
    monthly_rent: number;
  } | null;
}

function parseJsonArray(data: Json | null): string[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionStats, setCommissionStats] = useState({
    totalGross: 0,
    totalAgentShare: 0,
    pendingAmount: 0,
    paidAmount: 0,
  });

  useEffect(() => {
    if (id) {
      loadAgentData(id);
    }
  }, [id]);

  const loadAgentData = async (agentId: string) => {
    try {
      // Load agent
      const { data: agentData, error: agentError } = await supabase
        .from('agency_agents')
        .select(
          `
          *,
          profiles:user_id(full_name, avatar_url)
        `
        )
        .eq('id', agentId)
        .single();

      if (agentError) throw agentError;

      setAgent({
        ...agentData,
        specialties: parseJsonArray(agentData.specialties),
        certifications: parseJsonArray(agentData.certifications),
      });

      // Load transactions
      const { data: txData } = await supabase
        .from('agency_transactions')
        .select(
          'id, transaction_type, description, gross_amount, agent_share, status, transaction_date'
        )
        .eq('agent_id', agentId)
        .order('transaction_date', { ascending: false })
        .limit(20);

      setTransactions(txData || []);

      // Calculate commission stats
      const totalGross = txData?.reduce((sum, t) => sum + (t.gross_amount || 0), 0) || 0;
      const totalAgentShare = txData?.reduce((sum, t) => sum + (t.agent_share || 0), 0) || 0;
      const pendingAmount =
        txData
          ?.filter((t) => t.status === 'pending')
          .reduce((sum, t) => sum + (t.agent_share || 0), 0) || 0;
      const paidAmount =
        txData
          ?.filter((t) => t.status === 'paid')
          .reduce((sum, t) => sum + (t.agent_share || 0), 0) || 0;

      setCommissionStats({ totalGross, totalAgentShare, pendingAmount, paidAmount });

      // Load assignments
      const { data: assignData } = await supabase
        .from('property_assignments')
        .select(
          `
          id, status,
          properties:property_id(id, title, city, monthly_rent)
        `
        )
        .eq('agent_id', agentId)
        .eq('status', 'active');

      setAssignments((assignData as Assignment[]) || []);
    } catch (error) {
      console.error('Error loading agent:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto text-[#2C1810]/20 mb-4" />
          <h2 className="text-xl font-semibold text-[#2C1810]">Agent non trouvé</h2>
          <Button onClick={() => navigate('/dashboard/agence/equipe')} className="mt-4">
            Retour à l'équipe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard/agence/equipe')}
          className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour à l'équipe</span>
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-[#F16522]/10 flex items-center justify-center flex-shrink-0">
            {agent.profiles?.avatar_url ? (
              <img
                src={agent.profiles.avatar_url}
                alt=""
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-[#F16522]" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#2C1810]">
                  {agent.profiles?.full_name || agent.email || 'Agent'}
                </h1>
                <div className="flex gap-2 mt-2">
                  <Badge
                    className={
                      agent.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {agent.status === 'active' ? 'Actif' : agent.status}
                  </Badge>
                  <Badge variant="outline">{agent.role}</Badge>
                </div>
              </div>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-[#2C1810]/70">
              {agent.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {agent.email}
                </div>
              )}
              {agent.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {agent.phone}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Depuis {format(new Date(agent.hire_date), 'MMMM yyyy', { locale: fr })}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Coins className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#2C1810]">
                    {commissionStats.totalAgentShare.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#2C1810]/60">Total commissions</p>
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
                  <p className="text-lg font-bold text-[#2C1810]">
                    {commissionStats.pendingAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#2C1810]/60">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Home className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#2C1810]">{assignments.length}</p>
                  <p className="text-xs text-[#2C1810]/60">Propriétés</p>
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
                  <p className="text-lg font-bold text-[#2C1810]">{agent.commission_split ?? 0}%</p>
                  <p className="text-xs text-[#2C1810]/60">Commission</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Properties Assigned */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-[#EFEBE9]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#F16522]" />
                  Propriétés assignées
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <p className="text-[#2C1810]/60 text-center py-8">Aucune propriété assignée</p>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 bg-[#FAF7F4] rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-[#2C1810]">
                            {assignment.properties?.title}
                          </p>
                          <p className="text-sm text-[#2C1810]/60">{assignment.properties?.city}</p>
                        </div>
                        <p className="font-semibold text-[#F16522]">
                          {assignment.properties?.monthly_rent.toLocaleString()} FCFA
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="bg-white border-[#EFEBE9] mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#F16522]" />
                  Transactions récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-[#2C1810]/60 text-center py-8">Aucune transaction</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 10).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 border-b border-[#EFEBE9] last:border-0"
                      >
                        <div>
                          <p className="font-medium text-[#2C1810]">
                            {tx.description || tx.transaction_type}
                          </p>
                          <p className="text-sm text-[#2C1810]/60">
                            {tx.transaction_date
                              ? format(new Date(tx.transaction_date), 'dd MMM yyyy', { locale: fr })
                              : '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            +{(tx.agent_share ?? 0).toLocaleString()} FCFA
                          </p>
                          <Badge
                            variant="outline"
                            className={tx.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}
                          >
                            {tx.status === 'paid' ? 'Payé' : 'En attente'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <Card className="bg-white border-[#EFEBE9]">
              <CardHeader>
                <CardTitle className="text-lg">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-[#2C1810]/60">Objectif mensuel</p>
                  <p className="font-semibold text-[#2C1810]">
                    {(agent.target_monthly ?? 0).toLocaleString()} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#2C1810]/60">Part commission</p>
                  <p className="font-semibold text-[#2C1810]">{agent.commission_split ?? 0}%</p>
                </div>
                {agent.bio && (
                  <div>
                    <p className="text-sm text-[#2C1810]/60">Bio</p>
                    <p className="text-[#2C1810]">{agent.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Specialties */}
            {agent.specialties.length > 0 && (
              <Card className="bg-white border-[#EFEBE9]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#F16522]" />
                    Spécialités
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {agent.specialties.map((spec, i) => (
                      <Badge key={i} variant="outline">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
