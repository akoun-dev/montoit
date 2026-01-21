import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '@/services/supabase/client';

interface Property {
  id: string;
  title: string;
  monthly_rent: number;
  surface_area?: number;
  bedrooms?: number;
  bathrooms?: number;
  city: string;
  property_type: string;
  is_furnished?: boolean;
  has_parking?: boolean;
  has_ac?: boolean;
  deposit_amount?: number;
  charges_amount?: number;
  main_image?: string;
  address?: string;
}

interface CompareModalProps {
  propertyIds: string[];
  onClose: () => void;
}

export default function CompareModal({ propertyIds, onClose }: CompareModalProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propertyIds.length === 0) {
      setLoading(false);
      return;
    }

    const loadProperties = async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .in('id', propertyIds);

        if (error) throw error;
        setProperties(data || []);
      } catch (err) {
        console.error('Error loading properties for comparison:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, [propertyIds]);

  if (propertyIds.length < 2) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Comparaison</h2>
          <p className="text-gray-600 mb-4">
            Sélectionnez au moins 2 propriétés pour les comparer.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary text-white rounded-xl"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount);

  const renderFeature = (label: string, getValue: (prop: Property) => React.ReactNode) => (
    <div className="grid grid-cols-5 gap-4 py-3 border-b">
      <div className="font-medium text-gray-700">{label}</div>
      {properties.map((prop) => (
        <div key={prop.id} className="text-center">
          {getValue(prop)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Comparer les propriétés</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="p-6">
          {/* Images and Titles */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="font-medium text-gray-700"></div>
            {properties.map((prop) => (
              <div key={prop.id} className="text-center">
                {prop.main_image ? (
                  <img
                    src={prop.main_image}
                    alt={prop.title}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Pas d'image</span>
                  </div>
                )}
                <h3 className="font-semibold text-sm line-clamp-2">{prop.title}</h3>
                <p className="text-xs text-gray-500">{prop.city}</p>
              </div>
            ))}
          </div>

          {/* Comparison Features */}
          {renderFeature('Prix', (prop) => (
            <span className="font-bold text-primary">{formatCurrency(prop.monthly_rent)}</span>
          ))}

          {renderFeature('Type', (prop) => (
            <span className="capitalize">{prop.property_type}</span>
          ))}

          {renderFeature('Surface', (prop) =>
            prop.surface_area ? `${prop.surface_area} m²` : '-'
          )}

          {renderFeature('Chambres', (prop) =>
            prop.bedrooms !== undefined ? prop.bedrooms : '-'
          )}

          {renderFeature('Salles de bain', (prop) =>
            prop.bathrooms !== undefined ? prop.bathrooms : '-'
          )}

          {renderFeature('Meublé', (prop) =>
            prop.is_furnished ? (
              <Check className="h-5 w-5 text-green-600 mx-auto" />
            ) : (
              <X className="h-5 w-5 text-gray-400 mx-auto" />
            )
          )}

          {renderFeature('Parking', (prop) =>
            prop.has_parking ? (
              <Check className="h-5 w-5 text-green-600 mx-auto" />
            ) : (
              <X className="h-5 w-5 text-gray-400 mx-auto" />
            )
          )}

          {renderFeature('Climatisation', (prop) =>
            prop.has_ac ? (
              <Check className="h-5 w-5 text-green-600 mx-auto" />
            ) : (
              <X className="h-5 w-5 text-gray-400 mx-auto" />
            )
          )}

          {renderFeature('Caution', (prop) =>
            prop.deposit_amount ? formatCurrency(prop.deposit_amount) : '-'
          )}

          {renderFeature('Charges', (prop) =>
            prop.charges_amount ? formatCurrency(prop.charges_amount) : '-'
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
          >
            Fermer la comparaison
          </button>
        </div>
      </div>
    </div>
  );
}
