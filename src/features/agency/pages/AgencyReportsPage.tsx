import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import { toast } from 'sonner';
import {
  FileBarChart,
  Download,
  TrendingUp,
  Users,
  Building2,
  Coins,
  Calendar,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AgentPerformance {
  agent_id: string;
  name: string;
  total_revenue: number;
  total_commissions: number;
  transaction_count: number;
  properties_assigned: number;
}

interface ReportData {
  agency: {
    id: string;
    name: string;
    period: { start: string; end: string };
  };
  summary: {
    total_revenue: number;
    agency_share: number;
    agent_share: number;
    pending_commissions: number;
    paid_commissions: number;
    total_agents: number;
    total_properties: number;
    transaction_count: number;
  };
  agent_performance: AgentPerformance[];
  generated_at: string;
}

const COLORS = ['#F16522', '#2C1810', '#4A90A4', '#50C878', '#FFB347'];

export default function AgencyReportsPage() {
  const { user } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

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
      generateReport(agency.id);
    } else {
      setLoading(false);
    }
  };

  const generateReport = async (agencyIdParam: string) => {
    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-agency-report', {
        body: {
          agency_id: agencyIdParam,
          report_type: 'monthly',
        },
      });

      if (response.error) throw response.error;

      setReport(response.data.report);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const handleExport = () => {
    if (!report) return;

    const csv = [
      ['Rapport Agence', report.agency.name],
      ['Période', `${report.agency.period.start} - ${report.agency.period.end}`],
      [],
      ['Résumé'],
      ['Total revenus', report.summary.total_revenue],
      ['Part agence', report.summary.agency_share],
      ['Part agents', report.summary.agent_share],
      ['Agents actifs', report.summary.total_agents],
      ['Propriétés gérées', report.summary.total_properties],
      [],
      ['Performance par agent'],
      ['Nom', 'Revenus', 'Commissions', 'Transactions', 'Propriétés'],
      ...report.agent_performance.map((a) => [
        a.name,
        a.total_revenue,
        a.total_commissions,
        a.transaction_count,
        a.properties_assigned,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-agence-${format(new Date(), 'yyyy-MM')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const revenueData =
    report?.agent_performance.slice(0, 5).map((a) => ({
      name: a.name.split(' ')[0],
      revenue: a.total_revenue,
    })) || [];

  const pieData = report
    ? [
        { name: 'Part agence', value: report.summary.agency_share },
        { name: 'Part agents', value: report.summary.agent_share },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[#FAF7F4] py-8">
      <div className="w-full mx-auto px-4 w-fullxl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2C1810]">Rapports</h1>
            <p className="text-[#2C1810]/60 mt-1">Analyse des performances de l'agence</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => agencyId && generateReport(agencyId)}
              disabled={generating}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button onClick={handleExport} disabled={!report}>
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {report ? (
          <>
            {/* Period */}
            <div className="flex items-center gap-2 text-[#2C1810]/60 mb-6">
              <Calendar className="w-4 h-4" />
              <span>
                Période : {format(new Date(report.agency.period.start), 'dd MMMM', { locale: fr })}{' '}
                - {format(new Date(report.agency.period.end), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-white border-[#EFEBE9]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#F16522]/10">
                      <Coins className="w-5 h-5 text-[#F16522]" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[#2C1810]">
                        {report.summary.total_revenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-[#2C1810]/60">Revenus totaux</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#EFEBE9]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[#2C1810]">
                        {report.summary.agency_share.toLocaleString()}
                      </p>
                      <p className="text-sm text-[#2C1810]/60">Part agence</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#EFEBE9]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[#2C1810]">
                        {report.summary.total_agents}
                      </p>
                      <p className="text-sm text-[#2C1810]/60">Agents actifs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#EFEBE9]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Building2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[#2C1810]">
                        {report.summary.total_properties}
                      </p>
                      <p className="text-sm text-[#2C1810]/60">Propriétés</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue by Agent */}
              <Card className="bg-white border-[#EFEBE9]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileBarChart className="w-5 h-5 text-[#F16522]" />
                    Revenus par agent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE9" />
                        <XAxis dataKey="name" stroke="#2C1810" fontSize={12} />
                        <YAxis stroke="#2C1810" fontSize={12} />
                        <Tooltip
                          formatter={(value: number) => [
                            `${value.toLocaleString()} FCFA`,
                            'Revenus',
                          ]}
                        />
                        <Bar dataKey="revenue" fill="#F16522" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-[#2C1810]/60">
                      Aucune donnée disponible
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Commission Split */}
              <Card className="bg-white border-[#EFEBE9]">
                <CardHeader>
                  <CardTitle>Répartition des commissions</CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 && report.summary.total_revenue > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString()} FCFA`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-[#2C1810]/60">
                      Aucune transaction ce mois
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Agent Leaderboard */}
            <Card className="bg-white border-[#EFEBE9]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#F16522]" />
                  Classement des agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.agent_performance.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#FAF7F4]">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-[#2C1810]/70">
                            Rang
                          </th>
                          <th className="text-left p-3 text-sm font-medium text-[#2C1810]/70">
                            Agent
                          </th>
                          <th className="text-right p-3 text-sm font-medium text-[#2C1810]/70">
                            Revenus
                          </th>
                          <th className="text-right p-3 text-sm font-medium text-[#2C1810]/70">
                            Commissions
                          </th>
                          <th className="text-right p-3 text-sm font-medium text-[#2C1810]/70">
                            Transactions
                          </th>
                          <th className="text-right p-3 text-sm font-medium text-[#2C1810]/70">
                            Propriétés
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.agent_performance.map((agent, index) => (
                          <tr key={agent.agent_id} className="border-t border-[#EFEBE9]">
                            <td className="p-3">
                              {index === 0 && <span className="text-xl">🥇</span>}
                              {index === 1 && <span className="text-xl">🥈</span>}
                              {index === 2 && <span className="text-xl">🥉</span>}
                              {index > 2 && <span className="text-[#2C1810]/60">{index + 1}</span>}
                            </td>
                            <td className="p-3 font-medium text-[#2C1810]">{agent.name}</td>
                            <td className="p-3 text-right text-[#F16522] font-semibold">
                              {agent.total_revenue.toLocaleString()} F
                            </td>
                            <td className="p-3 text-right text-green-600">
                              {agent.total_commissions.toLocaleString()} F
                            </td>
                            <td className="p-3 text-right text-[#2C1810]">
                              {agent.transaction_count}
                            </td>
                            <td className="p-3 text-right text-[#2C1810]">
                              {agent.properties_assigned}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-[#2C1810]/60 py-8">
                    Aucun agent avec des transactions ce mois
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-12 text-center">
              <FileBarChart className="w-12 h-12 mx-auto text-[#2C1810]/20 mb-4" />
              <h3 className="text-lg font-semibold text-[#2C1810] mb-2">
                Aucun rapport disponible
              </h3>
              <p className="text-[#2C1810]/60">Générez votre premier rapport</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
