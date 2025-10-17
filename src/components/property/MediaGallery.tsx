import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./VideoPlayer";

import { PanoramaNavigation } from "./PanoramaNavigation";
import { FloorPlanViewer } from "./FloorPlanViewer";
import { OptimizedImage } from "./OptimizedImage";
import { SwipeGallery } from "./SwipeGallery";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePropertyImageAccess } from "@/hooks/usePropertyImageAccess";
import { usePanoramaPrefetch } from "@/hooks/usePanoramaPrefetch";
import { Image, Video, Globe, Layout, Lock, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MediaGalleryProps {
  propertyId: string;
  images: string[];
  videoUrl?: string;
  virtualTourUrl?: string;
  panoramicImages?: Array<{ url: string; title?: string }>;
  floorPlans?: Array<{ url: string; title: string; floor?: string; surface?: number }>;
}

export const MediaGallery = ({
  propertyId,
  images = [],
  videoUrl,
  virtualTourUrl,
  panoramicImages = [],
  floorPlans = [],
}: MediaGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [currentPanoramaIndex, setCurrentPanoramaIndex] = useState(0);
  const isMobile = useIsMobile();

  // Hook pour accès images
  const {
    maxImages,
    showBlur,
    showHDPhotos,
    show3DTour,
    showFloorPlans
  } = usePropertyImageAccess(propertyId);

  // Prefetch panoramic images when 360 tab is available
  const panoramaUrls = panoramicImages.map(p => p.url);
  const { prefetchOnHover } = usePanoramaPrefetch(panoramaUrls, {
    enabled: show3DTour && panoramaUrls.length > 0,
    priority: 'low'
  });

  // Limiter les images affichées
  const displayImages = images.slice(0, maxImages);
  const hiddenImagesCount = images.length - displayImages.length;

  const hasVideo = !!videoUrl;
  const has360 = panoramicImages.length > 0;
  const hasPlans = floorPlans.length > 0;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="photos" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="photos" className="gap-2">
            <Image className="h-4 w-4" />
            Photos ({displayImages.length}/{images.length})
          </TabsTrigger>
          {hasVideo && (
            <TabsTrigger value="video" className="gap-2">
              <Video className="h-4 w-4" />
              Vidéo
              <Badge variant="secondary" className="ml-1">
                Nouveau
              </Badge>
            </TabsTrigger>
          )}
          {has360 && show3DTour && (
            <TabsTrigger
              value="360"
              className="gap-2"
              onMouseEnter={() => {
                panoramaUrls.forEach(url => prefetchOnHover(url));
              }}
            >
              <Globe className="h-4 w-4" />
              Vue 360°
              <Badge variant="secondary" className="ml-1">
                {panoramicImages.length}
              </Badge>
            </TabsTrigger>
          )}
          {hasPlans && showFloorPlans && (
            <TabsTrigger value="plans" className="gap-2">
              <Layout className="h-4 w-4" />
              Plans
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="photos" className="space-y-4">
          {/* Alert si photos limitées */}
          {!showHDPhotos && (
            <Alert className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
              <Lock className="h-5 w-5 text-primary" />
              <AlertTitle className="text-lg font-semibold">
                {showBlur 
                  ? '🔒 Aperçu limité - Créez un compte gratuit' 
                  : '🎯 Débloquez tout le contenu premium'
                }
              </AlertTitle>
              <AlertDescription className="space-y-3 mt-2">
                <div className="space-y-2">
                  <p className="font-medium">
                    {showBlur 
                      ? 'Sans compte, vous voyez seulement 4 photos (floues).'
                      : `Votre dossier n'est pas encore validé. Débloquez :`
                    }
                  </p>
                  {!showBlur && hiddenImagesCount > 0 && (
                    <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                      <li><strong>{hiddenImagesCount} photos HD</strong> supplémentaires</li>
                      <li><strong>Visite virtuelle 3D</strong> interactive</li>
                      <li><strong>Plans détaillés</strong> du bien</li>
                      <li><strong>Vidéos</strong> de présentation</li>
                    </ul>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button asChild size="sm" className="font-semibold">
                    <Link to={showBlur ? '/auth' : '/verification'}>
                      <Lock className="mr-2 h-4 w-4" />
                      {showBlur ? 'Créer un compte gratuit' : 'Valider mon dossier'}
                    </Link>
                  </Button>
                  {!showBlur && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/guide#dossier-locataire">
                        Comment ça marche ?
                      </Link>
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isMobile ? (
            /* Mobile: SwipeGallery */
            <SwipeGallery 
              images={displayImages}
              onImageChange={(idx) => setLightboxIndex(idx)}
              className={cn(showBlur && 'blur-sm')}
            />
          ) : (
            /* Desktop: Original layout */
            <>
              {/* Main image */}
              {displayImages.length > 0 && (
                <div
                  className={cn(
                    "relative aspect-video w-full overflow-hidden rounded-lg cursor-pointer group",
                    showBlur && "blur-sm"
                  )}
                  onClick={() => !showBlur && openLightbox(0)}
                >
                  <OptimizedImage
                    src={displayImages[0]}
                    alt="Photo principale"
                    priority={true}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {showBlur && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Lock className="h-12 w-12 text-white" />
                    </div>
                  )}
                </div>
              )}

              {/* Thumbnail grid */}
              {displayImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {displayImages.slice(1, 5).map((image, index) => (
                    <div
                      key={index + 1}
                      className={cn(
                        "relative aspect-video overflow-hidden rounded-md cursor-pointer group",
                        showBlur && "blur-sm"
                      )}
                      onClick={() => !showBlur && openLightbox(index + 1)}
                    >
                      <OptimizedImage
                        src={image}
                        alt={`Photo ${index + 2}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      {index === 3 && hiddenImagesCount > 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold">
                          <Lock className="h-6 w-6 mr-2" />
                          +{hiddenImagesCount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {hasVideo && (
          <TabsContent value="video">
            <VideoPlayer url={videoUrl} thumbnail={images[0]} />
          </TabsContent>
        )}

        {has360 && (
          <TabsContent value="360">
            <div className="space-y-4">
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertTitle>Visite 360° Temporairement Indisponible</AlertTitle>
                <AlertDescription>
                  La fonctionnalité de visite panoramique est en cours de maintenance.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        )}

        {hasPlans && (
          <TabsContent value="plans">
            <FloorPlanViewer plans={floorPlans} />
          </TabsContent>
        )}
      </Tabs>

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={images.map((src) => ({ src }))}
        plugins={[Zoom, Fullscreen]}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
        }}
      />
    </div>
  );
};
