import { Button } from '@/components/ui/button';
import { Grid3x3, List, Table } from 'lucide-react';

interface ViewToggleProps {
  view: 'grid' | 'list' | 'table';
  onViewChange: (view: 'grid' | 'list' | 'table') => void;
  options?: ('grid' | 'list' | 'table')[];
}

const ViewToggle = ({ view, onViewChange, options = ['grid', 'list'] }: ViewToggleProps) => {
  return (
    <div className="flex gap-1 border rounded-lg p-1">
      {options.includes('grid') && (
        <Button
          variant={view === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('grid')}
          className="gap-2"
        >
          <Grid3x3 className="h-4 w-4" />
          Grille
        </Button>
      )}
      {options.includes('list') && (
        <Button
          variant={view === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('list')}
          className="gap-2"
        >
          <List className="h-4 w-4" />
          Liste
        </Button>
      )}
      {options.includes('table') && (
        <Button
          variant={view === 'table' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('table')}
          className="gap-2"
        >
          <Table className="h-4 w-4" />
          Tableau
        </Button>
      )}
    </div>
  );
};

export default ViewToggle;
