import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ArrowUpDown, TrendingUp, TrendingDown, Clock, Star } from 'lucide-react';
import { triggerHapticFeedback } from '@/utils/haptics';

interface SortSheetProps {
  currentSort: string;
  onSort: (sortBy: string) => void;
}

const SortSheet = ({ currentSort, onSort }: SortSheetProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { label: 'Plus récents', value: 'created_desc', icon: Clock },
    { label: 'Plus anciens', value: 'created_asc', icon: Clock },
    { label: 'Prix croissant', value: 'price_asc', icon: TrendingUp },
    { label: 'Prix décroissant', value: 'price_desc', icon: TrendingDown },
    { label: 'Plus de vues', value: 'views_desc', icon: Star },
    { label: 'Moins de vues', value: 'views_asc', icon: Star },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="min-h-[44px]"
          aria-label="Options de tri"
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Trier
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Trier par</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-2">
          {sortOptions.map((option) => {
            const Icon = option.icon;
            const isActive = currentSort === option.value;
            
            return (
              <button
                key={option.value}
                className={`w-full flex items-center gap-3 p-4 rounded-lg transition-colors min-h-[44px] ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => {
                  onSort(option.value);
                  setIsOpen(false);
                  triggerHapticFeedback('light');
                }}
                aria-pressed={isActive}
                aria-label={option.label}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SortSheet;
