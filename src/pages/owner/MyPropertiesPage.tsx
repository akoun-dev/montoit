import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, MapPin, Users, Calendar, Edit, Eye, Plus, Building2, Trash2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';

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
}

export default function MyPropertiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'disponible' | 'loue' | 'en_attente' | 'maintenance'>('all');

  useEffect(() => {
    fetchProperties();
  }, [user]);

  const fetchProperties = async () => {
    if (!user) return;

    // First, fetch properties with main_image (if column exists)
    const { data: propertiesData, error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
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

    setLoading(false);
  };

  const filteredProperties = properties.filter(
    (property) => filter === 'all' || property.status === filter
  );

  const handleDeleteProperty = async (propertyId: string) => {
    if (
      !confirm(
        'Êtes-vous sûr de vouloir supprimer cette propriété ? Cette action est irréversible.'
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)
        .eq('owner_id', user?.id);

      if (error) {
        console.error('Error deleting property:', error);
        alert('Erreur lors de la suppression de la propriété');
      } else {
        setProperties(properties.filter((p) => p.id !== propertyId));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Une erreur est survenue');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponible':
        return (
          <span className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
            Disponible
          </span>
        );
      case 'loue':
        return (
          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
            Loué
          </span>
        );
      case 'en_attente':
        return (
          <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
            En attente
          </span>
        );
      case 'maintenance':
        return (
          <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 text-xs font-semibold rounded-full border border-yellow-200">
            Maintenance
          </span>
        );
      default:
        return (
          <span className="px-3 py-1.5 bg-gray-50 text-gray-700 text-xs font-semibold rounded-full border border-gray-200">
            Inconnu
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[#2C1810]">
        <div className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Biens</h1>
                <p className="text-[#E8D4C5] mt-1">Gérez votre portefeuille immobilier</p>
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
          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-[#FFF5F0] p-2 rounded-xl">
                <Building2 className="h-5 w-5 text-[#F16522]" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Total</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">{properties.length}</p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-50 p-2 rounded-xl">
                <Home className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Disponibles</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">
              {properties.filter((p) => p.status === 'disponible').length}
            </p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-50 p-2 rounded-xl">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">Loués</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">
              {properties.filter((p) => p.status === 'loue').length}
            </p>
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-50 p-2 rounded-xl">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-sm text-[#6B5A4E]">En maintenance</span>
            </div>
            <p className="text-3xl font-bold text-[#2C1810]">
              {properties.filter((p) => p.status === 'maintenance').length}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'all', label: 'Tous' },
            { value: 'disponible', label: 'Disponibles' },
            { value: 'loue', label: 'Loués' },
            { value: 'maintenance', label: 'Maintenance' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value as any)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                filter === item.value
                  ? 'bg-[#F16522] text-white shadow-lg'
                  : 'bg-white text-[#6B5A4E] hover:bg-[#FFF5F0] border border-[#EFEBE9]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Properties List */}
        <div className="bg-white rounded-[20px] border border-[#EFEBE9] overflow-hidden">
          {filteredProperties.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-[#FFF5F0] rounded-full flex items-center justify-center mx-auto mb-6">
                <Home className="w-10 h-10 text-[#F16522]" />
              </div>
              <h3 className="text-xl font-semibold text-[#2C1810] mb-3">Aucune propriété</h3>
              <p className="text-[#6B5A4E] mb-8 max-w-md mx-auto">
                {filter === 'all'
                  ? "Vous n'avez pas encore ajouté de bien à votre portefeuille"
                  : `Aucun bien ${
                      filter === 'disponible'
                        ? 'disponible'
                        : filter === 'loue'
                          ? 'loué'
                          : filter === 'en_attente'
                            ? 'en attente'
                            : 'en maintenance'
                    }`}
              </p>
              {filter === 'all' && (
                <Link
                  to="/proprietaire/ajouter-propriete"
                  className="inline-flex items-center gap-3 bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-8 rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter votre premier bien
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FBFAF9] border-b border-[#EFEBE9]">
                  <tr>
                    <th className="text-left p-6 font-semibold text-[#2C1810]">Image</th>
                    <th className="text-left p-6 font-semibold text-[#2C1810]">Propriété</th>
                    <th className="text-left p-6 font-semibold text-[#2C1810]">Localisation</th>
                    <th className="text-left p-6 font-semibold text-[#2C1810]">Loyer</th>
                    <th className="text-left p-6 font-semibold text-[#2C1810]">Statut</th>
                    <th className="text-left p-6 font-semibold text-[#2C1810]">Candidatures</th>
                    <th className="text-left p-6 font-semibold text-[#2C1810]">Vues</th>
                    <th className="text-left p-6 font-semibold text-[#2C1810]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((property) => (
                    <tr
                      key={property.id}
                      className="border-b border-[#EFEBE9] hover:bg-[#FBFAF9] transition-colors"
                    >
                      <td className="p-6">
                        <div className="relative">
                          {property.main_image ? (
                            <div className="relative group">
                              <img
                                src={property.main_image}
                                alt={property.title}
                                className="w-20 h-20 rounded-xl object-cover border border-[#EFEBE9]"
                              />
                              {/* Badge showing number of images if more than 1 */}
                              {property.images_count && property.images_count > 1 && (
                                <div className="absolute -top-2 -right-2 bg-[#F16522] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white">
                                  {property.images_count}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-[#FAF7F4] border border-[#EFEBE9] flex items-center justify-center relative">
                              <ImageIcon className="w-8 h-8 text-[#A69B95]" />
                              {/* Badge showing number of images if any */}
                              {property.images_count && property.images_count > 0 && (
                                <div className="absolute -top-2 -right-2 bg-[#F16522] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white">
                                  {property.images_count}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <div>
                          <h4 className="font-semibold text-[#2C1810]">{property.title}</h4>
                          <p className="text-sm text-[#6B5A4E]">{property.type}</p>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2 text-sm text-[#6B5A4E]">
                          <MapPin className="w-4 h-4 text-[#F16522]" />
                          {property.city}, {property.neighborhood}
                        </div>
                      </td>
                      <td className="p-6 font-semibold text-[#2C1810]">
                        {property.price?.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="p-6">{getStatusBadge(property.status)}</td>
                      <td className="p-6 text-sm text-[#6B5A4E]">
                        {property.applications_count || 0} candidature(s)
                      </td>
                      <td className="p-6 text-sm text-[#6B5A4E]">{property.views_count || 0}</td>
                      <td className="p-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/propriete/${property.id}`)}
                            className="p-2.5 hover:bg-[#FBFAF9] rounded-xl transition-colors group"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-[#6B5A4E] group-hover:text-[#F16522]" />
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/proprietaire/ajouter-propriete?edit=${property.id}`)
                            }
                            className="p-2.5 hover:bg-[#FBFAF9] rounded-xl transition-colors group"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4 text-[#6B5A4E] group-hover:text-[#F16522]" />
                          </button>
                          <button
                            onClick={() => handleDeleteProperty(property.id)}
                            className="p-2.5 hover:bg-red-50 rounded-xl transition-colors group"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-[#6B5A4E] group-hover:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
