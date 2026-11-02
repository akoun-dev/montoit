import React from 'react';
import { usePropertyForm } from '../hooks/usePropertyForm';
import PropertySteps from './PropertySteps';
import PropertyImageUpload from './PropertyImageUpload';
import CitySelector from './CitySelector';
import { propertyService } from '../services/propertyService';
import { useNotifications, NotificationContainer } from '../../../shared/components/Notification';
import { PropertyData } from '../services/propertyService';
import {
  Home,
  MapPin,
  DollarSign,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Ruler,
  Bed,
  Bath,
  Car,
  Shield,
  Trees,
} from 'lucide-react';

const PropertyForm: React.FC = () => {
  const {
    formData,
    errors,
    currentStep,
    isLoading,
    isSubmitting,
    uploadProgress,
    updateField,
    nextStep,
    prevStep,
    validateCurrentStep,
    validateField,
    submitForm,
    canProceedToNextStep,
    // Images
    addImages,
    removeImage,
    setMainImage,
    reorderImages,
  } = usePropertyForm();

  const { success, error: showError, notifications, removeNotification } = useNotifications();

  const handleNext = () => {
    if (validateCurrentStep()) {
      nextStep();
    }
  };

  // Validation en temps réel au blur
  const handleBlur = (field: keyof PropertyData) => {
    validateField(field);
  };

  const handleSubmit = async () => {
    try {
      const result = await submitForm();
      if (result.success) {
        success(
          'Propriété créée avec succès !',
          'Votre propriété a été publiée et sera bientôt visible par les acheteurs potentiels.'
        );
        // Redirection vers la propriété créée
        if (result.propertyId) {
          setTimeout(() => {
            window.location.href = `/proprietes/${result.propertyId}`;
          }, 2000);
        }
      } else {
        console.error('Erreur lors de la soumission:', result.error);
        showError(
          'Erreur lors de la soumission',
          result.error || "Une erreur inattendue s'est produite"
        );
      }
    } catch (err) {
      console.error('Erreur inattendue lors de la soumission:', err);
      showError('Erreur technique', "Une erreur technique s'est produite. Veuillez réessayer.");
    }
  };

  // Afficher un loader pendant le chargement initial
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du formulaire...</p>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderInformationsStep();
      case 1:
        return renderLocalisationStep();
      case 2:
        return renderPhotosStep();
      case 3:
        return renderTarifStep();
      case 4:
        return renderValidationStep();
      default:
        return null;
    }
  };

  // Étape 1: Informations générales
  const renderInformationsStep = () => {
    const propertyTypes = propertyService.getPropertyTypes();

    return (
      <div className="space-y-6">
        {/* Titre et description */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Home className="inline w-4 h-4 mr-2" />
              Titre de la propriété *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              onBlur={() => handleBlur('title')}
              placeholder="Ex: Magnifique appartement 3 pièces vue mer"
              className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                errors.title
                  ? 'border-destructive bg-destructive/5'
                  : formData.title.length >= 5
                    ? 'border-green-500 bg-green-50'
                    : 'border-input'
              } focus:ring-2 focus:ring-primary/20 focus:border-primary`}
              maxLength={100}
            />
            {errors.title && <p className="text-destructive text-xs mt-1">{errors.title}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {formData.title.length}/100 caractères
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Type de propriété *
            </label>
            <select
              value={formData.propertyType}
              onChange={(e) => updateField('propertyType', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg transition-colors ${errors.propertyType ? 'border-destructive' : 'border-input'} focus:ring-2 focus:ring-primary/20 focus:border-primary`}
            >
              {propertyTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.propertyType && (
              <p className="text-destructive text-xs mt-1">{errors.propertyType}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description détaillée *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => handleBlur('description')}
            placeholder="Décrivez votre propriété, son environnement, ses avantages..."
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg transition-colors ${
              errors.description
                ? 'border-destructive bg-destructive/5'
                : formData.description.length >= 20
                  ? 'border-green-500 bg-green-50'
                  : 'border-input'
            } focus:ring-2 focus:ring-primary/20 focus:border-primary`}
            maxLength={2000}
          />
          {errors.description && (
            <p className="text-destructive text-xs mt-1">{errors.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formData.description.length}/2000 caractères
          </p>
        </div>

        {/* Caractéristiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Bed className="inline w-4 h-4 mr-1" />
              Chambres *
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.bedrooms}
              onChange={(e) => updateField('bedrooms', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md ${errors.bedrooms ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.bedrooms && <p className="text-red-500 text-xs mt-1">{errors.bedrooms}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Bath className="inline w-4 h-4 mr-1" />
              Salles de bain *
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.bathrooms}
              onChange={(e) => updateField('bathrooms', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md ${errors.bathrooms ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.bathrooms && <p className="text-red-500 text-xs mt-1">{errors.bathrooms}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Ruler className="inline w-4 h-4 mr-1" />
              Surface (m²) *
            </label>
            <input
              type="number"
              min="1"
              value={formData.area}
              onChange={(e) => updateField('area', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md ${errors.area ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.area && <p className="text-red-500 text-xs mt-1">{errors.area}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de transaction
            </label>
            <select
              value={formData.priceType}
              onChange={(e) => updateField('priceType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="achat">À vendre</option>
              <option value="location">À louer</option>
            </select>
          </div>
        </div>

        {/* Équipements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Équipements et commodités
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { key: 'furnished', label: 'Meublé', icon: <Home className="w-4 h-4" /> },
              { key: 'parking', label: 'Parking', icon: <Car className="w-4 h-4" /> },
              { key: 'garden', label: 'Jardin', icon: <Trees className="w-4 h-4" /> },
              { key: 'terrace', label: 'Terrasse', icon: <Home className="w-4 h-4" /> },
              { key: 'elevator', label: 'Ascenseur', icon: <Home className="w-4 h-4" /> },
              { key: 'security', label: 'Sécurité', icon: <Shield className="w-4 h-4" /> },
            ].map((amenity) => (
              <label key={amenity.key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData[amenity.key as keyof PropertyData] as boolean}
                  onChange={(e) => updateField(amenity.key as keyof PropertyData, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{amenity.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Étape 2: Localisation
  const renderLocalisationStep = () => {
    return (
      <div className="space-y-6">
        <CitySelector
          selectedCity={formData.city}
          selectedDistrict={formData.district}
          onCitySelect={(city) => {
            updateField('city', city);
            updateField('district', '');
          }}
          onDistrictSelect={(district) => updateField('district', district)}
          disabled={isSubmitting}
        />

        {/* Adresse détaillée */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="inline w-4 h-4 mr-2" />
            Adresse détaillée *
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Numéro, nom de rue, références..."
            className={`w-full px-3 py-2 border rounded-md ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
        </div>
      </div>
    );
  };

  // Étape 3: Photos
  const renderPhotosStep = () => {
    return (
      <div className="space-y-6">
        <PropertyImageUpload
          images={formData.images}
          mainImageIndex={formData.mainImageIndex || 0}
          onImagesAdd={addImages}
          onImageRemove={removeImage}
          onMainImageSet={setMainImage}
          onImagesReorder={reorderImages}
          disabled={isSubmitting}
          maxImages={20}
        />
        {errors.images && (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{errors.images}</span>
          </div>
        )}
      </div>
    );
  };

  // Étape 4: Tarif et contact
  const renderTarifStep = () => {
    return (
      <div className="space-y-6">
        {/* Prix */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="inline w-4 h-4 mr-2" />
            Prix {formData.priceType === 'achat' ? '(FCFA)' : '(FCFA/mois)'} *
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              value={formData.price}
              onChange={(e) => updateField('price', parseInt(e.target.value) || 0)}
              placeholder="0"
              className={`w-full pl-12 pr-3 py-2 border rounded-md ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">FCFA</span>
            </div>
          </div>
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          {formData.price > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Prix formaté: {formData.price.toLocaleString()} FCFA
              {formData.priceType === 'location' && ' / mois'}
            </p>
          )}
        </div>

        {/* Informations de contact */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Vos informations de contact
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet *</label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => updateField('ownerName', e.target.value)}
                placeholder="Votre nom et prénom"
                className={`w-full px-3 py-2 border rounded-md ${errors.ownerName ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.ownerName && <p className="text-red-500 text-xs mt-1">{errors.ownerName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline w-4 h-4 mr-1" />
                Email *
              </label>
              <input
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => updateField('ownerEmail', e.target.value)}
                placeholder="votre@email.com"
                className={`w-full px-3 py-2 border rounded-md ${errors.ownerEmail ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.ownerEmail && (
                <p className="text-red-500 text-xs mt-1">{errors.ownerEmail}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline w-4 h-4 mr-1" />
                Téléphone *
              </label>
              <input
                type="tel"
                value={formData.ownerPhone}
                onChange={(e) => updateField('ownerPhone', e.target.value)}
                placeholder="+225 XX XX XX XX"
                className={`w-full px-3 py-2 border rounded-md ${errors.ownerPhone ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.ownerPhone && (
                <p className="text-red-500 text-xs mt-1">{errors.ownerPhone}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Format accepté: +225 XX XX XX XX ou 0X XX XX XX XX
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Étape 5: Validation
  const renderValidationStep = () => {
    const mainImageIndex = formData.mainImageIndex ?? 0;
    const mainImage = formData.images[mainImageIndex];

    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Vérification finale</h3>
          <p className="text-gray-600">
            Vérifiez tous les détails de votre propriété avant la publication.
          </p>
        </div>

        {/* Récapitulatif */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">Récapitulatif de votre propriété</h4>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h5 className="font-medium text-gray-900">{formData.title}</h5>
                <p className="text-sm text-gray-600 capitalize">{formData.propertyType}</p>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{formData.bedrooms} chambres</span>
                <span>{formData.bathrooms} SDB</span>
                <span>{formData.area} m²</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {formData.city}, {formData.district}
              </div>

              <div className="text-lg font-bold text-blue-600">
                {formData.price.toLocaleString()} FCFA{' '}
                {formData.priceType === 'location' && '/ mois'}
              </div>
            </div>

            {formData.images.length > 0 && mainImage && (
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={URL.createObjectURL(mainImage)}
                  alt="Image principale"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">{formData.description}</p>
          </div>
        </div>

        {/* Progression de soumission */}
        {isSubmitting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div className="flex-1">
                <p className="text-sm text-blue-800">Création de votre propriété...</p>
                {uploadProgress > 0 && (
                  <div className="mt-2">
                    <div className="bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-1">{uploadProgress}% téléchargé</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full mx-auto">
      <NotificationContainer notifications={notifications} onClose={removeNotification} />

      {/* Indicateur de progression */}
      <PropertySteps
        currentStep={currentStep}
        completedSteps={Array.from({ length: currentStep }, (_, i) => i < currentStep)}
        stepValidations={Array.from({ length: 5 }, (_, i) => i < currentStep)}
      />

      {/* Contenu de l'étape */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 0 || isSubmitting}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Précédent
        </button>

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceedToNextStep || isSubmitting}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Publication en cours...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Publier la propriété
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default PropertyForm;
