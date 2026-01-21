import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  FileCheck,
  Home,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/badge';
import { Textarea } from '@/shared/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useSafeToast';
import type { Json } from '@/integrations/supabase/types';
import { AddressValue, formatAddress } from '@/shared/utils/address';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface Mission {
  id: string;
  property_id: string;
  mission_type: string;
  status: string;
  urgency: string;
  scheduled_date: string | null;
  notes: string | null;
  verification_checklist: Json;
  photos: Json;
  documents: Json;
  created_at: string;
  property?: {
    title: string;
    address: AddressValue;
    city: string;
    owner_id: string;
  };
}

const defaultChecklist: ChecklistItem[] = [
  { id: '1', label: "Vérifier l'identité du propriétaire", checked: false },
  { id: '2', label: "Confirmer l'adresse du bien", checked: false },
  { id: '3', label: 'Vérifier les documents de propriété', checked: false },
  { id: '4', label: "Inspecter l'état général du bien", checked: false },
  { id: '5', label: 'Prendre les photos requises', checked: false },
  { id: '6', label: 'Vérifier les équipements', checked: false },
  { id: '7', label: "Compléter l'état des lieux", checked: false },
  { id: '8', label: 'Recueillir la signature du propriétaire', checked: false },
];

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('MissionDetailPage mounted with id:', id);
    if (id) {
      loadMission(id);
    }
  }, [id]);

  const loadMission = async (missionId: string) => {
    try {
      const { data, error } = await supabase
        .from('cev_missions')
        .select(
          `
          *,
          property:properties(title, address, city, owner_id)
        `
        )
        .eq('id', missionId)
        .single();

      if (error) throw error;

      const missionData = data as Mission;
      setMission(missionData);
      setNotes(missionData.notes || '');

      // Load saved checklist or use default
      if (
        missionData.verification_checklist &&
        Array.isArray(missionData.verification_checklist) &&
        missionData.verification_checklist.length > 0
      ) {
        setChecklist(missionData.verification_checklist as unknown as ChecklistItem[]);
      }
    } catch (error) {
      console.error('Error loading mission:', error);
      toast.error('Erreur lors du chargement de la mission');
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistChange = (itemId: string, checked: boolean) => {
    setChecklist((prev) => prev.map((item) => (item.id === itemId ? { ...item, checked } : item)));
  };

  const saveMission = async () => {
    if (!mission) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('cev_missions')
        .update({
          verification_checklist: checklist as unknown as Json,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mission.id);

      if (error) throw error;
      toast.success('Mission sauvegardée');
    } catch (error) {
      console.error('Error saving mission:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!mission) return;

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'completed') {
        updateData['completed_at'] = new Date().toISOString();
      }

      const { error } = await supabase.from('cev_missions').update(updateData).eq('id', mission.id);

      if (error) throw error;

      setMission((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast.success(`Statut mis à jour: ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const completedCount = checklist.filter((item) => item.checked).length;
  const progress = Math.round((completedCount / checklist.length) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Mission non trouvée</p>
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
                onClick={() => navigate('/trust-agent/dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold">Détail Mission</h1>
                <p className="text-sm text-muted-foreground">{mission.property?.title}</p>
              </div>
            </div>
            <Button onClick={saveMission} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Informations du Bien
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{mission.property?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAddress(mission.property?.address, mission.property?.city)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Propriétaire</p>
                    <p className="font-medium">ID: {mission.property?.owner_id?.slice(0, 8)}...</p>
                  </div>
                </div>
                {mission.scheduled_date && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date planifiée</p>
                      <p className="font-medium">
                        {new Date(mission.scheduled_date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Checklist de Vérification
                  </CardTitle>
                  <Badge variant="outline">{progress}% complété</Badge>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        id={item.id}
                        checked={item.checked}
                        onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label
                        htmlFor={item.id}
                        className={`flex-1 cursor-pointer ${item.checked ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {item.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes & Observations</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Ajoutez vos observations ici..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Statut de la Mission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Statut actuel</span>
                  <Badge variant={mission.status === 'completed' ? 'default' : 'secondary'}>
                    {mission.status === 'pending' && 'En attente'}
                    {mission.status === 'assigned' && 'Assignée'}
                    {mission.status === 'in_progress' && 'En cours'}
                    {mission.status === 'completed' && 'Terminée'}
                    {mission.status === 'cancelled' && 'Annulée'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {mission.status === 'pending' && (
                    <Button className="w-full" onClick={() => updateStatus('in_progress')}>
                      Commencer la mission
                    </Button>
                  )}
                  {mission.status === 'in_progress' && (
                    <Button
                      className="w-full"
                      onClick={() => updateStatus('completed')}
                      disabled={progress < 100}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marquer comme terminée
                    </Button>
                  )}
                  {mission.status === 'in_progress' && progress < 100 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Complétez la checklist pour terminer
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/trust-agent/photos/${mission.id}`)}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capturer des Photos
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/trust-agent/documents/${mission.id}`)}
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Valider Documents
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/trust-agent/etat-des-lieux/${mission.id}`)}
                >
                  <Home className="h-4 w-4 mr-2" />
                  État des Lieux
                </Button>
              </CardContent>
            </Card>

            {/* Urgency Warning */}
            {mission.urgency === 'urgent' && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">Mission Urgente</p>
                      <p className="text-sm text-muted-foreground">
                        Cette mission nécessite une attention prioritaire.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
