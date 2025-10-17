import { useState, useEffect } from 'react';
import { useRoleSwitch } from '@/hooks/useRoleSwitch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Home, Building2, Briefcase, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

type UserType = 'locataire' | 'proprietaire' | 'agence' | 'admin_ansut';

const roleConfig = {
  locataire: {
    label: 'Locataire',
    description: 'Recherchez et postulez aux annonces',
    icon: Home,
    gradient: 'from-primary/10 via-primary/5 to-transparent',
    borderColor: 'border-primary/30',
    iconColor: 'text-primary',
    badgeColor: 'bg-primary/10 text-primary',
  },
  proprietaire: {
    label: 'Propriétaire',
    description: 'Gérez vos biens et recevez des candidatures',
    icon: Building2,
    gradient: 'from-secondary/10 via-secondary/5 to-transparent',
    borderColor: 'border-secondary/30',
    iconColor: 'text-secondary',
    badgeColor: 'bg-secondary/10 text-secondary',
  },
  agence: {
    label: 'Agence Immobilière',
    description: 'Gérez un portefeuille de biens',
    icon: Briefcase,
    gradient: 'from-accent/10 via-accent/5 to-transparent',
    borderColor: 'border-accent/30',
    iconColor: 'text-accent-foreground',
    badgeColor: 'bg-accent/10 text-accent-foreground',
  },
} as const;

export const RoleSelectorFull = () => {
  const { 
    currentRole, 
    availableRoles, 
    isLoading, 
    error,
    switchRole,
    fetchActiveRoles,
    hasMultipleRoles 
  } = useRoleSwitch();

  const [switching, setSwitching] = useState<UserType | null>(null);

  useEffect(() => {
    fetchActiveRoles();
  }, []);

  if (!currentRole) return null;

  const handleSwitch = async (role: UserType) => {
    if (role === currentRole || isLoading) return;
    setSwitching(role);
    await switchRole(role);
    setSwitching(null);
  };

  const filteredRoles = availableRoles.filter(
    (role): role is keyof typeof roleConfig => 
      role !== 'admin_ansut' && role in roleConfig
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Gestion des Rôles
        </CardTitle>
        <CardDescription>
          {hasMultipleRoles 
            ? 'Basculez entre vos différents rôles sans vous reconnecter'
            : 'Ajoutez un nouveau rôle pour accéder à plus de fonctionnalités'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

        <div className="grid gap-3">
          {filteredRoles.map((role) => {
            const config = roleConfig[role];
            const RoleIcon = config.icon;
            const isActive = role === currentRole;
            const isSwitching = switching === role;

            return (
              <div
                key={role}
                className={cn(
                  "relative overflow-hidden rounded-xl border-2 transition-all duration-800",
                  "hover:shadow-md cursor-pointer",
                  isActive 
                    ? cn(config.borderColor, "shadow-soft") 
                    : "border-border/50 hover:border-border"
                )}
                onClick={() => !isActive && handleSwitch(role)}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-50",
                  isActive && config.gradient
                )} />
                
                <div className="relative p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2.5 rounded-lg transition-all duration-800",
                        isActive ? config.badgeColor : "bg-muted"
                      )}>
                        <RoleIcon className={cn(
                          "h-5 w-5 transition-colors duration-800",
                          isActive ? config.iconColor : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">
                            {config.label}
                          </h4>
                          {isActive && (
                            <Badge variant="default" className={cn("text-xs", config.badgeColor)}>
                              <Check className="h-3 w-3 mr-1" />
                              Actif
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {config.description}
                        </p>
                      </div>
                    </div>

                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoading}
                        className="hover:bg-primary/10"
                      >
                        {isSwitching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Activer'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!hasMultipleRoles && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-sm text-muted-foreground text-center">
              💡 Vous pouvez ajouter d'autres rôles selon vos besoins
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
