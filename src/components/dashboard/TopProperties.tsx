import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Property {
  id: string;
  title: string;
  views: number;
  favorites: number;
  applications: number;
  conversionRate: number;
}

interface TopPropertiesProps {
  properties: Property[];
}

const TopProperties = ({ properties }: TopPropertiesProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Biens les Plus Performants</CardTitle>
        <CardDescription>Top 5 par taux de conversion</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {properties.map((property, index) => (
            <Link
              key={property.id}
              to={`/property/${property.id}`}
              className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-bold">#{index + 1}</Badge>
                    <h4 className="font-semibold line-clamp-1">{property.title}</h4>
                  </div>
                </div>
                <Badge 
                  variant={property.conversionRate > 10 ? 'default' : 'secondary'}
                  className={property.conversionRate > 10 ? 'bg-green-600' : ''}
                >
                  {property.conversionRate}% conversion
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>{property.views} vues</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Heart className="h-4 w-4" />
                  <span>{property.favorites} favoris</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{property.applications} candidatures</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopProperties;
