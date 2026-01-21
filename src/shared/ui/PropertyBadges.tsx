/**
 * PropertyBadges - Badges visuels pour les annonces
 * Affiche: Vérifié, Réponse rapide, Visite virtuelle, Nouveau, Améliore OSM
 */

import { ShieldCheck, Zap, Video, Sparkles, Globe2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

// Contenu riche du tooltip OSM
const OSMTooltipContent = () => (
  <div className="space-y-2 max-w-xs p-1">
    <div className="flex items-center gap-2">
      <Globe2 className="w-4 h-4 text-green-600" />
      <p className="font-medium text-sm">Contribue à OpenStreetMap</p>
    </div>
    <p className="text-xs text-muted-foreground">
      OpenStreetMap est la « Wikipedia des cartes » — une carte mondiale libre et collaborative
      créée par des millions de contributeurs.
    </p>
    <p className="text-xs text-muted-foreground">
      <span className="mr-1">🌍</span>
      <strong>Impact :</strong> Cette propriété aide à améliorer la cartographie de la Côte
      d'Ivoire, bénéficiant aux applications GPS, services humanitaires et plus.
    </p>
    <p className="text-xs text-green-600 font-medium">✓ Seule l'adresse anonymisée est partagée</p>
  </div>
);

interface PropertyBadgesProps {
  ownerIsVerified?: boolean;
  avgResponseTimeHours?: number | null;
  hasVirtualTour?: boolean;
  createdAt?: string;
  osmContributionConsent?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

interface BadgeConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  show: boolean;
  tooltip?: string;
}

export function PropertyBadges({
  ownerIsVerified = false,
  avgResponseTimeHours,
  hasVirtualTour = false,
  createdAt,
  osmContributionConsent = false,
  size = 'sm',
  className,
}: PropertyBadgesProps) {
  // Calculer si l'annonce est nouvelle (< 7 jours)
  const isNew = createdAt
    ? Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
    : false;

  // Réponse rapide = moins de 2h en moyenne
  const isQuickResponse =
    avgResponseTimeHours !== null && avgResponseTimeHours !== undefined && avgResponseTimeHours < 2;

  const badges: BadgeConfig[] = [
    {
      label: 'Vérifié',
      icon: ShieldCheck,
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      show: ownerIsVerified,
    },
    {
      label: 'Réponse rapide',
      icon: Zap,
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      show: isQuickResponse,
    },
    {
      label: 'Visite virtuelle',
      icon: Video,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      show: hasVirtualTour,
    },
    {
      label: 'Nouveau',
      icon: Sparkles,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      show: isNew,
    },
    {
      label: 'Améliore OSM',
      icon: Globe2,
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      show: osmContributionConsent,
      tooltip: 'Cette propriété améliore la cartographie OpenStreetMap',
    },
  ];

  const visibleBadges = badges.filter((badge) => badge.show);

  if (visibleBadges.length === 0) return null;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-1 gap-1',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  // Séparer le badge OSM des autres pour un traitement spécial
  const osmBadge = visibleBadges.find((b) => b.label === 'Améliore OSM');
  const otherBadges = visibleBadges.filter((b) => b.label !== 'Améliore OSM');

  const renderBadge = (badge: BadgeConfig) => (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        badge.bgColor,
        badge.textColor,
        sizeClasses[size]
      )}
      title={badge.label !== 'Améliore OSM' ? badge.tooltip : undefined}
    >
      <badge.icon className={iconSizes[size]} />
      {badge.label}
    </span>
  );

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {otherBadges.map((badge) => (
        <span key={badge.label}>{renderBadge(badge)}</span>
      ))}

      {osmBadge && (
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span className="cursor-help">{renderBadge(osmBadge)}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="p-3">
              <OSMTooltipContent />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export type { PropertyBadgesProps };
