import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, ShieldCheck, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LockedFeatureAlertProps {
  requiredVerification: 'oneci' | 'face' | 'cnam' | 'complete';
  feature?: string;
  className?: string;
}

const VERIFICATION_CONFIG = {
  oneci: {
    title: 'Vérification ONECI requise',
    description: 'Vous devez vérifier votre identité avec votre CNI pour accéder à cette fonctionnalité.',
    icon: ShieldCheck,
    color: 'border-yellow-600'
  },
  face: {
    title: 'Vérification faciale requise',
    description: 'Vous devez effectuer la vérification faciale pour accéder à cette fonctionnalité.',
    icon: Eye,
    color: 'border-blue-600'
  },
  cnam: {
    title: 'Vérification CNAM requise',
    description: 'Vous devez vérifier votre employeur pour accéder à cette fonctionnalité.',
    icon: ShieldCheck,
    color: 'border-warning'
  },
  complete: {
    title: 'Profil complet requis',
    description: 'Vous devez compléter toutes les vérifications (ONECI + Face ID) pour déverrouiller cette fonctionnalité.',
    icon: Lock,
    color: 'border-red-600'
  }
};

export const LockedFeatureAlert = ({ 
  requiredVerification, 
  feature,
  className = '' 
}: LockedFeatureAlertProps) => {
  const config = VERIFICATION_CONFIG[requiredVerification];
  const Icon = config.icon;

  return (
    <Alert className={`${config.color} ${className}`}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {feature 
            ? `Pour accéder à "${feature}", ${config.description.toLowerCase()}`
            : config.description
          }
        </p>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link to="/verification">
            <Lock className="h-4 w-4 mr-2" />
            Compléter ma vérification
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
};
