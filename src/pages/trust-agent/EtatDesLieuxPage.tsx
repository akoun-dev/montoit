import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Check, Save, Download, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useSafeToast';
import type { Json } from '@/integrations/supabase/types';

interface RoomItem {
  id: string;
  name: string;
  condition: 'excellent' | 'bon' | 'usé' | 'à_réparer' | '';
  notes: string;
  photos: string[];
}

interface EtatDesLieuxData {
  type: 'entree' | 'sortie';
  date: string;
  rooms: RoomItem[];
  generalNotes: string;
  signature: boolean;
}

const defaultRooms: RoomItem[] = [
  { id: 'entree', name: 'Entrée / Hall', condition: '', notes: '', photos: [] },
  { id: 'salon', name: 'Salon / Séjour', condition: '', notes: '', photos: [] },
  { id: 'cuisine', name: 'Cuisine', condition: '', notes: '', photos: [] },
  { id: 'chambre1', name: 'Chambre 1', condition: '', notes: '', photos: [] },
  { id: 'chambre2', name: 'Chambre 2', condition: '', notes: '', photos: [] },
  { id: 'sdb', name: 'Salle de bain', condition: '', notes: '', photos: [] },
  { id: 'wc', name: 'Toilettes', condition: '', notes: '', photos: [] },
  { id: 'balcon', name: 'Balcon / Terrasse', condition: '', notes: '', photos: [] },
  { id: 'exterieur', name: 'Extérieur', condition: '', notes: '', photos: [] },
];

const conditionConfig: Record<string, { label: string; color: string; stars: number }> = {
  excellent: { label: 'Excellent', color: 'text-green-600', stars: 4 },
  bon: { label: 'Bon état', color: 'text-blue-600', stars: 3 },
  usé: { label: 'Usure normale', color: 'text-amber-600', stars: 2 },
  à_réparer: { label: 'À réparer', color: 'text-destructive', stars: 1 },
};

export default function EtatDesLieuxPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [etatDesLieux, setEtatDesLieux] = useState<EtatDesLieuxData>({
    type: 'entree',
    date: new Date().toISOString().split('T')?.[0] ?? '',
    rooms: defaultRooms,
    generalNotes: '',
    signature: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missionId, setMissionId] = useState<string>('');

  useEffect(() => {
    if (id) {
      setMissionId(id);
      loadEtatDesLieux(id);
    }
  }, [id]);

  const loadEtatDesLieux = async (missionIdParam: string) => {
    try {
      const { data, error } = await supabase
        .from('cev_missions')
        .select('etat_lieux_report')
        .eq('id', missionIdParam)
        .single();

      if (error) throw error;

      if (
        data?.etat_lieux_report &&
        typeof data.etat_lieux_report === 'object' &&
        !Array.isArray(data.etat_lieux_report)
      ) {
        const report = data.etat_lieux_report as Record<string, unknown>;
        if (report['rooms']) {
          setEtatDesLieux(report as unknown as EtatDesLieuxData);
        }
      }
    } catch (error) {
      console.error('Error loading état des lieux:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRoom = (roomId: string, field: keyof RoomItem, value: string) => {
    setEtatDesLieux((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => (room.id === roomId ? { ...room, [field]: value } : room)),
    }));
  };

  const saveEtatDesLieux = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('cev_missions')
        .update({
          etat_lieux_report: etatDesLieux as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', missionId);

      if (error) throw error;
      toast.success('État des lieux sauvegardé');
    } catch (error) {
      console.error('Error saving état des lieux:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const completedRooms = etatDesLieux.rooms.filter((r) => r.condition !== '').length;
  const progress = Math.round((completedRooms / etatDesLieux.rooms.length) * 100);

  // Suppress unused variable warnings
  void conditionConfig;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
                <h1 className="font-semibold">État des Lieux</h1>
                <p className="text-sm text-muted-foreground">{progress}% complété</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="small">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button onClick={saveEtatDesLieux} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Type & Date */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Type d'état des lieux</Label>
                <Select
                  value={etatDesLieux.type}
                  onValueChange={(value: 'entree' | 'sortie') =>
                    setEtatDesLieux((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entree">État des lieux d'entrée</SelectItem>
                    <SelectItem value="sortie">État des lieux de sortie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <input
                  type="date"
                  value={etatDesLieux.date}
                  onChange={(e) => setEtatDesLieux((prev) => ({ ...prev, date: e.target.value }))}
                  className="mt-2 w-full px-3 py-2 border rounded-lg bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progression</span>
            <span className="text-sm font-medium">
              {completedRooms}/{etatDesLieux.rooms.length} pièces
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Rooms */}
        <div className="space-y-4">
          {etatDesLieux.rooms.map((room) => (
            <Card key={room.id} className={room.condition ? 'border-l-4 border-l-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Home className="h-4 w-4" />
                    {room.name}
                  </CardTitle>
                  {room.condition && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: conditionConfig[room.condition]?.stars || 0 }).map(
                        (_, i) => (
                          <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                        )
                      )}
                      {Array.from({
                        length: 4 - (conditionConfig[room.condition]?.stars || 0),
                      }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-muted-foreground/30" />
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>État général</Label>
                  <Select
                    value={room.condition}
                    onValueChange={(value) => updateRoom(room.id, 'condition', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionner l'état" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">
                        <span className="text-green-600">★★★★ Excellent</span>
                      </SelectItem>
                      <SelectItem value="bon">
                        <span className="text-blue-600">★★★☆ Bon état</span>
                      </SelectItem>
                      <SelectItem value="usé">
                        <span className="text-amber-600">★★☆☆ Usure normale</span>
                      </SelectItem>
                      <SelectItem value="à_réparer">
                        <span className="text-destructive">★☆☆☆ À réparer</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Observations</Label>
                  <Textarea
                    placeholder="Notes sur l'état de la pièce..."
                    value={room.notes}
                    onChange={(e) => updateRoom(room.id, 'notes', e.target.value)}
                    rows={2}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* General Notes */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Observations Générales</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ajoutez vos observations générales sur le bien..."
              value={etatDesLieux.generalNotes}
              onChange={(e) =>
                setEtatDesLieux((prev) => ({ ...prev, generalNotes: e.target.value }))
              }
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">État des lieux complété</p>
                <p className="text-sm text-muted-foreground">
                  En validant, vous confirmez l'exactitude des informations
                </p>
              </div>
              <Button
                onClick={() => {
                  setEtatDesLieux((prev) => ({ ...prev, signature: true }));
                  saveEtatDesLieux();
                }}
                disabled={progress < 100}
              >
                <Check className="h-4 w-4 mr-2" />
                Valider l'état des lieux
              </Button>
            </div>
            {progress < 100 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Complétez toutes les pièces pour pouvoir valider
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
