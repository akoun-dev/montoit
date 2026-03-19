import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  MapPin,
  Camera,
  X,
  Loader2,
  Check,
  Car,
  TreePine,
  Sofa,
  Wind,
  Eye,
  EyeOff,
} from 'lucide-react';
import { NativeCameraUpload } from '@/components/native';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  RESIDENTIAL_PROPERTY_TYPES,
  COMMERCIAL_PROPERTY_TYPES,
  CITIES,
  ABIDJAN_COMMUNES,
} from '@/shared/lib/constants/app.constants';
import type { Database } from '@/shared/lib/database.types';

type PropertyType = Database['public']['Tables']['properties']['Row']['property_type'];

interface PropertyFormData {
  title: string;
  description: string;
  address: string;
  city: string;
  neighborhood: string;
  property_type: PropertyType;
  property_category: 'residential' | 'commercial';
  bedrooms: number;
  bathrooms: number;
  surface_area: string;
  monthly_rent: string;
  deposit_amount: string;
  charges_amount: string;
  has_parking: boolean;
  has_garden: boolean;
  furnished: boolean;
  has_ac: boolean;
  is_anonymous: boolean;
}

const INITIAL_FORM_DATA: PropertyFormData = {
  title: '',
  description: '',
  address: '',
  city: '',
  neighborhood: '',
  property_type: 'apartment' as PropertyType,
  property_category: 'residential',
  bedrooms: 1,
  bathrooms: 1,
  surface_area: '',
  monthly_rent: '',
  deposit_amount: '',
  charges_amount: '0',
  has_parking: false,
  has_garden: false,
  furnished: false,
  has_ac: false,
  is_anonymous: false,
};

export default function AddPropertyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPropertyId = searchParams.get('edit');
  const isEditMode = !!editPropertyId;

  const [formData, setFormData] = useState<PropertyFormData>(INITIAL_FORM_DATA);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Load property data in edit mode
  useEffect(() => {
    if (isEditMode && editPropertyId && user) {
      loadPropertyData(editPropertyId);
    }
  }, [isEditMode, editPropertyId, user]);

  const loadPropertyData = async (propertyId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('owner_id', user?.id)
        .single();

      if (error || !data) {
        navigate('/proprietaire/mes-biens');
        return;
      }

      setExistingImages(data.images || []);
      setFormData({
        title: data.title || '',
        description: data.description || '',
        address: typeof data.address === 'string' ? data.address : '',
        city: data.city || '',
        neighborhood: data.neighborhood || '',
        property_type: (data.property_type as PropertyType) || 'apartment',
        property_category: data.property_category === 'commercial' ? 'commercial' : 'residential',
        bedrooms: data.bedrooms ?? 1,
        bathrooms: data.bathrooms ?? 1,
        surface_area: data.surface_area?.toString() || '',
        monthly_rent: (data.monthly_rent ?? data.price ?? '').toString(),
        deposit_amount: data.deposit_amount?.toString() || '',
        charges_amount: data.charges_amount?.toString() || '0',
        has_parking: data.has_parking ?? false,
        has_garden: data.has_garden ?? false,
        furnished: data.furnished ?? false,
        has_ac: data.has_ac ?? false,
        is_anonymous: data.is_anonymous ?? false,
      });
    } catch {
      navigate('/proprietaire/mes-biens');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageCapture = useCallback((files: File[]) => {
    const totalImages = existingImages.length + imagePreviews.length + files.length;
    if (totalImages > 10) {
      setError('Maximum 10 photos autorisees');
      return;
    }
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImageFiles(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  }, [existingImages.length, imagePreviews.length]);

  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      URL.revokeObjectURL(imagePreviews[index]);
      setImageFiles(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const uploadImages = async (propertyId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop();
      const fileName = `${propertyId}/${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('property-images').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('property-images').getPublicUrl(fileName);
      urls.push(publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate('/connexion');

    // Validation simple
    if (!formData.title.trim()) return setError('Le titre est requis');
    if (!formData.city) return setError('La ville est requise');
    if (!formData.monthly_rent) return setError('Le loyer est requis');

    setLoading(true);
    setError('');

    try {
      const propertyData = {
        owner_id: user.id,
        title: formData.title,
        description: formData.description || null,
        address: formData.address,
        city: formData.city,
        neighborhood: formData.neighborhood || null,
        property_type: formData.property_type,
        property_category: formData.property_category,
        bedrooms: Number(formData.bedrooms) || 0,
        bathrooms: Number(formData.bathrooms) || 0,
        surface_area: formData.surface_area ? Number(formData.surface_area) : null,
        price: Number(formData.monthly_rent),
        deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : null,
        charges_amount: formData.charges_amount ? Number(formData.charges_amount) : 0,
        has_parking: formData.has_parking,
        has_garden: formData.has_garden,
        furnished: formData.furnished,
        has_ac: formData.has_ac,
        is_anonymous: formData.is_anonymous,
        status: 'available' as const,
        images: [] as string[],
        main_image: null as string | null,
      };

      let propertyId: string;

      if (isEditMode && editPropertyId) {
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editPropertyId)
          .eq('owner_id', user.id);
        if (error) throw error;
        propertyId = editPropertyId;
      } else {
        const { data, error } = await supabase
          .from('properties')
          .insert(propertyData)
          .select('id')
          .single();
        if (error || !data) throw error || new Error('Erreur creation');
        propertyId = data.id;
      }

      // Upload images
      const newUrls = imageFiles.length > 0 ? await uploadImages(propertyId) : [];
      const allImages = [...existingImages, ...newUrls];

      if (allImages.length > 0) {
        await supabase
          .from('properties')
          .update({ images: allImages, main_image: allImages[0] })
          .eq('id', propertyId);
      }

      setSuccess(true);
      setTimeout(() => navigate('/proprietaire/mes-biens'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const propertyTypes = formData.property_category === 'commercial' 
    ? COMMERCIAL_PROPERTY_TYPES 
    : RESIDENTIAL_PROPERTY_TYPES;

  const neighborhoods = formData.city === 'Abidjan' ? ABIDJAN_COMMUNES : [];

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {isEditMode ? 'Bien modifie avec succes' : 'Bien publie avec succes'}
          </h2>
          <p className="text-muted-foreground">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">
              {isEditMode ? 'Modifier le bien' : 'Publier un bien'}
            </h1>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 space-y-6 pb-32">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Photos */}
        <section className="bg-background rounded-xl p-4 space-y-4 shadow-sm border border-border">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h2 className="font-medium text-foreground">Photos</h2>
            <span className="text-xs text-muted-foreground ml-auto">
              {existingImages.length + imagePreviews.length}/10
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {existingImages.map((url, i) => (
              <div key={`existing-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i, true)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {imagePreviews.map((url, i) => (
              <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i, false)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {existingImages.length + imagePreviews.length < 10 && (
              <NativeCameraUpload
                onCapture={handleImageCapture}
                maxFiles={10 - existingImages.length - imagePreviews.length}
                className="aspect-square"
              />
            )}
          </div>
        </section>

        {/* Informations principales */}
        <section className="bg-background rounded-xl p-4 space-y-4 shadow-sm border border-border">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            <h2 className="font-medium text-foreground">Informations</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Titre de l'annonce *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Appartement 3 pieces Cocody"
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Decrivez votre bien..."
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Categorie
                </label>
                <select
                  name="property_category"
                  value={formData.property_category}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="residential">Residentiel</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Type de bien
                </label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {propertyTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Chambres
                </label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  min={0}
                  className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Salles de bain
                </label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  min={0}
                  className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Surface (m2)
                </label>
                <input
                  type="number"
                  name="surface_area"
                  value={formData.surface_area}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Localisation */}
        <section className="bg-background rounded-xl p-4 space-y-4 shadow-sm border border-border">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-medium text-foreground">Localisation</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Ville *
              </label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Selectionnez une ville</option>
                {CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {neighborhoods.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Commune
                </label>
                <select
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Selectionnez une commune</option>
                  {neighborhoods.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Adresse
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Ex: Rue des Jardins, Cocody"
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </section>

        {/* Tarification */}
        <section className="bg-background rounded-xl p-4 space-y-4 shadow-sm border border-border">
          <h2 className="font-medium text-foreground">Tarification</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Loyer mensuel (FCFA) *
              </label>
              <input
                type="number"
                name="monthly_rent"
                value={formData.monthly_rent}
                onChange={handleChange}
                placeholder="150000"
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Caution (FCFA)
                </label>
                <input
                  type="number"
                  name="deposit_amount"
                  value={formData.deposit_amount}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Charges (FCFA)
                </label>
                <input
                  type="number"
                  name="charges_amount"
                  value={formData.charges_amount}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Equipements */}
        <section className="bg-background rounded-xl p-4 space-y-4 shadow-sm border border-border">
          <h2 className="font-medium text-foreground">Equipements</h2>

          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'has_parking', label: 'Parking', icon: Car },
              { name: 'has_garden', label: 'Jardin', icon: TreePine },
              { name: 'furnished', label: 'Meuble', icon: Sofa },
              { name: 'has_ac', label: 'Climatisation', icon: Wind },
            ].map(({ name, label, icon: Icon }) => (
              <label
                key={name}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData[name as keyof PropertyFormData]
                    ? 'border-primary bg-primary/5'
                    : 'border-input hover:border-primary/50'
                }`}
              >
                <input
                  type="checkbox"
                  name={name}
                  checked={formData[name as keyof PropertyFormData] as boolean}
                  onChange={handleChange}
                  className="sr-only"
                />
                <Icon className={`w-5 h-5 ${
                  formData[name as keyof PropertyFormData] ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <span className={`text-sm ${
                  formData[name as keyof PropertyFormData] ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {label}
                </span>
                {formData[name as keyof PropertyFormData] && (
                  <Check className="w-4 h-4 text-primary ml-auto" />
                )}
              </label>
            ))}
          </div>
        </section>

        {/* Options de publication */}
        <section className="bg-background rounded-xl p-4 space-y-4 shadow-sm border border-border">
          <h2 className="font-medium text-foreground">Options</h2>

          <label className="flex items-center justify-between p-3 rounded-lg border border-input cursor-pointer hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3">
              {formData.is_anonymous ? (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Eye className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <span className="text-sm font-medium text-foreground">Publication anonyme</span>
                <p className="text-xs text-muted-foreground">Masquer vos coordonnees</p>
              </div>
            </div>
            <input
              type="checkbox"
              name="is_anonymous"
              checked={formData.is_anonymous}
              onChange={handleChange}
              className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
            />
          </label>
        </section>
      </form>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isEditMode ? 'Modification...' : 'Publication...'}
              </>
            ) : (
              isEditMode ? 'Enregistrer les modifications' : 'Publier le bien'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
