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
  Calendar,
  Handshake,
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
  });

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

      // Load maintenance requests
      let maintenanceRequests = 0;
      if (propertyIds.length > 0) {
        const { data: maintenanceData } = await supabase
          .from('maintenance_requests')
          .select('id')
          .in('property_id', propertyIds)
          .in('status', ['ouverte', 'en_cours']);
        maintenanceRequests = maintenanceData?.length || 0;
      }

      // Load unread messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      setStats({
        totalProperties: props.length,
        activeLeases: activeLeases.length,
        pendingApplications,
        maintenanceRequests,
        unreadMessages: messagesData?.length || 0,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-[#2C1810] dashboard-header-animate">
        <div className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center icon-pulse-premium">
                <Building className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Espace Propriétaire</h1>
                <p className="text-[#E8D4C5] mt-1">
                  Bienvenue, {profile?.full_name || 'Propriétaire'}
                </p>
              </div>
            </div>
            <Link
              to="/proprietaire/ajouter-propriete"
              className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Ajouter un bien</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-[#FFF5F0] p-2 rounded-xl">
                <Building className="h-5 w-5 text-[#F16522]" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Mes biens</span>
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
              <div className="bg-amber-100 p-2 rounded-xl">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Candidatures</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">{stats.pendingApplications}</p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-4">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column - Properties */}
          <div className="lg:col-span-2 space-y-6">
            {/* Properties List */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#2C1810] flex items-center gap-2">
                  <Home className="h-6 w-6 text-[#F16522]" />
                  <span>Mes Propriétés</span>
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
                            {property.monthly_rent.toLocaleString()} FCFA
                          </span>
                          <span className="flex items-center gap-1 text-xs text-[#6B5A4E]">
                            <Eye className="h-3 w-3" /> {property.views_count || 0} vues
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
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
                        <div className="flex gap-3">
                          <Link
                            to={`/propriete/${property.id}`}
                            className="text-xs text-[#F16522] hover:underline font-medium"
                          >
                            Voir →
                          </Link>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedPropertyForInvite(property.id);
                              setShowInviteDialog(true);
                            }}
                            className="text-xs text-[#6B5A4E] hover:text-[#F16522] font-medium flex items-center gap-1"
                            title="Déléguer la gestion à une agence"
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            Déléguer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-[#FFF5F0] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building className="h-10 w-10 text-[#F16522]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#2C1810] mb-2">Aucune propriété</h3>
                  <p className="text-[#6B5A4E] mb-4">Commencez à louer votre bien dès maintenant</p>
                  <Link
                    to="/proprietaire/ajouter-propriete"
                    className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-6 rounded-xl transition-colors inline-flex items-center"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Ajouter un bien
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-6">
              <h3 className="text-lg font-bold text-[#2C1810] mb-4">Actions Rapides</h3>
              <div className="space-y-3">
                <Link
                  to="/proprietaire/ajouter-propriete"
                  className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Ajouter un bien
                </Link>
                <Link
                  to="/proprietaire/candidatures"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Candidatures
                  {stats.pendingApplications > 0 && (
                    <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {stats.pendingApplications}
                    </span>
                  )}
                </Link>
                <Link
                  to="/proprietaire/contrats"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Mes contrats
                </Link>
                <Link
                  to="/proprietaire/mes-mandats"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Handshake className="h-5 w-5 mr-2" />
                  Mandats agence
                </Link>
                <button
                  onClick={() => {
                    setSelectedPropertyForInvite(undefined);
                    setShowInviteDialog(true);
                  }}
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Building2 className="h-5 w-5 mr-2" />
                  Inviter une agence
                </button>
                <Link
                  to="/locataire/messages"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Messages
                </Link>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-stagger-6">
              <h3 className="text-lg font-bold text-[#2C1810] mb-4">Alertes</h3>
              <div className="space-y-3">
                {stats.pendingApplications > 0 && (
                  <Link
                    to="/dashboard/candidatures"
                    className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 hover:border-amber-400 transition-colors"
                  >
                    <Users className="h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2C1810]">Candidatures en attente</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {stats.pendingApplications}
                      </p>
                    </div>
                  </Link>
                )}
                {stats.maintenanceRequests > 0 && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <Wrench className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2C1810]">Demandes maintenance</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.maintenanceRequests}
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
                {stats.pendingApplications === 0 &&
                  stats.maintenanceRequests === 0 &&
                  stats.unreadMessages === 0 && (
                    <p className="text-sm text-[#6B5A4E] text-center py-4">Aucune alerte</p>
                  )}
              </div>
            </div>

            {/* Calendar Preview */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-6">
              <h3 className="text-lg font-bold text-[#2C1810] mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#F16522]" />
                <span>Prochaines visites</span>
              </h3>
              <p className="text-sm text-[#6B5A4E] text-center py-4">Aucune visite planifiée</p>
            </div>
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
    </>
  );
}
