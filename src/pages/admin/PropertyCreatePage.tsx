import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Home, DollarSign, Ruler, Save } from 'lucide-react';
import { toast } from 'sonner';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUserRoles } from '@/hooks/shared/useUserRoles';
import { supabase } from '@/integrations/supabase/client';

// Types
interface PropertyFormData {
  title: string;
  description: string;
  property_type: string;
  price: number;
  surface_area: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  city: string;
  address: string;
  furnished: boolean;
  status: string;
  is_public: boolean;
}

const PROPERTY_TYPES = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'local-commercial', label: 'Local commercial' },
];

const CITIES = ['Abidjan', 'Yamoussoukro', 'Bouaké', 'San-Pédro', 'Korhogo', 'Daloa'];

export default function PropertyCreatePage() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRoles();

  const [formData, setFormData] = useState<PropertyFormData>({
    title: '',
    description: '',
    property_type: 'appartement',
    price: 0,
    surface_area: 0,
    rooms: 1,
    bedrooms: 1,
    bathrooms: 1,
    city: 'Abidjan',
    address: '',
    furnished: false,
    status: 'disponible',
    is_public: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PropertyFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutation pour créer la propriété
  const createMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Récupérer l'ID du premier utilisateur admin comme owner_id par défaut
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'admin_ansut')
        .limit(1);

      const ownerId = profilesData?.[0]?.id || user.id;

      const { data: result, error } = await supabase
        .from('properties')
        .insert({
          owner_id: ownerId,
          title: data.title,
          description: data.description,
          property_type: data.property_type,
          price: data.price,
          surface_area: data.surface_area,
          rooms: data.rooms,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          city: data.city,
          address: data.address,
          furnished: data.furnished,
          status: data.status,
          is_public: data.is_public,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Propriété créée avec succès');
      navigate('/admin/properties');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  // Redirection si non admin
  if (!isAdmin) {
    navigate('/admin/tableau-de-bord');
    return null;
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PropertyFormData, string>> = {};

    if (!formData.title || formData.title.length < 5) {
      newErrors.title = 'Le titre doit contenir au moins 5 caractères';
    }
    if (!formData.description || formData.description.length < 20) {
      newErrors.description = 'La description doit contenir au moins 20 caractères';
    }
    if (formData.price <= 0) {
      newErrors.price = 'Le prix doit être supérieur à 0';
    }
    if (formData.surface_area <= 0) {
      newErrors.surface_area = 'La surface doit être supérieure à 0';
    }
    if (!formData.city) {
      newErrors.city = 'La ville est requise';
    }
    if (!formData.address || formData.address.length < 5) {
      newErrors.address = "L'adresse doit contenir au moins 5 caractères";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    createMutation.mutate(formData);
  };

  const updateField = <K extends keyof PropertyFormData>(
    key: K,
    value: PropertyFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => navigate('/admin/properties')}
            variant="ghost"
            className="mb-4 text-[#6B5A4E] hover:text-[#F16522]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux propriétés
          </Button>
          <h1 className="text-3xl font-bold text-[#2C1810]">Créer une propriété</h1>
          <p className="text-[#6B5A4E] mt-2">
            Remplissez les informations pour créer une nouvelle propriété
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations générales */}
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <h2 className="text-xl font-semibold text-[#2C1810] mb-4 flex items-center gap-2">
              <Home className="w-5 h-5" />
              Informations générales
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Titre */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Titre *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Appartement 3 pièces Cocody"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Type de bien *
                </label>
                <select
                  value={formData.property_type}
                  onChange={(e) => updateField('property_type', e.target.value)}
                  className="w-full px-4 py-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
                >
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ville */}
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Ville *
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522] ${
                    errors.city ? 'border-red-500' : 'border-[#EFEBE9]'
                  }`}
                >
                  {CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {errors.city && (
                  <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                )}
              </div>

              {/* Adresse */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Adresse *
                </label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Quartier, rue, numéro..."
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">{errors.address}</p>
                )}
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Décrivez la propriété, ses caractéristiques, ses atouts..."
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522] resize-none ${
                    errors.description ? 'border-red-500' : 'border-[#EFEBE9]'
                  }`}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Caractéristiques */}
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <h2 className="text-xl font-semibold text-[#2C1810] mb-4 flex items-center gap-2">
              <Ruler className="w-5 h-5" />
              Caractéristiques
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Prix */}
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Prix (FCFA) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B5A4E]" />
                  <Input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => updateField('price', Number(e.target.value))}
                    placeholder="500000"
                    className={`pl-10 ${errors.price ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                )}
              </div>

              {/* Surface */}
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Surface (m²) *
                </label>
                <Input
                  type="number"
                  value={formData.surface_area || ''}
                  onChange={(e) => updateField('surface_area', Number(e.target.value))}
                  placeholder="120"
                  className={errors.surface_area ? 'border-red-500' : ''}
                />
                {errors.surface_area && (
                  <p className="text-red-500 text-sm mt-1">{errors.surface_area}</p>
                )}
              </div>

              {/* Pièces */}
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Pièces
                </label>
                <Input
                  type="number"
                  value={formData.rooms}
                  onChange={(e) => updateField('rooms', Number(e.target.value))}
                  min="1"
                />
              </div>

              {/* Chambres */}
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Chambres
                </label>
                <Input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => updateField('bedrooms', Number(e.target.value))}
                  min="1"
                />
              </div>

              {/* Salles de bain */}
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Salles de bain
                </label>
                <Input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => updateField('bathrooms', Number(e.target.value))}
                  min="1"
                />
              </div>
            </div>

            {/* Meublé */}
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.furnished}
                  onChange={(e) => updateField('furnished', e.target.checked)}
                  className="w-5 h-5 rounded border-[#EFEBE9] text-[#F16522] focus:ring-[#F16522]"
                />
                <span className="text-sm font-medium text-[#2C1810]">Propriété meublée</span>
              </label>
            </div>
          </div>

          {/* Publication */}
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <h2 className="text-xl font-semibold text-[#2C1810] mb-4">Publication</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full px-4 py-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
                >
                  <option value="disponible">Disponible</option>
                  <option value="loué">Loué</option>
                  <option value="unavailable">Indisponible</option>
                  <option value="pending">En attente</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => updateField('is_public', e.target.checked)}
                    className="w-5 h-5 rounded border-[#EFEBE9] text-[#F16522] focus:ring-[#F16522]"
                  />
                  <span className="text-sm font-medium text-[#2C1810]">Publier immédiatement</span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              onClick={() => navigate('/admin/properties')}
              className="border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] bg-white"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="bg-[#F16522] hover:bg-[#d9571d] text-white"
            >
              {isSubmitting || createMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Créer la propriété
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
