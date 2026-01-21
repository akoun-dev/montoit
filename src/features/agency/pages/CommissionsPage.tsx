import { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';
import { toast } from 'sonner';
import {
  Coins,
  Search,
  Download,
  TrendingUp,
  Clock,
  CheckCircle,
  Filter,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Transaction {
  id: string;
  agent_id: string | null;
  property_id: string | null;
  lease_id: string | null;
  transaction_type: string;
  description: string | null;
  gross_amount: number;
  agency_share: number;
  agent_share: number | null;
  status: string | null;
  validated_at: string | null;
  paid_at: string | null;
  transaction_date: string | null;
  agent?: {
    profiles?: {
      full_name: string | null;
    } | null;
  } | null;
  properties?: {
    title: string;
  } | null;
}

export default function CommissionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalGross: 0,
    totalAgencyShare: 0,
    totalAgentShare: 0,
    pending: 0,
    validated: 0,
    paid: 0,
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
      loadTransactions(agency.id);
    } else {
      setLoading(false);
    }
  };

  const loadTransactions = async (agencyIdParam: string) => {
    try {
      const { data, error } = await supabase
        .from('agency_transactions')
        .select(
          `
          *,
          agent:agent_id(profiles:user_id(full_name)),
          properties:property_id(title)
        `
        )
        .eq('agency_id', agencyIdParam)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);

      // Calculate stats
      const totalGross = data?.reduce((sum, t) => sum + (t.gross_amount || 0), 0) || 0;
      const totalAgencyShare = data?.reduce((sum, t) => sum + (t.agency_share || 0), 0) || 0;
      const totalAgentShare = data?.reduce((sum, t) => sum + (t.agent_share || 0), 0) || 0;
      const pending =
        data
          ?.filter((t) => t.status === 'pending')
          .reduce((sum, t) => sum + (t.gross_amount || 0), 0) || 0;
      const validated =
        data
          ?.filter((t) => t.status === 'validated')
          .reduce((sum, t) => sum + (t.gross_amount || 0), 0) || 0;
      const paid =
        data
          ?.filter((t) => t.status === 'paid')
          .reduce((sum, t) => sum + (t.gross_amount || 0), 0) || 0;

      setStats({ totalGross, totalAgencyShare, totalAgentShare, pending, validated, paid });
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('agency_transactions')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
        })
        .eq('id', transactionId);

      if (error) throw error;

      toast.success('Transaction validée');
      if (agencyId) loadTransactions(agencyId);
    } catch (error) {
      console.error('Error validating:', error);
      toast.error('Erreur lors de la validation');
    }
  };

  const handleMarkPaid = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('agency_transactions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (error) throw error;

      toast.success('Transaction marquée comme payée');
      if (agencyId) loadTransactions(agencyId);
    } catch (error) {
      console.error('Error marking paid:', error);
      toast.error('Erreur');
    }
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Type', 'Description', 'Montant brut', 'Part agence', 'Part agent', 'Statut'].join(
        ','
      ),
      ...transactions.map((tx) =>
        [
          tx.transaction_date || '',
          tx.transaction_type,
          `"${tx.description || ''}"`,
          tx.gross_amount,
          tx.agency_share,
          tx.agent_share ?? 0,
          tx.status || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.agent?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      validated: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: 'En attente',
      validated: 'Validée',
      paid: 'Payée',
      cancelled: 'Annulée',
    };
    const s = status || 'pending';
    return <Badge className={styles[s] || styles['pending']}>{labels[s] || s}</Badge>;
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
            <h1 className="text-3xl font-bold text-[#2C1810]">Commissions</h1>
            <p className="text-[#2C1810]/60 mt-1">Suivi des commissions et revenus</p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#F16522]" />
                <div>
                  <p className="text-lg font-bold text-[#2C1810]">
                    {stats.totalGross.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#2C1810]/60">Total brut</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-lg font-bold text-[#2C1810]">
                    {stats.totalAgencyShare.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#2C1810]/60">Part agence</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-lg font-bold text-[#2C1810]">
                    {stats.totalAgentShare.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#2C1810]/60">Part agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-lg font-bold text-[#2C1810]">
                    {stats.pending.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#2C1810]/60">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-lg font-bold text-[#2C1810]">
                    {stats.validated.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#2C1810]/60">Validées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-lg font-bold text-[#2C1810]">{stats.paid.toLocaleString()}</p>
                  <p className="text-xs text-[#2C1810]/60">Payées</p>
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
              placeholder="Rechercher..."
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
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="validated">Validées</SelectItem>
              <SelectItem value="paid">Payées</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transactions Table */}
        <Card className="bg-white border-[#EFEBE9]">
          <CardContent className="p-0">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <Coins className="w-12 h-12 mx-auto text-[#2C1810]/20 mb-4" />
                <h3 className="text-lg font-semibold text-[#2C1810] mb-2">Aucune transaction</h3>
                <p className="text-[#2C1810]/60">Les commissions apparaîtront ici</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#FAF7F4]">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-[#2C1810]/70">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-[#2C1810]/70">
                        Description
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-[#2C1810]/70">Agent</th>
                      <th className="text-right p-4 text-sm font-medium text-[#2C1810]/70">Brut</th>
                      <th className="text-right p-4 text-sm font-medium text-[#2C1810]/70">
                        Agence
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-[#2C1810]/70">
                        Agent
                      </th>
                      <th className="text-center p-4 text-sm font-medium text-[#2C1810]/70">
                        Statut
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-[#2C1810]/70">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="border-t border-[#EFEBE9] hover:bg-[#FAF7F4]/50">
                        <td className="p-4 text-sm">
                          {tx.transaction_date
                            ? format(new Date(tx.transaction_date), 'dd MMM yyyy', { locale: fr })
                            : '-'}
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-[#2C1810]">
                            {tx.description || tx.transaction_type}
                          </p>
                          {tx.properties && (
                            <p className="text-sm text-[#2C1810]/60">{tx.properties.title}</p>
                          )}
                        </td>
                        <td className="p-4 text-sm text-[#2C1810]">
                          {tx.agent?.profiles?.full_name || '-'}
                        </td>
                        <td className="p-4 text-right font-medium text-[#2C1810]">
                          {tx.gross_amount.toLocaleString()} F
                        </td>
                        <td className="p-4 text-right text-green-600 font-medium">
                          {tx.agency_share.toLocaleString()} F
                        </td>
                        <td className="p-4 text-right text-blue-600 font-medium">
                          {(tx.agent_share ?? 0).toLocaleString()} F
                        </td>
                        <td className="p-4 text-center">{getStatusBadge(tx.status)}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {tx.status === 'pending' && (
                              <Button
                                size="small"
                                variant="outline"
                                onClick={() => handleValidate(tx.id)}
                              >
                                Valider
                              </Button>
                            )}
                            {tx.status === 'validated' && (
                              <Button
                                size="small"
                                onClick={() => handleMarkPaid(tx.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Marquer payée
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
