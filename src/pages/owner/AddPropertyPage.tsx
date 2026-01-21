import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Home,
  X,
  Image as ImageIcon,
  Building2,
  Check,
  RefreshCw,
  MapPin,
  DollarSign,
  Settings,
  FileText,
} from 'lucide-react';
import { NativeCameraUpload } from '@/components/native';
import Modal from '@/shared/ui/Modal';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  RESIDENTIAL_PROPERTY_TYPES,
  COMMERCIAL_PROPERTY_TYPES,
  CITIES,
  ABIDJAN_COMMUNES,
  STORAGE_KEYS,
} from '@/shared/lib/constants/app.constants';
import { ValidationService } from '@/services/validation';
import { useFormValidation } from '@/hooks/shared/useFormValidation';
import { ValidatedInput } from '@/shared/ui/ValidatedInput';
import { ValidatedTextarea } from '@/shared/ui/ValidatedTextarea';
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

// Character limits
const TITLE_MIN = 10;
const TITLE_MAX = 100;
const DESC_MIN = 50;
const DESC_MAX = 1000;

// Initial form data
const INITIAL_FORM_DATA: PropertyFormData = {
  title: '',
  description: '',
  address: '',
  city: '',
  neighborhood: '',
  property_type: 'appartement' as PropertyType,
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

// Step configuration
const STEPS = [
  { id: 1, label: 'Photos & Infos', icon: ImageIcon },
  { id: 2, label: 'Localisation', icon: MapPin },
  { id: 3, label: 'Tarification', icon: DollarSign },
];

const toDbCategory = (category: PropertyFormData['property_category']) =>
  category === 'commercial' ? 'commercial' : 'residentiel';

const toUiCategory = (category?: string | null): PropertyFormData['property_category'] =>
  category === 'commercial' ? 'commercial' : 'residential';

export default function AddProperty() {
  return <AddPropertyContent />;
}

export function AddPropertyContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [draftSaved, setDraftSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [pendingDraftData, setPendingDraftData] = useState<PropertyFormData | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hook de validation
  const { validateField, getFieldState, setFieldTouched } = useFormValidation<PropertyFormData>();

  const [formData, setFormData] = useState<PropertyFormData>(INITIAL_FORM_DATA);

  const [searchParams] = useSearchParams();
  const editPropertyId = searchParams.get('edit');
  const isEditMode = !!editPropertyId;
  // Le layout est déjà géré par les routes, pas besoin d'encapsuler

  // Load draft from localStorage on mount - show confirmation modal
  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEYS.PROPERTY_DRAFT);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        // Show modal if draft has significant data
        if (parsed.title || parsed.description || parsed.address) {
          setPendingDraftData(parsed);
          setShowDraftModal(true);
        }
      } catch {
        // Remove corrupted draft
        localStorage.removeItem(STORAGE_KEYS.PROPERTY_DRAFT);
      }
    }
  }, []);

  const loadPropertyData = useCallback(
    async (propertyId: string) => {
      if (!user) {
        navigate('/connexion');
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', propertyId)
          .eq('owner_id', user.id)
          .single();

        if (error) {
          console.error('Error loading property:', error);
          alert('Erreur lors du chargement de la propriété');
          navigate('/proprietaire/mes-biens');
          return;
        }

        if (data) {
          const addressValue =
            typeof data.address === 'string'
              ? data.address
              : ((data as unknown as { address?: { street?: string } })?.address?.street ?? '');

          setFormData({
            title: data.title || '',
            description: data.description || '',
            address: addressValue,
            city: data.city || '',
            neighborhood: data.neighborhood || '',
            property_type: (data.property_type as PropertyType) || 'appartement',
            property_category: toUiCategory(data.property_category),
            bedrooms: data.bedrooms ?? 0,
            bathrooms: data.bathrooms ?? 0,
            surface_area: data.surface_area?.toString() || '',
            monthly_rent: (data.monthly_rent ?? data.price ?? '').toString(),
            deposit_amount: data.deposit_amount?.toString() || '',
            charges_amount: data.charges_amount?.toString() || '',
            has_parking: data.has_parking ?? false,
            has_garden: data.has_garden ?? false,
            furnished: data.furnished ?? false,
            has_ac: data.has_ac ?? false,
            is_anonymous: data.is_anonymous ?? false,
          });
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Une erreur est survenue');
        navigate('/proprietaire/mes-biens');
      } finally {
        setLoading(false);
      }
    },
    [user, navigate]
  );

  // Load property data in edit mode
  useEffect(() => {
    if (isEditMode && editPropertyId) {
      loadPropertyData(editPropertyId);
    }
  }, [isEditMode, editPropertyId, loadPropertyData]);

  // Save draft to localStorage with debounce
  const saveDraft = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.PROPERTY_DRAFT, JSON.stringify(formData));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }, [formData]);

  // Auto-save draft on form changes (debounced)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (formData.title || formData.description || formData.city) {
        saveDraft();
      }
    }, 3000); // Save after 3 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, saveDraft]);

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.PROPERTY_DRAFT);
    setFormData(INITIAL_FORM_DATA);
    setHasDraft(false);
    setImageFiles([]);
    setImagePreviews([]);
    setStep(1);
  }, []);

  // Handler for "Continue draft"
  const handleContinueDraft = () => {
    if (pendingDraftData) {
      setFormData((prev) => ({ ...prev, ...pendingDraftData }));
      setHasDraft(true);
    }
    setShowDraftModal(false);
    setPendingDraftData(null);
  };

  // Handler for "Start fresh"
  const handleStartFresh = () => {
    localStorage.removeItem(STORAGE_KEYS.PROPERTY_DRAFT);
    setFormData(INITIAL_FORM_DATA);
    setHasDraft(false);
    setShowDraftModal(false);
    setPendingDraftData(null);
  };

  useEffect(() => {
    const category = formData.property_category;
    const currentType = formData.property_type;

    const validTypes: string[] =
      category === 'commercial'
        ? COMMERCIAL_PROPERTY_TYPES.map((pt) => pt.value)
        : RESIDENTIAL_PROPERTY_TYPES.map((pt) => pt.value);

    if (!validTypes.includes(currentType)) {
      setFormData((prev) => ({
        ...prev,
        property_type: validTypes[0] as PropertyType,
      }));
    }
  }, [formData.property_category]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Validation en temps réel pour les champs critiques
  const handleBlur = (field: keyof PropertyFormData) => {
    setFieldTouched(field);

    switch (field) {
      case 'title': {
        // Validation combinée: longueur + qualité
        const lengthResult = ValidationService.validateLength(
          formData.title,
          TITLE_MIN,
          TITLE_MAX,
          'Le titre'
        );
        if (!lengthResult.isValid) {
          validateField('title', () => lengthResult);
        } else {
          validateField('title', () => ValidationService.validateTitleQuality(formData.title));
        }
        break;
      }
      case 'description':
        if (formData.description) {
          validateField('description', () =>
            ValidationService.validateLength(
              formData.description,
              DESC_MIN,
              DESC_MAX,
              'La description'
            )
          );
        }
        break;
      case 'address':
        validateField('address', () =>
          ValidationService.validateRequired(formData.address, "L'adresse")
        );
        break;
      case 'city':
        validateField('city', () => ValidationService.validateRequired(formData.city, 'La ville'));
        break;
      case 'monthly_rent':
        validateField('monthly_rent', () =>
          ValidationService.validatePositiveNumber(formData.monthly_rent, 'Le loyer')
        );
        break;
      case 'surface_area':
        if (formData.surface_area) {
          validateField('surface_area', () =>
            ValidationService.validatePositiveNumber(formData.surface_area, 'La surface')
          );
        }
        break;
    }
  };

  const getPropertyTypesForCategory = () => {
    return formData.property_category === 'commercial'
      ? COMMERCIAL_PROPERTY_TYPES
      : RESIDENTIAL_PROPERTY_TYPES;
  };

  // Character count helpers
  const getTitleCharClass = () => {
    if (formData.title.length < TITLE_MIN) return 'text-[var(--color-orange)]';
    if (formData.title.length > TITLE_MAX) return 'text-red-500';
    return 'text-[var(--color-gris-neutre)]';
  };

  const getDescCharClass = () => {
    if (formData.description.length > 0 && formData.description.length < DESC_MIN)
      return 'text-[var(--color-orange)]';
    if (formData.description.length > DESC_MAX) return 'text-red-500';
    return 'text-[var(--color-gris-neutre)]';
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    const previewToRevoke = imagePreviews[index];
    if (previewToRevoke) {
      URL.revokeObjectURL(previewToRevoke);
    }

    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const uploadImages = async (propertyId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    console.log('[uploadImages] Starting upload for property:', propertyId);
    console.log('[uploadImages] Files to upload:', imageFiles.length);

    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId}/${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log('[uploadImages] Uploading:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('[uploadImages] Upload error:', uploadError);
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('property-images').getPublicUrl(fileName);

      console.log('[uploadImages] Public URL:', publicUrl);
      uploadedUrls.push(publicUrl);
    }

    console.log('[uploadImages] All uploads complete:', uploadedUrls);
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/connexion');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const monthlyRentValue = Number(formData.monthly_rent);
      const depositValue = formData.deposit_amount ? Number(formData.deposit_amount) : null;
      const chargesValue = formData.charges_amount ? Number(formData.charges_amount) : 0;
      const bedroomsValue = Number(formData.bedrooms);
      const bathroomsValue = Number(formData.bathrooms);
      const surfaceValue = formData.surface_area ? Number(formData.surface_area) : null;
      const normalizedDeposit =
        depositValue === null || Number.isNaN(depositValue) ? null : depositValue;
      const normalizedCharges = Number.isNaN(chargesValue) ? 0 : chargesValue;
      const normalizedSurface =
        surfaceValue === null || Number.isNaN(surfaceValue) ? null : surfaceValue;

      if (Number.isNaN(monthlyRentValue)) {
        throw new Error('Le loyer est invalide');
      }

      const propertyData = {
        owner_id: user.id,
        title: formData.title,
        description: formData.description || null,
        address: formData.address || '',
        city: formData.city || '',
        neighborhood: formData.neighborhood || null,
        property_type: formData.property_type,
        property_category: toDbCategory(formData.property_category),
        bedrooms: Number.isNaN(bedroomsValue) ? 0 : bedroomsValue,
        bathrooms: Number.isNaN(bathroomsValue) ? 0 : bathroomsValue,
        surface_area: normalizedSurface,
        price: monthlyRentValue,
        deposit_amount: normalizedDeposit,
        charges_amount: normalizedCharges,
        has_parking: !!formData.has_parking,
        has_garden: !!formData.has_garden,
        furnished: !!formData.furnished,
        has_ac: !!formData.has_ac,
        is_anonymous: !!formData.is_anonymous,
        status: 'disponible' as const,
        images: [],
        main_image: null,
        views_count: 0,
      };

      let data, error;

      if (isEditMode && editPropertyId) {
        // Update existing property
        const result = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editPropertyId)
          .eq('owner_id', user.id)
          .select()
          .single();

        data = result.data;
        error = result.error;
      } else {
        // Create new property
        const result = await supabase.from('properties').insert(propertyData).select().single();

        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      if (!data)
        throw new Error(
          `Erreur lors de ${isEditMode ? 'la mise à jour' : 'la création'} de la propriété`
        );

      if (imageFiles.length > 0) {
        setUploadingImages(true);
        const imageUrls = await uploadImages(data.id);

        console.log('[handleSubmit] Updating property with images:', imageUrls);

        const { error: updateError } = await supabase
          .from('properties')
          .update({
            images: imageUrls,
            main_image: imageUrls[0],
          })
          .eq('id', data.id);

        if (updateError) {
          console.error('[handleSubmit] Update error:', updateError);
          throw updateError;
        }

        console.log('[handleSubmit] Property updated successfully with images');
      }

      // Clear draft after successful submission
      localStorage.removeItem(STORAGE_KEYS.PROPERTY_DRAFT);

      setSuccess(true);
      setTimeout(() => {
        navigate('/proprietaire/mes-biens');
      }, 3000);
    } catch (err: unknown) {
      const supabaseErr = err as { message?: string; details?: string; hint?: string };
      const message =
        supabaseErr?.message ||
        (err instanceof Error ? err.message : "Erreur lors de l'ajout de la propriété");
      const details = supabaseErr?.details ? ` (${supabaseErr.details})` : '';
      const hint = supabaseErr?.hint ? ` — ${supabaseErr.hint}` : '';
      console.error('Error inserting property:', err);
      setError(`${message}${details}${hint}`);
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  // Navigation between steps with directional animation
  const goToStep = (targetStep: number) => {
    if (targetStep >= 1 && targetStep <= 3) {
      setSlideDirection(targetStep > step ? 'forward' : 'backward');
      setStep(targetStep);
    }
  };

  const canProceedToStep2 = () => {
    return formData.title.length >= TITLE_MIN && formData.property_category;
  };

  const canProceedToStep3 = () => {
    return formData.city !== '';
  };

  // Confetti colors with Premium Ivorian palette
  const confettiColors = [
    'var(--color-orange)',
    'var(--color-chocolat)',
    'hsl(38 92% 50%)',
    'hsl(142 76% 36%)',
  ];

  if (success) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        style={{
          background:
            'linear-gradient(to bottom right, var(--color-orange-50), var(--color-creme))',
        }}
      >
        {/* Confetti effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-5%',
                animationDuration: `${2 + Math.random() * 3}s`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    confettiColors[Math.floor(Math.random() * confettiColors.length)],
                }}
              />
            </div>
          ))}
        </div>

        <div
          className="relative bg-white rounded-3xl p-10 max-w-xl w-full text-center shadow-xl animate-fade-in border"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Animated success icon */}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce"
            style={{
              background: 'linear-gradient(135deg, var(--color-orange), var(--color-orange-dark))',
            }}
          >
            <Check className="h-12 w-12 text-white" />
          </div>

          <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-chocolat)' }}>
            🎉 Félicitations !
          </h2>
          <p className="text-xl mb-2" style={{ color: 'var(--color-gris-texte)' }}>
            Propriété publiée avec succès
          </p>
          <p className="mb-6" style={{ color: 'var(--color-gris-neutre)' }}>
            Votre annonce est maintenant visible par tous les locataires sur Mon Toit.
          </p>

          {/* Animated redirect indicator */}
          <div
            className="flex items-center justify-center gap-2"
            style={{ color: 'var(--color-orange)' }}
          >
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: 'var(--color-orange)', animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: 'var(--color-orange)', animationDelay: '150ms' }}
            />
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: 'var(--color-orange)', animationDelay: '300ms' }}
            />
            <span className="ml-2 font-medium">Redirection vers votre dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header Sticky Premium Ivorian */}
      <div
        className="bg-white border-b sticky top-0 z-30 shadow-sm"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="w-full px-4 lg:px-10 xl:px-12 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--color-gris-texte)' }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Retour</span>
          </button>

          {/* Progress Dots */}
          <div className="flex items-center gap-3">
            {STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => goToStep(s.id)}
                className={`flex items-center gap-2 transition-all ${step === s.id ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step >= s.id ? 'text-white shadow-lg' : 'bg-gray-200 text-gray-500'
                  }`}
                  style={{
                    backgroundColor: step >= s.id ? 'var(--color-orange)' : undefined,
                    boxShadow: step >= s.id ? '0 4px 12px rgba(241, 101, 34, 0.3)' : undefined,
                  }}
                >
                  {s.id}
                </div>
                <span
                  className={`hidden md:block text-sm font-medium ${step === s.id ? '' : 'text-gray-400'}`}
                  style={{ color: step === s.id ? 'var(--color-chocolat)' : undefined }}
                >
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <div
                    className="w-8 h-0.5 hidden md:block"
                    style={{
                      backgroundColor: step > s.id ? 'var(--color-orange)' : 'var(--color-border)',
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Draft saved indicator */}
          {draftSaved && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <Check className="h-3 w-3" />
              Sauvegardé
            </span>
          )}
          {!draftSaved && hasDraft && (
            <button
              onClick={clearDraft}
              className="flex items-center gap-1 text-xs hover:text-red-500 transition-colors"
              style={{ color: 'var(--color-gris-neutre)' }}
            >
              <RefreshCw className="h-3 w-3" />
              Effacer
            </button>
          )}
        </div>
      </div>

      <div className="w-full px-4 lg:px-10 xl:px-12 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--color-orange-100)' }}>
              <Home className="w-6 h-6" style={{ color: 'var(--color-orange)' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-chocolat)' }}>
              {isEditMode ? 'Modifier la propriété' : 'Ajouter une propriété'}
            </h1>
          </div>
          <p style={{ color: 'var(--color-gris-texte)' }}>
            {isEditMode
              ? 'Modifiez les informations de votre propriété'
              : 'Remplissez les informations de votre propriété pour la publier sur Mon Toit'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <strong>Erreur:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Photos & Infos générales */}
          {step === 1 && (
            <div
              key={`step-1-${slideDirection}`}
              className={`space-y-6 ${slideDirection === 'forward' ? 'step-enter-forward' : 'step-enter-backward'}`}
            >
              {/* Photos Section with NativeCameraUpload */}
              <div
                className="bg-white p-6 rounded-2xl border shadow-sm"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-5 h-5" style={{ color: 'var(--color-orange)' }} />
                  <h2 className="font-bold" style={{ color: 'var(--color-chocolat)' }}>
                    Photos de la propriété
                  </h2>
                </div>

                {/* Preview grid for existing images */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200"
                      >
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {index === 0 && (
                          <div
                            className="absolute bottom-2 left-2 text-white text-xs px-2 py-1 rounded-full font-medium"
                            style={{ backgroundColor: 'var(--color-orange)' }}
                          >
                            Photo principale
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* NativeCameraUpload for adding new images */}
                {imageFiles.length < 10 && (
                  <NativeCameraUpload
                    multiple
                    maxImages={10 - imageFiles.length}
                    showPreview={false}
                    label="Ajouter des photos"
                    variant="card"
                    compressionQuality={0.8}
                    compressionMaxWidth={1920}
                    onImageCaptured={(file, preview) => {
                      if (imageFiles.length < 10) {
                        setImageFiles((prev) => [...prev, file]);
                        setImagePreviews((prev) => [...prev, preview]);
                      }
                    }}
                    onMultipleImages={(files, previews) => {
                      const remaining = 10 - imageFiles.length;
                      const filesToAdd = files.slice(0, remaining);
                      const previewsToAdd = previews.slice(0, remaining);
                      setImageFiles((prev) => [...prev, ...filesToAdd]);
                      setImagePreviews((prev) => [...prev, ...previewsToAdd]);
                    }}
                  />
                )}

                <p
                  className="text-xs text-center mt-3"
                  style={{ color: 'var(--color-gris-neutre)' }}
                >
                  {imageFiles.length}/10 photos • La première photo sera l'image principale
                </p>
              </div>

              {/* General Info Section */}
              <div
                className="bg-white p-6 rounded-2xl border shadow-sm space-y-6"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <h2 className="font-bold text-lg" style={{ color: 'var(--color-chocolat)' }}>
                  Informations générales
                </h2>

                {/* Category Toggle */}
                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--color-gris-neutre)' }}
                  >
                    Catégorie de bien *
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, property_category: 'residential' }))
                      }
                      className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        formData.property_category === 'residential'
                          ? 'text-white shadow-lg'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      style={{
                        backgroundColor:
                          formData.property_category === 'residential'
                            ? 'var(--color-orange)'
                            : undefined,
                        boxShadow:
                          formData.property_category === 'residential'
                            ? '0 8px 20px rgba(241, 101, 34, 0.25)'
                            : undefined,
                      }}
                    >
                      <Home className="w-4 h-4" /> Résidentiel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, property_category: 'commercial' }))
                      }
                      className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        formData.property_category === 'commercial'
                          ? 'text-white shadow-lg'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      style={{
                        backgroundColor:
                          formData.property_category === 'commercial'
                            ? 'var(--color-orange)'
                            : undefined,
                        boxShadow:
                          formData.property_category === 'commercial'
                            ? '0 8px 20px rgba(241, 101, 34, 0.25)'
                            : undefined,
                      }}
                    >
                      <Building2 className="w-4 h-4" /> Commercial
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wide mb-1"
                    style={{ color: 'var(--color-gris-neutre)' }}
                  >
                    Titre de l'annonce *
                  </label>
                  <ValidatedInput
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    onBlur={() => handleBlur('title')}
                    required
                    placeholder="Ex: Bel appartement 3 pièces à Cocody"
                    error={getFieldState('title').error}
                    touched={getFieldState('title').isInvalid || getFieldState('title').isValid}
                    isValid={getFieldState('title').isValid}
                    maxLength={TITLE_MAX}
                  />
                  <div className={`text-xs mt-1 text-right ${getTitleCharClass()}`}>
                    {formData.title.length}/{TITLE_MAX} caractères
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wide mb-1"
                    style={{ color: 'var(--color-gris-neutre)' }}
                  >
                    Description
                  </label>
                  <ValidatedTextarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Décrivez votre propriété en détail..."
                    maxLength={DESC_MAX}
                  />
                  <div className={`text-xs mt-1 text-right ${getDescCharClass()}`}>
                    {formData.description.length}/{DESC_MAX} caractères
                    {formData.description.length > 0 && formData.description.length < DESC_MIN && (
                      <span className="ml-2">(min. recommandé: {DESC_MIN})</span>
                    )}
                  </div>
                </div>

                {/* Property Type & Surface */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wide mb-1"
                      style={{ color: 'var(--color-gris-neutre)' }}
                    >
                      Type de bien *
                    </label>
                    <select
                      name="property_type"
                      value={formData.property_type}
                      onChange={handleChange}
                      required
                      className="input-premium w-full"
                    >
                      {getPropertyTypesForCategory().map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wide mb-1"
                      style={{ color: 'var(--color-gris-neutre)' }}
                    >
                      Surface (m²)
                    </label>
                    <input
                      type="number"
                      name="surface_area"
                      value={formData.surface_area}
                      onChange={handleChange}
                      min="0"
                      placeholder="Ex: 75"
                      className="input-premium w-full"
                    />
                  </div>
                </div>

                {/* Bedrooms & Bathrooms */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wide mb-1"
                      style={{ color: 'var(--color-gris-neutre)' }}
                    >
                      Chambres *
                    </label>
                    <input
                      type="number"
                      name="bedrooms"
                      value={formData.bedrooms}
                      onChange={handleChange}
                      required
                      min="0"
                      className="input-premium w-full"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wide mb-1"
                      style={{ color: 'var(--color-gris-neutre)' }}
                    >
                      Salles de bain *
                    </label>
                    <input
                      type="number"
                      name="bathrooms"
                      value={formData.bathrooms}
                      onChange={handleChange}
                      required
                      min="0"
                      className="input-premium w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Step 1 Navigation */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  disabled={!canProceedToStep2()}
                  className="btn-premium-chocolat disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Localisation */}
          {step === 2 && (
            <div
              key={`step-2-${slideDirection}`}
              className={`space-y-6 ${slideDirection === 'forward' ? 'step-enter-forward' : 'step-enter-backward'}`}
            >
              <div
                className="bg-white p-6 rounded-2xl border shadow-sm space-y-6"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5" style={{ color: 'var(--color-orange)' }} />
                  <h2 className="font-bold text-lg" style={{ color: 'var(--color-chocolat)' }}>
                    Localisation
                  </h2>
                </div>

                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wide mb-1"
                    style={{ color: 'var(--color-gris-neutre)' }}
                  >
                    Adresse complète
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Ex: Rue des Jardins, Résidence Les Palmiers"
                    className="input-premium w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wide mb-1"
                      style={{ color: 'var(--color-gris-neutre)' }}
                    >
                      Ville *
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={(e) => {
                        handleChange(e);
                        if (e.target.value !== 'Abidjan') {
                          setFormData((prev) => ({ ...prev, neighborhood: '' }));
                        }
                      }}
                      onBlur={() => handleBlur('city')}
                      required
                      className="input-premium w-full"
                    >
                      <option value="">Sélectionnez une ville</option>
                      {CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wide mb-1"
                      style={{ color: 'var(--color-gris-neutre)' }}
                    >
                      Quartier{' '}
                      {formData.city === 'Abidjan' && (
                        <span className="font-normal">(commune)</span>
                      )}
                    </label>
                    {formData.city === 'Abidjan' ? (
                      <select
                        name="neighborhood"
                        value={formData.neighborhood}
                        onChange={handleChange}
                        className="input-premium w-full"
                      >
                        <option value="">Sélectionnez une commune</option>
                        {ABIDJAN_COMMUNES.map((commune) => (
                          <option key={commune} value={commune}>
                            {commune}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="neighborhood"
                        value={formData.neighborhood}
                        onChange={handleChange}
                        placeholder="Ex: Centre-ville"
                        className="input-premium w-full"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2 Navigation */}
              <div className="flex justify-between">
                <button type="button" onClick={() => goToStep(1)} className="btn-premium-secondary">
                  <ArrowLeft className="w-4 h-4" /> Retour
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  disabled={!canProceedToStep3()}
                  className="btn-premium-chocolat disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Tarification & Équipements */}
          {step === 3 && (
            <div
              key={`step-3-${slideDirection}`}
              className={`space-y-6 ${slideDirection === 'forward' ? 'step-enter-forward' : 'step-enter-backward'}`}
            >
              {/* Pricing */}
              <div
                className="bg-white p-6 rounded-2xl border shadow-sm space-y-6"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5" style={{ color: 'var(--color-orange)' }} />
                  <h2 className="font-bold text-lg" style={{ color: 'var(--color-chocolat)' }}>
                    Tarification
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wide mb-1"
                      style={{ color: 'var(--color-orange)' }}
                    >
                      Loyer mensuel (FCFA) *
                    </label>
                    <input
                      type="number"
                      name="monthly_rent"
                      value={formData.monthly_rent}
                      onChange={handleChange}
                      onBlur={() => handleBlur('monthly_rent')}
                      required
                      min="0"
                      placeholder="Ex: 150000"
                      className="input-premium w-full font-bold text-lg"
                      style={{
                        borderColor: 'var(--color-orange-100)',
                        color: 'var(--color-chocolat)',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wide mb-1"
                      style={{ color: 'var(--color-gris-neutre)' }}
                    >
                      Dépôt de garantie (FCFA)
                    </label>
                    <input
                      type="number"
                      name="deposit_amount"
                      value={formData.deposit_amount}
                      onChange={handleChange}
                      min="0"
                      placeholder="Ex: 300000"
                      className="input-premium w-full"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wide mb-1"
                      style={{ color: 'var(--color-gris-neutre)' }}
                    >
                      Charges (FCFA)
                    </label>
                    <input
                      type="number"
                      name="charges_amount"
                      value={formData.charges_amount}
                      onChange={handleChange}
                      min="0"
                      placeholder="0"
                      className="input-premium w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Equipment */}
              <div
                className="bg-white p-6 rounded-2xl border shadow-sm space-y-6"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-5 h-5" style={{ color: 'var(--color-orange)' }} />
                  <h2 className="font-bold text-lg" style={{ color: 'var(--color-chocolat)' }}>
                    Équipements
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'furnished', label: 'Meublé', checked: formData.furnished },
                    { name: 'has_parking', label: 'Parking', checked: formData.has_parking },
                    { name: 'has_garden', label: 'Jardin', checked: formData.has_garden },
                    { name: 'has_ac', label: 'Climatisation', checked: formData.has_ac },
                  ].map((item) => (
                    <label
                      key={item.name}
                      className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border ${
                        item.checked
                          ? 'border-[var(--color-orange)] bg-[var(--color-orange-50)]'
                          : 'border-[var(--color-border)] bg-white hover:border-[var(--color-orange)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name={item.name}
                        checked={item.checked}
                        onChange={handleChange}
                        className="w-5 h-5 rounded text-[var(--color-orange)] focus:ring-[var(--color-orange)]"
                        style={{ accentColor: 'var(--color-orange)' }}
                      />
                      <span
                        className="font-medium"
                        style={{
                          color: item.checked ? 'var(--color-chocolat)' : 'var(--color-gris-texte)',
                        }}
                      >
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Option Gestion Anonyme */}
                <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <label
                    className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                      formData.is_anonymous
                        ? 'border-[var(--color-orange)] bg-[var(--color-orange-50)]'
                        : 'border-[var(--color-border)] bg-white hover:border-[var(--color-orange)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="is_anonymous"
                      checked={formData.is_anonymous}
                      onChange={handleChange}
                      className="w-5 h-5 mt-0.5 rounded text-[var(--color-orange)] focus:ring-[var(--color-orange)]"
                      style={{ accentColor: 'var(--color-orange)' }}
                    />
                    <div>
                      <span
                        className="font-semibold block"
                        style={{
                          color: formData.is_anonymous
                            ? 'var(--color-chocolat)'
                            : 'var(--color-gris-texte)',
                        }}
                      >
                        🔒 Gestion anonyme
                      </span>
                      <span
                        className="text-sm block mt-1"
                        style={{ color: 'var(--color-gris-neutre)' }}
                      >
                        Votre nom sera masqué. Les locataires verront "Géré par [Agence]" à la
                        place. Nécessite un mandat avec une agence.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 3 Navigation & Submit */}
              <div className="flex justify-between items-center pt-4">
                <button type="button" onClick={() => goToStep(2)} className="btn-premium-secondary">
                  <ArrowLeft className="w-4 h-4" /> Retour
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingImages}
                  className="btn-premium-primary transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed px-10 py-4 text-lg"
                  style={{ boxShadow: '0 8px 24px rgba(241, 101, 34, 0.3)' }}
                >
                  {loading || uploadingImages ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>
                        {uploadingImages
                          ? 'Upload des images...'
                          : isEditMode
                            ? 'Mise à jour...'
                            : 'Publication...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />{' '}
                      {isEditMode ? "Mettre à jour l'annonce" : "Publier l'annonce"}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Draft confirmation modal */}
      <Modal
        isOpen={showDraftModal}
        onClose={() => {}}
        title=""
        size="sm"
        closeOnOverlayClick={false}
        showCloseButton={false}
      >
        <div className="text-center py-4">
          {/* File icon with gradient */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{
              background:
                'linear-gradient(135deg, var(--color-orange-100), var(--color-orange-50))',
            }}
          >
            <FileText
              className="h-12 w-12 animate-pulse"
              style={{ color: 'var(--color-orange)' }}
            />
          </div>

          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-chocolat)' }}>
            📝 Brouillon trouvé !
          </h3>

          <p className="mb-4" style={{ color: 'var(--color-gris-texte)' }}>
            Vous avez un brouillon non terminé pour cette propriété.
          </p>

          {pendingDraftData?.title && (
            <div
              className="p-4 rounded-xl mb-6 text-left"
              style={{ backgroundColor: 'var(--color-creme)' }}
            >
              <p
                className="text-xs uppercase tracking-wide mb-1"
                style={{ color: 'var(--color-gris-neutre)' }}
              >
                Titre sauvegardé
              </p>
              <p className="font-medium truncate" style={{ color: 'var(--color-chocolat)' }}>
                {pendingDraftData.title}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleStartFresh}
              className="btn-premium-secondary flex-1 justify-center"
            >
              Recommencer à zéro
            </button>
            <button
              onClick={handleContinueDraft}
              className="btn-premium-primary flex-1 justify-center"
            >
              Continuer le brouillon
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
