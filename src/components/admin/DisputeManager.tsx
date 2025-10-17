import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, Clock, CheckCircle, XCircle, FileText, Users, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DisputeTimeline } from './DisputeTimeline';

interface Dispute {
  id: string;
  lease_id: string | null;
  reporter_id: string;
  reported_id: string;
  dispute_type: string;
  description: string;
  status: string;
  resolution_notes: string | null;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  assigned_to: string | null;
  attachments: any;
  reporter: { full_name: string; avatar_url?: string } | null;
  reported: { full_name: string; avatar_url?: string } | null;
  assigned_admin: { full_name: string; avatar_url?: string } | null;
}

interface Admin {
  user_id: string;
  profile: { full_name: string } | null;
}

interface DisputeStats {
  open: number;
  in_review: number;
  resolved_last_30d: number;
  avg_resolution_hours: number;
}

const DisputeManager = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [stats, setStats] = useState<DisputeStats>({
    open: 0,
    in_review: 0,
    resolved_last_30d: 0,
    avg_resolution_hours: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDisputes();
    fetchAdmins();
    fetchStats();
  }, [filter]);

  const fetchDisputes = async () => {
    try {
      // Utiliser le RPC sécurisé qui masque reporter_id pour les signalés
      const { data, error } = await supabase.rpc('get_my_disputes');

      if (error) throw error;

      // Appliquer le filtre côté client
      let filteredData = data || [];
      if (filter !== 'all') {
        filteredData = filteredData.filter(d => d.status === filter);
      }

      setDisputes(filteredData as unknown as Dispute[]);
    } catch (error) {
      logger.error('Error fetching disputes', { error, filter });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profile:user_id(full_name)
        `)
        .eq('role', 'admin');

      if (error) throw error;

      setAdmins((data || []) as unknown as Admin[]);
    } catch (error) {
      logger.error('Error fetching admins', { error });
    }
  };

  const fetchStats = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Utiliser le RPC sécurisé et calculer stats côté client
      const { data: allDisputes, error } = await supabase
        .rpc('get_my_disputes');

      if (error) throw error;

      const open = allDisputes?.filter(d => d.status === 'open').length || 0;
      const in_review = allDisputes?.filter(d => d.status === 'in_review').length || 0;
      const resolved_last_30d = allDisputes?.filter(
        d => d.status === 'resolved' && d.resolved_at && new Date(d.resolved_at) > thirtyDaysAgo
      ).length || 0;

      const resolvedWithTime = allDisputes?.filter(d => d.resolved_at && d.created_at) || [];
      const avg_resolution_hours = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((sum, d) => {
            return sum + differenceInHours(new Date(d.resolved_at!), new Date(d.created_at));
          }, 0) / resolvedWithTime.length
        : 0;

      setStats({ open, in_review, resolved_last_30d, avg_resolution_hours });
    } catch (error) {
      logger.error('Error fetching dispute stats', { error });
    }
  };

  const updateDispute = async (disputeId: string, updates: Partial<Dispute>, sendNotification = false) => {
    try {
      const { error } = await supabase
        .from('disputes')
        .update(updates)
        .eq('id', disputeId);

      if (error) throw error;

      if (sendNotification && selectedDispute && (updates.status === 'resolved' || updates.status === 'closed')) {
        const message = updates.status === 'resolved' 
          ? 'Le litige a été résolu par ANSUT.'
          : 'Le litige a été fermé par ANSUT.';

        await Promise.all([
          supabase.from('notifications').insert({
            user_id: selectedDispute.reporter_id,
            type: 'dispute_update',
            title: 'Mise à jour du litige',
            message: message,
            link: '/dashboard',
            metadata: { dispute_id: disputeId }
          }),
          supabase.from('notifications').insert({
            user_id: selectedDispute.reported_id,
            type: 'dispute_update',
            title: 'Mise à jour du litige',
            message: message,
            link: '/dashboard',
            metadata: { dispute_id: disputeId }
          })
        ]);
      }

      toast({
        title: "Litige mis à jour",
        description: "Le litige a été mis à jour avec succès",
      });

      fetchDisputes();
      fetchStats();
      setSelectedDispute(null);
    } catch (error) {
      logger.error('Error updating dispute', { error, disputeId, updates });
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le litige",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: 'destructive',
      in_review: 'secondary',
      resolved: 'default',
      closed: 'outline'
    };

    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion des litiges</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="open">Ouverts</SelectItem>
            <SelectItem value="in_review">En révision</SelectItem>
            <SelectItem value="resolved">Résolus</SelectItem>
            <SelectItem value="closed">Fermés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ouverts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En révision</CardTitle>
            <Clock className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.in_review}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Résolus (30j)</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved_last_30d}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avg_resolution_hours)}h</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {disputes.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Aucun litige trouvé</p>
            </CardContent>
          </Card>
        ) : (
          disputes.map((dispute) => (
            <Card key={dispute.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  {getPriorityIcon(dispute.priority)}
                  <CardTitle className="text-base">
                    {dispute.dispute_type}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(dispute.status)}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedDispute(dispute)}>
                        Gérer
                      </Button>
                    </DialogTrigger>
                     <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Détails du litige</DialogTitle>
                      </DialogHeader>
                      {selectedDispute && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {selectedDispute.reporter?.full_name?.charAt(0) || 'R'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <Label className="text-xs text-muted-foreground">Rapporteur</Label>
                                <p className="text-sm font-medium">{selectedDispute.reporter?.full_name || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {selectedDispute.reported?.full_name?.charAt(0) || 'R'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <Label className="text-xs text-muted-foreground">Signalé</Label>
                                <p className="text-sm font-medium">{selectedDispute.reported?.full_name || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <Label>Type de litige</Label>
                            <p className="text-sm mt-1">{selectedDispute.dispute_type}</p>
                          </div>

                          <div>
                            <Label>Description</Label>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {selectedDispute.description}
                            </p>
                          </div>

                          {selectedDispute.lease_id && (
                            <div>
                              <Label>Bail concerné</Label>
                              <Button 
                                variant="link" 
                                className="h-auto p-0 text-sm"
                                onClick={() => window.open(`/leases`, '_blank')}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Voir le bail
                              </Button>
                            </div>
                          )}

                          {selectedDispute.attachments && Array.isArray(selectedDispute.attachments) && selectedDispute.attachments.length > 0 && (
                            <div>
                              <Label>Pièces jointes</Label>
                              <div className="mt-2 space-y-2">
                                {selectedDispute.attachments.map((att: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 text-sm">
                                    <FileText className="h-4 w-4" />
                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                      {att.name || `Document ${idx + 1}`}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <Label>Date de création</Label>
                            <p className="text-sm">
                              {format(new Date(selectedDispute.created_at), 'PPP à HH:mm', { locale: fr })}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Assigner à un admin</Label>
                            <Select
                              value={selectedDispute.assigned_to || 'unassigned'}
                              onValueChange={(value) => {
                                updateDispute(selectedDispute.id, { 
                                  assigned_to: value === 'unassigned' ? null : value 
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Non assigné</SelectItem>
                                {admins.map((admin) => (
                                  <SelectItem key={admin.user_id} value={admin.user_id}>
                                    {admin.profile?.full_name || 'Admin'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Statut</Label>
                            <Select
                              defaultValue={selectedDispute.status}
                              onValueChange={(value) => {
                                updateDispute(selectedDispute.id, {
                                  status: value,
                                  resolved_at: value === 'resolved' || value === 'closed' ? new Date().toISOString() : null
                                }, value === 'resolved' || value === 'closed');
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Ouvert</SelectItem>
                                <SelectItem value="in_review">En révision</SelectItem>
                                <SelectItem value="resolved">Résolu</SelectItem>
                                <SelectItem value="closed">Fermé</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Priorité</Label>
                            <Select
                              defaultValue={selectedDispute.priority}
                              onValueChange={(value) => {
                                updateDispute(selectedDispute.id, { priority: value });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Basse</SelectItem>
                                <SelectItem value="medium">Moyenne</SelectItem>
                                <SelectItem value="high">Haute</SelectItem>
                                <SelectItem value="urgent">Urgente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Notes de résolution</Label>
                            <Textarea
                              defaultValue={selectedDispute.resolution_notes || ''}
                              placeholder="Ajouter des notes..."
                              rows={4}
                              onBlur={(e) => {
                                if (e.target.value !== selectedDispute.resolution_notes) {
                                  updateDispute(selectedDispute.id, { resolution_notes: e.target.value });
                                }
                              }}
                            />
                          </div>

                          <DisputeTimeline disputeId={selectedDispute.id} />
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {dispute.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>De: {dispute.reporter?.full_name || 'N/A'}</span>
                    <span>Contre: {dispute.reported?.full_name || 'N/A'}</span>
                    <span>{format(new Date(dispute.created_at), 'PPP', { locale: fr })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default DisputeManager;