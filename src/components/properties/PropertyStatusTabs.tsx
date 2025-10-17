import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface PropertyStatusTabsProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
  counts: {
    all: number;
    disponible: number;
    loué: number;
    en_maintenance: number;
    en_negociation: number;
    pending: number;
    rejected: number;
  };
}

const PropertyStatusTabs = ({ activeStatus, onStatusChange, counts }: PropertyStatusTabsProps) => {
  return (
    <Tabs value={activeStatus} onValueChange={onStatusChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
        <TabsTrigger value="all" className="gap-2">
          Tous
          <Badge variant="secondary" className="ml-1">
            {counts.all}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="disponible" className="gap-2">
          Disponible
          <Badge variant="secondary" className="ml-1">
            {counts.disponible}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="loué" className="gap-2">
          Loué
          <Badge variant="secondary" className="ml-1">
            {counts.loué}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="en_maintenance" className="gap-2">
          Maintenance
          <Badge variant="secondary" className="ml-1">
            {counts.en_maintenance}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="en_negociation" className="gap-2">
          En négociation
          <Badge variant="secondary" className="ml-1 bg-negotiation/20 text-negotiation">
            {counts.en_negociation}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="pending" className="gap-2">
          En attente
          <Badge variant="secondary" className="ml-1">
            {counts.pending}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="rejected" className="gap-2">
          Rejeté
          <Badge variant="secondary" className="ml-1">
            {counts.rejected}
          </Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default PropertyStatusTabs;
