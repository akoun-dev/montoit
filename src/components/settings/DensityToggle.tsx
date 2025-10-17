import { Maximize2, Minimize2, ArrowDownToLine } from 'lucide-react';
import { useDensity, type UIDensity } from '@/contexts/DensityContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const densityOptions: Array<{
  value: UIDensity;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'comfortable',
    label: 'Confortable',
    description: 'Espacement généreux',
    icon: <Maximize2 className="h-4 w-4" />,
  },
  {
    value: 'compact',
    label: 'Compact',
    description: 'Équilibre optimal',
    icon: <Minimize2 className="h-4 w-4" />,
  },
  {
    value: 'dense',
    label: 'Dense',
    description: 'Maximum d\'informations',
    icon: <ArrowDownToLine className="h-4 w-4" />,
  },
];

export const DensityToggle = () => {
  const { density, setDensity } = useDensity();

  const currentOption = densityOptions.find(opt => opt.value === density);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {currentOption?.icon}
          <span className="hidden sm:inline">Affichage</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Densité d'affichage</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {densityOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setDensity(option.value)}
            className={cn(
              "flex items-start gap-3 cursor-pointer",
              density === option.value && "bg-accent"
            )}
          >
            <span className="mt-0.5">{option.icon}</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </div>
            {density === option.value && (
              <span className="ml-auto text-xs text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
