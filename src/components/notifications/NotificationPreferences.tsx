import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, MessageSquare, Home, FileText, DollarSign } from 'lucide-react';
import { logger } from '@/services/logger';

interface NotificationPreference {
  id: string;
  category: string;
  enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

const NOTIFICATION_CATEGORIES = [
  { value: 'messages', label: 'Messages', icon: MessageSquare, description: 'Nouveaux messages et réponses' },
  { value: 'applications', label: 'Candidatures', icon: FileText, description: 'Nouvelles candidatures et mises à jour' },
  { value: 'properties', label: 'Biens immobiliers', icon: Home, description: 'Nouveaux biens et favoris' },
  { value: 'payments', label: 'Paiements', icon: DollarSign, description: 'Paiements et transactions' },
  { value: 'system', label: 'Système', icon: Bell, description: 'Notifications système importantes' },
];

const NotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Créer des préférences par défaut pour les catégories manquantes
      const existingCategories = data?.map(p => p.category) || [];
      const missingCategories = NOTIFICATION_CATEGORIES
        .map(c => c.value)
        .filter(cat => !existingCategories.includes(cat));

      if (missingCategories.length > 0) {
        const newPreferences = missingCategories.map(category => ({
          user_id: user.id,
          category,
          enabled: true,
          email_enabled: false,
          push_enabled: true,
        }));

        const { data: inserted } = await supabase
          .from('notification_preferences')
          .insert(newPreferences)
          .select();

        setPreferences([...(data || []), ...(inserted || [])]);
      } else {
        setPreferences(data || []);
      }
    } catch (error) {
      logger.logError(error, { context: 'NotificationPreferences', action: 'fetch' });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les préférences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (
    category: string,
    field: 'enabled' | 'email_enabled' | 'push_enabled',
    value: boolean
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [field]: value })
        .eq('user_id', user.id)
        .eq('category', category);

      if (error) throw error;

      setPreferences(prev =>
        prev.map(p =>
          p.category === category ? { ...p, [field]: value } : p
        )
      );

      toast({
        title: 'Préférences mises à jour',
        description: 'Vos préférences de notifications ont été enregistrées',
      });
    } catch (error) {
      logger.logError(error, { context: 'NotificationPreferences', action: 'update' });
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les préférences',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Préférences de notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préférences de notifications</CardTitle>
        <CardDescription>
          Gérez comment vous souhaitez recevoir vos notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {NOTIFICATION_CATEGORIES.map(({ value, label, icon: Icon, description }) => {
          const pref = preferences.find(p => p.category === value);
          if (!pref) return null;

          return (
            <div key={value} className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <h4 className="font-medium">{label}</h4>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              
              <div className="grid gap-3 pl-8">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${value}-enabled`} className="text-sm">
                    Activer les notifications
                  </Label>
                  <Switch
                    id={`${value}-enabled`}
                    checked={pref.enabled}
                    onCheckedChange={(checked) =>
                      updatePreference(value, 'enabled', checked)
                    }
                  />
                </div>

                {pref.enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={`${value}-push`} className="text-sm">
                          Notifications push
                        </Label>
                      </div>
                      <Switch
                        id={`${value}-push`}
                        checked={pref.push_enabled}
                        onCheckedChange={(checked) =>
                          updatePreference(value, 'push_enabled', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={`${value}-email`} className="text-sm">
                          Notifications par email
                        </Label>
                      </div>
                      <Switch
                        id={`${value}-email`}
                        checked={pref.email_enabled}
                        onCheckedChange={(checked) =>
                          updatePreference(value, 'email_enabled', checked)
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
