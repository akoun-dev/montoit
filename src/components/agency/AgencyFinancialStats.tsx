import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AgencyMandate } from '@/hooks/useAgencyMandates';
import { TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { useMemo } from 'react';

interface AgencyFinancialStatsProps {
  mandates: AgencyMandate[];
  properties: any[];
}

export function AgencyFinancialStats({ mandates, properties }: AgencyFinancialStatsProps) {
  // Calculer les revenus estimés avec useMemo pour optimiser
  const estimatedRevenue = useMemo(() => {
    return mandates.reduce((total, mandate) => {
      if (mandate.fixed_fee) {
        return total + mandate.fixed_fee;
      }
      if (mandate.commission_rate) {
        // Estimer basé sur les loyers des biens
        const mandateProperties = properties.filter(p => 
          mandate.property_id === p.id || mandate.property_id === null
        );
        const totalRent = mandateProperties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);
        return total + (totalRent * mandate.commission_rate / 100);
      }
      return total;
    }, 0);
  }, [mandates, properties]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenus estimés</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estimatedRevenue.toLocaleString()} FCFA
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Par mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mandats avec commission</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mandates.filter(m => m.commission_rate).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Commission moyenne: {
                mandates.filter(m => m.commission_rate).length > 0
                  ? (mandates.filter(m => m.commission_rate).reduce((sum, m) => sum + (m.commission_rate || 0), 0) / mandates.filter(m => m.commission_rate).length).toFixed(1)
                  : 0
              }%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Frais fixes mensuels</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mandates.filter(m => m.fixed_fee && m.billing_frequency === 'mensuel')
                .reduce((sum, m) => sum + (m.fixed_fee || 0), 0)
                .toLocaleString()} FCFA
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mandates.filter(m => m.fixed_fee).length} mandat{mandates.filter(m => m.fixed_fee).length > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détail des revenus par mandat</CardTitle>
          <CardDescription>Estimation basée sur les loyers actuels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mandates.map(mandate => {
              const mandateProperties = properties.filter(p => 
                mandate.property_id === p.id || mandate.property_id === null
              );
              const totalRent = mandateProperties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);
              const revenue = mandate.fixed_fee || (totalRent * (mandate.commission_rate || 0) / 100);

              return (
                <div key={mandate.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">
                      {mandate.property_id ? 'Mandat spécifique' : 'Mandat global'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {mandateProperties.length} bien{mandateProperties.length > 1 ? 's' : ''}
                      {mandate.commission_rate && ` • ${mandate.commission_rate}% commission`}
                      {mandate.fixed_fee && ` • ${mandate.fixed_fee} FCFA`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{revenue.toLocaleString()} FCFA</p>
                    <p className="text-xs text-muted-foreground">
                      {mandate.billing_frequency || 'mensuel'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
