import { useState } from "react";
import { Upload, X, Video, Globe, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { FILE_LIMITS, ERROR_MESSAGES } from "@/constants";

interface MediaUploaderProps {
  propertyId?: string;
  onImagesChange: (files: File[]) => void;
  onVideoChange: (file: File | null) => void;
  onPanoramaChange?: (files: File[]) => void;
  onFloorPlanChange?: (files: File[]) => void;
  onVirtualTourUrlChange: (url: string) => void;
  existingImages?: string[];
  existingVideo?: string | null;
  existingPanoramas?: { url: string; title: string }[];
  existingFloorPlans?: { url: string; title: string }[];
  existingVirtualTourUrl?: string;
  uploading?: boolean;
}

export const MediaUploader = ({
  onImagesChange,
  onVideoChange,
  onPanoramaChange,
  onFloorPlanChange,
  onVirtualTourUrlChange,
  existingImages = [],
  existingVideo = null,
  existingPanoramas = [],
  existingFloorPlans = [],
  existingVirtualTourUrl = "",
  uploading = false,
}: MediaUploaderProps) => {
  const [imagePreviews, setImagePreviews] = useState<string[]>(existingImages);
  const [videoPreview, setVideoPreview] = useState<string | null>(existingVideo);
  const [panoramaPreviews, setPanoramaPreviews] = useState<string[]>([]);
  const [planPreviews, setPlanPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [virtualTour, setVirtualTour] = useState(existingVirtualTourUrl);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imagePreviews.length > FILE_LIMITS.MAX_IMAGES_PER_PROPERTY) {
      toast.error(`Maximum ${FILE_LIMITS.MAX_IMAGES_PER_PROPERTY} images autorisées`);
      return;
    }

    const oversizedFiles = files.filter(f => f.size > FILE_LIMITS.MAX_IMAGE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(ERROR_MESSAGES.IMAGE_TOO_LARGE);
      return;
    }

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
    onImagesChange(files);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > FILE_LIMITS.MAX_VIDEO_SIZE) {
      toast.error(ERROR_MESSAGES.VIDEO_TOO_LARGE);
      return;
    }

    const validFormats = ["video/mp4", "video/webm", "video/quicktime"];
    if (!validFormats.includes(file.type)) {
      toast.error("Format vidéo non supporté (mp4, webm, mov uniquement)");
      return;
    }

    setVideoPreview(URL.createObjectURL(file));
    onVideoChange(file);
  };

  const handlePanoramaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Check for 2:1 aspect ratio (equirectangular)
    files.forEach((file) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        if (Math.abs(ratio - 2) > 0.1) {
          toast.warning(
            `${file.name} n'a pas le bon ratio (2:1 requis pour les images 360°)`
          );
        }
      };
      img.src = URL.createObjectURL(file);
    });

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPanoramaPreviews([...panoramaPreviews, ...newPreviews]);
    onPanoramaChange(files);
  };

  const handleFloorPlanSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPlanPreviews([...planPreviews, ...newPreviews]);
    onFloorPlanChange(files);
  };

  const removeImage = (index: number) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
  };

  return (
    <div className="space-y-6">
      {/* Regular images */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="images" className="text-base font-semibold">
            Photos du bien
          </Label>
          <span className="text-xs text-muted-foreground">
            {imagePreviews.length}/10 • JPG, PNG • Max 5MB/photo
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative aspect-video group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover rounded-md border-2 border-border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-md">
                <p className="text-xs text-white font-medium">Photo {index + 1}</p>
              </div>
            </div>
          ))}
          {imagePreviews.length < 10 && (
            <label className="aspect-video border-2 border-dashed border-muted-foreground/25 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors mb-1" />
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Ajouter</span>
            </label>
          )}
        </div>
      </div>

      {/* Video upload */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="video" className="text-base font-semibold flex items-center gap-2">
            <Video className="h-5 w-5" />
            Vidéo de présentation
          </Label>
          <span className="text-xs text-muted-foreground">
            MP4, WebM, MOV • Max 100MB
          </span>
        </div>
        <div className="flex items-center gap-4">
          {videoPreview ? (
            <div className="relative flex-1">
              <video 
                src={videoPreview} 
                controls 
                className="w-full rounded-md border-2 border-border" 
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setVideoPreview(null);
                  onVideoChange(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="flex-1 border-2 border-dashed border-muted-foreground/25 rounded-md p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleVideoSelect}
                className="hidden"
              />
              <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="text-sm font-medium text-foreground mb-1">
                Ajouter une vidéo
              </p>
              <p className="text-xs text-muted-foreground">
                Formats: MP4, WebM, MOV • Taille max: 100 MB
              </p>
            </label>
          )}
        </div>
      </div>

      {/* 360° panorama */}
      <div className="space-y-3">
        <Label htmlFor="panorama" className="text-base font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Images panoramiques 360°
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {panoramaPreviews.map((preview, index) => (
            <div key={index} className="relative aspect-video group">
              <img
                src={preview}
                alt={`Panorama ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover rounded-md"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  const newPreviews = panoramaPreviews.filter((_, i) => i !== index);
                  setPanoramaPreviews(newPreviews);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <label className="aspect-video border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePanoramaSelect}
              className="hidden"
            />
            <Globe className="h-8 w-8 text-muted-foreground" />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Les images doivent avoir un ratio 2:1 (équirectangulaire)
        </p>
      </div>

      {/* Floor plans */}
      <div className="space-y-3">
        <Label htmlFor="plans" className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Plans d'étage
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {planPreviews.map((preview, index) => (
            <div key={index} className="relative aspect-video group">
              <img
                src={preview}
                alt={`Plan ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover rounded-md"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  const newPreviews = planPreviews.filter((_, i) => i !== index);
                  setPlanPreviews(newPreviews);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <label className="aspect-video border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFloorPlanSelect}
              className="hidden"
            />
            <FileText className="h-8 w-8 text-muted-foreground" />
          </label>
        </div>
      </div>

      {/* Virtual tour URL */}
      <div className="space-y-3">
        <Label htmlFor="virtualTour" className="text-base font-semibold">
          Lien visite virtuelle (Matterport, etc.)
        </Label>
        <Input
          id="virtualTour"
          type="url"
          placeholder="https://my.matterport.com/show/..."
          value={virtualTour}
          onChange={(e) => {
            setVirtualTour(e.target.value);
            onVirtualTourUrlChange(e.target.value);
          }}
        />
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-sm text-center text-muted-foreground">
            Upload en cours... {uploadProgress}%
          </p>
        </div>
      )}
    </div>
  );
};
