import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, Wrench, Zap, Droplet, Flame, AlertCircle, 
  CheckCircle, Clock, XCircle, Plus, Loader2,
  Search as SearchIcon, Home
} from 'lucide-react';

interface MaintenanceRequest {
  id: string;
  property_id: string;
  request_type: string;
  title: string;
  description: string;
  urgency: 'low' | 'normal' | 'high' | 'emergency';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

const Maintenance = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    request_type: 'other',
    title: '',
    description: '',
    urgency: 'normal' as const
  });

  // Vérifier accès
  const { data: canAccess, isLoading: checkingAccess } = useQuery({
    queryKey: ['can-access-maintenance', propertyId],
    queryFn: async () => {
      if (!user || !propertyId) return false;
      
      const { data, error } = await supabase.rpc('can_access_maintenance', { 
        p_property_id: propertyId 
      });
      
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!user && !!propertyId
  });

  // Charger les demandes
  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ['maintenance-requests', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MaintenanceRequest[];
    },
    enabled: canAccess === true
  });

  // Créer demande
  const createRequest = useMutation({
    mutationFn: async (newRequest: typeof formData) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({
          property_id: propertyId,
          requester_id: user!.id,
          ...newRequest
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Demande créée',
        description: 'Votre demande de maintenance a été envoyée au propriétaire.'
      });
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests', propertyId] });
      setShowForm(false);
      setFormData({ request_type: 'other', title: '', description: '', urgency: 'normal' });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la demande.',
        variant: 'destructive'
      });
      logger.error('Failed to create maintenance request', { error });
    }
  });

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'plumbing': return <Droplet className="h-4 w-4" />;
      case 'electrical': return <Zap className="h-4 w-4" />;
      case 'heating': return <Flame className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { icon: Clock, variant: 'secondary' as const, label: 'En attente' },
      in_progress: { icon: Wrench, variant: 'default' as const, label: 'En cours' },
      completed: { icon: CheckCircle, variant: 'default' as const, label: 'Terminé' },
      cancelled: { icon: XCircle, variant: 'destructive' as const, label: 'Annulé' }
    };
    const config = configs[status as keyof typeof configs];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const configs = {
      low: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', label: 'Faible' },
      normal: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400', label: 'Normal' },
      high: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', label: 'Urgent' },
      emergency: { className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', label: 'Urgence' }
    };
    const config = configs[urgency as keyof typeof configs];
    
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-8 pt-24">
          <div className="max-w-3xl mx-auto">
            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-orange-100">
                  <Lock className="h-8 w-8 text-orange-600" />
                </div>
                <CardTitle className="text-2xl text-center">
                  Fonctionnalité réservée aux locataires
                </CardTitle>
                <CardDescription className="text-center text-base">
                  La gestion des demandes de maintenance nécessite un dossier validé
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Étapes visuelles */}
                <div className="space-y-4">
                  <div className="flex gap-4 items-start p-4 rounded-lg bg-white border">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">1</div>
                    <div>
                      <h3 className="font-semibold mb-1">Postulez à ce bien</h3>
                      <p className="text-sm text-muted-foreground">
                        Créez votre dossier de candidature depuis la page du bien
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-start p-4 rounded-lg bg-white border">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">2</div>
                    <div>
                      <h3 className="font-semibold mb-1">Attendez la validation</h3>
                      <p className="text-sm text-muted-foreground">
                        Le propriétaire étudiera votre dossier sous 48h
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-start p-4 rounded-lg bg-white border">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">3</div>
                    <div>
                      <h3 className="font-semibold mb-1">Accédez aux fonctionnalités</h3>
                      <p className="text-sm text-muted-foreground">
                        Une fois validé, gérez vos demandes de maintenance facilement
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button onClick={() => navigate(`/property/${propertyId}`)} className="flex-1" size="lg">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Voir le bien
                  </Button>
                  <Button onClick={() => navigate('/recherche')} variant="outline" className="flex-1" size="lg">
                    <SearchIcon className="mr-2 h-4 w-4" />
                    Chercher un autre bien
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto space-y-6">
          <DynamicBreadcrumb />
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Demandes de maintenance</h1>
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle demande
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>Créer une demande</CardTitle>
                <CardDescription>Décrivez le problème rencontré</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="request_type">Type de problème</Label>
                    <Select 
                      value={formData.request_type}
                      onValueChange={(value) => setFormData({ ...formData, request_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plumbing">Plomberie</SelectItem>
                        <SelectItem value="electrical">Électricité</SelectItem>
                        <SelectItem value="heating">Chauffage</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="urgency">Urgence</Label>
                    <Select 
                      value={formData.urgency}
                      onValueChange={(value: any) => setFormData({ ...formData, urgency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Faible</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Urgent</SelectItem>
                        <SelectItem value="emergency">Urgence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title">Titre</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Fuite d'eau dans la salle de bain"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description détaillée</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Décrivez le problème en détail..."
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => createRequest.mutate(formData)}
                    disabled={!formData.title || !formData.description || createRequest.isPending}
                  >
                    {createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Envoyer la demande
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loadingRequests ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getRequestTypeIcon(request.request_type)}
                        <CardTitle className="text-lg">{request.title}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        {getUrgencyBadge(request.urgency)}
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                    <CardDescription>
                      {new Date(request.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Aucune demande</AlertTitle>
              <AlertDescription>
                Vous n'avez pas encore créé de demande de maintenance.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Maintenance;
