import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Loader2,
  Save,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Euro,
  Building2,
  AlertCircle,
} from 'lucide-react';
import CitySelector from '@/features/property/components/CitySelector';

interface Property {
  id: string;
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
  status: string;
  latitude?: number | null;
  longitude?: number | null;
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

const propertyStatuses = [
  { value: 'disponible', label: 'Disponible', color: 'green' },
  { value: 'loue', label: 'Loué', color: 'blue' },
  { value: 'en_attente', label: 'En attente', color: 'orange' },
  { value: 'retire', label: 'Retiré', color: 'gray' },
  { value: 'maintenance', label: 'En maintenance', color: 'yellow' },
];

export default function AgencyPropertyEditPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Property>({
    id: '',
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
    status: 'disponible',
    latitude: null,
    longitude: null,
  });

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
        .single();

      if (error) throw error;
      setFormData(data as Property);
    } catch (error) {
      console.error('Error loading property:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Le titre est requis';
    if (!formData.address.trim()) newErrors.address = 'L\'adresse est requise';
    if (!formData.city.trim()) newErrors.city = 'La ville est requise';
    if (formData.price <= 0) newErrors.price = 'Le prix doit être supérieur à 0';
    if (formData.surface_area <= 0) newErrors.surface_area = 'La surface est requise';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
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
          status: formData.status,
          latitude: formData.latitude,
          longitude: formData.longitude,
        })
        .eq('id', id);

      if (error) throw error;
      navigate(`/agences/biens/${id}`);
    } catch (error) {
      console.error('Error updating property:', error);
      alert('Erreur lors de la mise à jour de la propriété');
    } finally {
      setSaving(false);
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/agences/biens/${id}`)}
            className="inline-flex items-center gap-2 text-[#EFEBE9] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>
          <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center shadow-md">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Modifier la propriété
            </h1>
            <p className="text-[#EFEBE9] text-sm">{formData.title}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Property Type & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Property Type */}
            <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#2C1810] mb-4">Type de propriété</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {propertyTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, property_type: type.value })
                    }
                    className={`p-3 rounded-xl border-2 transition-all ${
                      formData.property_type === type.value
                        ? 'border-[#F16522] bg-[#F16522]/5'
                        : 'border-[#EFEBE9] hover:border-[#6B5A4E]'
                    }`}
                  >
                    <span className="text-xl mb-1 block">{type.icon}</span>
                    <span className="text-xs font-medium text-[#2C1810]">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#2C1810] mb-4">Statut</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {propertyStatuses.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, status: status.value })
                    }
                    className={`p-3 rounded-xl border-2 transition-all ${
                      formData.status === status.value
                        ? `border-${status.color}-500 bg-${status.color}-50`
                        : 'border-[#EFEBE9] hover:border-[#6B5A4E]'
                    }`}
                  >
                    <span className="text-sm font-medium text-[#2C1810]">{status.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Title & Address */}
          <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#2C1810] mb-4">Informations de base</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Titre de l'annonce *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-4 py-3 bg-[#FAF7F4] border-2 rounded-xl focus:outline-none focus:border-[#F16522] transition-colors ${
                    errors.address ? 'border-red-500' : 'border-[#EFEBE9]'
                  }`}
                  placeholder="Ex: 15 Rue des Jardins"
                />
                {errors.address && (
                  <p className="text-red-600 text-sm mt-1">{errors.address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  Localisation *
                </label>
                <CitySelector
                  selectedCity={formData.city}
                  selectedDistrict={formData.neighborhood}
                  onCitySelect={(city) => setFormData({ ...formData, city })}
                  onDistrictSelect={(district) => setFormData({ ...formData, neighborhood: district })}
                  disabled={saving}
                />
                {errors.city && (
                  <p className="text-red-600 text-sm mt-1">{errors.city}</p>
                )}
              </div>
            </div>
          </div>

          {/* Characteristics */}
          <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#2C1810] mb-4">Caractéristiques</h3>
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
                    setFormData({ ...formData, surface_area: Number(e.target.value) })
                  }
                  className={`w-full px-4 py-3 bg-[#FAF7F4] border-2 rounded-xl focus:outline-none focus:border-[#F16522] transition-colors ${
                    errors.surface_area ? 'border-red-500' : 'border-[#EFEBE9]'
                  }`}
                  placeholder="75"
                />
                {errors.surface_area && (
                  <p className="text-red-600 text-sm mt-1">{errors.surface_area}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">Pièces</label>
                <input
                  type="number"
                  min="0"
                  value={formData.rooms || ''}
                  onChange={(e) => setFormData({ ...formData, rooms: Number(e.target.value) })}
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
                    setFormData({ ...formData, bedrooms: Number(e.target.value) })
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
                    setFormData({ ...formData, bathrooms: Number(e.target.value) })
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
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
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

          {/* Description */}
          <div className="bg-white rounded-2xl border-2 border-[#EFEBE9] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#2C1810] mb-4">Description</h3>
            <textarea
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-[#FAF7F4] border-2 border-[#EFEBE9] rounded-xl focus:outline-none focus:border-[#F16522] transition-colors resize-none"
              placeholder="Décrivez la propriété, ses caractéristiques, son environnement..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => navigate(`/agences/biens/${id}`)}
              className="px-6 py-3 border-2 border-[#EFEBE9] rounded-xl text-[#2C1810] hover:bg-[#FAF7F4] transition-all font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-[#F16522] hover:bg-[#E5551C] text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
