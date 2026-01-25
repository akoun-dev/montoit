import { useState, useEffect } from 'react';
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
  Star,
  Phone,
  Mail,
  X,
  Info,
} from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import MapWrapper from '@/shared/ui/MapWrapper';
import { useAuth } from '@/app/providers/AuthProvider';
import { getCreateContractRoute } from '@/shared/config/routes.config';
import { OwnerBadge } from '@/shared/ui';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import PropertyReviewsSection from '@/features/dispute/components/PropertyReviewsSection';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
}

// Helper function to get status badge configuration
function getStatusConfig(status?: string | null) {
  if (!status) return null;

  const statusConfig: Record<string, { label: string; className: string; icon?: string }> = {
    disponible: { label: 'Disponible', className: 'bg-green-100 text-green-700 border-green-200', icon: '✓' },
    louee: { label: 'Louée', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🔑' },
    en_attente: { label: 'En attente', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: '⏳' },
    reservee: { label: 'Réservée', className: 'bg-purple-100 text-purple-700 border-purple-200', icon: '📋' },
    indisponible: { label: 'Indisponible', className: 'bg-gray-100 text-gray-700 border-gray-200', icon: '✕' },
    maintenance: { label: 'Maintenance', className: 'bg-red-100 text-red-700 border-red-200', icon: '🔧' },
  };

  return statusConfig[status.toLowerCase()] || null;
}

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

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80';

function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.target as HTMLImageElement;
  const currentSrc = target.src;
  if (!currentSrc.includes(FALLBACK_IMAGE)) {
    target.src = FALLBACK_IMAGE;
    target.onerror = null;
  }
}

interface ImageGalleryProps {
  images: string[];
  title: string;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

function ImageGallery({ images, title, currentIndex, onIndexChange }: ImageGalleryProps) {
  const displayImages = !images || images.length === 0 ? [FALLBACK_IMAGE] : images;

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] bg-neutral-100 rounded-2xl overflow-hidden group">
        <img
          src={displayImages[currentIndex]}
          alt={`${title} - Image ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          loading="eager"
          onError={handleImageError}
        />

        {/* Navigation Arrows */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={() =>
                onIndexChange(currentIndex === 0 ? displayImages.length - 1 : currentIndex - 1)
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
              aria-label="Image précédente"
            >
              <ChevronLeft className="h-6 w-6 text-neutral-700" />
            </button>
            <button
              onClick={() => onIndexChange((currentIndex + 1) % displayImages.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
              aria-label="Image suivante"
            >
              <ChevronRight className="h-6 w-6 text-neutral-700" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 backdrop-blur-sm text-white rounded-full text-sm font-semibold">
            {currentIndex + 1} / {displayImages.length}
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-12 h-12 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
            aria-label="Ajouter aux favoris"
          >
            <Heart className="h-5 w-5 text-neutral-700" />
          </button>
          <button
            className="w-12 h-12 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
            aria-label="Partager"
          >
            <Share2 className="h-5 w-5 text-neutral-700" />
          </button>
        </div>
      </div>

      {/* Thumbnail Gallery */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => onIndexChange(index)}
              className={cn(
                "flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105",
                index === currentIndex
                  ? "border-[#F16522] shadow-lg ring-2 ring-[#F16522]/20"
                  : "border-transparent hover:border-neutral-300"
              )}
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

interface QuickInfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
  highlight?: boolean;
}

function QuickInfoCard({ icon, label, value, color = "text-[#F16522]", highlight = false }: QuickInfoCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-4 border transition-all duration-300 hover:shadow-lg",
      highlight
        ? "bg-gradient-to-br from-[#F16522] to-[#d9571d] border-[#F16522] text-white"
        : "bg-white border-[#EFEBE9] hover:border-[#F16522]/30"
    )}>
      <div className={cn("flex items-center gap-3", highlight && "text-white")}>
        <div className={cn("p-2.5 rounded-xl", highlight ? "bg-white/20" : "bg-[#FAF7F4]")}>
          <div className={cn(highlight ? "text-white" : color)}>
            {icon}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-medium mb-0.5", highlight ? "text-white/70" : "text-[#6B5A4E]")}>
            {label}
          </p>
          <p className={cn("text-lg font-bold truncate", highlight ? "text-white" : "text-[#2C1810]")}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  label: string;
  available: boolean;
}

function FeatureCard({ icon, label, available }: FeatureCardProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4 rounded-xl border transition-all",
      available
        ? "bg-[#FAF7F4] border-[#EFEBE9] hover:border-[#F16522]/30"
        : "bg-gray-50 border-gray-200 opacity-50"
    )}>
      <div className={cn("p-2.5 rounded-full mb-2", available ? "bg-[#F16522]/10" : "bg-gray-200")}>
        <div className={cn(available ? "text-[#F16522]" : "text-gray-400")}>
          {icon}
        </div>
      </div>
      <span className={cn("text-xs font-medium text-center", available ? "text-[#2C1810]" : "text-gray-400")}>
        {label}
      </span>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}

function TabButton({ active, onClick, children, icon }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all text-sm",
        active
          ? "bg-[#F16522] text-white shadow-lg"
          : "bg-white text-[#6B5A4E] hover:bg-[#FAF7F4] border border-[#EFEBE9]"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'location' | 'reviews'>('overview');
  const [showContactModal, setShowContactModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

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

  const loadProperty = async (propertyId: string) => {
    try {
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

      let ownerProfile: {
        full_name: string | null;
        avatar_url: string | null;
        trust_score: number | null;
        is_verified: boolean | null;
        oneci_verified: boolean | null;
        city: string | null;
      } | null = null;

      if (data.owner_id) {
        const { data: profileData } = await supabase.rpc('get_public_profile', {
          profile_user_id: data.owner_id,
        });

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

      let managingAgencyName: string | null = null;

      if (data.is_anonymous) {
        const { data: mandateData } = await supabase
          .from('agency_mandates')
          .select('agency:agencies(agency_name)')
          .eq('property_id', propertyId)
          .eq('status', 'active')
          .maybeSingle();

        if (mandateData?.agency) {
          const agency = mandateData.agency as { agency_name: string } | null;
          managingAgencyName = agency?.agency_name ?? null;
        }
      }

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
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#F16522] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[#6B5A4E] font-medium">Chargement de la propriété...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-[#EFEBE9] rounded-full flex items-center justify-center mx-auto mb-6">
            <Home className="h-10 w-10 text-[#6B5A4E]" />
          </div>
          <h2 className="text-2xl font-bold text-[#2C1810] mb-4">Propriété introuvable</h2>
          <p className="text-[#6B5A4E] mb-8">Cette propriété n'existe pas ou a été supprimée</p>
          <button
            onClick={() => navigate('/recherche')}
            className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Retour à la recherche
          </button>
        </div>
      </div>
    );
  }

  const images = property.images?.length ? property.images : [FALLBACK_IMAGE];
  const displayPrice = property.monthly_rent ?? property.price;
  const formattedPrice = displayPrice != null ? displayPrice.toLocaleString('fr-FR') : null;

  const propertyTypeLabels: Record<string, string> = {
    maison: 'Maison',
    appartement: 'Appartement',
    villa: 'Villa',
    studio: 'Studio',
    duplex: 'Duplex',
    chambre: 'Chambre',
    bureau: 'Bureau',
    commerce: 'Commerce',
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      {/* Header minimal */}
      <header className="bg-white border-b border-[#EFEBE9] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-[#FAF7F4] hover:bg-[#EFEBE9] rounded-full flex items-center justify-center transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5 text-[#2C1810]" />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-[#2C1810] truncate flex-1 flex items-center gap-2">
              {property.title}
              {(() => {
                const statusConfig = getStatusConfig(property.status);
                return statusConfig ? (
                  <span className={`hidden md:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.className}`}>
                    <span className="mr-1">{statusConfig.icon}</span>
                    {statusConfig.label}
                  </span>
                ) : null;
              })()}
              {property.ansut_verified && (
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <span className="mr-1">✓</span>
                  Certifié ANSUT
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 bg-[#FAF7F4] hover:bg-[#EFEBE9] rounded-full flex items-center justify-center transition-colors">
                <Share2 className="h-5 w-5 text-[#2C1810]" />
              </button>
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="w-10 h-10 bg-[#FAF7F4] hover:bg-[#EFEBE9] rounded-full flex items-center justify-center transition-colors"
              >
                <Heart className={cn("h-5 w-5", isFavorite ? "fill-[#F16522] text-[#F16522]" : "text-[#2C1810]")} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Price Bar - Mobile */}
      <div className="md:hidden sticky top-[60px] z-30 bg-white border-b border-[#EFEBE9] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#6B5A4E]">Loyer mensuel</p>
            <p className="text-2xl font-bold text-[#F16522]">{formattedPrice ?? 'Prix sur demande'}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/locataire/visiter/${property.id}`, { state: { property } })}
              className="px-4 py-2 border-2 border-[#F16522] text-[#F16522] font-semibold rounded-xl text-sm"
            >
              <Calendar className="h-4 w-4 inline mr-1" />
              Visiter
            </button>
            <button
              onClick={() => navigate(`/locataire/candidature/${property.id}`, { state: { property } })}
              className="px-4 py-2 bg-[#F16522] text-white font-semibold rounded-xl text-sm"
            >
              Postuler
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Image Gallery */}
        <section>
          <ImageGallery
            images={images}
            title={property.title}
            currentIndex={currentImageIndex}
            onIndexChange={setCurrentImageIndex}
          />
        </section>

        {/* Quick Info Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickInfoCard
            highlight
            icon={<span className="text-xl font-bold">FCFA</span>}
            label="Loyer mensuel"
            value={formattedPrice ?? 'Prix demandé'}
          />
          <QuickInfoCard
            icon={<Bed className="h-6 w-6" />}
            label="Chambres"
            value={property.bedrooms || '-'}
          />
          <QuickInfoCard
            icon={<Maximize className="h-6 w-6" />}
            label="Surface"
            value={`${property.surface_area || '-'} m²`}
          />
          <QuickInfoCard
            icon={<Building className="h-6 w-6" />}
            label="Type"
            value={propertyTypeLabels[property.property_type] || property.property_type || '-'}
          />
        </section>

        {/* Tabs */}
        <section className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
          {/* Tab Headers */}
          <div className="flex gap-2 p-3 border-b border-[#EFEBE9] overflow-x-auto">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={<Info className="w-4 h-4" />}
            >
              Aperçu
            </TabButton>
            <TabButton
              active={activeTab === 'location'}
              onClick={() => setActiveTab('location')}
              icon={<MapPin className="w-4 h-4" />}
            >
              Localisation
            </TabButton>
            <TabButton
              active={activeTab === 'reviews'}
              onClick={() => setActiveTab('reviews')}
              icon={<Star className="w-4 h-4" />}
            >
              Avis
            </TabButton>
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Title & Location */}
                <div>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h2 className="text-2xl md:text-3xl font-bold text-[#2C1810]">
                      {property.title}
                    </h2>
                    {(() => {
                      const statusConfig = getStatusConfig(property.status);
                      return statusConfig ? (
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.className}`}>
                          <span className="mr-1">{statusConfig.icon}</span>
                          {statusConfig.label}
                        </span>
                      ) : null;
                    })()}
                    {property.ansut_verified && (
                      <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <span className="mr-1">✓</span>
                        Certifié ANSUT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[#6B5A4E]">
                    <MapPin className="h-5 w-5 text-[#F16522]" />
                    <span className="font-medium">
                      {property.city}{property.neighborhood && `, ${property.neighborhood}`}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-[#FAF7F4] rounded-xl p-5 border border-[#EFEBE9]">
                  <h3 className="font-semibold text-[#2C1810] mb-3 flex items-center gap-2">
                    <Info className="h-5 w-5 text-[#F16522]" />
                    Description
                  </h3>
                  <p className="text-[#2C1810] leading-relaxed">
                    {property.description || 'Aucune description disponible pour ce bien.'}
                  </p>
                </div>

                {/* Features Grid */}
                <div>
                  <h3 className="font-semibold text-[#2C1810] mb-4">Caractéristiques</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <FeatureCard
                      icon={<Bed className="h-5 w-5" />}
                      label={`${property.bedrooms} ch.`}
                      available={!!property.bedrooms}
                    />
                    <FeatureCard
                      icon={<Bath className="h-5 w-5" />}
                      label={`${property.bathrooms} sdb`}
                      available={!!property.bathrooms}
                    />
                    <FeatureCard
                      icon={<Car className="h-5 w-5" />}
                      label="Parking"
                      available={!!property.has_parking}
                    />
                    <FeatureCard
                      icon={<CheckCircle className="h-5 w-5" />}
                      label="Meublé"
                      available={!!property.furnished}
                    />
                    <FeatureCard
                      icon={<Zap className="h-5 w-5" />}
                      label="Climatisation"
                      available={!!property.has_ac}
                    />
                    <FeatureCard
                      icon={<Building className="h-5 w-5" />}
                      label={propertyTypeLabels[property.property_type] || property.property_type}
                      available={true}
                    />
                  </div>
                </div>

                {/* Reviews Preview */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[#2C1810]">Avis & Notations</h3>
                    <button
                      onClick={() => setActiveTab('reviews')}
                      className="text-sm text-[#F16522] font-medium hover:underline"
                    >
                      Voir tout →
                    </button>
                  </div>
                  <PropertyReviewsSection
                    propertyId={property.id}
                    ownerId={property.owner_id || undefined}
                    canReview={
                      user &&
                      property.owner_id !== user.id &&
                      profile?.user_type === 'locataire'
                    }
                  />
                </div>

                {/* Owner Card */}
                <div>
                  <h3 className="font-semibold text-[#2C1810] mb-4">Propriétaire</h3>
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
            )}

            {activeTab === 'location' && (
              <div className="space-y-4">
                <div className="bg-[#FAF7F4] rounded-xl p-4 border border-[#EFEBE9]">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[#F16522] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-[#2C1810]">
                        {property.city}{property.neighborhood && `, ${property.neighborhood}`}
                      </p>
                      {property.address && (
                        <p className="text-sm text-[#6B5A4E] mt-1">
                          {formatAddress(property.address, property.city)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Map */}
                <div className="rounded-xl overflow-hidden border border-[#EFEBE9]">
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
                    <div className="h-[300px] flex items-center justify-center bg-[#FAF7F4]">
                      <div className="text-center">
                        <MapPin className="h-12 w-12 text-[#6B5A4E] mx-auto mb-4" />
                        <p className="text-[#6B5A4E]">Localisation non disponible</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <PropertyReviewsSection
                propertyId={property.id}
                ownerId={property.owner_id || undefined}
                canReview={
                  user &&
                  property.owner_id !== user.id &&
                  profile?.user_type === 'locataire'
                }
              />
            )}
          </div>
        </section>

        {/* CTA Section - Desktop */}
        <div className="hidden md:block">
          <div className="bg-[#2C1810] rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                  Intéressé par ce bien ?
                </h3>
                <p className="text-[#E8D4C5]">
                  Contactez le propriétaire ou planifiez une visite dès maintenant
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {isOwnerOrAgency ? (
                  <button
                    onClick={() => navigate(getCreateContractRoute(property.id))}
                    className="px-6 py-3 bg-white text-[#2C1810] font-semibold rounded-xl hover:bg-[#FAF7F4] transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="h-5 w-5" />
                    Créer un contrat
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => navigate(`/locataire/visiter/${property.id}`, { state: { property } })}
                      className="px-6 py-3 bg-[#FAF7F4] text-[#2C1810] font-semibold rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Calendar className="h-5 w-5" />
                      Planifier une visite
                    </button>
                    <button
                      onClick={() => navigate(`/locataire/candidature/${property.id}`, { state: { property } })}
                      className="px-6 py-3 bg-[#F16522] text-white font-semibold rounded-xl hover:bg-[#d9571d] transition-colors"
                    >
                      Postuler maintenant
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowContactModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-[#FAF7F4] hover:bg-[#EFEBE9] rounded-full flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-[#2C1810]" />
            </button>

            <h3 className="text-xl font-bold text-[#2C1810] mb-4">Contacter le propriétaire</h3>

            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-4 bg-[#FAF7F4] rounded-xl hover:bg-[#EFEBE9] transition-colors">
                <div className="w-10 h-10 bg-[#F16522] rounded-full flex items-center justify-center">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#2C1810]">Appeler</p>
                  <p className="text-sm text-[#6B5A4E]">Discuter directement</p>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 p-4 bg-[#FAF7F4] rounded-xl hover:bg-[#EFEBE9] transition-colors">
                <div className="w-10 h-10 bg-[#F16522] rounded-full flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#2C1810]">Envoyer un message</p>
                  <p className="text-sm text-[#6B5A4E]">Réponse garantie</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
