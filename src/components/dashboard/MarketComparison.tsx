import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MarketData {
  propertyType: string;
  myAverage: number;
  marketAverage: number;
  difference: number;
  trend: 'up' | 'down' | 'neutral';
}

interface MarketComparisonProps {
  data: MarketData[];
  className?: string;
}

const MarketComparison = ({ data, className }: MarketComparisonProps) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendBadge = (difference: number) => {
    if (difference > 0) {
      return <Badge variant="default" className="bg-green-600">+{difference}%</Badge>;
    } else if (difference < 0) {
      return <Badge variant="destructive">{difference}%</Badge>;
    }
    return <Badge variant="secondary">0%</Badge>;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Comparaison de Marché</CardTitle>
        <CardDescription>Vos prix vs prix du marché par type de bien</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                {getTrendIcon(item.trend)}
                <div>
                  <p className="font-medium">{item.propertyType}</p>
                  <p className="text-sm text-muted-foreground">
                    Votre moyenne: {item.myAverage.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">
                  Marché: {item.marketAverage.toLocaleString()} FCFA
                </p>
                {getTrendBadge(item.difference)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketComparison;
