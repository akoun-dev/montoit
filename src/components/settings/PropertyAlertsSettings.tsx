import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bell, BellOff, Mail, Smartphone, Plus, Trash2 } from 'lucide-react';

interface PropertyAlert {
  id: string;
  alert_type: string;
  search_criteria: any;
  email_enabled: boolean;
  push_enabled: boolean;
  is_active: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
}

export const PropertyAlertsSettings = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PropertyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAlertForm, setShowNewAlertForm] = useState(false);
  
  // Formulaire nouvelle alerte
  const [newAlert, setNewAlert] = useState({
    city: '',
    property_type: '',
    min_rent: '',
    max_rent: '',
    min_bedrooms: '',
  });

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('property_alerts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      logger.error('Failed to fetch property alerts');
      toast.error('Erreur lors du chargement des alertes');
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    if (!user) return;

    // Validation
    if (!newAlert.city) {
      toast.error('Veuillez sélectionner une ville');
      return;
    }

    try {
      const { error } = await supabase.from('property_alerts').insert({
        user_id: user.id,
        alert_type: 'new_similar',
        search_criteria: {
          city: newAlert.city,
          property_type: newAlert.property_type || null,
          min_rent: newAlert.min_rent ? parseInt(newAlert.min_rent) : null,
          max_rent: newAlert.max_rent ? parseInt(newAlert.max_rent) : null,
          min_bedrooms: newAlert.min_bedrooms ? parseInt(newAlert.min_bedrooms) : null,
        },
        email_enabled: true,
        push_enabled: true,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Alerte créée avec succès');
      setShowNewAlertForm(false);
      setNewAlert({ city: '', property_type: '', min_rent: '', max_rent: '', min_bedrooms: '' });
      fetchAlerts();
    } catch (error) {
      logger.error('Failed to create property alert');
      toast.error('Erreur lors de la création de l\'alerte');
    }
  };

  const toggleAlert = async (alertId: string, field: 'is_active' | 'email_enabled' | 'push_enabled', value: boolean) => {
    try {
      const { error } = await supabase
        .from('property_alerts')
        .update({ [field]: value })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.map(a => a.id === alertId ? { ...a, [field]: value } : a));
      toast.success('Préférences mises à jour');
    } catch (error) {
      logger.error('Failed to update property alert', { alertId, field });
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) return;

    try {
      const { error } = await supabase
        .from('property_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.filter(a => a.id !== alertId));
      toast.success('Alerte supprimée');
    } catch (error) {
      logger.error('Failed to delete property alert', { alertId });
      toast.error('Erreur lors de la suppression');
    }
  };

  const getCriteriaLabel = (criteria: any) => {
    const parts = [];
    if (criteria.city) parts.push(criteria.city);
    if (criteria.property_type) parts.push(criteria.property_type);
    if (criteria.min_rent || criteria.max_rent) {
      parts.push(`${criteria.min_rent || 0} - ${criteria.max_rent || '∞'} FCFA`);
    }
    if (criteria.min_bedrooms) parts.push(`${criteria.min_bedrooms}+ chambres`);
    return parts.join(' • ');
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Mes Alertes Immobilières
          </CardTitle>
          <CardDescription>
            Recevez des notifications quand de nouveaux biens correspondent à vos critères
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune alerte configurée</p>
              <p className="text-sm">Créez votre première alerte pour ne manquer aucune opportunité</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Switch
                            checked={alert.is_active}
                            onCheckedChange={(checked) => toggleAlert(alert.id, 'is_active', checked)}
                          />
                          <span className="font-medium">{getCriteriaLabel(alert.search_criteria)}</span>
                        </div>
                        
                        {alert.last_triggered_at && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Dernière alerte: {new Date(alert.last_triggered_at).toLocaleDateString('fr-FR')} 
                            {alert.trigger_count > 0 && ` (${alert.trigger_count} notifications envoyées)`}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <label className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <Switch
                              checked={alert.email_enabled}
                              onCheckedChange={(checked) => toggleAlert(alert.id, 'email_enabled', checked)}
                              disabled={!alert.is_active}
                            />
                            <span>Email</span>
                          </label>
                          
                          <label className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            <Switch
                              checked={alert.push_enabled}
                              onCheckedChange={(checked) => toggleAlert(alert.id, 'push_enabled', checked)}
                              disabled={!alert.is_active}
                            />
                            <span>Push</span>
                          </label>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAlert(alert.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!showNewAlertForm ? (
            <Button onClick={() => setShowNewAlertForm(true)} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Créer une nouvelle alerte
            </Button>
          ) : (
            <Card className="border-2 border-primary">
              <CardContent className="p-4 space-y-4">
                <h4 className="font-semibold">Nouvelle alerte</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label>Ville *</Label>
                    <Select value={newAlert.city} onValueChange={(value) => setNewAlert({ ...newAlert, city: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une ville" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Abidjan">Abidjan</SelectItem>
                        <SelectItem value="Yamoussoukro">Yamoussoukro</SelectItem>
                        <SelectItem value="Bouaké">Bouaké</SelectItem>
                        <SelectItem value="San-Pédro">San-Pédro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Type de bien</Label>
                    <Select value={newAlert.property_type} onValueChange={(value) => setNewAlert({ ...newAlert, property_type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appartement">Appartement</SelectItem>
                        <SelectItem value="maison">Maison</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Loyer minimum</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 50000"
                        value={newAlert.min_rent}
                        onChange={(e) => setNewAlert({ ...newAlert, min_rent: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Loyer maximum</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 200000"
                        value={newAlert.max_rent}
                        onChange={(e) => setNewAlert({ ...newAlert, max_rent: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Chambres minimum</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 2"
                      value={newAlert.min_bedrooms}
                      onChange={(e) => setNewAlert({ ...newAlert, min_bedrooms: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={createAlert} className="flex-1">
                    Créer l'alerte
                  </Button>
                  <Button onClick={() => setShowNewAlertForm(false)} variant="outline">
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
