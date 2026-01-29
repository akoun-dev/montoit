import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText,
  Building2,
  AlertCircle,
  CheckCircle,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  ArrowLeft,
  Plus,
  Bed,
  Bath,
  Maximize,
  Euro,
  User,
  Phone,
  Mail,
  Image as ImageIcon,
  X,
  Upload,
} from 'lucide-react';
import CitySelector from '@/features/property/components/CitySelector';
import { useNativeGeolocation } from '@/hooks/native/useNativeGeolocation';

interface OwnerInfo {
  full_name: string;
  email: string;
  phone: string;
  id: string;
}

interface Mandate {
  id: string;
  property_id?: string;
  property_title?: string;
  owner_id: string;
  owner_name: string;
  owner_email?: string;
  owner_phone?: string;
  status: 'active' | 'expired' | 'pending';
  start_date: string;
  end_date?: string;
  commission_rate: number;
  can_create_properties: boolean;
  owner?: OwnerInfo;
  property?: any;
}

interface PropertyFormData {
  mandate_id: string;
  title: string;
  property_type: string;
  address: string;
  city: string;
  neighborhood: string;
  price: number;
  description: string;
  surface_area: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  latitude?: number | null;
  longitude?: number | null;
  images?: string[];
}

const propertyTypes = [
  { value: 'appartement', label: 'Appartement', icon: '🏢' },
  { value: 'maison', label: 'Maison', icon: '🏠' },
  { value: 'studio', label: 'Studio', icon: '🏘️' },
  { value: 'duplex', label: 'Duplex', icon: '🏬' },
  { value: 'villa', label: 'Villa', icon: '🏡' },
  { value: 'commerce', label: 'Local commercial', icon: '🏪' },
  { value: 'bureau', label: 'Bureau', icon: '🏢' },
  { value: 'chambre', label: 'Chambre', icon: '🛏️' },
  { value: 'entrepot', label: 'Entrepôt', icon: '📦' },
  { value: 'terrain', label: 'Terrain', icon: '🌳' },
];

export default function AgencyAddPropertyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>({
    mandate_id: '',
    title: '',
    property_type: 'appartement',
    address: '',
    city: '',
    neighborhood: '',
    price: 0,
    description: '',
    surface_area: 0,
    rooms: 0,
    bedrooms: 0,
    bathrooms: 0,
    latitude: null,
    longitude: null,
    images: [],
  });

  const {
    position: geoPosition,
    isLoading: geoLoading,
    error: geoError,
    getCurrentPosition,
  } = useNativeGeolocation({ enableHighAccuracy: true });

  useEffect(() => {
    if (user) {
      loadMandates();
    }
  }, [user]);

  const loadMandates = async () => {
    try {
      const { data: agencyData } = await supabase
        .from('agencies')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!agencyData) {
        setMandates([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('agency_mandates')
        .select(
          `
          *,
          properties:property_id (
            id,
            title,
            property_type,
            address,
            city,
            neighborhood,
            price,
            description,
            surface_area,
            rooms,
            bedrooms,
            bathrooms,
            latitude,
            longitude,
            main_image,
            images,
            status
          ),
          owner:owner_id (
            id,
            full_name,
            email,
            phone
          )
        `
        )
        .eq('agency_id', agencyData.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedMandates = (data || []).map((mandate: any) => ({
        id: mandate.id,
        property_id: mandate.property_id,
        property_title: mandate.properties?.title,
        owner_id: mandate.owner_id,
        owner_name: mandate.owner?.full_name || 'Propriétaire inconnu',
        owner_email: mandate.owner?.email,
        owner_phone: mandate.owner?.phone,
        status: mandate.status,
        start_date: mandate.start_date,
        end_date: mandate.end_date,
        commission_rate: mandate.commission_rate,
        can_create_properties: mandate.can_create_properties ?? false,
        owner: mandate.owner,
        property: mandate.properties,
      }));

      setMandates(formattedMandates);
    } catch (error) {
      console.error('Error loading mandates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMandateSelect = async (mandate: Mandate) => {
    setSelectedMandate(mandate);

    // Initialize form with mandate data
    const newFormData: PropertyFormData = {
      mandate_id: mandate.id,
      title: mandate.property_title || '',
      property_type: 'appartement',
      address: '',
      city: '',
      neighborhood: '',
      price: 0,
      description: '',
      surface_area: 0,
      rooms: 0,
      bedrooms: 0,
      bathrooms: 0,
      latitude: null,
      longitude: null,
      images: [],
    };

    // If property already exists, load all its data
    if (mandate.property_id && mandate.property) {
      const prop = mandate.property;
      newFormData.title = prop.title || '';
      newFormData.property_type = prop.property_type || 'appartement';
      newFormData.address = prop.address || '';
      newFormData.city = prop.city || '';
      newFormData.neighborhood = prop.neighborhood || '';
      newFormData.price = prop.price || 0;
      newFormData.description = prop.description || '';
      newFormData.surface_area = prop.surface_area || 0;
      newFormData.rooms = prop.rooms || 0;
      newFormData.bedrooms = prop.bedrooms || 0;
      newFormData.bathrooms = prop.bathrooms || 0;
      newFormData.latitude = prop.latitude;
      newFormData.longitude = prop.longitude;

      // Parse images if they exist
      if (prop.images) {
        try {
          const imagesArray = typeof prop.images === 'string'
            ? JSON.parse(prop.images)
            : prop.images;
          newFormData.images = Array.isArray(imagesArray) ? imagesArray : [];
        } catch {
          newFormData.images = [];
        }
      }

      // Add main_image to images array if not already there
      if (prop.main_image && !newFormData.images.includes(prop.main_image)) {
        newFormData.images = [prop.main_image, ...newFormData.images];
      }
    }

    setFormData(newFormData);
    setStep(2);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('property-images')
          .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls],
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Erreur lors de l\'upload des images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleGetMyLocation = async () => {
    const result = await getCurrentPosition();
    if (result && result.latitude !== null && result.longitude !== null) {
      setFormData((prev) => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude,
      }));
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 2) {
      if (!formData.title.trim()) newErrors.title = 'Le titre est requis';
      if (!formData.property_type) newErrors.property_type = 'Le type est requis';
      if (!formData.address.trim()) newErrors.address = 'L\'adresse est requise';
      if (!formData.city.trim()) newErrors.city = 'La ville est requise';
      if (formData.price <= 0) newErrors.price = 'Le prix doit être supérieur à 0';
      if (formData.surface_area <= 0) newErrors.surface_area = 'La surface est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep()) return;

    setSubmitting(true);
    try {
      const agencyId = (
        await supabase
          .from('agencies')
          .select('id')
          .eq('user_id', user?.id)
          .single()
      ).data?.id;

      // Prepare property data
      const propertyData: any = {
        title: formData.title,
        property_type: formData.property_type,
        address: formData.address,
        city: formData.city,
        neighborhood: formData.neighborhood,
        price: formData.price,
        description: formData.description,
        surface_area: formData.surface_area,
        rooms: formData.rooms,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        owner_id: selectedMandate!.owner_id,
        managed_by_agency: agencyId,
        latitude: formData.latitude ?? null,
        longitude: formData.longitude ?? null,
        status: 'disponible',
        images: formData.images && formData.images.length > 0 ? formData.images : null,
        main_image: formData.images && formData.images.length > 0 ? formData.images[0] : null,
      };

      let propertyId = selectedMandate!.property_id;

      // If property already exists, update it
      if (propertyId) {
        const { error: updateError } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', propertyId);

        if (updateError) throw updateError;
      } else {
        // Create new property
        const { data: newProperty, error: insertError } = await supabase
          .from('properties')
          .insert(propertyData)
          .select()
          .single();

        if (insertError) throw insertError;
        propertyId = newProperty.id;

        // Update mandate with property_id
        await supabase
          .from('agency_mandates')
          .update({ property_id: propertyId })
          .eq('id', selectedMandate!.id);
      }

      navigate(`/agences/biens/${propertyId}`);
    } catch (error) {
      console.error('Error saving property:', error);
      alert('Erreur lors de la sauvegarde de la propriété');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="bg-[#FAF7F4] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-[#6B5A4E] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#2C1810] mb-2">
            Connexion requise
          </h2>
          <p className="text-[#6B5A4E]">
            Veuillez vous connecter pour ajouter une propriété
          </p>
        </div>
      </div>
    );
  }

  const isNewProperty = !selectedMandate?.property_id;

  return (
    <div className="bg-[#FAF7F4] min-h-screen pb-8">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-b-2xl lg:rounded-[28px] px-4 sm:px-6 lg:px-8 py-6 shadow-lg">
        <button
          onClick={() => navigate('/agences/biens')}
          className="inline-flex items-center gap-2 text-[#EFEBE9] hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour aux biens</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center shadow-md">
            <Plus className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {isNewProperty ? 'Ajouter une propriété' : 'Modifier la propriété'}
            </h1>
            <p className="text-[#EFEBE9] text-sm">
              {step === 1
                ? 'Étape 1 : Sélectionner un mandat'
                : `Étape 2 : ${isNewProperty ? 'Informations de la' : 'Modifier la'} propriété`}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mt-6 max-w-2xl">
          <div
            className={`flex-1 h-2 rounded-full transition-colors ${
              step >= 1 ? 'bg-[#F16522]' : 'bg-[#6B5A4E]/50'
            }`}
          />
          <div
            className={`flex-1 h-2 rounded-full transition-colors ${
              step >= 2 ? 'bg-[#F16522]' : 'bg-[#6B5A4E]/50'
            }`}
          />
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#F16522]" />
          </div>
        ) : (
          <>
            {/* Step 1: Select Mandate */}
            {step === 1 && (
              <div className="space-y-6 max-w-6xl mx-auto">
                {mandates.length === 0 ? (
                  <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-8 sm:p-12 text-center shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#2C1810] mb-2">
                      Aucun mandat actif
                    </h3>
                    <p className="text-[#6B5A4E] mb-6">
                      Vous devez avoir un mandat actif pour ajouter une propriété
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/agences/mandats')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#F16522] hover:bg-[#E5551C] text-white rounded-xl font-medium transition-all"
                    >
                      <FileText className="w-5 h-5" />
                      Voir mes mandats
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {mandates.map((mandate) => (
                      <button
                        key={mandate.id}
                        type="button"
                        onClick={() => handleMandateSelect(mandate)}
                        disabled={!mandate.can_create_properties}
                        className={`bg-white rounded-2xl border-2 p-5 text-left transition-all shadow-sm hover:shadow-md ${
                          !mandate.can_create_properties
                            ? 'border-[#EFEBE9] opacity-50 cursor-not-allowed'
                            : 'border-[#EFEBE9] hover:border-[#F16522] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-[#2C1810]">
                              {mandate.owner_name}
                            </p>
                            <p className="text-sm text-[#6B5A4E]">
                              {mandate.property_title || 'Nouvelle propriété'}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              mandate.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {mandate.status === 'active' ? 'Actif' : 'En attente'}
                          </span>
                        </div>

                        {/* Property already exists indicator */}
                        {mandate.property_id && (
                          <div className="flex items-center gap-1 mb-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600">
                              Bien existe déjà
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-[#6B5A4E] mb-3">
                          <div className="flex items-center gap-1">
                            <Euro className="w-4 h-4" />
                            <span>{mandate.commission_rate}%</span>
                          </div>
                        </div>

                        <div className="text-xs text-[#6B5A4E] pb-3 border-b border-[#EFEBE9]">
                          Du {formatDate(mandate.start_date)}
                          {mandate.end_date && ` au ${formatDate(mandate.end_date)}`}
                        </div>

                        {/* Owner info preview */}
                        {mandate.owner && (
                          <div className="mt-2 text-xs text-[#6B5A4E] space-y-1">
                            {mandate.owner.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{mandate.owner.email}</span>
                              </div>
                            )}
                            {mandate.owner.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span className="truncate">{mandate.owner.phone}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {!mandate.can_create_properties && (
                          <p className="text-xs text-red-600 mt-2">
                            Ce mandat ne permet pas de créer des propriétés
                          </p>
                        )}

                        <div className="flex items-center justify-end mt-3">
                          <CheckCircle className="w-5 h-5 text-[#F16522]" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Property Details */}
            {step === 2 && selectedMandate && (
              <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl mx-auto">
                {/* Owner Info (Read-only) */}
                <div className="bg-[#F16522]/5 border-2 border-[#F16522]/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#2C1810]">
                        Propriétaire
                      </h3>
                      <p className="text-sm text-[#6B5A4E]">
                        Informations issues du mandat (non modifiables)
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-3 border border-[#EFEBE9]">
                      <p className="text-xs text-[#6B5A4E] mb-1">Nom complet</p>
                      <p className="font-medium text-[#2C1810]">
                        {selectedMandate.owner?.full_name || selectedMandate.owner_name}
                      </p>
                    </div>
                    {selectedMandate.owner?.email && (
                      <div className="bg-white rounded-xl p-3 border border-[#EFEBE9]">
                        <p className="text-xs text-[#6B5A4E] mb-1">Email</p>
                        <p className="font-medium text-[#2C1810] truncate">
                          {selectedMandate.owner.email}
                        </p>
                      </div>
                    )}
                    {selectedMandate.owner?.phone && (
                      <div className="bg-white rounded-xl p-3 border border-[#EFEBE9]">
                        <p className="text-xs text-[#6B5A4E] mb-1">Téléphone</p>
                        <p className="font-medium text-[#2C1810]">
                          {selectedMandate.owner.phone}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Mandate Info */}
                <div className="bg-white rounded-2xl border-2 border-[#F16522] p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#F16522]/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#F16522]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#2C1810]">
                          {selectedMandate.owner_name}
                        </p>
                        <p className="text-sm text-[#6B5A4E]">
                          Mandat {selectedMandate.status === 'active' ? 'actif' : 'en attente'} • {selectedMandate.commission_rate}% commission
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm text-[#6B5A4E] hover:text-[#F16522] transition-colors underline"
                    >
                      Changer de mandat
                    </button>
                  </div>
                </div>

                {/* Property Type Selection */}
                <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#2C1810] mb-4">
                    Type de propriété
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {propertyTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, property_type: type.value })
                        }
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.property_type === type.value
                            ? 'border-[#F16522] bg-[#F16522]/5'
                            : 'border-[#EFEBE9] hover:border-[#6B5A4E]'
                        }`}
                      >
                        <span className="text-2xl mb-1 block">{type.icon}</span>
                        <span className="text-sm font-medium text-[#2C1810]">
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Basic Information */}
                <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#2C1810] mb-4">
                    Informations de base
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2C1810] mb-2">
                        Titre de l'annonce *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className={`w-full px-4 py-3 bg-[#FAF7F4] border-2 rounded-xl focus:outline-none focus:border-[#F16522] transition-colors ${
                          errors.title ? 'border-red-500' : 'border-[#EFEBE9]'
                        }`}
                        placeholder="Ex: Bel appartement T3 centre-ville"
                      />
                      {errors.title && (
                        <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#2C1810] mb-2">
                        Adresse *
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        className={`w-full px-4 py-3 bg-[#FAF7F4] border-2 rounded-xl focus:outline-none focus:border-[#F16522] transition-colors ${
                          errors.address ? 'border-red-500' : 'border-[#EFEBE9]'
                        }`}
                        placeholder="Ex: 15 Rue des Jardins"
                      />
                      {errors.address && (
                        <p className="text-red-600 text-sm mt-1">{errors.address}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2C1810] mb-2">
                      <MapPin className="inline w-4 h-4 mr-1" />
                      Localisation *
                    </label>
                    <CitySelector
                      selectedCity={formData.city}
                      selectedDistrict={formData.neighborhood}
                      onCitySelect={(city) =>
                        setFormData({ ...formData, city })
                      }
                      onDistrictSelect={(district) =>
                        setFormData({ ...formData, neighborhood: district })
                      }
                      disabled={submitting}
                    />
                    {errors.city && (
                      <p className="text-red-600 text-sm mt-1">{errors.city}</p>
                    )}
                  </div>
                </div>

                {/* Property Details */}
                <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#2C1810] mb-4">
                    Caractéristiques
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2C1810] mb-2">
                        <Maximize className="inline w-4 h-4 mr-1" />
                        Surface (m²) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.surface_area || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            surface_area: Number(e.target.value),
                          })
                        }
                        className={`w-full px-4 py-3 bg-[#FAF7F4] border-2 rounded-xl focus:outline-none focus:border-[#F16522] transition-colors ${
                          errors.surface_area
                            ? 'border-red-500'
                            : 'border-[#EFEBE9]'
                        }`}
                        placeholder="75"
                      />
                      {errors.surface_area && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.surface_area}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#2C1810] mb-2">Pièces</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.rooms || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, rooms: Number(e.target.value) })
                        }
                        className="w-full px-4 py-3 bg-[#FAF7F4] border-2 border-[#EFEBE9] rounded-xl focus:outline-none focus:border-[#F16522] transition-colors"
                        placeholder="3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#2C1810] mb-2">
                        <Bed className="inline w-4 h-4 mr-1" />
                        Chambres
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.bedrooms || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bedrooms: Number(e.target.value),
                          })
                        }
                        className="w-full px-4 py-3 bg-[#FAF7F4] border-2 border-[#EFEBE9] rounded-xl focus:outline-none focus:border-[#F16522] transition-colors"
                        placeholder="2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#2C1810] mb-2">
                        <Bath className="inline w-4 h-4 mr-1" />
                        Salles de bain
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.bathrooms || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bathrooms: Number(e.target.value),
                          })
                        }
                        className="w-full px-4 py-3 bg-[#FAF7F4] border-2 border-[#EFEBE9] rounded-xl focus:outline-none focus:border-[#F16522] transition-colors"
                        placeholder="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#2C1810] mb-2">
                        <Euro className="inline w-4 h-4 mr-1" />
                        Loyer (FCFA) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.price || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, price: Number(e.target.value) })
                        }
                        className={`w-full px-4 py-3 bg-[#FAF7F4] border-2 rounded-xl focus:outline-none focus:border-[#F16522] transition-colors ${
                          errors.price ? 'border-red-500' : 'border-[#EFEBE9]'
                        }`}
                        placeholder="150000"
                      />
                      {errors.price && (
                        <p className="text-red-600 text-sm mt-1">{errors.price}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Images */}
                <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#2C1810] mb-4">
                    Photos
                  </h3>

                  {/* Upload Button */}
                  <div className="mb-4">
                    <label className="flex items-center justify-center w-full px-6 py-8 border-2 border-dashed border-[#EFEBE9] rounded-xl bg-[#FAF7F4] hover:bg-[#EFEBE9] transition-colors cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImages}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className={`flex flex-col items-center gap-2 cursor-pointer ${uploadingImages ? 'opacity-50' : ''}`}
                      >
                        {uploadingImages ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin text-[#F16522]" />
                            <span className="text-sm font-medium text-[#6B5A4E]">
                              Upload en cours...
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-[#6B5A4E]" />
                            <span className="text-sm font-medium text-[#2C1810]">
                              Cliquez pour ajouter des photos
                            </span>
                            <span className="text-xs text-[#6B5A4E]">
                              JPG, PNG jusqu'à 5MB
                            </span>
                          </>
                        )}
                      </label>
                    </label>
                  </div>

                  {/* Images Grid */}
                  {formData.images && formData.images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      {formData.images.map((imageUrl, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#EFEBE9] group">
                          <img
                            src={imageUrl}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#2C1810] mb-4">
                    Description
                  </h3>
                  <textarea
                    rows={6}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[#FAF7F4] border-2 border-[#EFEBE9] rounded-xl focus:outline-none focus:border-[#F16522] transition-colors resize-none"
                    placeholder="Décrivez la propriété, ses caractéristiques, son environnement..."
                  />
                </div>

                {/* Geolocation */}
                <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#2C1810] mb-4">
                    Géolocalisation
                  </h3>
                  <div className="p-4 rounded-xl border-2 border-dashed border-[#EFEBE9] flex items-center justify-between bg-[#FAF7F4]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-[#F16522]/10">
                        <Navigation className="w-5 h-5 text-[#F16522]" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#2C1810]">
                          {formData.latitude && formData.longitude
                            ? 'Position capturée'
                            : 'Géolocalisation'}
                        </p>
                        <p className="text-xs text-[#6B5A4E]">
                          {formData.latitude && formData.longitude
                            ? `${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)}`
                            : 'Utilisez votre position actuelle'}
                        </p>
                        {geoError && (
                          <p className="text-xs text-red-600 mt-1">{geoError}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetMyLocation}
                      disabled={geoLoading || submitting}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 bg-[#F16522] text-white hover:bg-[#E5551C] disabled:bg-[#6B5A4E] disabled:opacity-70"
                    >
                      {geoLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Localisation...
                        </>
                      ) : formData.latitude && formData.longitude ? (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Recapturer
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4" />
                          Ma position
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3 border-2 border-[#EFEBE9] rounded-xl text-[#2C1810] hover:bg-[#FAF7F4] transition-all font-medium"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-[#F16522] hover:bg-[#E5551C] text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {isNewProperty ? 'Création...' : 'Modification...'}
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        {isNewProperty ? 'Créer la propriété' : 'Enregistrer les modifications'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
