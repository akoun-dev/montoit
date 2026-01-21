import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Users, FileText, Home, TrendingUp, Clock } from 'lucide-react';

export default function AgencyAnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    properties: 0,
    mandates: 0,
    activeContracts: 0,
    pendingApplications: 0,
    upcomingVisits: 0,
  });

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: propsData } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', user.id);
      const propertyIds = (propsData || []).map((p) => p.id);

      const [{ data: contracts }, { data: applications }, { data: visits }] = await Promise.all([
        supabase.from('lease_contracts').select('id').eq('owner_id', user.id).eq('status', 'actif'),
        propertyIds.length > 0
          ? supabase
              .from('rental_applications')
              .select('id, status')
              .in('property_id', propertyIds)
              .eq('status', 'en_attente')
          : Promise.resolve({ data: [] }),
        supabase
          .from('visit_requests')
          .select('id, confirmed_date, status')
          .eq('owner_id', user.id),
      ]);

      const propsCount = propertyIds.length;
      const activeContracts = contracts?.length || 0;
      const pendingApplications = applications?.length || 0;
      const now = new Date();
      const upcomingVisits =
        visits?.filter((v: any) => {
          const d = v.confirmed_date ? new Date(v.confirmed_date) : null;
          return d && d >= now && (v.status === 'en_attente' || v.status === 'confirmee');
        }).length || 0;

      // Mandates: approximation = properties owned (if no dedicated table)
      const mandates = propsCount;

      setStats({
        properties: propsCount,
        mandates,
        activeContracts,
        pendingApplications,
        upcomingVisits,
      });
    } catch (err) {
      console.error('Erreur chargement analytics agence', err);
      setStats({
        properties: 0,
        mandates: 0,
        activeContracts: 0,
        pendingApplications: 0,
        upcomingVisits: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const cards = useMemo(
    () => [
      {
        label: 'Biens gérés',
        value: stats.properties,
        sub: 'Total propriétés',
        icon: Home,
        color: 'orange',
      },
      {
        label: 'Mandats actifs',
        value: stats.mandates,
        sub: 'Biens mandatés',
        icon: FileText,
        color: 'emerald',
      },
      {
        label: 'Contrats actifs',
        value: stats.activeContracts,
        sub: 'Leases en cours',
        icon: BarChart3,
        color: 'blue',
      },
      {
        label: 'Candidatures en attente',
        value: stats.pendingApplications,
        sub: 'Demandes à traiter',
        icon: Users,
        color: 'amber',
      },
      {
        label: 'Visites à venir',
        value: stats.upcomingVisits,
        sub: 'Confirmées/en attente',
        icon: Clock,
        color: 'purple',
      },
      {
        label: 'Taux de succès',
        value:
          stats.properties > 0
            ? Math.min(100, Math.round((stats.activeContracts / stats.properties) * 100))
            : 0,
        suffix: '%',
        sub: 'Contrats / biens',
        icon: TrendingUp,
        color: 'cyan',
      },
    ],
    [stats]
  );

  return (
    <div className="space-y-8">
      <div className="bg-[#2C1810] dashboard-header-animate rounded-2xl px-4 sm:px-6 lg:px-8 py-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center icon-pulse-premium shadow-md">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Analytics Agence</h1>
            <p className="text-[#E8D4C5] mt-1">Vue synthétique de vos performances</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              sub={card.sub}
              icon={card.icon}
              color={card.color}
              suffix={card.suffix}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'orange',
  suffix,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'orange' | 'emerald' | 'blue' | 'amber' | 'purple' | 'cyan';
  suffix?: string;
}) {
  const badgeColor =
    color === 'emerald'
      ? 'bg-emerald-100 text-emerald-700'
      : color === 'blue'
        ? 'bg-blue-100 text-blue-700'
        : color === 'amber'
          ? 'bg-amber-100 text-amber-700'
          : color === 'purple'
            ? 'bg-purple-100 text-purple-700'
            : color === 'cyan'
              ? 'bg-cyan-100 text-cyan-700'
              : 'bg-[#FFF5F0] text-[#F16522]';

  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium">
      <div className="flex items-center gap-3 mb-2">
        <div className={`${badgeColor} p-2 rounded-xl`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm text-[#6B5A4E]">{label}</span>
      </div>
      <p className="text-3xl font-bold text-[#2C1810]">
        {value}
        {suffix}
      </p>
      {sub && <p className="text-sm text-[#6B5A4E] mt-1">{sub}</p>}
    </div>
  );
}
