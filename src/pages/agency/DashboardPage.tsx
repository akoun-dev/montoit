import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Coins,
  FileText,
  Home,
  MessageSquare,
  TrendingUp,
  Plus,
  Eye,
  BarChart3,
  Handshake,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { Link, useNavigate } from 'react-router-dom';

interface Property {
  id: string;
  title: string;
  city: string;
  neighborhood: string | null;
  monthly_rent: number;
  status: string;
  views_count: number;
  main_image: string | null;
}

interface Stats {
  totalProperties: number;
  activeLeases: number;
  pendingApplications: number;
  unreadMessages: number;
  monthlyRevenue: number;
  totalCommissions: number;
}

export default function AgencyDashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    activeLeases: 0,
    pendingApplications: 0,
    unreadMessages: 0,
    monthlyRevenue: 0,
    totalCommissions: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }

    if (profile && profile.user_type !== 'agent' && profile.user_type !== 'agence') {
      navigate('/dashboard');
      return;
    }

    loadDashboardData();
  }, [user, profile, navigate]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load agency's properties
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      const props = (propertiesData || []) as unknown as Property[];
      setProperties(props);

      // Load active leases count
      const { data: leasesData } = await supabase
        .from('lease_contracts')
        .select('id, monthly_rent')
        .eq('owner_id', user.id)
        .eq('status', 'actif');

      const activeLeases = leasesData || [];
      const monthlyRevenue = activeLeases.reduce(
        (sum, lease) => sum + (lease.monthly_rent || 0),
        0
      );

      // Load pending applications
      const propertyIds = props.map((p) => p.id);
      let pendingApplications = 0;
      if (propertyIds.length > 0) {
        const { data: applicationsData } = await supabase
          .from('rental_applications')
          .select('id')
          .in('property_id', propertyIds)
          .eq('status', 'en_attente');
        pendingApplications = applicationsData?.length || 0;
      }

      // Load unread messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      // Calculate commissions (5% of monthly revenue)
      const totalCommissions = Math.round(monthlyRevenue * 0.05);

      setStats({
        totalProperties: props.length,
        activeLeases: activeLeases.length,
        pendingApplications,
        unreadMessages: messagesData?.length || 0,
        monthlyRevenue,
        totalCommissions,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-[#FAF7F4]">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F4]">
      {/* Header */}
      <div className="bg-[#2C1810] dashboard-header-animate rounded-2xl lg:rounded-[28px] px-4 sm:px-6 lg:px-8 py-6 shadow-lg">
        <div className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center icon-pulse-premium shadow-md">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Espace Agence</h1>
                <p className="text-[#E8D4C5] mt-1">Bienvenue, {profile?.full_name || 'Agence'}</p>
              </div>
            </div>
            <Link
              to="/proprietaire/ajouter-propriete"
              className="bg-white text-[#F16522] hover:bg-[#F16522] hover:text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="h-5 w-5" />
              <span>Ajouter un bien</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-[#FFF5F0] p-2 rounded-xl">
                <Home className="h-5 w-5 text-[#F16522]" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Biens gérés</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">{stats.totalProperties}</p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-xl">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Baux actifs</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">{stats.activeLeases}</p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-[#FFF5F0] p-2 rounded-xl">
                <TrendingUp className="h-5 w-5 text-[#F16522]" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Revenus/mois</span>
            </div>
            <p className="text-2xl font-bold text-[#F16522]">
              {stats.monthlyRevenue.toLocaleString()} <span className="text-sm">FCFA</span>
            </p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-100 p-2 rounded-xl">
                <Coins className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Commissions</span>
            </div>
            <p className="text-2xl font-bold text-[#2C1810]">
              {stats.totalCommissions.toLocaleString()} <span className="text-sm">FCFA</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column - Properties */}
          <div className="lg:col-span-2 space-y-6">
            {/* Properties List */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
                  <Home className="h-6 w-6 text-[#F16522]" />
                  <span>Biens en Gestion</span>
                </h2>
                <Link
                  to="/proprietaire/ajouter-propriete"
                  className="text-[#F16522] hover:underline text-sm font-medium"
                >
                  + Ajouter
                </Link>
              </div>

              {properties.length > 0 ? (
                <div className="space-y-4">
                  {properties.slice(0, 5).map((property) => (
                    <div
                      key={property.id}
                      className="bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-4 flex items-center gap-4 hover:border-[#F16522] transition-colors"
                    >
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#EFEBE9]">
                        {property.main_image ? (
                          <img
                            src={property.main_image}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-8 w-8 text-[#6B5A4E]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#2C1810] truncate">{property.title}</h3>
                        <p className="text-sm text-[#6B5A4E]">
                          {property.city} {property.neighborhood && `• ${property.neighborhood}`}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-[#F16522] font-bold">
                            {property.monthly_rent.toLocaleString()} FCFA/mois
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              property.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {property.status === 'active' ? 'Actif' : 'En attente'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-white rounded-xl px-3 py-2 text-sm text-[#6B5A4E]">
                          {property.views_count} vues
                        </div>
                        <button className="flex items-center gap-2 text-[#F16522] hover:underline font-medium">
                          <Eye className="h-4 w-4" />
                          Voir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl">
                  <Home className="h-8 w-8 text-[#6B5A4E] mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-[#2C1810] mb-2">
                    Aucun bien en gestion
                  </h3>
                  <p className="text-[#6B5A4E] mb-4">Ajoutez votre premier bien dès maintenant</p>
                  <Link
                    to="/proprietaire/ajouter-propriete"
                    className="inline-flex items-center gap-2 text-[#F16522] hover:underline font-semibold"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un bien
                  </Link>
                </div>
              )}
            </div>

            {/* Communication */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-[#F16522]" />
                  <span>Communications</span>
                </h2>
                <span className="text-[#F16522] text-sm font-medium">Voir tous</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FAF7F4] rounded-xl p-4 border border-[#EFEBE9]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#F16522]/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-[#F16522]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#2C1810]">Nouvelles candidatures</p>
                      <p className="text-sm text-[#6B5A4E]">5 en attente</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-[#EFEBE9] border-2 border-white"
                        />
                      ))}
                    </div>
                    <span className="text-sm text-[#6B5A4E]">Nouveaux dossiers reçus</span>
                  </div>
                </div>

                <div className="bg-[#FAF7F4] rounded-xl p-4 border border-[#EFEBE9]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Handshake className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#2C1810]">Nouveaux mandats</p>
                      <p className="text-sm text-[#6B5A4E]">2 en signature</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#6B5A4E]">
                    Suivez les signatures et définissez les permissions par agence.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="h-2 flex-1 bg-[#EFEBE9] rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-[#F16522]" />
                    </div>
                    <span className="text-sm font-semibold text-[#2C1810]">75%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Column - Stats */}
          <div className="space-y-6">
            {/* Revenue Card */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#6B5A4E]">Revenus mensuels</p>
                  <h3 className="text-2xl font-bold text-[#2C1810]">
                    {stats.monthlyRevenue.toLocaleString()} FCFA
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#F16522]/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-[#F16522]" />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B5A4E]">Commissions attendues</span>
                  <span className="font-semibold text-[#2C1810]">
                    {stats.totalCommissions.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B5A4E]">Baux actifs</span>
                  <span className="font-semibold text-[#2C1810]">{stats.activeLeases}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B5A4E]">Applications en attente</span>
                  <span className="font-semibold text-[#2C1810]">{stats.pendingApplications}</span>
                </div>
              </div>
              <button className="mt-6 w-full bg-[#F16522] text-white py-3 rounded-xl font-semibold hover:bg-[#d9571d] transition-colors">
                Exporter les rapports
              </button>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-[#F16522]" />
                  <span>Performance</span>
                </h2>
                <span className="text-sm text-green-600 font-semibold">+12% vs dernier mois</span>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Taux d occupation', value: 92, color: 'bg-green-500' },
                  { label: 'Taux de conversion', value: 38, color: 'bg-blue-500' },
                  { label: 'Temps de réponse', value: 1.4, color: 'bg-amber-500' },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between text-sm text-[#6B5A4E] mb-2">
                      <span>{metric.label}</span>
                      <span className="font-semibold text-[#2C1810]">{metric.value}%</span>
                    </div>
                    <div className="h-2 bg-[#EFEBE9] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${metric.color}`}
                        style={{ width: `${Math.min(metric.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
