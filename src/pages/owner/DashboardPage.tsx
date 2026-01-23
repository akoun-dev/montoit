import { useState, useEffect } from 'react';
import {
  Home,
  Building,
  Building2,
  Users,
  FileText,
  Wrench,
  MessageSquare,
  Plus,
  Eye,
  TrendingUp,
  TrendingDown,
  Calendar,
  Handshake,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Star,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { Link, useNavigate } from 'react-router-dom';
import InviteAgencyDialog from '@/features/agency/components/InviteAgencyDialog';
import { useAgencyMandates } from '@/hooks/useAgencyMandates';

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
  maintenanceRequests: number;
  unreadMessages: number;
  monthlyRevenue: number;
  occupancyRate: number;
}

interface RecentActivity {
  id: string;
  type: 'application' | 'payment' | 'maintenance' | 'visit' | 'contract';
  title: string;
  description: string;
  date: string;
  status?: 'pending' | 'completed' | 'failed';
}

export default function OwnerDashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedPropertyForInvite, setSelectedPropertyForInvite] = useState<string | undefined>();
  const { agencies, createMandate, downloadMandate } = useAgencyMandates();
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    activeLeases: 0,
    pendingApplications: 0,
    maintenanceRequests: 0,
    unreadMessages: 0,
    monthlyRevenue: 0,
    occupancyRate: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }

    if (profile && profile.user_type !== 'owner' && profile.user_type !== 'proprietaire') {
      navigate('/dashboard');
      return;
    }

    loadDashboardData();
  }, [user, profile, navigate]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load owner's properties
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      const props = (propertiesData || []).map((p: any) => ({
        ...p,
        monthly_rent: p.price ?? p.monthly_rent ?? 0,
      })) as Property[];
      setProperties(props);

      // Load active leases count
      const { data: leasesData } = await supabase
        .from('lease_contracts')
        .select('id, monthly_rent, property_id')
        .eq('owner_id', user.id)
        .eq('status', 'actif');

      const activeLeases = leasesData || [];
      const monthlyRevenue = activeLeases.reduce(
        (sum, lease) => sum + (lease.monthly_rent || 0),
        0
      );

      // Calculate occupancy rate
      const occupancyRate = props.length > 0
        ? Math.round((activeLeases.length / props.length) * 100)
        : 0;

      // Load pending applications
      const propertyIds = props.map((p) => p.id);
      let pendingApplications = 0;
      let activities: RecentActivity[] = [];

      if (propertyIds.length > 0) {
        const { data: applicationsData } = await supabase
          .from('rental_applications')
          .select('id, property_id, created_at, profiles(full_name)')
          .in('property_id', propertyIds)
          .eq('status', 'en_attente')
          .order('created_at', { ascending: false })
          .limit(5);

        pendingApplications = applicationsData?.length || 0;

        // Add recent applications to activities
        applicationsData?.forEach((app: any) => {
          const property = props.find(p => p.id === app.property_id);
          activities.push({
            id: app.id,
            type: 'application',
            title: 'Nouvelle candidature',
            description: `${app.profiles?.full_name || 'Un candidat'} pour ${property?.title || 'un bien'}`,
            date: app.created_at,
            status: 'pending',
          });
        });
      }

      // Load maintenance requests
      let maintenanceRequests = 0;
      if (propertyIds.length > 0) {
        const { data: maintenanceData } = await supabase
          .from('maintenance_requests')
          .select('id, property_id, created_at, title, status')
          .in('property_id', propertyIds)
          .in('status', ['ouverte', 'en_cours'])
          .order('created_at', { ascending: false })
          .limit(3);

        maintenanceRequests = maintenanceData?.length || 0;

        // Add maintenance to activities
        maintenanceData?.forEach((req: any) => {
          const property = props.find(p => p.id === req.property_id);
          activities.push({
            id: req.id,
            type: 'maintenance',
            title: 'Demande de maintenance',
            description: `${req.title} - ${property?.title || 'Un bien'}`,
            date: req.created_at,
            status: 'pending',
          });
        });
      }

      // Load recent payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, amount, created_at, lease_id, lease_contracts(properties(title))')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      paymentsData?.forEach((payment: any) => {
        activities.push({
          id: payment.id,
          type: 'payment',
          title: 'Paiement reçu',
          description: `${payment.amount.toLocaleString()} FCFA - ${payment.lease_contracts?.properties?.title || 'Un bien'}`,
          date: payment.created_at,
          status: 'completed',
        });
      });

      // Load unread messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      // Sort activities by date
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivities(activities.slice(0, 6));

      setStats({
        totalProperties: props.length,
        activeLeases: activeLeases.length,
        pendingApplications,
        maintenanceRequests,
        unreadMessages: messagesData?.length || 0,
        monthlyRevenue,
        occupancyRate,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmptyState = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="w-full px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            {/* Welcome Illustration */}
            <div className="mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full mx-auto flex items-center justify-center shadow-xl">
                <Home className="w-16 h-16 text-white" />
              </div>
            </div>

            {/* Welcome Message */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Bienvenue sur MonToit !
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Votre espace propriétaire pour gérer vos biens immobiliers en toute simplicité.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-orange-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Ajoutez vos biens</h3>
                <p className="text-sm text-gray-600">Publiez vos propriétés en quelques clics</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Trouvez des locataires</h3>
                <p className="text-sm text-gray-600">Gérez les candidatures simplement</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Suivez vos revenus</h3>
                <p className="text-sm text-gray-600">Visualisez vos revenus en temps réel</p>
              </div>
            </div>

            {/* CTA Button */}
            <Link
              to="/proprietaire/ajouter-propriete"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-4 px-8 rounded-2xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter mon premier bien</span>
            </Link>

            {/* Trust Indicators */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Gratuit</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Sécurisé</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Sans engagement</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
      </div>
    );
  }

  // Show empty state for new users
  if (properties.length === 0) {
    return getEmptyState();
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl shadow-sm mb-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
                <Building className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Tableau de bord</h1>
                <p className="text-[#E8D4C5]">
                  Bonjour, {profile?.full_name || 'Propriétaire'}
                </p>
              </div>
            </div>
            <Link
              to="/proprietaire/ajouter-propriete"
              className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Ajouter un bien</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Stats Grid - Premium Cards with Trend Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Properties */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Building className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex items-center text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>Active</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalProperties}</p>
            <p className="text-sm text-gray-500 mt-1">Biens immobiliers</p>
          </div>

          {/* Active Leases */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-500 font-medium">{stats.occupancyRate}% occupé</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.activeLeases}</p>
            <p className="text-sm text-gray-500 mt-1">Baux actifs</p>
          </div>

          {/* Pending Applications */}
          <div className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border ${
            stats.pendingApplications > 0 ? 'border-amber-200 ring-2 ring-amber-100' : 'border-gray-100'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
              {stats.pendingApplications > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                  {stats.pendingApplications}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingApplications}</p>
            <p className="text-sm text-gray-500 mt-1">Candidatures en attente</p>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center text-white/80 text-sm font-medium">
                <Activity className="w-4 h-4 mr-1" />
                <span>Ce mois</span>
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.monthlyRevenue.toLocaleString()}</p>
            <p className="text-sm text-white/80 mt-1">FCFA / mois</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Properties Grid */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Home className="h-6 w-6 text-orange-500" />
                  <span>Mes Propriétés</span>
                </h2>
                <Link
                  to="/proprietaire/mes-biens"
                  className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center"
                >
                  Voir tout <ArrowUpRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {properties.slice(0, 4).map((property) => (
                  <Link
                    key={property.id}
                    to={`/propriete/${property.id}`}
                    className="group block bg-gray-50 rounded-xl overflow-hidden hover:shadow-lg transition-all border border-gray-100 hover:border-orange-200"
                  >
                    <div className="aspect-video w-full overflow-hidden">
                      {property.main_image ? (
                        <img
                          src={property.main_image}
                          alt={property.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                          <Home className="h-12 w-12 text-orange-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">{property.title}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${
                            property.status === 'disponible'
                              ? 'bg-green-100 text-green-700'
                              : property.status === 'loue'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {property.status === 'disponible'
                            ? 'Disponible'
                            : property.status === 'loue'
                              ? 'Loué'
                              : property.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {property.city} {property.neighborhood && `• ${property.neighborhood}`}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-orange-600">
                          {property.monthly_rent.toLocaleString()} FCFA
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Eye className="h-3 w-3" /> {property.views_count || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {properties.length > 4 && (
                <div className="mt-4 text-center">
                  <Link
                    to="/proprietaire/mes-biens"
                    className="text-sm text-gray-600 hover:text-orange-500 font-medium"
                  >
                    Voir les {properties.length - 4} autres bien{properties.length - 4 > 1 ? 's' : ''}
                  </Link>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            {recentActivities.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Activity className="h-6 w-6 text-orange-500" />
                  <span>Activité récente</span>
                </h2>
                <div className="space-y-4">
                  {recentActivities.slice(0, 5).map((activity) => {
                    const Icon = activity.type === 'application' ? Users :
                      activity.type === 'payment' ? DollarSign :
                      activity.type === 'maintenance' ? Wrench :
                      activity.type === 'visit' ? Calendar : FileText;
                    const iconColor = activity.type === 'application' ? 'text-amber-500 bg-amber-50' :
                      activity.type === 'payment' ? 'text-green-500 bg-green-50' :
                      activity.type === 'maintenance' ? 'text-blue-500 bg-blue-50' :
                      'text-gray-500 bg-gray-50';

                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">
                            {new Date(activity.date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Actions Rapides</h3>
              <div className="space-y-3">
                <Link
                  to="/proprietaire/ajouter-propriete"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Ajouter un bien
                </Link>
                {stats.pendingApplications > 0 && (
                  <Link
                    to="/proprietaire/candidatures"
                    className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                  >
                    <Users className="h-5 w-5 mr-2" />
                    Candidatures
                    <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {stats.pendingApplications}
                    </span>
                  </Link>
                )}
                <Link
                  to="/proprietaire/contrats"
                  className="border border-gray-200 hover:border-orange-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Mes contrats
                </Link>
                <Link
                  to="/proprietaire/mes-mandats"
                  className="border border-gray-200 hover:border-orange-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Handshake className="h-5 w-5 mr-2" />
                  Mandats agence
                </Link>
                <button
                  onClick={() => {
                    setSelectedPropertyForInvite(undefined);
                    setShowInviteDialog(true);
                  }}
                  className="border border-gray-200 hover:border-orange-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Building2 className="h-5 w-5 mr-2" />
                  Inviter une agence
                </button>
                {stats.unreadMessages > 0 && (
                  <Link
                    to="/locataire/messages"
                    className="border border-gray-200 hover:border-orange-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Messages
                    <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {stats.unreadMessages}
                    </span>
                  </Link>
                )}
              </div>
            </div>

            {/* Alerts */}
            {(stats.pendingApplications > 0 || stats.maintenanceRequests > 0 || stats.unreadMessages > 0) && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <span>Alertes</span>
                </h3>
                <div className="space-y-3">
                  {stats.pendingApplications > 0 && (
                    <Link
                      to="/proprietaire/candidatures"
                      className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors"
                    >
                      <Users className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Candidatures en attente</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {stats.pendingApplications}
                        </p>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-amber-600" />
                    </Link>
                  )}
                  {stats.maintenanceRequests > 0 && (
                    <Link
                      to="/proprietaire/maintenance"
                      className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition-colors"
                    >
                      <Wrench className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Demandes de maintenance</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {stats.maintenanceRequests}
                        </p>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-blue-600" />
                    </Link>
                  )}
                  {stats.unreadMessages > 0 && (
                    <Link
                      to="/locataire/messages"
                      className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 hover:bg-green-100 transition-colors"
                    >
                      <MessageSquare className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Messages non lus</p>
                        <p className="text-2xl font-bold text-green-600">{stats.unreadMessages}</p>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Tips/Recommendations */}
            {stats.occupancyRate < 50 && properties.length > 0 && (
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <Star className="h-6 w-6" />
                  <h3 className="font-bold">Conseil</h3>
                </div>
                <p className="text-sm text-white/90 mb-4">
                  Votre taux d'occupation est de {stats.occupancyRate}%. Pensez à ajuster vos prix ou à améliorer vos annonces pour attirer plus de locataires.
                </p>
                <Link
                  to="/proprietaire/mes-biens"
                  className="text-sm underline hover:no-underline"
                >
                  Gérer mes biens →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Invitation Agence */}
      <InviteAgencyDialog
        isOpen={showInviteDialog}
        onClose={() => {
          setShowInviteDialog(false);
          setSelectedPropertyForInvite(undefined);
        }}
        onInvite={createMandate}
        onDownloadMandate={downloadMandate}
        properties={properties.map((p) => ({
          id: p.id,
          title: p.title,
          city: p.city,
          monthly_rent: p.monthly_rent,
        }))}
        agencies={agencies}
        selectedPropertyId={selectedPropertyForInvite}
      />
    </div>
  );
}
