import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LocationSectionProps {
  propertyId: string;
  latitude: number;
  longitude: number;
  city: string;
  address: string;
}

export const LocationSection = ({
  propertyId,
  latitude,
  longitude,
  city,
  address
}: LocationSectionProps) => {
  const { user } = useAuth();

  const { data: canViewMap = false } = useQuery({
    queryKey: ['can-view-map', propertyId, user?.id],
    queryFn: async () => {
      if (!user || !propertyId) return false;

      const { data, error } = await supabase
        .from('rental_applications')
        .select('status')
        .eq('property_id', propertyId)
        .eq('applicant_id', user.id)
        .maybeSingle();

      if (error) return false;
      return data?.status === 'approved';
    },
    enabled: !!user && !!propertyId
  });

  if (canViewMap) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">{city}</p>
            <p className="text-sm text-muted-foreground mt-1">{address}</p>
          </div>
        </div>
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01},${latitude-0.01},${longitude+0.01},${latitude+0.01}&layer=mapnik&marker=${latitude},${longitude}`}
            style={{ border: 0 }}
          />
        </div>
        <Button asChild className="w-full" variant="outline">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Ouvrir dans Google Maps
          </a>
        </Button>
      </div>
    );
  }

  return (
    <Alert>
      <Lock className="h-4 w-4" />
      <AlertTitle>Localisation précise</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          La carte interactive et la localisation exacte (GPS) sont disponibles 
          après validation de votre dossier locataire.
        </p>
        <div className="flex items-start gap-2 mb-3 pt-2">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium text-foreground">{city}</p>
            <p className="text-sm text-muted-foreground mt-1">Quartier: {address.split(',')[0]}</p>
          </div>
        </div>
        {user ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/verification">
              <Lock className="mr-2 h-4 w-4" />
              Valider mon dossier
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link to="/auth">
              Créer un compte
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
