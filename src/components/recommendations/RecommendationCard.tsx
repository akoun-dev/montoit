import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Wrench, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/properties/StatusBadge';

interface RecommendationCardProps {
  item: any;
  type: 'property' | 'tenant';
  score: number;
  reasons: string[];
}

export const RecommendationCard = ({ item, type, score, reasons }: RecommendationCardProps) => {
  const navigate = useNavigate();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-600 text-white';
    if (score >= 60) return 'bg-yellow-600 text-white';
    return 'bg-gray-600 text-white';
  };

  const handleClick = () => {
    if (type === 'property') {
      navigate(`/property/${item.data?.id || item.id}`);
    } else {
      // For tenants, navigate to application detail or profile
      navigate(`/applications`);
    }
  };

  if (type === 'property') {
    const property = item.data || item;
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={handleClick}>
        <div className="relative h-48">
          <img
            src={property.main_image || property.images?.[0] || '/placeholder.svg'}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <Badge className={getScoreColor(score)}>
              <Star className="h-3 w-3 mr-1" />
              {score}% Match
            </Badge>
            {property.work_status && property.work_status !== 'aucun_travail' && (
              <Badge variant="secondary" className="bg-orange-600 hover:bg-orange-700 text-white">
                <Wrench className="h-3 w-3 mr-1" />
                Travaux
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg line-clamp-1 flex-1">{property.title}</h3>
            {property.status && (
              <StatusBadge status={property.status} variant="compact" />
            )}
          </div>
          <div className="flex items-center text-muted-foreground text-sm mb-2">
            <MapPin className="h-4 w-4 mr-1" />
            {property.city}
          </div>
          <div className="text-2xl font-bold text-primary mb-3">
            {property.monthly_rent?.toLocaleString()} FCFA/mois
          </div>
          <div className="space-y-1 mb-4">
            {reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start text-sm">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-muted-foreground">{reason}</span>
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
            Voir les détails
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Tenant card
  const profile = item.profile || item.data?.profile;
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4 mb-4">
          <img
            src={profile?.avatar_url || '/placeholder.svg'}
            alt={profile?.full_name}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{profile?.full_name}</h3>
            <Badge className={`${getScoreColor(score)} mt-1`}>
              <Star className="h-3 w-3 mr-1" />
              {score}% Match
            </Badge>
          </div>
        </div>
        <div className="space-y-1 mb-4">
          {reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start text-sm">
              <span className="text-green-600 mr-2">✓</span>
              <span className="text-muted-foreground">{reason}</span>
            </div>
          ))}
        </div>
        <Button className="w-full" variant="outline">
          Voir le profil
        </Button>
      </CardContent>
    </Card>
  );
};
