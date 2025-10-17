import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PushNotificationSetup = () => {
  const { permission, isSupported, requestPermission, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications Push
        </CardTitle>
        <CardDescription>
          Recevez des alertes en temps réel pour les nouveaux événements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Statut : {
                  permission === 'granted' ? 'Activées' :
                  permission === 'denied' ? 'Bloquées' :
                  'Non activées'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {permission === 'granted' && "Vous recevrez des notifications même quand l'app est fermée"}
                {permission === 'denied' && "Veuillez autoriser les notifications dans les paramètres de votre navigateur"}
                {permission === 'default' && "Activez les notifications pour ne rien manquer"}
              </p>
            </div>
            {permission === 'granted' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={unsubscribe}
              >
                <BellOff className="h-4 w-4 mr-2" />
                Désactiver
              </Button>
            ) : permission === 'default' ? (
              <Button
                size="sm"
                onClick={requestPermission}
              >
                <Bell className="h-4 w-4 mr-2" />
                Activer
              </Button>
            ) : null}
          </div>
          
          {permission === 'granted' && (
            <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
              <p className="font-medium">Vous serez notifié pour :</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Nouvelles candidatures sur vos propriétés</li>
                <li>Nouveaux messages</li>
                <li>Validation de documents</li>
                <li>Contrats de bail à signer</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PushNotificationSetup;
