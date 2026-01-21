import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  Share2,
  Calendar,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Car,
  Zap,
  Building,
  Home,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import MapWrapper from '@/shared/ui/MapWrapper';
import { useAuth } from '@/app/providers/AuthProvider';
import { getCreateContractRoute } from '@/shared/config/routes.config';
import { OwnerBadge } from '@/shared/ui';
import { AddressValue, formatAddress } from '@/shared/utils/address';

// Extended property type with new columns and owner profile
interface Property {
  id: string;
  title: string;
  description: string | null;
  address: AddressValue;
  city: string;
  neighborhood: string | null;
  property_type: string;
  property_category: string | null;
  status: string | null;
  monthly_rent: number;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  surface_area: number | null;
  furnished: boolean | null;
  has_parking: boolean | null;
  has_garden: boolean | null;
  has_ac: boolean | null;
  amenities: string[] | null;
  images: string[] | null;
  main_image: string | null;
  latitude: number | null;
  longitude: number | null;
  views_count: number | null;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Gestion anonyme
  is_anonymous: boolean | null;
  // Owner profile fields
  owner_trust_score?: number | null;
  owner_full_name?: string | null;
  owner_avatar_url?: string | null;
  owner_is_verified?: boolean | null;
  owner_oneci_verified?: boolean | null;
  owner_city?: string | null;
  // Managing agency (if anonymous)
  managing_agency_name?: string | null;
}

interface ImageGalleryProps {
  images: string[];
  title: string;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

// Use reliable external image as fallback
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80';

function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.target as HTMLImageElement;
  const currentSrc = target.src;
  // Only set fallback if not already using it
  if (!currentSrc.includes(FALLBACK_IMAGE)) {
    target.src = FALLBACK_IMAGE;
    target.onerror = null; // Prevent infinite loop
  }
}

function ImageGallery({ images, title, currentIndex, onIndexChange }: ImageGalleryProps) {
  const displayImages = !images || images.length === 0 ? [FALLBACK_IMAGE] : images;

  return (
    <div className="space-y-4">
      <div className="relative h-[400px] md:h-[500px] lg:h-[600px] bg-neutral-100 rounded-xl overflow-hidden">
        <img
          src={displayImages[currentIndex]}
          alt={`${title} - Image ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
          loading="eager"
          onError={handleImageError}
        />

        {displayImages.length > 1 && (
          <>
            <button
              onClick={() =>
                onIndexChange(currentIndex === 0 ? displayImages.length - 1 : currentIndex - 1)
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105"
              aria-label="Image précédente"
            >
              <ChevronLeft className="h-6 w-6 text-neutral-700" />
            </button>
            <button
              onClick={() => onIndexChange((currentIndex + 1) % displayImages.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105"
              aria-label="Image suivante"
            >
              <ChevronRight className="h-6 w-6 text-neutral-700" />
            </button>
          </>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 text-white rounded-full text-sm font-semibold">
          {currentIndex + 1} / {displayImages.length}
        </div>

        <div className="absolute top-4 right-4 flex gap-2">
          <button
            className="w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
            aria-label="Ajouter aux favoris"
          >
            <Heart className="h-5 w-5 text-neutral-700" />
          </button>
          <button
            className="w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
            aria-label="Partager"
          >
            <Share2 className="h-5 w-5 text-neutral-700" />
          </button>
        </div>
      </div>

      {displayImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => onIndexChange(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                index === currentIndex
                  ? 'border-primary-500 shadow-lg'
                  : 'border-neutral-200 hover:border-primary-300'
              }`}
              aria-label={`Voir l'image ${index + 1}`}
            >
              <img
                src={image}
                alt={`Miniature ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={handleImageError}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface PropertyFeaturesProps {
  property: Property;
}

function PropertyFeatures({ property }: PropertyFeaturesProps) {
  const features = [];

  if (property.bedrooms) {
    features.push({
      icon: <Bed className="h-6 w-6" />,
      label: 'Chambres',
      value: property.bedrooms.toString(),
      color: 'text-primary-500',
    });
  }

  if (property.bathrooms) {
    features.push({
      icon: <Bath className="h-6 w-6" />,
      label: 'Salles de bain',
      value: property.bathrooms.toString(),
      color: 'text-primary-500',
    });
  }

  if (property.surface_area) {
    features.push({
      icon: <Maximize className="h-6 w-6" />,
      label: 'Surface',
      value: `${property.surface_area} m²`,
      color: 'text-primary-500',
    });
  }

  if (property.has_parking) {
    features.push({
      icon: <Car className="h-6 w-6" />,
      label: 'Parking',
      value: 'Disponible',
      color: 'text-primary-500',
    });
  }

  if (property.property_type) {
    const propertyTypeLabels: Record<string, string> = {
      maison: 'Maison',
      appartement: 'Appartement',
      villa: 'Villa',
      studio: 'Studio',
      duplex: 'Duplex',
      chambre: 'Chambre',
      bureau: 'Bureau',
      commerce: 'Commerce',
      entrepot: 'Entrepôt',
      terrain: 'Terrain',
    };
    features.push({
      icon:
        property.property_type === 'maison' || property.property_type === 'villa' ? (
          <Home className="h-6 w-6" />
        ) : (
          <Building className="h-6 w-6" />
        ),
      label: 'Type de bien',
      value: propertyTypeLabels[property.property_type] || property.property_type,
      color: 'text-primary-500',
    });
  }

  const amenities = [
    {
      key: 'parking',
      available: property.has_parking,
      label: 'Parking',
      icon: <Car className="h-5 w-5" />,
    },
    {
      key: 'garden',
      available: property.has_garden,
      label: 'Jardin',
      icon: <CheckCircle className="h-5 w-5" />,
    },
    {
      key: 'furnished',
      available: property.furnished,
      label: 'Meublé',
      icon: <CheckCircle className="h-5 w-5" />,
    },
    {
      key: 'ac',
      available: property.has_ac,
      label: 'Climatisation',
      icon: <Zap className="h-5 w-5" />,
    },
  ].filter((a) => a.available);

  amenities.slice(0, 4).forEach((amenity) => {
    features.push({
      icon: amenity.icon,
      label: amenity.label,
      value: 'Disponible',
      color: 'text-semantic-success',
    });
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {features.map((feature, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-100"
        >
          <div className={`${feature.color}`}>{feature.icon}</div>
          <div>
            <div className="text-sm text-neutral-500">{feature.label}</div>
            <div className="font-semibold text-neutral-900">{feature.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface StickyCTABarProps {
  propertyId: string;
  isOwnerOrAgency?: boolean;
}

function StickyCTABar({ propertyId, isOwnerOrAgency }: StickyCTABarProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 shadow-lg z-50 md:hidden">
      <div className="flex gap-3 max-w-sm mx-auto">
        {isOwnerOrAgency ? (
          <button
            onClick={() => navigate(getCreateContractRoute(propertyId))}
            className="flex-1 px-4 py-3 bg-semantic-success text-white font-semibold rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="h-5 w-5" />
            <span>Créer contrat</span>
          </button>
        ) : (
          <>
            <button
              onClick={() =>
                navigate(`/locataire/visiter/${propertyId}`, {
                  state: { property },
                })
              }
              className="flex-1 px-4 py-3 border-2 border-primary-500 text-primary-500 font-semibold rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="h-5 w-5" />
              <span>Planifier visite</span>
            </button>
            <button
              onClick={() =>
                navigate(`/locataire/candidature/${propertyId}`, {
                  state: { property },
                })
              }
              className="flex-1 px-4 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Postuler
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Geographic boundaries for Abidjan communes (simplified validation)
const ABIDJAN_COORDINATES: Record<string, { lat: [number, number]; lng: [number, number] }> = {
  abidjan: { lat: [5.25, 5.45], lng: [-3.95, -4.05] },
  cocody: { lat: [5.32, 5.42], lng: [-3.95, -4.05] },
  plateau: { lat: [5.33, 5.36], lng: [-4.00, -4.04] },
  yopougon: { lat: [5.35, 5.42], lng: [-4.00, -4.10] },
  abobo: { lat: [5.42, 5.48], lng: [-4.00, -4.08] },
  mare: { lat: [5.28, 5.35], lng: [-4.05, -4.12] },
  koumassi: { lat: [5.28, 5.33], lng: [-4.00, -4.08] },
  marcory: { lat: [5.28, 5.32], lng: [-4.00, -4.05] },
  treichville: { lat: [5.28, 5.32], lng: [-3.98, -4.02] },
  portbouet: { lat: [5.25, 5.30], lng: [-3.95, -4.02] },
  vridi: { lat: [5.25, 5.30], lng: [-3.92, -3.98] },
  bingerville: { lat: [5.20, 5.28], lng: [-3.85, -3.95] },
};

interface LocationWarningProps {
  city: string;
  neighborhood: string | null;
  latitude: number;
  longitude: number;
}

function LocationWarning({ city, neighborhood, latitude, longitude }: LocationWarningProps) {
  // Normalize city name for comparison
  const normalizedCity = city?.toLowerCase().trim() || '';
  const normalizedNeighborhood = neighborhood?.toLowerCase().trim() || '';

  // Check if coordinates are within expected boundaries for the declared city/neighborhood
  const isInExpectedBounds = useMemo(() => {
    // Check specific neighborhood first
    if (normalizedNeighborhood && ABIDJAN_COORDINATES[normalizedNeighborhood]) {
      const bounds = ABIDJAN_COORDINATES[normalizedNeighborhood];
      return (
        latitude >= bounds.lat[0] &&
        latitude <= bounds.lat[1] &&
        longitude >= bounds.lng[0] &&
        longitude <= bounds.lng[1]
      );
    }

    // Fall back to city
    if (normalizedCity && ABIDJAN_COORDINATES[normalizedCity]) {
      const bounds = ABIDJAN_COORDINATES[normalizedCity];
      return (
        latitude >= bounds.lat[0] &&
        latitude <= bounds.lat[1] &&
        longitude >= bounds.lng[0] &&
        longitude <= bounds.lng[1]
      );
    }

    // If we don't have boundary data, assume it's valid
    return true;
  }, [normalizedCity, normalizedNeighborhood, latitude, longitude]);

  // Don't show warning if coordinates are within expected bounds
  if (isInExpectedBounds) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 mb-1">Incohérence de localisation détectée</h3>
          <p className="text-sm text-amber-800">
            Les coordonnées GPS semblent ne pas correspondre à l'adresse indiquée (
            <span className="font-medium">
              {city}
              {neighborhood && `, ${neighborhood}`}
            </span>
            ). La carte affiche la position GPS réelle du bien.
          </p>
          <p className="text-xs text-amber-700 mt-2">
            Nous vous recommandons de vérifier l'emplacement exact avant toute visite.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const isOwnerOrAgency =
    user &&
    property &&
    (user.id === property.owner_id ||
      profile?.user_type === 'agence' ||
      profile?.user_type === 'proprietaire');

  useEffect(() => {
    if (id) {
      loadProperty(id);
    }
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setShowStickyBar(scrollPosition > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadProperty = async (propertyId: string) => {
    try {
      // Étape 1: Récupérer la propriété (sans jointure directe sur profiles)
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setLoadError('Propriété introuvable ou supprimée.');
        setProperty(null);
        return;
      }

      // Étape 2: Récupérer le profil public du propriétaire via RPC sécurisé
      let ownerProfile: {
        full_name: string | null;
        avatar_url: string | null;
        trust_score: number | null;
        is_verified: boolean | null;
        oneci_verified: boolean | null;
        city: string | null;
      } | null = null;

      if (data.owner_id) {
        const { data: profileData, error: profileError } = await supabase.rpc('get_public_profile', {
          profile_user_id: data.owner_id,
        });

        if (profileError) {
          console.warn('Error fetching owner profile:', profileError.message);
        }

        const profileRow = profileData?.[0];
        if (profileRow) {
          ownerProfile = {
            full_name: profileRow.full_name ?? null,
            avatar_url: profileRow.avatar_url ?? null,
            trust_score: profileRow.trust_score ?? null,
            is_verified: profileRow.is_verified ?? null,
            oneci_verified: profileRow.oneci_verified ?? null,
            city: profileRow.city ?? null,
          };
        }
      }

      // Étape 3: Si is_anonymous, récupérer le mandat actif pour avoir le nom de l'agence
      let managingAgencyName: string | null = null;

      if (data.is_anonymous) {
        const { data: mandateData } = await supabase
          .from('agency_mandates')
          .select(
            `
            agency:agencies(agency_name)
          `
          )
          .eq('property_id', propertyId)
          .eq('status', 'active')
          .maybeSingle();

        if (mandateData?.agency) {
          const agency = mandateData.agency as { agency_name: string } | null;
          managingAgencyName = agency?.agency_name ?? null;
        }
      }

      // Étape 4: Construire l'objet Property enrichi
      const propertyData = {
        ...data,
        status: data.status ?? undefined,
        is_anonymous: data.is_anonymous ?? false,
        owner_trust_score: ownerProfile?.trust_score ?? null,
        owner_full_name: ownerProfile?.full_name ?? null,
        owner_avatar_url: ownerProfile?.avatar_url ?? null,
        owner_is_verified: ownerProfile?.is_verified ?? null,
        owner_oneci_verified: ownerProfile?.oneci_verified ?? null,
        owner_city: ownerProfile?.city ?? null,
        managing_agency_name: managingAgencyName,
      } as unknown as Property;
      setProperty(propertyData);
    } catch (error) {
      console.error('Error loading property:', error);
      setLoadError('Propriété introuvable ou inaccessible.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-page flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-neutral-500 font-medium">Chargement de la propriété...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background-page flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Home className="h-10 w-10 text-neutral-400" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Propriété introuvable</h2>
          <p className="text-neutral-500 mb-8">Cette propriété n'existe pas ou a été supprimée</p>
          <button onClick={() => navigate('/recherche')} className="btn-primary w-full sm:w-auto">
            Retour à la recherche
          </button>
        </div>
      </div>
    );
  }

  const images = property.images?.length ? property.images : [FALLBACK_IMAGE];
  const displayPrice = property.monthly_rent ?? property.price;
  const formattedPrice = displayPrice != null ? displayPrice.toLocaleString() : null;

  return (
    <div className="min-h-screen bg-background-page">
      <header className="bg-white border-b border-neutral-100">
        <div className="container max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-neutral-50 hover:bg-neutral-100 rounded-full flex items-center justify-center transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-700" />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
              {property.title}
            </h1>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-12">
            <section>
              <ImageGallery
                images={images}
                title={property.title}
                currentIndex={currentImageIndex}
                onIndexChange={setCurrentImageIndex}
              />
            </section>

            <section className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-neutral-500">
                      <MapPin className="h-5 w-5" />
                      <span className="font-medium">
                        {property.city}, {property.neighborhood}
                      </span>
                    </div>
                    {(property.views_count ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-neutral-500">
                          {property.views_count} vue{(property.views_count ?? 0) > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-4xl md:text-5xl font-bold text-primary-500">
                    {formattedPrice ?? 'Prix sur demande'}
                  </span>
                  <span className="text-xl text-neutral-500 font-medium">FCFA/mois</span>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-neutral-900">Caractéristiques</h2>
                <PropertyFeatures property={property} />
              </div>

              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-neutral-900">Description</h2>
                <div className="prose prose-lg max-w-none">
                  <p className="text-neutral-700 leading-relaxed text-lg">
                    {property.description || 'Aucune description disponible pour ce bien.'}
                  </p>
                </div>
              </div>

              {(property.has_parking ||
                property.has_garden ||
                property.furnished ||
                property.has_ac) && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-neutral-900">Équipements</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.has_parking && (
                      <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                        <CheckCircle className="h-5 w-5 text-semantic-success flex-shrink-0" />
                        <span className="text-neutral-700 font-medium">Parking</span>
                      </div>
                    )}
                    {property.has_garden && (
                      <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                        <CheckCircle className="h-5 w-5 text-semantic-success flex-shrink-0" />
                        <span className="text-neutral-700 font-medium">Jardin</span>
                      </div>
                    )}
                    {property.furnished && (
                      <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                        <CheckCircle className="h-5 w-5 text-semantic-success flex-shrink-0" />
                        <span className="text-neutral-700 font-medium">Meublé</span>
                      </div>
                    )}
                    {property.has_ac && (
                      <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                        <CheckCircle className="h-5 w-5 text-semantic-success flex-shrink-0" />
                        <span className="text-neutral-700 font-medium">Climatisation</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-neutral-900">Localisation</h2>

                {/* Geographic inconsistency warning */}
                {property.longitude && property.latitude && (
                  <LocationWarning
                    city={property.city}
                    neighborhood={property.neighborhood}
                    latitude={property.latitude}
                    longitude={property.longitude}
                  />
                )}

                <div className="bg-neutral-50 rounded-xl overflow-hidden border border-neutral-200">
                  {property.longitude && property.latitude ? (
                    <MapWrapper
                      center={[property.longitude, property.latitude]}
                      zoom={15}
                      height="400px"
                      properties={[
                        {
                          id: property.id,
                          title: property.title,
                          latitude: property.latitude,
                          longitude: property.longitude,
                          monthly_rent: property.monthly_rent,
                          status: property.status ?? 'disponible',
                          city: property.city,
                        },
                      ]}
                    />
                  ) : (
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-500">Localisation non disponible</p>
                        <p className="text-sm text-neutral-400 mt-2">
                          {formatAddress(property.address, property.city)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Address display */}
                  <div className="p-4 bg-white border-t border-neutral-200">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-neutral-900">
                          {property.city}
                          {property.neighborhood && `, ${property.neighborhood}`}
                        </p>
                        {property.address && (
                          <p className="text-sm text-neutral-500 mt-1">
                            {formatAddress(property.address, property.city)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              {/* Prix et CTA */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-neutral-100">
                <div className="space-y-6">
                  <div>
                    <span className="text-3xl font-bold text-primary-500">
                      {formattedPrice ?? 'Prix sur demande'}
                    </span>
                    <span className="text-neutral-500 ml-2">FCFA/mois</span>
                  </div>

                  <div className="space-y-3">
                    {isOwnerOrAgency ? (
                      <button
                        onClick={() => navigate(getCreateContractRoute(property.id))}
                        className="w-full py-3 bg-semantic-success text-white font-semibold rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText className="h-5 w-5" />
                        <span>Créer un contrat</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            navigate(`/locataire/visiter/${property.id}`, {
                              state: { property },
                            })
                          }
                          className="w-full py-3 border-2 border-primary-500 text-primary-500 font-semibold rounded-xl hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Calendar className="h-5 w-5" />
                          <span>Planifier une visite</span>
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/locataire/candidature/${property.id}`, {
                              state: { property },
                            })
                          }
                          className="w-full py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                        >
                          Postuler maintenant
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Profil Propriétaire ou Agence (si anonyme) */}
              <OwnerBadge
                name={property.owner_full_name}
                avatarUrl={property.owner_avatar_url}
                trustScore={property.owner_trust_score}
                isVerified={property.owner_is_verified ?? false}
                oneciVerified={property.owner_oneci_verified ?? false}
                city={property.owner_city}
                showVerificationBadges={!property.is_anonymous}
                variant="card"
                size="lg"
                ownerId={property.owner_id}
                propertyId={property.id}
                propertyTitle={property.title}
                showContactButton={!isOwnerOrAgency}
                isAnonymous={property.is_anonymous ?? false}
                managedByAgencyName={property.managing_agency_name}
              />
            </div>
          </div>
        </div>
      </main>

      {showStickyBar && (
        <StickyCTABar propertyId={property.id} isOwnerOrAgency={isOwnerOrAgency ?? false} />
      )}
    </div>
  );
}
