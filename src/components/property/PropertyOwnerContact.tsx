import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Phone, Mail, MessageSquare, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPhone } from '@/hooks/useUserPhone';
import { VerifiedBadgeGate } from '@/components/verification/VerifiedBadgeGate';
import { Link } from 'react-router-dom';

interface PropertyOwnerContactProps {
  ownerId: string;
  ownerName: string;
  propertyId: string;
}

export const PropertyOwnerContact = ({ 
  ownerId, 
  ownerName,
  propertyId 
}: PropertyOwnerContactProps) => {
  const { user } = useAuth();
  const { phone, loading } = useUserPhone(ownerId);
  const [showPhone, setShowPhone] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacter le propriétaire</CardTitle>
        <CardDescription>
          {ownerName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <VerifiedBadgeGate 
          requiredVerification="oneci"
          feature="Contact propriétaire"
          fallback={
            <Alert className="border-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Vérification ONECI requise</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  Pour contacter ce propriétaire, vous devez d'abord <strong>vérifier votre identité</strong> 
                  avec votre <strong>CNI (Carte Nationale d'Identité)</strong> via <strong>ONECI</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Cette vérification permet de :
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>Protéger les propriétaires contre les faux profils</li>
                  <li>Accélérer le traitement de votre candidature</li>
                  <li>Débloquer l'accès aux coordonnées (téléphone, email)</li>
                </ul>
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link to="/verification">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Vérifier mon identité maintenant
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          }
        >
          <div className="space-y-3">
            {/* Phone Contact */}
            {phone && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPhone(!showPhone)}
                  disabled={loading}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {showPhone ? phone : 'Afficher le téléphone'}
                </Button>
                {showPhone && (
                  <a 
                    href={`tel:${phone}`}
                    className="block w-full"
                  >
                    <Button variant="default" className="w-full">
                      <Phone className="h-4 w-4 mr-2" />
                      Appeler maintenant
                    </Button>
                  </a>
                )}
              </div>
            )}

            {/* Message */}
            <Button
              asChild
              variant="outline"
              className="w-full"
            >
              <Link to={`/messages?user=${ownerId}&property=${propertyId}`}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Envoyer un message
              </Link>
            </Button>

            {/* Email (if available) */}
            {user && (
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <a href={`mailto:contact@montoit.ci?subject=Demande de renseignements - ${propertyId}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer un email
                </a>
              </Button>
            )}
          </div>
        </VerifiedBadgeGate>
      </CardContent>
    </Card>
  );
};
