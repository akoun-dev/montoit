import { useState } from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDashboardLayout, WidgetType } from '@/hooks/useDashboardLayout';

const WIDGET_LABELS: Record<WidgetType, string> = {
  profile_score: 'Score de profil',
  applications_overview: 'Vue d\'ensemble des candidatures',
  property_stats: 'Statistiques des biens',
  urgent_actions: 'Actions urgentes',
  quick_actions: 'Actions rapides',
  activity_timeline: 'Fil d\'activité',
  market_insights: 'Insights du marché',
  revenue_forecast: 'Prévisions de revenus',
};

interface DashboardCustomizerProps {
  userType: string;
}

export const DashboardCustomizer = ({ userType }: DashboardCustomizerProps) => {
  const { enabledWidgets, toggleWidget, resetLayout } = useDashboardLayout(userType);
  const [open, setOpen] = useState(false);

  const availableWidgets = Object.keys(WIDGET_LABELS) as WidgetType[];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Personnaliser
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Personnaliser le dashboard</SheetTitle>
          <SheetDescription>
            Activez ou désactivez les widgets affichés sur votre dashboard
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Widgets disponibles</h3>
            {availableWidgets.map((widget) => (
              <div key={widget} className="flex items-center justify-between">
                <Label htmlFor={widget} className="cursor-pointer">
                  {WIDGET_LABELS[widget]}
                </Label>
                <Switch
                  id={widget}
                  checked={enabledWidgets.includes(widget)}
                  onCheckedChange={() => toggleWidget(widget)}
                />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={resetLayout}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser la disposition
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
