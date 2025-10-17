import { Eye, Heart, FileText, DollarSign, TrendingUp, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PropertyStatsCompactProps {
  stats: {
    totalProperties: number;
    totalViews: number;
    totalFavorites: number;
    totalApplications: number;
    averageRent: number;
    occupancyRate: number;
  };
}

export const PropertyStatsCompact = ({ stats }: PropertyStatsCompactProps) => {
  const statItems = [
    { 
      title: 'Biens', 
      value: stats.totalProperties, 
      icon: Home,
      color: 'text-blue-600'
    },
    {
      title: 'Vues',
      value: stats.totalViews.toLocaleString(),
      icon: Eye,
      color: 'text-primary'
    },
    { 
      title: 'Favoris', 
      value: stats.totalFavorites, 
      icon: Heart,
      color: 'text-pink-600'
    },
    { 
      title: 'Candidatures', 
      value: stats.totalApplications, 
      icon: FileText,
      color: 'text-orange-600'
    },
    { 
      title: 'Loyer moyen', 
      value: `${(stats.averageRent / 1000).toFixed(0)}K`, 
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Occupation',
      value: `${stats.occupancyRate}%`,
      icon: TrendingUp,
      color: 'text-success'
    },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {statItems.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold truncate">{stat.value}</div>
                <div className="text-xs text-muted-foreground truncate">{stat.title}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};