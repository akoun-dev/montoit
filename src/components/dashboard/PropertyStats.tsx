import { Eye, Heart, FileText, TrendingUp, DollarSign, Home } from 'lucide-react';
import { StatCard } from './StatCard';

interface PropertyStatsProps {
  stats: {
    totalProperties: number;
    totalViews: number;
    totalFavorites: number;
    totalApplications: number;
    averageRent: number;
    occupancyRate: number;
  };
  trends?: {
    totalProperties?: { value: number; isPositive: boolean };
    totalViews?: { value: number; isPositive: boolean };
    totalFavorites?: { value: number; isPositive: boolean };
    totalApplications?: { value: number; isPositive: boolean };
    averageRent?: { value: number; isPositive: boolean };
    occupancyRate?: { value: number; isPositive: boolean };
  };
}

const PropertyStats = ({ stats, trends }: PropertyStatsProps) => {
  const statCards = [
    { 
      title: 'Biens totaux', 
      value: stats.totalProperties, 
      icon: Home,
      trend: trends?.totalProperties
    },
    { 
      title: 'Vues totales', 
      value: stats.totalViews.toLocaleString(), 
      icon: Eye,
      trend: trends?.totalViews
    },
    { 
      title: 'Favoris', 
      value: stats.totalFavorites, 
      icon: Heart,
      trend: trends?.totalFavorites
    },
    { 
      title: 'Candidatures', 
      value: stats.totalApplications, 
      icon: FileText,
      trend: trends?.totalApplications
    },
    { 
      title: 'Loyer moyen', 
      value: `${stats.averageRent.toLocaleString()} FCFA`, 
      icon: DollarSign,
      trend: trends?.averageRent,
      description: 'Par mois'
    },
    { 
      title: "Taux d'occupation", 
      value: `${stats.occupancyRate}%`, 
      icon: TrendingUp,
      trend: trends?.occupancyRate
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statCards.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default PropertyStats;
