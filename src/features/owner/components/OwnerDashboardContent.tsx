import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2,
  FileText,
  Users,
  TrendingUp,
  ChevronRight,
  Loader2,
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  city: string;
  neighborhood: string | null;
  monthly_rent: number;
  status: string | null;
  main_image: string | null;
  views_count: number | null;
}

interface LeaseStats {
  activeCount: number;
  totalRevenue: number;
}

interface ApplicationStats {
  pendingCount: number;
}

/**
 * Contenu du dashboard propriétaire - affiché dans l'onglet "Mes Propriétés"
 */
export default function OwnerDashboardContent() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [leaseStats, setLeaseStats] = useState<LeaseStats>({ activeCount: 0, totalRevenue: 0 });
  const [applicationStats, setApplicationStats] = useState<ApplicationStats>({ pendingCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchOwnerData();
    }
  }, [user?.id]);

  const fetchOwnerData = async () => {
    if (!user?.id) return;

    try {
      // Fetch properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, city, neighborhood, monthly_rent, status, main_image, views_count')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;
      setProperties(propertiesData || []);

      // Fetch lease stats
      const { data: leasesData, error: leasesError } = await supabase
        .from('lease_contracts')
        .select('monthly_rent, status')
        .eq('owner_id', user.id)
        .in('status', ['actif', 'en_cours', 'signé']);

      if (!leasesError && leasesData) {
        const totalRevenue = leasesData.reduce((sum, lease) => sum + (lease.monthly_rent || 0), 0);
        setLeaseStats({
          activeCount: leasesData.length,
          totalRevenue,
        });
      }

      // Fetch pending applications count
      const propertyIds = propertiesData?.map((p) => p.id) || [];
      if (propertyIds.length > 0) {
        const { count, error: appsError } = await supabase
          .from('rental_applications')
          .select('id', { count: 'exact', head: true })
          .in('property_id', propertyIds)
          .eq('status', 'en_attente');

        if (!appsError) {
          setApplicationStats({ pendingCount: count || 0 });
        }
      }
    } catch (error) {
      console.error('Error fetching owner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      disponible: { label: 'Disponible', className: 'bg-green-100 text-green-700' },
      loué: { label: 'Loué', className: 'bg-blue-100 text-blue-700' },
      indisponible: { label: 'Indisponible', className: 'bg-gray-100 text-gray-700' },
      en_attente: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
    };
    const config = statusConfig[status || 'disponible'] || {
      label: status || 'Inconnu',
      className: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#F16522]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#EFEBE9]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5A4E]">Propriétés</p>
              <p className="text-2xl font-bold text-[#2C1810] mt-1">{properties.length}</p>
            </div>
            <div className="p-3 bg-[#F16522]/10 rounded-xl">
              <Building2 className="h-5 w-5 text-[#F16522]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#EFEBE9]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5A4E]">Baux actifs</p>
              <p className="text-2xl font-bold text-[#2C1810] mt-1">{leaseStats.activeCount}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <Link
          to="/dashboard/candidatures"
          className="bg-white rounded-2xl p-5 border border-[#EFEBE9] hover:border-[#F16522] transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5A4E]">Candidatures</p>
              <p className="text-2xl font-bold text-[#2C1810] mt-1">
                {applicationStats.pendingCount}
                <span className="text-sm font-normal text-[#6B5A4E] ml-1">en attente</span>
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-2xl p-5 border border-[#EFEBE9]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5A4E]">Revenus mensuels</p>
              <p className="text-xl font-bold text-[#2C1810] mt-1">
                {leaseStats.totalRevenue.toLocaleString('fr-FR')}
                <span className="text-sm font-normal text-[#6B5A4E] ml-1">FCFA</span>
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Properties List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2C1810]">Mes Propriétés</h2>
          <Link
            to="/ajouter-propriete"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F16522] text-white text-sm font-medium hover:bg-[#D95318] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-8 text-center">
            <Building2 className="h-12 w-12 text-[#A69B95] mx-auto mb-3" />
            <p className="text-[#6B5A4E]">Aucune propriété</p>
            <Link
              to="/ajouter-propriete"
              className="text-[#F16522] hover:underline text-sm font-medium mt-2 inline-block"
            >
              Publier votre première annonce
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden hover:border-[#F16522] transition-colors group"
              >
                <div className="flex">
                  {property.main_image ? (
                    <img
                      src={property.main_image}
                      alt={property.title}
                      className="w-32 h-32 object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-[#FAF7F4] flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-[#A69B95]" />
                    </div>
                  )}

                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-[#2C1810] truncate">{property.title}</h3>
                          {getStatusBadge(property.status)}
                        </div>
                        <p className="text-sm text-[#6B5A4E]">
                          {property.city}
                          {property.neighborhood ? `, ${property.neighborhood}` : ''}
                        </p>
                        <p className="text-lg font-bold text-[#F16522] mt-2">
                          {property.monthly_rent?.toLocaleString('fr-FR')} FCFA
                          <span className="text-sm font-normal text-[#6B5A4E]">/mois</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#EFEBE9]">
                      <div className="flex items-center gap-1 text-sm text-[#6B5A4E]">
                        <Eye className="h-4 w-4" />
                        <span>{property.views_count || 0} vues</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/propriete/${property.id}`}
                          className="p-2 rounded-lg hover:bg-[#FAF7F4] text-[#6B5A4E] hover:text-[#F16522] transition-colors"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/dashboard/modifier-propriete/${property.id}`}
                          className="p-2 rounded-lg hover:bg-[#FAF7F4] text-[#6B5A4E] hover:text-[#F16522] transition-colors"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          className="p-2 rounded-lg hover:bg-[#FAF7F4] text-[#6B5A4E] hover:text-[#F16522] transition-colors"
                          title="Plus d'options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {properties.length > 0 && (
          <div className="flex justify-center mt-4">
            <Link
              to="/proprietaire/mes-proprietes"
              className="flex items-center gap-1 text-[#F16522] hover:underline font-medium"
            >
              Voir toutes les propriétés
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
