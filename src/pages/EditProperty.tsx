import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { usePropertyForm } from '@/hooks/usePropertyForm';
import { useMediaUpload, type MediaFiles, type MediaUrls } from '@/hooks/useMediaUpload';
import { usePropertyDelete } from '@/hooks/usePropertyDelete';
import { usePropertyPermissions } from '@/hooks/usePropertyPermissions';
import { useAgencyMandates } from '@/hooks/useAgencyMandates';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { FormProgressIndicator, type Step } from '@/components/forms/FormProgressIndicator';
import { FormStepper } from '@/components/forms/FormStepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Trash2 } from 'lucide-react';
import { MediaUploader } from '@/components/property/MediaUploader';
import { type PropertyFormData } from '@/components/property/form/PropertyFormSchema';
import { PropertyBasicInfo } from '@/components/property/form/PropertyBasicInfo';
import { PropertyLocation } from '@/components/property/form/PropertyLocation';
import { PropertyCharacteristicsForm } from '@/components/property/form/PropertyCharacteristicsForm';
import { PropertyPricing } from '@/components/property/form/PropertyPricing';
import { PropertyWorkStatus } from '@/components/property/form/PropertyWorkStatus';
import { LocationPicker } from '@/components/property/LocationPicker';

const propertyFormSteps: Step[] = [
  { id: 'basic', label: 'Type de bien' },
  { id: 'location', label: 'Informations générales' },
  { id: 'characteristics', label: 'Photos et description' },
  { id: 'pricing', label: 'Prix et disponibilité' },
  { id: 'media', label: 'Vérification' }
];

const EditProperty = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, canEditProperty, requireOwnerAccess, hasAgencyPermission, activeMandates, asAgency } = usePropertyPermissions();
  const { form, loading, submitting, submitProperty } = usePropertyForm(id);
  const { uploading, uploadMedia } = useMediaUpload();
  const { deleting, deleteProperty } = usePropertyDelete();
  
  const [propertyOwnerId, setPropertyOwnerId] = useState<string | null>(null);
  const [activeMandate, setActiveMandate] = useState<any>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const basicInfoRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const characteristicsRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  
  const [existingMedia, setExistingMedia] = useState<MediaUrls>({
    images: [],
    mainImage: null,
    videoUrl: null,
    panoramas: [],
    floorPlans: [],
  });
  
  const [mediaFiles, setMediaFiles] = useState<MediaFiles>({
    images: [],
    video: null,
    panoramas: [],
    floorPlans: [],
    virtualTourUrl: '',
  });

  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [initialLocation, setInitialLocation] = useState<{lat: number, lng: number} | null>(null);

  // Track scroll position to update current step
  useEffect(() => {
    const handleScroll = () => {
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

  // Load property data and media
  useEffect(() => {
    const loadPropertyMedia = async () => {
      if (!id) return;

      const { data: property, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !property) {
        toast({
          title: "Erreur",
          description: "Bien introuvable",
          variant: "destructive",
        });
        navigate('/mes-biens');
        return;
      }

      // Check ownership or agency permissions
      setPropertyOwnerId(property.owner_id);
      
      if (!canEditProperty(property.owner_id, id)) {
        toast({
          title: "Accès refusé",
          description: "Vous ne pouvez pas modifier ce bien",
          variant: "destructive",
        });
        navigate('/mes-biens');
        return;
      }

      // Find active mandate if user is an agency
      if (user?.id && user.id !== property.owner_id) {
        const mandate = activeMandates.find(m => 
          m.property_id === id || (!m.property_id && m.owner_id === property.owner_id)
        );
        setActiveMandate(mandate);
      }

      // Set existing media
      setExistingMedia({
        images: property.images || [],
        mainImage: property.main_image || null,
        videoUrl: property.video_url || null,
        panoramas: (property.panoramic_images as any) || [],
        floorPlans: (property.floor_plans as any) || [],
      });

      setMediaFiles(prev => ({
        ...prev,
        virtualTourUrl: property.virtual_tour_url || '',
      }));

      // Set initial location if available
      if (property.latitude && property.longitude) {
        setInitialLocation({ lat: property.latitude, lng: property.longitude });
      }
    };

    loadPropertyMedia();
  }, [id, canEditProperty, navigate]);

  const onSubmit = async (data: PropertyFormData) => {
    if (!id || !user) return;

    try {
      // Upload new media
      const mediaUrls = await uploadMedia(id, mediaFiles, existingMedia);

      // Update property with all data including media URLs
      await submitProperty(data, mediaUrls, id, selectedLocation);

      navigate('/mes-biens');
    } catch (error) {
      // Errors are already handled by the hooks
    }
  };

  const handleDeleteProperty = async () => {
    if (!id || !user) return;
    await deleteProperty(id, user.id, existingMedia);
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
              <CardDescription>{accessCheck.error}</CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 pt-24">
        <div className="max-w-4xl mx-auto">
          <DynamicBreadcrumb />
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Modifier le bien</h1>
            {propertyOwnerId && hasAgencyPermission(id!, propertyOwnerId, 'can_delete_properties') ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer le bien
                  </Button>
                </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Le bien et toutes ses images seront supprimés définitivement.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteProperty}>
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            ) : null}
          </div>

          {/* Agency mandate info */}
          {activeMandate && propertyOwnerId && user?.id !== propertyOwnerId && (
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Vous gérez ce bien en tant qu'agence</strong>
                <div className="mt-2 text-sm">
                  <p className="font-medium mb-1">Permissions accordées :</p>
                  <ul className="list-disc list-inside space-y-1">
                    {activeMandate.permissions.can_edit_properties && <li>Modification du bien</li>}
                    {activeMandate.permissions.can_view_applications && <li>Voir les candidatures</li>}
                    {activeMandate.permissions.can_manage_applications && <li>Gérer les candidatures</li>}
                    {activeMandate.permissions.can_create_leases && <li>Créer des baux</li>}
                    {!activeMandate.permissions.can_delete_properties && (
                      <li className="text-muted-foreground">❌ Suppression non autorisée</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <FormStepper steps={propertyFormSteps} currentStep={currentStep} />
          <FormProgressIndicator steps={propertyFormSteps} currentStep={currentStep} className="mt-6" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div ref={basicInfoRef} className="scroll-mt-32">
                <PropertyBasicInfo form={form} />
              </div>
              <div ref={locationRef} className="scroll-mt-32">
                <PropertyLocation form={form} />
              </div>
              
              <LocationPicker 
                city={form.watch("city")}
                initialLat={initialLocation?.lat}
                initialLng={initialLocation?.lng}
                onLocationSelect={(lat, lng) => setSelectedLocation({ lat, lng })}
              />

              <div ref={characteristicsRef} className="scroll-mt-32">
                <PropertyCharacteristicsForm form={form} />
              </div>
              <div ref={pricingRef} className="scroll-mt-32">
                <PropertyPricing form={form} />
              </div>
              <PropertyWorkStatus form={form} />

              <Card ref={mediaRef} className="scroll-mt-32">
                <CardHeader>
                  <CardTitle>Médias</CardTitle>
                  <CardDescription>Ajoutez ou modifiez les photos, vidéos et plans</CardDescription>
                </CardHeader>
                <CardContent>
                  <MediaUploader
                    onImagesChange={(files) => setMediaFiles(prev => ({ ...prev, images: files }))}
                    onVideoChange={(file) => setMediaFiles(prev => ({ ...prev, video: file }))}
                    onPanoramaChange={(files) => setMediaFiles(prev => ({ ...prev, panoramas: files }))}
                    onFloorPlanChange={(files) => setMediaFiles(prev => ({ ...prev, floorPlans: files }))}
                    onVirtualTourUrlChange={(url) => setMediaFiles(prev => ({ ...prev, virtualTourUrl: url }))}
                    uploading={uploading}
                    existingImages={existingMedia.images}
                    existingVideo={existingMedia.videoUrl}
                    existingVirtualTourUrl={mediaFiles.virtualTourUrl}
                    existingPanoramas={existingMedia.panoramas}
                    existingFloorPlans={existingMedia.floorPlans}
                  />
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
                      Mise à jour en cours...
                    </>
                  ) : (
                    'Enregistrer les modifications'
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

export default EditProperty;
