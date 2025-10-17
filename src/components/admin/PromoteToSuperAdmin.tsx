import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PromoteToSuperAdmin() {
  const { user, hasRole, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isSuperAdmin = hasRole('super_admin');

  const handlePromote = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('promote_to_super_admin', {
        target_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: 'Promotion réussie',
        description: 'Vous êtes maintenant Super Admin. Veuillez rafraîchir la page.',
      });

      // Rafraîchir le profil pour mettre à jour les rôles
      await refreshProfile();
      
      // Recharger la page après 2 secondes
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de vous promouvoir',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isSuperAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Vous êtes déjà Super Admin
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Devenir Super Admin
        </CardTitle>
        <CardDescription>
          Première connexion ? Promouvez-vous en Super Admin pour accéder à toutes les fonctionnalités d'administration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertDescription>
            <strong>Note importante :</strong> Cette action est réservée au premier administrateur.
            Par la suite, seuls les Super Admins pourront promouvoir d'autres utilisateurs.
          </AlertDescription>
        </Alert>
        <Button 
          onClick={handlePromote} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Promotion en cours...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Me promouvoir en Super Admin
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
