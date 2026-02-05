import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  Building2,
  MapPin,
  Users,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Image as ImageIcon,
  Bed,
  Bath,
  Maximize,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  property_type: string;
  address: string;
  city: string;
  neighborhood: string;
  price: number;
  surface_area: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  description: string;
  status: 'disponible' | 'loue' | 'maintenance' | 'en_attente' | 'retire';
  main_image?: string;
  created_at: string;
  owner_id: string;
  owner?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

interface PropertyStats {
  total: number;
  disponible: number;
  loue: number;
  maintenance: number;
  totalValue: number;
  avgRent: number;
}

export default function AgencyPropertiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState<PropertyStats>({
    total: 0,
    disponible: 0,
    loue: 0,
    maintenance: 0,
    totalValue: 0,
    avgRent: 0,
  });
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAgencyAndProperties();
    }
  }, [user, loadAgencyAndProperties]);

  const loadAgencyAndProperties = useCallback(async () => {
    try {
      // Get agency_id for this user
      const { data: agencyData } = await supabase
        .from('agencies')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!agencyData) {
        setLoading(false);
        return;
      }

      setAgencyId(agencyData.id);

      // Load properties with owner information
      const { data: propertiesData, error } = await supabase
        .from('properties')
        .select(
          `
          *,
          owner:owner_id (
            full_name,
            email,
            phone
          )
        `
        )
        .eq('managed_by_agency', agencyData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProperties(propertiesData || []);
      calculateStats(propertiesData || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const calculateStats = (props: Property[]) => {
    const disponible = props.filter((p) => p.status === 'disponible').length;
    const loue = props.filter((p) => p.status === 'loue').length;
    const maintenance = props.filter((p) => p.status === 'maintenance').length;
    const totalValue = props.reduce((sum, p) => sum + (p.price || 0), 0);
    const avgRent = props.length > 0 ? totalValue / props.length : 0;

    setStats({
      total: props.length,
      disponible,
      loue,
      maintenance,
      totalValue,
      avgRent,
    });
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      searchQuery === '' ||
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' || property.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponible':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Disponible
          </span>
        );
      case 'loue':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Users className="w-3 h-3 mr-1" />
            Loué
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Clock className="w-3 h-3 mr-1" />
            En travaux
          </span>
        );
      case 'en_attente':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </span>
        );
      case 'retire':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3 mr-1" />
            Retiré
          </span>
        );
      default:
        return null;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette propriété ?')) return;

    try {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;

      setProperties(properties.filter((p) => p.id !== id));
      calculateStats(properties.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Erreur lors de la suppression de la propriété');
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FAF7F4] min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#F16522]" />
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F4] min-h-screen pb-8">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-b-2xl lg:rounded-[28px] px-4 sm:px-6 lg:px-8 py-6 shadow-lg">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center shadow-md">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Gestion des Biens
                </h1>
                <p className="text-[#EFEBE9] text-sm">
                  {stats.total} propriété{stats.total > 1 ? 's' : ''} gérée{stats.total > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/agences/ajouter-bien')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F16522] hover:bg-[#E5551C] text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter un bien</span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B5A4E] text-sm font-medium">Total</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#2C1810] mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#FAF7F4] flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#F16522]" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B5A4E] text-sm font-medium">Disponibles</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">
                  {stats.disponible}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B5A4E] text-sm font-medium">Louées</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">
                  {stats.loue}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B5A4E] text-sm font-medium">En travaux</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">
                  {stats.maintenance}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-4 sm:p-6 shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B5A4E] text-sm font-medium">Valeur locative</p>
                <p className="text-lg sm:text-xl font-bold text-[#2C1810] mt-1">
                  {formatPrice(Math.round(stats.totalValue))} FCFA
                </p>
                <p className="text-xs text-[#6B5A4E]">
                  Moy: {formatPrice(Math.round(stats.avgRent))} FCFA/mois
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#FAF7F4] flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#F16522]" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B5A4E]" />
              <input
                type="text"
                placeholder="Rechercher un bien..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#FAF7F4] border-2 border-[#EFEBE9] rounded-xl focus:outline-none focus:border-[#F16522] transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#6B5A4E]" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-[#FAF7F4] border-2 border-[#EFEBE9] rounded-xl focus:outline-none focus:border-[#F16522] transition-colors pr-8"
              >
                <option value="all">Tous les statuts</option>
                <option value="disponible">Disponibles</option>
                <option value="loue">Louées</option>
                <option value="maintenance">En travaux</option>
                <option value="en_attente">En attente</option>
                <option value="retire">Retirés</option>
              </select>
            </div>
          </div>
        </div>

        {/* Properties Grid */}
        {filteredProperties.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-8 sm:p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#FAF7F4] flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-[#6B5A4E]" />
            </div>
            <h3 className="text-xl font-semibold text-[#2C1810] mb-2">
              {searchQuery || filterStatus !== 'all'
                ? 'Aucun bien trouvé'
                : 'Aucun bien enregistré'}
            </h3>
            <p className="text-[#6B5A4E] mb-6">
              {searchQuery || filterStatus !== 'all'
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par ajouter votre premier bien'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <button
                onClick={() => navigate('/agences/ajouter-bien')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F16522] hover:bg-[#E5551C] text-white rounded-xl font-medium transition-all"
              >
                <Plus className="w-5 h-5" />
                Ajouter un bien
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-2xl border-2 border-[#EFEBE9] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Property Image */}
                <div className="relative h-48 bg-[#FAF7F4]">
                  {property.main_image ? (
                    <img
                      src={property.main_image}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-[#EFEBE9]" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    {getStatusBadge(property.status)}
                  </div>
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-[#2C1810]">
                    {formatPrice(property.price)} FCFA
                    <span className="text-xs font-normal text-[#6B5A4E]">/mois</span>
                  </div>
                </div>

                {/* Property Details */}
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-[#2C1810] mb-2 line-clamp-1">
                    {property.title}
                  </h3>

                  <div className="flex items-center text-sm text-[#6B5A4E] mb-3">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {property.neighborhood && `${property.neighborhood}, `}
                      {property.city}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-[#6B5A4E] mb-4 pb-4 border-b border-[#EFEBE9]">
                    <div className="flex items-center gap-1">
                      <Maximize className="w-4 h-4" />
                      <span>{property.surface_area} m²</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      <span>{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4" />
                      <span>{property.bathrooms}</span>
                    </div>
                  </div>

                  {/* Owner Info */}
                  {property.owner && (
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#EFEBE9]">
                      <div className="w-10 h-10 rounded-full bg-[#FAF7F4] flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#6B5A4E]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2C1810] truncate">
                          {property.owner.full_name}
                        </p>
                        <p className="text-xs text-[#6B5A4E] truncate">
                          {property.owner.email}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6B5A4E]">
                      Ajoutée le {formatDate(property.created_at)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/agences/biens/${property.id}`)}
                        className="p-2 rounded-lg hover:bg-[#FAF7F4] text-[#6B5A4E] hover:text-[#F16522] transition-colors"
                        title="Voir"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/agences/biens/${property.id}/edit`)}
                        className="p-2 rounded-lg hover:bg-[#FAF7F4] text-[#6B5A4E] hover:text-[#F16522] transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-[#6B5A4E] hover:text-red-600 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
