import { useState, useEffect } from 'react';
import { useRoleSwitch } from '@/hooks/useRoleSwitch';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Home, Building2, Briefcase } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type UserType = 'locataire' | 'proprietaire' | 'agence' | 'admin_ansut';

const roleConfig = {
  locataire: {
    label: 'Locataire',
    icon: Home,
    gradient: 'from-primary/20 to-primary/5',
    color: 'text-primary',
  },
  proprietaire: {
    label: 'Propriétaire',
    icon: Building2,
    gradient: 'from-secondary/20 to-secondary/5',
    color: 'text-secondary',
  },
  agence: {
    label: 'Agence',
    icon: Briefcase,
    gradient: 'from-accent/20 to-accent/5',
    color: 'text-accent-foreground',
  },
} as const;

export const RoleSwitcherCompact = () => {
  const { 
    currentRole, 
    availableRoles, 
    isLoading, 
    error,
    switchRole,
    fetchActiveRoles,
    hasMultipleRoles 
  } = useRoleSwitch();

  useEffect(() => {
    fetchActiveRoles();
  }, []);

  if (!hasMultipleRoles || !currentRole) return null;

  const filteredRoles = availableRoles.filter(
    (role): role is keyof typeof roleConfig => 
      role !== 'admin_ansut' && role in roleConfig
  );

  // Switch pour 2 rôles
  if (filteredRoles.length === 2) {
    const otherRole = filteredRoles.find(r => r !== currentRole);
    if (!otherRole) return null;

    const CurrentIcon = roleConfig[currentRole]?.icon || Home;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-800",
              "bg-gradient-to-r border shadow-sm hover:shadow-md",
              roleConfig[currentRole]?.gradient,
              "border-border/50"
            )}>
              <div className="flex items-center gap-2">
                <CurrentIcon className={cn("h-4 w-4", roleConfig[currentRole]?.color)} />
                <Label 
                  htmlFor="role-switch" 
                  className="text-sm font-medium cursor-pointer"
                >
                  {roleConfig[currentRole]?.label}
                </Label>
              </div>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  id="role-switch"
                  checked={currentRole === filteredRoles[1]}
                  onCheckedChange={() => switchRole(otherRole)}
                  disabled={isLoading}
                  className="transition-all duration-800"
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Basculer vers {roleConfig[otherRole]?.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Dropdown pour 3+ rôles
  const CurrentIcon = roleConfig[currentRole]?.icon || Home;

  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-800",
                  "bg-gradient-to-r border shadow-sm hover:shadow-md",
                  roleConfig[currentRole]?.gradient,
                  "border-border/50"
                )}
                disabled={isLoading}
              >
                <CurrentIcon className={cn("h-4 w-4", roleConfig[currentRole]?.color)} />
                <span className="text-sm font-medium">{roleConfig[currentRole]?.label}</span>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {filteredRoles.map((role) => {
              const RoleIcon = roleConfig[role]?.icon || Home;
              const isActive = role === currentRole;
              
              return (
                <DropdownMenuItem
                  key={role}
                  onClick={() => !isActive && switchRole(role)}
                  disabled={isActive || isLoading}
                  className={cn(
                    "flex items-center gap-3 cursor-pointer transition-all duration-300",
                    isActive && "bg-primary/10 font-medium"
                  )}
                >
                  <RoleIcon className={cn("h-4 w-4", roleConfig[role]?.color)} />
                  <span>{roleConfig[role]?.label}</span>
                  {isActive && (
                    <span className="ml-auto text-xs text-primary">✓</span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent>
          <p>Changer de rôle</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
