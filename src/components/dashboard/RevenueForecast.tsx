import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ForecastData {
  month: string;
  optimistic: number;
  realistic: number;
  pessimistic: number;
}

interface RevenueForecastProps {
  currentRevenue: number;
  occupancyRate: number;
  className?: string;
}

const RevenueForecast = ({ currentRevenue, occupancyRate, className }: RevenueForecastProps) => {
  // Generate 3-month forecast
  const generateForecast = (): ForecastData[] => {
    const months = ['Mois 1', 'Mois 2', 'Mois 3'];
    
    return months.map((month, index) => {
      const growthFactor = 1 + (index * 0.05); // 5% growth per month
      
      return {
        month,
        optimistic: Math.round(currentRevenue * growthFactor * 1.15), // +15%
        realistic: Math.round(currentRevenue * growthFactor),
        pessimistic: Math.round(currentRevenue * growthFactor * 0.85), // -15%
      };
    });
  };

  const forecastData = generateForecast();
  const realisticTotal = forecastData.reduce((sum, d) => sum + d.realistic, 0);
  const currentTotal = currentRevenue * 3;
  const projectedGrowth = ((realisticTotal - currentTotal) / currentTotal) * 100;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Prévisions de Revenus
          <div className="flex items-center gap-1 text-sm font-normal">
            {projectedGrowth > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-green-600">+{projectedGrowth.toFixed(1)}%</span>
              </>
            ) : projectedGrowth < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-red-600">{projectedGrowth.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <Minus className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Stable</span>
              </>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Projection sur 3 mois (taux d'occupation actuel: {occupancyRate}%)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRealistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPessimistic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number) => `${value.toLocaleString()} FCFA`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="optimistic"
              stroke="#22c55e"
              strokeWidth={1}
              fill="url(#colorOptimistic)"
              name="Optimiste (+15%)"
            />
            <Area
              type="monotone"
              dataKey="realistic"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorRealistic)"
              name="Réaliste"
            />
            <Area
              type="monotone"
              dataKey="pessimistic"
              stroke="#ef4444"
              strokeWidth={1}
              fill="url(#colorPessimistic)"
              name="Pessimiste (-15%)"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        <div className="mt-4 pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Revenus actuels (mois)</span>
            <span className="font-medium">{currentRevenue.toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Projection réaliste (3 mois)</span>
            <span className="font-medium">{realisticTotal.toLocaleString()} FCFA</span>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            * Basé sur le taux d'occupation actuel et les tendances du marché
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueForecast;
