import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, ExternalLink, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Reminder {
  id: string;
  reminder_type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_active: boolean;
  frequency: string;
  created_at: string;
}

const SmartReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReminders(data || []);
    } catch (error) {
      logger.logError(error, { context: 'SmartReminders', action: 'fetch' });
    } finally {
      setLoading(false);
    }
  };

  const dismissReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('user_reminders')
        .update({ is_active: false })
        .eq('id', reminderId);

      if (error) throw error;

      setReminders(prev => prev.filter(r => r.id !== reminderId));
      toast({
        title: "Rappel masqué",
        description: "Le rappel a été masqué avec succès",
      });
    } catch (error) {
      logger.logError(error, { context: 'SmartReminders', action: 'dismiss' });
      toast({
        title: "Erreur",
        description: "Impossible de masquer le rappel",
        variant: "destructive",
      });
    }
  };

  const updateFrequency = async (reminderId: string, frequency: string) => {
    try {
      const { error } = await supabase
        .from('user_reminders')
        .update({ frequency })
        .eq('id', reminderId);

      if (error) throw error;

      setReminders(prev => prev.map(r => 
        r.id === reminderId ? { ...r, frequency } : r
      ));
      toast({
        title: "Fréquence mise à jour",
        description: "La fréquence du rappel a été modifiée",
      });
    } catch (error) {
      logger.logError(error, { context: 'SmartReminders', action: 'updateFrequency' });
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la fréquence",
        variant: "destructive",
      });
    }
  };

  const getReminderIcon = (type: string) => {
    return <Bell className="h-5 w-5" />;
  };

  const getReminderVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'new_match':
        return 'default';
      case 'application_update':
        return 'secondary';
      case 'lease_expiry':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Rappels intelligents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reminders.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Rappels intelligents
          <Badge variant="secondary" className="ml-auto">
            {reminders.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className={`p-2 rounded-full bg-primary/10 text-primary`}>
                {getReminderIcon(reminder.reminder_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm">{reminder.title}</h4>
                  <div className="flex items-center gap-1 shrink-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Paramètres du rappel</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Fréquence</Label>
                            <Select
                              value={reminder.frequency}
                              onValueChange={(value) => updateFrequency(reminder.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Quotidien</SelectItem>
                                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                                <SelectItem value="never">Jamais</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissReminder(reminder.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {reminder.message && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {reminder.message}
                  </p>
                )}
                
                {reminder.link && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-2"
                    onClick={() => navigate(reminder.link)}
                  >
                    Voir plus
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartReminders;