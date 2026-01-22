import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  MapPin,
  Users,
  Calendar,
  Edit,
  Eye,
  Plus,
  Building2,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Camera,
  CheckCircle2,
  Clock,
  Wrench,
  Ban,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';

interface Property {
  id: string;
  title: string;
  type: string;
  city: string;
  neighborhood: string;
  price: number;
  status: 'disponible' | 'loue' | 'en_attente' | 'retire' | 'maintenance';
  created_at: string;
  applications_count?: number;
  views_count: number;
  main_image: string | null;
  images_count?: number;
  has_image?: boolean;
  surface_area?: number;
  bedrooms?: number;
}

// Status configuration
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  disponible: {
    label: 'Disponible',
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: CheckCircle2,
  },
  loue: {
    label: 'Loué',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    icon: Users,
  },
  en_attente: {
    label: 'En attente',
    color: 'text-purple-700',
    bg: 'bg-purple-100',
    icon: Clock,
  },
  maintenance: {
    label: 'Maintenance',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    icon: Wrench,
  },
  retire: {
    label: 'Retiré',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: Ban,
  },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'disponible', label: 'Disponibles' },
  { value: 'loue', label: 'Loués' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'maintenance', label: 'Maintenance' },
];

// Helper components
const StatCard = ({
  icon: Icon,
  label,
  value,
  color = 'gray',
  onClick,
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: 'gray' | 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'amber';
  onClick?: () => void;
}) => {
  const colors = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
    red: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border transition-all cursor-pointer ${colors[color]}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color === 'gray' ? 'bg-gray-200' : 'bg-white'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.disponible;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount);

export default function MyPropertiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'disponible' | 'loue' | 'en_attente' | 'maintenance'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchProperties();
  }, [user]);

  const fetchProperties = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First, fetch properties with main_image (if column exists)
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError);
        toast.error('Erreur lors du chargement des propriétés');
        setLoading(false);
        return;
      }

      // Then, for each property, count applications and images separately
      if (propertiesData) {
        const propertiesWithCounts = await Promise.all(
          propertiesData.map(async (property: any) => {
            // Count applications
            const { count: appsCount, error: appsError } = await supabase
              .from('rental_applications')
              .select('*', { count: 'exact', head: true })
              .eq('property_id', property.id);

            // Try to count total images from property_images table (may not exist)
            let imagesCount = 0;
            try {
              const { count, error } = await supabase
                .from('property_images')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', property.id);
              if (!error && count) {
                imagesCount = count;
              }
            } catch {
              // Table property_images doesn't exist, use 0 as default
              imagesCount = 0;
            }

            // Determine if property has any image (from main_image or images count)
            const hasImage = !!(property.main_image || property.image_url || imagesCount > 0);

            return {
              ...property,
              applications_count: appsError ? 0 : appsCount || 0,
              images_count: imagesCount,
              // Handle main_image field compatibility
              main_image: property.main_image || property.image_url || null,
              // Helper to determine if we should show image badge
              has_image: hasImage,
            };
          })
        );

        setProperties(propertiesWithCounts);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter((property) => {
    const matchesFilter = filter === 'all' || property.status === filter;
    const matchesSearch =
      searchQuery === '' ||
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.neighborhood.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDeleteProperty = async (propertyId: string) => {
    if (
      !confirm(
        'Êtes-vous sûr de vouloir supprimer cette propriété ? Cette action est irréversible.'
      )
    ) {
      return;
    }

    setActionLoading(propertyId);
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)
        .eq('owner_id', user?.id);

      if (error) {
        console.error('Error deleting property:', error);
        toast.error('Erreur lors de la suppression de la propriété');
      } else {
        setProperties(properties.filter((p) => p.id !== propertyId));
        toast.success('Propriété supprimée avec succès');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Veuillez vous connecter</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Calculate stats
  const totalRevenue = properties
    .filter((p) => p.status === 'loue')
    .reduce((sum, p) => sum + (p.price || 0), 0);
  const availableProperties = properties.filter((p) => p.status === 'disponible').length;
  const totalViews = properties.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const pendingApplications = properties.reduce(
    (sum, p) => sum + (p.applications_count || 0),
    0
  );

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Mes Biens</h1>
                <p className="text-sm text-gray-500">Gérez votre portefeuille immobilier</p>
              </div>
            </div>

            <Link
              to="/proprietaire/ajouter-propriete"
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un bien</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            icon={Building2}
            label="Total"
            value={properties.length}
          />
          <StatCard
            icon={CheckCircle2}
            label="Disponibles"
            value={availableProperties}
            color="green"
          />
          <StatCard
            icon={Users}
            label="Loués"
            value={properties.filter((p) => p.status === 'loue').length}
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="En attente"
            value={properties.filter((p) => p.status === 'en_attente').length}
            color="purple"
          />
          <StatCard
            icon={Wrench}
            label="Maintenance"
            value={properties.filter((p) => p.status === 'maintenance').length}
            color="amber"
          />
          <StatCard
            icon={Ban}
            label="Retirés"
            value={properties.filter((p) => p.status === 'retire').length}
            color="red"
          />
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">Revenu mensuel</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Vues totales</p>
                <p className="text-2xl font-bold text-blue-800">
                  {totalViews.toLocaleString('fr-FR')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-5 border border-purple-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-700 font-medium">Candidatures</p>
                <p className="text-2xl font-bold text-purple-800">
                  {pendingApplications}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-wrap gap-2 flex-1">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === option.value
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Properties List */}
        {filteredProperties.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun bien</h3>
            <p className="text-gray-500 mb-4">
              {filter !== 'all'
                ? `Aucun bien ne correspond au filtre "${filter}"`
                : "Vous n'avez pas encore ajouté de bien à votre portefeuille"}
            </p>
            {filter === 'all' && (
              <Link
                to="/proprietaire/ajouter-propriete"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg"
              >
                <Plus className="h-5 w-5" />
                Ajouter votre premier bien
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => {
              const isLoading = actionLoading === property.id;

              return (
                <div
                  key={property.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden group"
                >
                  {/* Property Image */}
                  <div className="relative h-48 bg-gray-100 overflow-hidden">
                    {property.main_image ? (
                      <img
                        src={property.main_image}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-16 w-16 text-gray-300" />
                      </div>
                    )}

                    {/* Images count badge */}
                    {property.images_count > 1 && (
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                        <Camera className="w-3.5 h-3.5 text-gray-600" />
                        <span className="text-xs font-semibold text-gray-700">
                          {property.images_count}
                        </span>
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={property.status} />
                    </div>
                  </div>

                  {/* Property Content */}
                  <div className="p-5">
                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-1">
                      {property.title}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {property.city}, {property.neighborhood}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      {property.bedrooms && (
                        <div className="flex items-center gap-1.5">
                          <Home className="w-4 h-4" />
                          <span>{property.bedrooms} p</span>
                        </div>
                      )}
                      {property.surface_area && (
                        <div className="flex items-center gap-1.5">
                          <span>{property.surface_area} m²</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">{property.type}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <p className="text-xl font-bold text-orange-600">
                        {formatCurrency(property.price)}
                      </p>
                      <p className="text-xs text-gray-500">/ mois</p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>{property.views_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span>{property.applications_count || 0}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/propriete/${property.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Voir</span>
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/proprietaire/ajouter-propriete?edit=${property.id}`)
                        }
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Modifier</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property.id)}
                        disabled={isLoading}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
