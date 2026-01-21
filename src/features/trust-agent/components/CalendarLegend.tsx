import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';

const legendItems = [
  { label: 'Urgente', color: 'bg-red-500' },
  { label: 'Haute', color: 'bg-orange-500' },
  { label: 'Moyenne', color: 'bg-amber-500' },
  { label: 'Basse', color: 'bg-green-500' },
];

export default function CalendarLegend() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Légende</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
