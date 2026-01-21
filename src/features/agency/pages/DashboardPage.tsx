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
  Settings,
  UserPlus,
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
      <div className="min-h-screen bg-[#FAF7F4]">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      {/* Header */}
      <div className="bg-[#2C1810] dashboard-header-animate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center icon-pulse-premium">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Espace Agence</h1>
                <p className="text-[#E8D4C5] mt-1">Bienvenue, {profile?.full_name || 'Agence'}</p>
              </div>
            </div>
            <Link
              to="/agences/ajouter-bien"
              className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Ajouter un bien</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  to="/agences/ajouter-bien"
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
                            {property.monthly_rent.toLocaleString()} FCFA
                          </span>
                          <span className="flex items-center gap-1 text-xs text-[#6B5A4E]">
                            <Eye className="h-3 w-3" /> {property.views_count || 0} vues
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-medium ${
                            property.status === 'disponible'
                              ? 'bg-green-100 text-green-700'
                              : property.status === 'loue'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-[#EFEBE9] text-[#6B5A4E]'
                          }`}
                        >
                          {property.status === 'disponible'
                            ? 'Disponible'
                            : property.status === 'loue'
                              ? 'Loué'
                              : property.status}
                        </span>
                        <Link
                          to={`/propriete/${property.id}`}
                          className="text-xs text-[#F16522] hover:underline font-medium"
                        >
                          Voir →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-[#FFF5F0] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="h-10 w-10 text-[#F16522]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#2C1810] mb-2">Aucun bien en gestion</h3>
                  <p className="text-[#6B5A4E] mb-4">
                    Commencez à gérer des biens pour vos clients
                  </p>
                  <Link
                    to="/agences/ajouter-bien"
                    className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-6 rounded-xl transition-colors inline-flex items-center"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Ajouter un bien
                  </Link>
                </div>
              )}
            </div>

            {/* Performance Overview */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-stagger-6">
              <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2 mb-6">
                <BarChart3 className="h-6 w-6 text-[#F16522]" />
                <span>Aperçu Performance</span>
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-4 text-center">
                  <p className="text-sm text-[#6B5A4E] mb-1">Taux occupation</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.totalProperties > 0
                      ? Math.round((stats.activeLeases / stats.totalProperties) * 100)
                      : 0}
                    %
                  </p>
                </div>
                <div className="bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-4 text-center">
                  <p className="text-sm text-[#6B5A4E] mb-1">Candidatures</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pendingApplications}</p>
                </div>
                <div className="bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-4 text-center">
                  <p className="text-sm text-[#6B5A4E] mb-1">Messages</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.unreadMessages}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-5">
              <h3 className="text-lg font-bold text-[#2C1810] mb-4">Actions Rapides</h3>
              <div className="space-y-3">
                <Link
                  to="/agences/ajouter-bien"
                  className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Ajouter un bien
                </Link>
                <Link
                  to="/agences/analytics"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Mon équipe
                </Link>
                <Link
                  to="/agences/analytics"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Coins className="h-5 w-5 mr-2" />
                  Commissions
                </Link>
                <Link
                  to="/agences/biens"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Home className="h-5 w-5 mr-2" />
                  Assignations
                </Link>
                <Link
                  to="/agences/candidatures"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Recrutement
                </Link>
                <Link
                  to="/agences/analytics"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Rapports
                </Link>
                <Link
                  to="/agences/profil"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Paramètres
                </Link>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-stagger-6">
              <h3 className="text-lg font-bold text-[#2C1810] mb-4">Alertes</h3>
              <div className="space-y-3">
                {stats.pendingApplications > 0 && (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <Users className="h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2C1810]">Candidatures</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {stats.pendingApplications}
                      </p>
                    </div>
                  </div>
                )}
                {stats.unreadMessages > 0 && (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2C1810]">Messages non lus</p>
                      <p className="text-2xl font-bold text-green-600">{stats.unreadMessages}</p>
                    </div>
                  </div>
                )}
                {stats.pendingApplications === 0 && stats.unreadMessages === 0 && (
                  <p className="text-sm text-[#6B5A4E] text-center py-4">Aucune alerte</p>
                )}
              </div>
            </div>

            {/* Commission Summary */}
            <div className="bg-[#2C1810] rounded-[20px] p-6 text-white card-animate-in card-stagger-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Coins className="h-5 w-5 text-[#F16522]" />
                <span>Commissions du mois</span>
              </h3>
              <p className="text-4xl font-bold mb-2">
                {stats.totalCommissions.toLocaleString()} <span className="text-lg">FCFA</span>
              </p>
              <p className="text-sm text-[#E8D4C5]">
                5% sur {stats.monthlyRevenue.toLocaleString()} FCFA de loyers
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
