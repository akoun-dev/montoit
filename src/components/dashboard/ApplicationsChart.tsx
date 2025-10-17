import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ApplicationsChartProps {
  data: Array<{
    property: string;
    pending: number;
    approved: number;
    rejected: number;
  }>;
  className?: string;
}

const ApplicationsChart = ({ data, className }: ApplicationsChartProps) => {
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  const selectedData = data.find(d => d.property === selectedProperty);
  const totalApplications = selectedData 
    ? selectedData.pending + selectedData.approved + selectedData.rejected 
    : 0;

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle>Candidatures par Bien</CardTitle>
          <CardDescription>Cliquez sur une barre pour voir les détails</CardDescription>
        </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="property" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="pending" 
              fill="#facc15" 
              name="En attente"
              cursor="pointer"
              onClick={(data) => setSelectedProperty(data.property)}
            />
            <Bar 
              dataKey="approved" 
              fill="#22c55e" 
              name="Approuvées"
              cursor="pointer"
              onClick={(data) => setSelectedProperty(data.property)}
            />
            <Bar 
              dataKey="rejected" 
              fill="#ef4444" 
              name="Rejetées"
              cursor="pointer"
              onClick={(data) => setSelectedProperty(data.property)}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{selectedProperty}</DialogTitle>
          <DialogDescription>
            Détail des candidatures pour ce bien
          </DialogDescription>
        </DialogHeader>
        {selectedData && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalApplications}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Taux d'approbation</p>
                <p className="text-2xl font-bold">
                  {totalApplications > 0 
                    ? Math.round((selectedData.approved / totalApplications) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <span className="text-sm font-medium">En attente</span>
                <span className="font-bold">{selectedData.pending}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <span className="text-sm font-medium">Approuvées</span>
                <span className="font-bold">{selectedData.approved}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950">
                <span className="text-sm font-medium">Rejetées</span>
                <span className="font-bold">{selectedData.rejected}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ApplicationsChart;
