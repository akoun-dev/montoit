import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MapPin, Bed, Bath, X, Home, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';
import { AddressValue, formatAddress } from '@/shared/utils/address';

interface Favorite {
  id: string;
  property_id: string | null;
  created_at: string | null;
  property: {
    id: string;
    title: string;
    address: AddressValue;
    city: string;
    neighborhood: string | null;
    property_type: string;
    rooms: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    surface_area: number | null;
    price: number;
    status: string | null;
    main_image: string | null;
  } | null;
}

export default function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(
          `
          id,
          property_id,
          created_at,
          properties(
            id,
            title,
            address,
            city,
            neighborhood,
            property_type,
            rooms,
            bedrooms,
            bathrooms,
            surface_area,
            price,
            status,
            main_image
          )
        `
        )
        .eq('user_id', user?.id ?? '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedFavorites = (data || []).map((fav: any) => ({
        id: fav.id,
        property_id: fav.property_id,
        created_at: fav.created_at,
        property: fav.properties,
      }));

      setFavorites(formattedFavorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    if (!confirm('Retirer cette propriété de vos favoris ?')) return;

    try {
      const { error } = await supabase.from('favorites').delete().eq('id', favoriteId);

      if (error) throw error;

      setFavorites(favorites.filter((f) => f.id !== favoriteId));
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Erreur lors de la suppression du favori');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Connexion requise</h2>
          <p className="text-neutral-600">Veuillez vous connecter pour voir vos favoris</p>
        </div>
      </div>
    );
  }

  return (
    <TenantDashboardLayout title="Mes Favoris">
      <div className="w-full">
        {/* Header Banner */}
        <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center flex-shrink-0">
              <Heart className="h-6 w-6 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Favoris</h1>
              <p className="text-[#E8D4C5] mt-1">
                {favorites.length}{' '}
                {favorites.length === 1 ? 'propriété sauvegardée' : 'propriétés sauvegardées'}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Heart className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Aucun favori</h3>
            <p className="text-neutral-600 mb-6">
              Explorez nos propriétés et ajoutez vos préférées à vos favoris
            </p>
            <Link
              to="/recherche"
              className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
            >
              Rechercher des propriétés
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden group"
              >
                <div className="relative">
                  <img
                    src={favorite.property?.main_image || 'https://via.placeholder.com/400x300'}
                    alt={favorite.property?.title}
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => removeFavorite(favorite.id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:bg-red-500 hover:text-white transition shadow-lg"
                    title="Retirer des favoris"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold">
                    {favorite.property?.status}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-neutral-900 mb-2 line-clamp-1">
                    {favorite.property?.title}
                  </h3>

                  <div className="flex items-start space-x-2 text-neutral-600 mb-3">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm line-clamp-2">
                      {formatAddress(favorite.property?.address, favorite.property?.city)}
                      {favorite.property?.neighborhood && ` - ${favorite.property.neighborhood}`}
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 mb-3 text-sm text-neutral-600">
                    <div className="flex items-center space-x-1">
                      <Home className="w-4 h-4" />
                      <span>{favorite.property?.property_type}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Bed className="w-4 h-4" />
                      <span>
                        {favorite.property?.bedrooms ?? favorite.property?.rooms ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Bath className="w-4 h-4" />
                      <span>{favorite.property?.bathrooms_count ?? 0}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-2xl font-bold text-primary-500">
                      {favorite.property?.price?.toLocaleString() || 'Prix sur demande'} FCFA
                      <span className="text-sm text-neutral-500 font-normal">/mois</span>
                    </p>
                  </div>

                  <div className="border-t pt-3 flex items-center justify-between text-xs text-neutral-500">
                    <span>Ajouté le {formatDate(favorite.created_at)}</span>
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <Link
                      to={`/propriete/${favorite.property?.id}`}
                      className="block w-full py-2 bg-primary-500 text-white text-center rounded-lg hover:bg-primary-600 transition font-semibold"
                    >
                      Voir les détails
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TenantDashboardLayout>
  );
}
