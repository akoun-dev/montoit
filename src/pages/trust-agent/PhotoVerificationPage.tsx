import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, X, Check, Image as ImageIcon, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useSafeToast';
import type { Json } from '@/integrations/supabase/types';

interface PhotoCategory {
  id: string;
  label: string;
  required: boolean;
  photos: string[];
}

const defaultCategories: PhotoCategory[] = [
  { id: 'facade', label: 'Façade extérieure', required: true, photos: [] },
  { id: 'salon', label: 'Salon / Séjour', required: true, photos: [] },
  { id: 'cuisine', label: 'Cuisine', required: true, photos: [] },
  { id: 'chambres', label: 'Chambres', required: true, photos: [] },
  { id: 'sdb', label: 'Salle de bain', required: true, photos: [] },
  { id: 'wc', label: 'Toilettes', required: false, photos: [] },
  { id: 'exterieur', label: 'Espaces extérieurs', required: false, photos: [] },
  { id: 'autres', label: 'Autres', required: false, photos: [] },
];

export default function PhotoVerificationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<PhotoCategory[]>(defaultCategories);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [missionId, setMissionId] = useState<string>('');

  useEffect(() => {
    if (id) {
      setMissionId(id);
      loadMissionPhotos(id);
    }
  }, [id]);

  const loadMissionPhotos = async (missionIdParam: string) => {
    try {
      const { data, error } = await supabase
        .from('cev_missions')
        .select('photos')
        .eq('id', missionIdParam)
        .single();

      if (error) throw error;

      if (data?.photos && typeof data.photos === 'object' && !Array.isArray(data.photos)) {
        const savedPhotos = data.photos as Record<string, string[]>;
        setCategories((prev) =>
          prev.map((cat) => ({
            ...cat,
            photos: savedPhotos[cat.id] || [],
          }))
        );
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedCategory) return;

    setUploading(true);
    const newPhotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} n'est pas une image valide`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} dépasse la limite de 5MB`);
          continue;
        }

        // Convert to base64 for storage (in production, use Supabase Storage)
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        newPhotos.push(base64);
      }

      if (newPhotos.length > 0) {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === selectedCategory ? { ...cat, photos: [...cat.photos, ...newPhotos] } : cat
          )
        );
        toast.success(`${newPhotos.length} photo(s) ajoutée(s)`);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      setSelectedCategory(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (categoryId: string, photoIndex: number) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, photos: cat.photos.filter((_, i) => i !== photoIndex) }
          : cat
      )
    );
  };

  const savePhotos = async () => {
    try {
      const photosData: Record<string, string[]> = {};
      categories.forEach((cat) => {
        photosData[cat.id] = cat.photos;
      });

      const { error } = await supabase
        .from('cev_missions')
        .update({
          photos: photosData as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', missionId);

      if (error) throw error;
      toast.success('Photos sauvegardées');
    } catch (error) {
      console.error('Error saving photos:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const totalPhotos = categories.reduce((acc, cat) => acc + cat.photos.length, 0);
  const requiredCompleted = categories
    .filter((cat) => cat.required)
    .every((cat) => cat.photos.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="small"
                className="p-2 h-auto w-auto"
                onClick={() => navigate(`/trust-agent/mission/${missionId}`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold">Vérification Photos</h1>
                <p className="text-sm text-muted-foreground">{totalPhotos} photo(s) capturée(s)</p>
              </div>
            </div>
            <Button onClick={savePhotos}>
              <Check className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Status Banner */}
        <Card className={`mb-6 ${requiredCompleted ? 'border-green-500' : 'border-amber-500'}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera
                  className={`h-5 w-5 ${requiredCompleted ? 'text-green-600' : 'text-amber-600'}`}
                />
                <span>
                  {requiredCompleted
                    ? 'Toutes les photos requises ont été capturées'
                    : 'Des photos requises sont manquantes'}
                </span>
              </div>
              <Badge variant={requiredCompleted ? 'default' : 'secondary'}>
                {totalPhotos} photos
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Photo Categories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{category.label}</CardTitle>
                  {category.required && (
                    <Badge
                      variant={category.photos.length > 0 ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {category.photos.length > 0 ? 'OK' : 'Requis'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Photo Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {category.photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square group">
                      <img
                        src={photo}
                        alt={`${category.label} ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removePhoto(category.id, index)}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add Photo Button */}
                  <button
                    onClick={() => {
                      setSelectedCategory(category.id);
                      fileInputRef.current?.click();
                    }}
                    disabled={uploading}
                    className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Ajouter</span>
                  </button>
                </div>

                {category.photos.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Aucune photo pour cette catégorie
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Instructions de Capture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Prenez des photos nettes et bien éclairées</li>
              <li>• Photographiez chaque pièce sous plusieurs angles</li>
              <li>• Incluez les éventuels défauts ou problèmes</li>
              <li>• Les photos marquées "Requis" sont obligatoires</li>
              <li>• Taille maximale par photo : 5 MB</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
