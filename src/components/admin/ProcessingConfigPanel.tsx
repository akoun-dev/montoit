import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Settings, AlertTriangle, Save, Clock } from 'lucide-react';
import { logger } from '@/services/logger';

export const ProcessingConfigPanel = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Configuration du délai
  const [deadlineHours, setDeadlineHours] = useState(48);
  
  // Configuration de l'action automatique
  const [autoActionEnabled, setAutoActionEnabled] = useState(false);
  const [autoActionType, setAutoActionType] = useState<'approved' | 'rejected' | 'none'>('none');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('processing_config')
        .select('*');

      if (error) throw error;

      if (data) {
        data.forEach(config => {
          if (config.config_key === 'application_processing_deadline_hours') {
            const configValue = config.config_value as { value?: number; unit?: string };
            setDeadlineHours(configValue.value || 48);
          }
          if (config.config_key === 'auto_action_after_deadline') {
            const configValue = config.config_value as { enabled?: boolean; action?: 'approved' | 'rejected' | 'none' };
            setAutoActionEnabled(configValue.enabled || false);
            setAutoActionType(configValue.action || 'none');
          }
        });
      }
    } catch (error) {
      logger.error('Error fetching processing config', { error });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Mettre à jour le délai
      await supabase
        .from('processing_config')
        .update({
          config_value: { value: deadlineHours, unit: 'hours' },
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'application_processing_deadline_hours');

      // Mettre à jour l'action automatique
      await supabase
        .from('processing_config')
        .update({
          config_value: {
            enabled: autoActionEnabled,
            action: autoActionEnabled ? autoActionType : 'none'
          },
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'auto_action_after_deadline');

      toast({
        title: 'Configuration enregistrée',
        description: 'Les paramètres de traitement ont été mis à jour avec succès.',
      });
    } catch (error) {
      logger.error('Error saving processing config', { error });
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Configuration du Traitement des Dossiers</CardTitle>
        </div>
        <CardDescription>
          Gérez les délais et actions automatiques pour le traitement des candidatures
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section Délai */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-semibold">Délai de traitement</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deadline">Délai en heures</Label>
            <div className="flex items-center gap-4">
              <Input
                id="deadline"
                type="number"
                min={24}
                max={168}
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(Math.max(24, Math.min(168, parseInt(e.target.value) || 48)))}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                ({Math.round(deadlineHours / 24 * 10) / 10} jours)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Les candidatures seront marquées comme en retard après ce délai (min: 24h, max: 168h/7 jours)
            </p>
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          {/* Section Action Automatique */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Action automatique après délai</Label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="auto-action-toggle" className="text-base">
                  Activer le traitement automatique
                </Label>
                <p className="text-sm text-muted-foreground">
                  Les dossiers en retard seront traités automatiquement
                </p>
              </div>
              <Switch
                id="auto-action-toggle"
                checked={autoActionEnabled}
                onCheckedChange={setAutoActionEnabled}
              />
            </div>

            {autoActionEnabled && (
              <div className="space-y-3 ml-4 pl-4 border-l-2 border-primary/20">
                <Label htmlFor="auto-action-type">Type d'action</Label>
                <Select value={autoActionType} onValueChange={(value: 'approved' | 'rejected' | 'none') => setAutoActionType(value)}>
                  <SelectTrigger id="auto-action-type">
                    <SelectValue placeholder="Sélectionner une action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">✅ Valider automatiquement</SelectItem>
                    <SelectItem value="rejected">❌ Rejeter automatiquement</SelectItem>
                    <SelectItem value="none">⏸️ Aucune action (marquage seulement)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Cette action sera appliquée aux dossiers dépassant le délai configuré
                </p>

                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Attention</AlertTitle>
                  <AlertDescription className="text-sm">
                    {autoActionType === 'approved' && 'Les candidatures en retard seront APPROUVÉES automatiquement. Assurez-vous que c\'est le comportement souhaité.'}
                    {autoActionType === 'rejected' && 'Les candidatures en retard seront REJETÉES automatiquement. Cela peut affecter l\'expérience utilisateur.'}
                    {autoActionType === 'none' && 'Les candidatures seront seulement marquées comme en retard, sans action automatique.'}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
