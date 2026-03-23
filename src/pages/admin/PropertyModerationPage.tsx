import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Ban,
  ExternalLink,
  Calendar,
  Image as ImageIcon,
  MapPin,
  DollarSign,
  Users,
  Shield,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/ui/Button';
import { toast } from '@/hooks/shared/useSafeToast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Textarea } from '@/shared/ui/textarea';

// Types
type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
type PropertyType = 'apartment' | 'house' | 'villa' | 'studio' | 'office' | 'retail' | 'land' | 'other';

interface PropertyForModeration {
  id: string;
  title: string;
  type: PropertyType;
  description: string;
  city: string;
  neighborhood: string | null;
  address: string | null;
  price: number;
  surface_area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  main_image: string | null;
  images_count?: number;
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  status: ModerationStatus;
  moderation_status: ModerationStatus;
  views_count: number;
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
  moderated_at?: string;
  moderated_by?: string;
  is_verified?: boolean;
}

interface PropertyDetail extends PropertyForModeration {
  amenities: string[];
  furnished: boolean;
  parking: boolean;
  year_built: number | null;
  floor: number | null;
  images?: Array<{
    id: string;
    url: string;
    is_main: boolean;
  }>;
  applications_count?: number;
  favorites_count?: number;
}

// Configuration
const STATUS_CONFIG: Record<ModerationStatus, {
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
}> = {
  pending: {
    label: 'En attente',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    icon: Clock,
  },
  approved: {
    label: 'Approuvée',
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejetée',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: XCircle,
  },
  suspended: {
    label: 'Suspendue',
    color: 'text-purple-700',
    bg: 'bg-purple-100',
    icon: Ban,
  },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvées' },
  { value: 'rejected', label: 'Rejetées' },
  { value: 'suspended', label: 'Suspendues' },
];

export default function PropertyModerationPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PropertyForModeration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PropertyDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<ModerationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);

      // Récupérer toutes les propriétés avec info propriétaire
      const { data: propertiesData, error } = await supabase
        .from('properties')
        .select(`
          *,
          profiles:owner_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProperties = (propertiesData || []).map((prop: Record<string, unknown>) => ({
        ...prop,
        owner_name: prop.profiles?.full_name || 'Non renseigné',
        owner_email: prop.profiles?.email || '',
        moderation_status: prop.moderation_status || prop.status || 'pending',
      }));

      setProperties(formattedProperties as PropertyForModeration[]);

      // Calculer les stats
      const statsMap = {
        total: formattedProperties.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        suspended: 0,
      };

      formattedProperties.forEach((prop) => {
        const status = prop.moderation_status;
        if (status in statsMap) {
          statsMap[status as keyof typeof statsMap]++;
        }
      });

      setStats(statsMap);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Erreur lors du chargement des propriétés');
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyDetail = async (propertyId: string) => {
    try {
      // Récupérer les détails complets
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          profiles:owner_id(full_name, email)
        `)
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Propriété non trouvée');
        return;
      }

      // Récupérer les images
      const { data: images } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', propertyId)
        .order('is_main', { ascending: false });

      // Compter les candidatures et favoris
      const [{ count: applicationsCount }] = await Promise.all([
        supabase
          .from('rental_applications')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', propertyId),
        supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', propertyId),
      ]);

      setSelectedProperty({
        ...(data as Record<string, unknown>),
        owner_name: (data.profiles as Record<string, unknown> | null)?.full_name as string || 'Non renseigné',
        owner_email: (data.profiles as Record<string, unknown> | null)?.email as string || '',
        moderation_status: (data.moderation_status as string | null) || (data.status as string) || 'pending',
        images: images || [],
        applications_count: applicationsCount || 0,
        favorites_count: 0,
      } as PropertyDetail);
    } catch (error) {
      console.error('Error loading property details:', error);
      toast.error('Erreur lors du chargement des détails');
    }
  };

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesStatus = statusFilter === 'all' || property.moderation_status === statusFilter;
      const matchesSearch =
        searchQuery === '' ||
        property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.owner_name?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [properties, statusFilter, searchQuery]);

  const handleApprove = async (propertyId: string) => {
    setActionLoading(propertyId);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          moderation_status: 'approved',
          is_verified: true,
          moderated_at: new Date().toISOString(),
          moderated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast.success('Annonce approuvée avec succès');
      loadProperties();
    } catch (error) {
      console.error('Error approving property:', error);
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (propertyId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Veuillez indiquer la raison du rejet');
      return;
    }

    setActionLoading(propertyId);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          moderation_status: 'rejected',
          rejection_reason: rejectionReason,
          is_verified: false,
          moderated_at: new Date().toISOString(),
          moderated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast.success('Annonce rejetée');
      setShowRejectDialog(false);
      setRejectionReason('');
      loadProperties();
    } catch (error) {
      console.error('Error rejecting property:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (propertyId: string) => {
    if (!suspendReason.trim()) {
      toast.error('Veuillez indiquer la raison de la suspension');
      return;
    }

    setActionLoading(propertyId);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          moderation_status: 'suspended',
          rejection_reason: suspendReason,
          is_verified: false,
          moderated_at: new Date().toISOString(),
          moderated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast.success('Annonce suspendue');
      setShowSuspendDialog(false);
      setSuspendReason('');
      loadProperties();
    } catch (error) {
      console.error('Error suspending property:', error);
      toast.error('Erreur lors de la suspension');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (propertyId: string) => {
    setActionLoading(propertyId);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          moderation_status: 'approved',
          is_verified: true,
          rejection_reason: null,
          moderated_at: new Date().toISOString(),
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast.success('Annonce réactivée');
      loadProperties();
    } catch (error) {
      console.error('Error reactivating property:', error);
      toast.error('Erreur lors de la réactivation');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CI', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Modération des Annonces
                </h1>
                <p className="text-gray-600">
                  Valider, rejeter ou suspendre les annonces immobilières
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50 text-gray-700 border-gray-200' },
              { label: 'En attente', value: stats.pending, color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { label: 'Approuvées', value: stats.approved, color: 'bg-green-50 text-green-700 border-green-200' },
              { label: 'Rejetées', value: stats.rejected, color: 'bg-red-50 text-red-700 border-red-200' },
              { label: 'Suspendues', value: stats.suspended, color: 'bg-purple-50 text-purple-700 border-purple-200' },
            ].map((stat) => (
              <div key={stat.label} className={`p-4 rounded-xl border ${stat.color}`}>
                <p className="text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-wrap gap-2 flex-1">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value as ModerationStatus | 'all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === option.value
                      ? 'bg-emerald-500 text-white shadow-md'
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
                placeholder="Rechercher par titre, ville, propriétaire..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Properties List */}
        {filteredProperties.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune annonce trouvée
            </h3>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Aucune annonce ne correspond à votre recherche'
                : 'Aucune annonce à modérer'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Propriété
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Propriétaire
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Prix
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Vues
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProperties.map((property) => {
                    const statusConfig = STATUS_CONFIG[property.moderation_status];
                    const StatusIcon = statusConfig.icon;
                    const isLoading = actionLoading === property.id;

                    return (
                      <tr key={property.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            {property.main_image ? (
                              <img
                                src={property.main_image}
                                alt={property.title}
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 line-clamp-1">
                                {property.title}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <MapPin className="w-3 h-3" />
                                {property.city}
                                {property.neighborhood && `, ${property.neighborhood}`}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                <span>{property.type}</span>
                                {property.surface_area && (
                                  <>
                                    <span>•</span>
                                    <span>{property.surface_area} m²</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">{property.owner_name}</p>
                            <p className="text-gray-500">{property.owner_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(property.price)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {property.views_count || 0}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="small"
                              onClick={() => loadPropertyDetail(property.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {property.moderation_status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="small"
                                  onClick={() => handleApprove(property.id)}
                                  disabled={isLoading}
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="small"
                                  onClick={() => {
                                    setSelectedProperty(property);
                                    setShowRejectDialog(true);
                                  }}
                                  disabled={isLoading}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {property.moderation_status === 'rejected' && (
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => handleReactivate(property.id)}
                                disabled={isLoading}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                {isLoading ? (
                                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            {property.moderation_status === 'approved' && (
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => {
                                  setSelectedProperty(property);
                                  setShowSuspendDialog(true);
                                }}
                                disabled={isLoading}
                                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                            {property.moderation_status === 'suspended' && (
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => handleReactivate(property.id)}
                                disabled={isLoading}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                {isLoading ? (
                                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="small"
                              onClick={() => window.open(`/propriete/${property.id}`, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Property Detail Modal */}
      {selectedProperty && (
        <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Home className="h-6 w-6" />
                Détails de l'annonce
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Images */}
              {selectedProperty.images && selectedProperty.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {selectedProperty.images.map((image, index) => (
                    <div
                      key={image.id}
                      className={`aspect-video rounded-lg overflow-hidden ${
                        image.is_main ? 'ring-2 ring-emerald-500' : ''
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={`${selectedProperty.title} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {selectedProperty.title}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>
                        {selectedProperty.city}, {selectedProperty.neighborhood}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-lg">
                        {formatCurrency(selectedProperty.price)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-600">
                      <span>{selectedProperty.type}</span>
                      {selectedProperty.bedrooms && (
                        <span>{selectedProperty.bedrooms} chambres</span>
                      )}
                      {selectedProperty.surface_area && (
                        <span>{selectedProperty.surface_area} m²</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Propriétaire</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-900">{selectedProperty.owner_name}</p>
                    <p className="text-gray-500">{selectedProperty.owner_email}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <Eye className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedProperty.views_count}
                  </p>
                  <p className="text-xs text-gray-500">Vues</p>
                </div>
                <div className="text-center">
                  <Users className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedProperty.applications_count || 0}
                  </p>
                  <p className="text-xs text-gray-500">Candidatures</p>
                </div>
                <div className="text-center">
                  <Calendar className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                  <p className="text-sm text-gray-600">
                    {new Date(selectedProperty.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-xs text-gray-500">Publié</p>
                </div>
              </div>

              {/* Description */}
              {selectedProperty.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedProperty.description}
                  </p>
                </div>
              )}

              {/* Rejection reason */}
              {selectedProperty.rejection_reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">
                    Raison du rejet/suspension
                  </h4>
                  <p className="text-sm text-red-700">{selectedProperty.rejection_reason}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedProperty(null)}>
                Fermer
              </Button>
              <Button
                onClick={() => window.open(`/propriete/${selectedProperty.id}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir l'annonce
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Rejeter l'annonce
            </DialogTitle>
            <DialogDescription>
              Cette action empêchera l'annonce d'être visible sur la plateforme.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Annonce:</strong> {selectedProperty?.title}
              </p>
            </div>

            <label className="block text-sm font-medium text-gray-900 mb-2">
              Raison du rejet *
            </label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Expliquez pourquoi cette annonce ne peut pas être publiée..."
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedProperty && handleReject(selectedProperty.id)}
              disabled={!rejectionReason.trim()}
            >
              Rejeter l'annonce
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <Ban className="w-5 h-5" />
              Suspendre l'annonce
            </DialogTitle>
            <DialogDescription>
              Cette action masquera temporairement l'annonce sur la plateforme.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Annonce:</strong> {selectedProperty?.title}
              </p>
            </div>

            <label className="block text-sm font-medium text-gray-900 mb-2">
              Raison de la suspension *
            </label>
            <Textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Expliquez pourquoi cette annonce doit être suspendue..."
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedProperty && handleSuspend(selectedProperty.id)}
              disabled={!suspendReason.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Suspendre l'annonce
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
