import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, MapPin, BedDouble, Bath, Square } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PropertyWithProfile {
  id: string;
  title: string;
  description: string;
  property_type: string;
  address: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  surface_area: number;
  monthly_rent: number;
  main_image: string;
  moderation_status: string;
  moderation_notes: string;
  created_at: string;
  owner_id: string;
  profiles: {
    full_name: string;
  };
}

const PropertyModerationQueue = () => {
  const [properties, setProperties] = useState<PropertyWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [filter, setFilter] = useState<string>('pending');

  useEffect(() => {
    fetchProperties();
  }, [filter]);

  const fetchProperties = async () => {
    setLoading(true);
    const { data: propertiesData, error } = await supabase
      .from('properties')
      .select('*')
      .eq('moderation_status', filter)
      .order('created_at', { ascending: true });

    if (error || !propertiesData) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les annonces',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    // Fetch profiles for each property
    const propertiesWithProfiles = await Promise.all(
      propertiesData.map(async (property) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', property.owner_id)
          .single();

        return {
          ...property,
          profiles: profile || { full_name: 'Inconnu' }
        };
      })
    );

    setProperties(propertiesWithProfiles);

    setLoading(false);
  };

  const handleModeration = async (
    propertyId: string, 
    status: 'approved' | 'rejected' | 'changes_requested',
    moderationNotes: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('properties')
      .update({ 
        moderation_status: status,
        moderation_notes: moderationNotes,
        moderated_by: user?.id,
        moderated_at: new Date().toISOString()
      })
      .eq('id', propertyId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modérer l\'annonce',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Succès',
      description: `Annonce ${status === 'approved' ? 'approuvée' : status === 'rejected' ? 'rejetée' : 'modifications demandées'}`
    });

    fetchProperties();
  };

  const getModerationBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejetée</Badge>;
      case 'changes_requested':
        return <Badge variant="secondary">Modifications demandées</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
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
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="approved">Approuvées</TabsTrigger>
          <TabsTrigger value="rejected">Rejetées</TabsTrigger>
          <TabsTrigger value="changes_requested">Modifications demandées</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {properties.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Aucune annonce {filter === 'pending' ? 'en attente' : filter}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {properties.map((property) => (
                <Card key={property.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-xl">{property.title}</CardTitle>
                          {getModerationBadge(property.moderation_status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Propriétaire: {property.profiles.full_name}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {new Date(property.created_at).toLocaleDateString('fr-FR')}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Image */}
                      {property.main_image && (
                        <img 
                          src={property.main_image} 
                          alt={property.title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      )}

                      {/* Details */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {property.address}, {property.city}
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <BedDouble className="h-4 w-4 text-muted-foreground" />
                            {property.bedrooms} ch.
                          </div>
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4 text-muted-foreground" />
                            {property.bathrooms} sdb
                          </div>
                          <div className="flex items-center gap-1">
                            <Square className="h-4 w-4 text-muted-foreground" />
                            {property.surface_area} m²
                          </div>
                        </div>
                        <p className="text-2xl font-bold">{property.monthly_rent.toLocaleString('fr-FR')} FCFA/mois</p>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{property.description}</p>
                    </div>

                    {/* Previous moderation notes */}
                    {property.moderation_notes && (
                      <div>
                        <h4 className="font-semibold mb-2">Notes de modération</h4>
                        <p className="text-sm text-muted-foreground">{property.moderation_notes}</p>
                      </div>
                    )}

                    {/* Moderation Actions for pending items */}
                    {filter === 'pending' && (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Notes de modération</label>
                          <Textarea
                            placeholder="Ajoutez des notes pour le propriétaire..."
                            value={notes[property.id] || ''}
                            onChange={(e) => setNotes({ ...notes, [property.id]: e.target.value })}
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleModeration(property.id, 'approved', notes[property.id] || '')}
                            className="flex-1"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approuver
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleModeration(property.id, 'changes_requested', notes[property.id] || '')}
                            className="flex-1"
                          >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Demander modifications
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleModeration(property.id, 'rejected', notes[property.id] || '')}
                            className="flex-1"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Rejeter
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PropertyModerationQueue;
