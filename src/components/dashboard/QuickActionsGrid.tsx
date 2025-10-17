import { Card, CardContent } from '@/components/ui/card';
import { Search, Heart, FileText, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const quickActions = [
  {
    title: 'Rechercher',
    description: 'Trouver un logement',
    icon: Search,
    link: '/recherche',
    color: 'from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-500/40',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Favoris',
    description: 'Biens sauvegardés',
    icon: Heart,
    link: '/favoris',
    color: 'from-pink-500/10 to-pink-600/10 border-pink-500/20 hover:border-pink-500/40',
    iconColor: 'text-pink-600',
  },
  {
    title: 'Candidatures',
    description: 'Suivre mes demandes',
    icon: FileText,
    link: '/candidatures',
    color: 'from-warning/10 to-warning/20 border-warning/20 hover:border-warning/40',
    iconColor: 'text-warning',
  },
  {
    title: 'Notifications',
    description: 'Alertes & messages',
    icon: Bell,
    link: '/profile',
    color: 'from-orange-500/10 to-orange-600/10 border-orange-500/20 hover:border-orange-500/40',
    iconColor: 'text-orange-600',
  },
];

export const QuickActionsGrid = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {quickActions.map((action) => (
        <Link key={action.title} to={action.link}>
          <Card className={cn(
            'transition-all duration-300 hover:shadow-lg cursor-pointer bg-gradient-to-br',
            action.color
          )}>
            <CardContent className="p-6 space-y-2">
              <action.icon className={cn('h-8 w-8', action.iconColor)} />
              <div>
                <h3 className="font-semibold">{action.title}</h3>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};
