import { Card, CardContent } from '@/components/ui/card';
import { Search, Heart, FileText, Bell, Home, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const quickActions = [
  {
    title: 'Rechercher',
    icon: Search,
    link: '/recherche',
    color: 'from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-500/40',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Favoris',
    icon: Heart,
    link: '/favoris',
    color: 'from-pink-500/10 to-pink-600/10 border-pink-500/20 hover:border-pink-500/40',
    iconColor: 'text-pink-600',
  },
  {
    title: 'Candidatures',
    icon: FileText,
    link: '/candidatures',
    color: 'from-warning/10 to-warning/20 border-warning/20 hover:border-warning/40',
    iconColor: 'text-warning',
  },
  {
    title: 'Profil',
    icon: Bell,
    link: '/profile',
    color: 'from-orange-500/10 to-orange-600/10 border-orange-500/20 hover:border-orange-500/40',
    iconColor: 'text-orange-600',
  },
];

export const QuickActionsGridCompact = () => {
  return (
    <div className="grid grid-cols-2 gap-2 h-[180px]">
      {quickActions.map((action) => (
        <Link key={action.title} to={action.link}>
          <Card className={cn(
            'transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-gradient-to-br h-full',
            action.color
          )}>
            <CardContent className="p-2 flex flex-col items-center justify-center h-full gap-1">
              <action.icon className={cn('h-6 w-6', action.iconColor)} />
              <span className="text-xs font-semibold text-center">{action.title}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};