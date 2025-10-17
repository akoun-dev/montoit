import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TenantScoreBreakdown } from '@/components/application/TenantScoreBreakdown';

interface Application {
  id: string;
  applicant_id: string;
  property_id: string;
  status: string;
  application_score: number;
  created_at: string;
  cover_letter: string;
  processing_deadline: string | null;
  is_overdue: boolean;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
  properties: {
    title: string;
    address: string;
    city: string;
  };
}

interface DossierValidationQueueProps {
  onUpdate?: () => void;
}

type FilterStatus = 'all' | 'urgent' | 'soon' | 'normal';
type SortBy = 'priority' | 'date' | 'score';

const DossierValidationQueue = ({ onUpdate }: DossierValidationQueueProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('priority');

  useEffect(() => {
    fetchApplications();
  }, [filterStatus, sortBy]);

  const getUrgencyStatus = (app: Application) => {
    if (!app.processing_deadline) {
      return { color: 'default', label: '⏳ En attente', badge: null, shouldPulse: false };
    }

    const now = new Date();
    const deadline = new Date(app.processing_deadline);
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (app.is_overdue) {
      return { 
        color: 'destructive', 
        label: `🔴 EN RETARD (${Math.abs(Math.round(hoursRemaining))}h)`, 
        badge: 'URGENT',
        shouldPulse: true
      };
    }
    if (hoursRemaining < 24) {
      return { 
        color: 'warning', 
        label: `🟡 < 24h restantes`, 
        badge: 'ATTENTION',
        shouldPulse: false
      };
    }
    if (hoursRemaining < 48) {
      return { 
        color: 'secondary', 
        label: `🟡 < 48h restantes`, 
        badge: null,
        shouldPulse: false
      };
    }
    return { 
      color: 'default', 
      label: '🟢 Dans les délais', 
      badge: null,
      shouldPulse: false
    };
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('rental_applications')
        .select(`
          *,
          profiles!rental_applications_applicant_id_fkey (full_name, avatar_url),
          properties (title, address, city)
        `)
        .eq('status', 'pending');

      // Appliquer les filtres
      if (filterStatus === 'urgent') {
        query = query.eq('is_overdue', true);
      } else if (filterStatus === 'soon') {
        const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        query = query
          .eq('is_overdue', false)
          .lte('processing_deadline', in48h);
      } else if (filterStatus === 'normal') {
        const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        query = query.gt('processing_deadline', in48h);
      }

      // Appliquer le tri
      if (sortBy === 'priority') {
        query = query
          .order('is_overdue', { ascending: false })
          .order('processing_deadline', { ascending: true });
      } else if (sortBy === 'date') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'score') {
        query = query.order('application_score', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les dossiers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (applicationId: string, newStatus: 'approved' | 'rejected' | 'pending', reason?: string) => {
    const { error } = await supabase
      .from('rental_applications')
      .update({ 
        status: newStatus,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le dossier',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Succès',
      description: `Dossier ${newStatus === 'approved' ? 'validé' : 'rejeté'} avec succès`
    });

    fetchApplications();
    onUpdate?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres et Tri */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📋 Tous les dossiers</SelectItem>
              <SelectItem value="urgent">🔴 Urgents (en retard)</SelectItem>
              <SelectItem value="soon">🟡 Bientôt urgents (&lt; 48h)</SelectItem>
              <SelectItem value="normal">🟢 Dans les délais</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">🔥 Par priorité</SelectItem>
              <SelectItem value="date">📅 Par date</SelectItem>
              <SelectItem value="score">⭐ Par score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {applications.length} dossier{applications.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Liste des candidatures */}
      {applications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Aucun dossier correspondant aux critères</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const urgency = getUrgencyStatus(app);
            
            return (
              <Card 
                key={app.id} 
                className={`${
                  urgency.color === 'destructive' ? 'border-destructive border-2' : ''
                } ${urgency.shouldPulse ? 'animate-pulse' : ''}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <CardTitle className="text-xl">{app.profiles.full_name}</CardTitle>
                        {urgency.badge && (
                          <Badge variant="destructive" className="font-bold">
                            {urgency.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {app.properties.title} • {app.properties.city}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                      <Badge variant={urgency.color as any}>
                        {urgency.label}
                      </Badge>
                      {app.processing_deadline && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            Limite : {new Date(app.processing_deadline).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mt-2">
                    Soumis le {new Date(app.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Application Score */}
                  {app.application_score > 0 && (
                    <TenantScoreBreakdown 
                      score={app.application_score}
                      breakdown={{
                        identity_verification: 20,
                        face_verification: 15,
                        payment_history: 20,
                        documents: 25,
                        profile_completeness: 20
                      }}
                      recommendation={
                        app.application_score >= 70 ? 'approved' :
                        app.application_score >= 50 ? 'conditional' : 'rejected'
                      }
                    />
                  )}

                  {/* Cover Letter */}
                  {app.cover_letter && (
                    <div>
                      <h4 className="font-semibold mb-2">Lettre de motivation</h4>
                      <p className="text-sm text-muted-foreground">{app.cover_letter}</p>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Notes de validation</label>
                    <Textarea
                      placeholder="Ajoutez des notes concernant ce dossier..."
                      value={notes[app.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [app.id]: e.target.value })}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      onClick={() => handleAction(app.id, 'approved')}
                      className="flex-1 min-w-[150px]"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Valider
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAction(app.id, 'pending', notes[app.id])}
                      className="flex-1 min-w-[150px]"
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Demander compléments
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleAction(app.id, 'rejected', notes[app.id])}
                      className="flex-1 min-w-[150px]"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rejeter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DossierValidationQueue;
