import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePropertyForm } from '@/hooks/usePropertyForm';
import { useMediaUpload, type MediaFiles } from '@/hooks/useMediaUpload';
import { usePropertyPermissions } from '@/hooks/usePropertyPermissions';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { FormProgressIndicator, type Step } from '@/components/forms/FormProgressIndicator';
import { FormStepper } from '@/components/forms/FormStepper';
import { StickyHeader } from '@/components/ui/sticky-header';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { MediaUploader } from '@/components/property/MediaUploader';
import { type PropertyFormData } from '@/components/property/form/PropertyFormSchema';
import { PropertyBasicInfo } from '@/components/property/form/PropertyBasicInfo';
import { PropertyLocation } from '@/components/property/form/PropertyLocation';
import { PropertyCharacteristicsForm } from '@/components/property/form/PropertyCharacteristicsForm';
import { PropertyPricing } from '@/components/property/form/PropertyPricing';
import { PropertyWorkStatus } from '@/components/property/form/PropertyWorkStatus';
import { LocationPicker } from '@/components/property/LocationPicker';
import { TitleDeedUploader } from '@/components/property/TitleDeedUploader';
import { NavigationHelp } from '@/components/navigation/NavigationHelp';
import { LazyIllustration } from '@/components/illustrations/LazyIllustration';
import { getIllustrationPath } from '@/lib/utils';

const propertyFormSteps: Step[] = [
  { id: 'basic', label: 'Type de bien' },
  { id: 'location', label: 'Informations générales' },
  { id: 'characteristics', label: 'Photos et description' },
  { id: 'pricing', label: 'Prix et disponibilité' },
  { id: 'media', label: 'Vérification' }
];

const AddProperty = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const basicInfoRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const characteristicsRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { requireOwnerAccess } = usePropertyPermissions();
  const { form, submitting, submitProperty } = usePropertyForm();
  const { uploading, progress, uploadMedia, validateMediaFiles } = useMediaUpload();
  
  const [mediaFiles, setMediaFiles] = useState<MediaFiles>({
    images: [],
    video: null,
    panoramas: [],
    floorPlans: [],
    virtualTourUrl: '',
  });

  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [propertyId] = useState<string>(() => crypto.randomUUID());

  // Track scroll position to update current step and sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
      
      const sections = [
        { ref: basicInfoRef, step: 0 },
        { ref: locationRef, step: 1 },
        { ref: characteristicsRef, step: 2 },
        { ref: pricingRef, step: 3 },
        { ref: mediaRef, step: 4 }
      ];

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.ref.current) {
          const rect = section.ref.current.getBoundingClientRect();
          if (rect.top <= 200) {
            setCurrentStep(section.step);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const onSubmit = async (data: PropertyFormData) => {
    // Validate media files
    const validation = validateMediaFiles(mediaFiles);
    if (!validation.valid) {
      validation.errors.forEach(error => {
        toast({
          title: "Erreur",
          description: error,
          variant: "destructive",
        });
      });
      return;
    }

    try {
      // 1. Create property first (without media URLs)
      const propertyId = await submitProperty(data, {
        images: [],
        mainImage: null,
        videoUrl: null,
        panoramas: [],
        floorPlans: [],
      });

      // 2. Upload all media
      const mediaUrls = await uploadMedia(propertyId, mediaFiles);

      // 3. Update property with media URLs
      await submitProperty(data, mediaUrls, propertyId);

      navigate('/mes-biens');
    } catch (error) {
      // Errors are already handled by the hooks
    }
  };

  const accessCheck = requireOwnerAccess();
  if (!accessCheck.hasAccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Accès refusé</CardTitle>
              <CardDescription>
                {accessCheck.error}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Sticky Header */}
      {isSticky && (
        <StickyHeader offsetTop="top-16" className="shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Nouvelle Propriété</h2>
              <p className="text-sm text-muted-foreground">
                Étape {currentStep + 1} sur {propertyFormSteps.length}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: "Brouillon sauvegardé",
                  description: "Vos modifications ont été enregistrées",
                });
              }}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Enregistrer brouillon
            </Button>
          </div>
        </StickyHeader>
      )}
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto">
          <DynamicBreadcrumb />
          
          <div className="mb-6 mt-4">
            <NavigationHelp backTo="/dashboard" backLabel="Retour au dashboard" />
          </div>

          {/* Illustration motivante */}
          <div className="mb-8 grid md:grid-cols-[1fr,300px] gap-6 items-center p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Publiez votre bien</h1>
              <p className="text-lg text-muted-foreground">Remplissez le formulaire en quelques clics et touchez des milliers de locataires</p>
            </div>
            <LazyIllustration
              src={getIllustrationPath("ivorian-family-house")}
              alt="Publier un bien"
              className="hidden md:block w-full h-[180px] rounded-xl"
              animate={true}
            />
          </div>

          <FormStepper steps={propertyFormSteps} currentStep={currentStep} />
          <FormProgressIndicator steps={propertyFormSteps} currentStep={currentStep} className="mt-6" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div ref={basicInfoRef} className="scroll-mt-32">
                <PropertyBasicInfo form={form} />
              </div>
              <div ref={locationRef} className="scroll-mt-32">
                <PropertyLocation form={form} />
              </div>
              
              <LocationPicker 
                city={form.watch("city")}
                onLocationSelect={(lat, lng) => setSelectedLocation({ lat, lng })}
              />

              <div ref={characteristicsRef} className="scroll-mt-32">
                <PropertyCharacteristicsForm form={form} />
              </div>
              <div ref={pricingRef} className="scroll-mt-32">
                <PropertyPricing form={form} />
              </div>
              <PropertyWorkStatus form={form} />

              {/* Titre de propriété */}
              <Card>
                <CardHeader>
                  <CardTitle>📄 Titre de propriété (optionnel)</CardTitle>
                  <CardDescription>
                    Document officiel attestant de votre propriété du bien (PDF, JPEG, PNG)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TitleDeedUploader
                    propertyId={propertyId}
                    onUploadSuccess={(url) => form.setValue("title_deed_url", url)}
                    existingUrl={form.watch("title_deed_url")}
                  />
                </CardContent>
              </Card>

              {/* Multimedia */}
              <Card ref={mediaRef} className="scroll-mt-32">
                <CardHeader>
                  <CardTitle>Médias</CardTitle>
                  <CardDescription>Ajoutez des photos, vidéos, vues 360° et plans</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MediaUploader
                    onImagesChange={(files) => setMediaFiles(prev => ({ ...prev, images: files }))}
                    onVideoChange={(file) => setMediaFiles(prev => ({ ...prev, video: file }))}
                    onPanoramaChange={(files) => setMediaFiles(prev => ({ ...prev, panoramas: files }))}
                    onFloorPlanChange={(files) => setMediaFiles(prev => ({ ...prev, floorPlans: files }))}
                    onVirtualTourUrlChange={(url) => setMediaFiles(prev => ({ ...prev, virtualTourUrl: url }))}
                    uploading={uploading}
                  />
                  
                  {uploading && progress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Téléchargement des médias...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/mes-biens')}
                  disabled={submitting || uploading}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={submitting || uploading} className="flex-1">
                  {submitting || uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publication en cours...
                    </>
                  ) : (
                    'Publier le bien'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddProperty;
