import { PropertyCard } from '@/components/properties/PropertyCard';
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { AgencyMandate } from '@/hooks/useAgencyMandates';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';

interface AgencyPropertiesViewProps {
  properties: any[];
  mandates: AgencyMandate[];
}

const ITEMS_PER_PAGE = 50;

export function AgencyPropertiesView({ properties, mandates }: AgencyPropertiesViewProps) {
  const [page, setPage] = useState(1);
  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun bien à gérer</h3>
            <p className="text-muted-foreground">
              Les biens dont vous avez la gestion apparaîtront ici
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grouper par propriétaire avec useMemo
  const propertiesByOwner = useMemo(() => {
    return properties.reduce<Record<string, { mandate: AgencyMandate; properties: any[] }>>(
      (acc, property) => {
        const mandate = mandates.find(m => 
          m.owner_id === property.owner_id &&
          (m.property_id === property.id || m.property_id === null)
        );
        
        if (!mandate) return acc;

        const ownerName = mandate.owner_id; // TODO: Récupérer le nom du propriétaire
        if (!acc[ownerName]) {
          acc[ownerName] = { mandate, properties: [] };
        }
        acc[ownerName].properties.push(property);
        return acc;
      }, 
      {}
    );
  }, [properties, mandates]);

  // Pagination des propriétaires
  const ownersEntries = Object.entries(propertiesByOwner);
  const totalPages = Math.ceil(ownersEntries.length / ITEMS_PER_PAGE);
  const paginatedOwners = useMemo(
    () => ownersEntries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [ownersEntries, page]
  );

  return (
    <div className="space-y-8">
      {paginatedOwners.map(([ownerName, data]) => {
        const { mandate, properties: ownerProperties } = data;
        return (
          <div key={ownerName} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Propriétaire: {ownerName}</h3>
                <p className="text-sm text-muted-foreground">
                  {ownerProperties.length} bien{ownerProperties.length > 1 ? 's' : ''} géré
                  {ownerProperties.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ownerProperties.map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Précédent
          </Button>
          <span className="flex items-center px-4">
            Page {page} sur {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
