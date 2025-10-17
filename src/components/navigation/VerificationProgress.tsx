import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';

export const VerificationProgress = () => {
  const { profile } = useAuth();

  if (!profile) return null;

  const verifications = [
    { key: 'oneci_verified', label: 'ONECI (Identité)' },
    { key: 'cnam_verified', label: 'CNAM (Emploi)' },
  ];

  const completedCount = verifications.filter(v => profile[v.key as keyof typeof profile]).length;
  const totalCount = verifications.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  if (completedCount === totalCount) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/verification">
              <Badge variant="secondary" className="gap-1.5 cursor-pointer hover:bg-secondary/80 transition-colors">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-semibold">Vérifié</span>
              </Badge>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-medium">Toutes vos vérifications sont complètes</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/verification">
            <Badge 
              variant="outline" 
              className="gap-1.5 cursor-pointer hover:bg-accent transition-colors border-amber-500/50 text-amber-700 dark:text-amber-400"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">{percentage}%</span>
            </Badge>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="text-xs font-semibold mb-1">Progression de vérification</p>
            {verifications.map(v => (
              <div key={v.key} className="flex items-center gap-2 text-xs">
                <span className={profile[v.key as keyof typeof profile] ? 'text-green-600' : 'text-muted-foreground'}>
                  {profile[v.key as keyof typeof profile] ? '✓' : '○'}
                </span>
                <span>{v.label}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              Cliquez pour compléter votre profil
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
