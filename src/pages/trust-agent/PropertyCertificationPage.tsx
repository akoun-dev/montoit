import { useState, useEffect } from 'react';
import {
  Home,
  MapPin,
  CheckCircle2,
  XCircle,
  Upload,
  FileCheck,
  Search,
  Zap,
  Droplets,
  Shield,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import TrustAgentHeader from '../../features/trust-agent/components/TrustAgentHeader';
import { AddressValue, formatAddress } from '@/shared/utils/address';

interface Property {
  id: string;
  title: string;
  address: AddressValue;
  city: string;
  neighborhood: string | null;
  property_type: string;
  main_image: string | null;
  ansut_verified?: boolean;
  ansut_verification_date?: string | null;
  owner_id: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ElementType;
  checked: boolean;
}

export default function PropertyCertificationPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [certifying, setCertifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasAnsutColumns, setHasAnsutColumns] = useState(
    false // Forcer à false pour redétecter à chaque chargement
  );

  // Debug: Afficher l'état initial
  console.log('Initial hasAnsutColumns:', hasAnsutColumns);
  console.log(
    'localStorage has_ansut_columns:',
    typeof window !== 'undefined' ? localStorage.getItem('has_ansut_columns') : 'N/A'
  );

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'electricity', label: 'Installation électrique conforme', icon: Zap, checked: false },
    { id: 'plumbing', label: 'Plomberie en bon état', icon: Droplets, checked: false },
    { id: 'security', label: 'Sécurité des accès vérifiée', icon: Shield, checked: false },
    { id: 'structure', label: 'Structure du bâtiment saine', icon: Home, checked: false },
    { id: 'documents', label: 'Documents de propriété vérifiés', icon: FileCheck, checked: false },
  ]);

  const [certificationData, setCertificationData] = useState({
    ansutCertificateUrl: '',
    notes: '',
    photoUrls: [] as string[],
  });

  useEffect(() => {
    loadPropertiesPendingCertification();
  }, [hasAnsutColumns]);

  const fetchFallback = async () => {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('properties')
      .select('id, title, address, city, neighborhood, property_type, main_image, owner_id')
      .order('created_at', { ascending: false });

    if (fallbackError) throw fallbackError;

    const withDefaults = (fallbackData || []).map(
      (p: Omit<Property, 'ansut_verified' | 'ansut_verification_date'>) => ({
        ...p,
        ansut_verified: false,
        ansut_verification_date: null,
      })
    ) as Property[];

    setProperties(withDefaults);
  };
  const loadPropertiesPendingCertification = async () => {
    try {
      console.log('🔍 loadPropertiesPendingCertification - hasAnsutColumns:', hasAnsutColumns);

      // Si on sait déjà que les colonnes ANSUT sont absentes, on passe directement en fallback
      if (!hasAnsutColumns) {
        console.log('⚠️ Using fallback mode - trying to detect ANSUT columns...');
        // On essaie quand même une requête avec les colonnes ANSUT pour voir si elles existent
        const { data, error } = await supabase
          .from('properties')
          .select('id, ansut_verified')
          .limit(1);

        if (error) {
          console.log('❌ ANSUT columns detection failed:', error);
          await fetchFallback();
          return;
        } else {
          console.log('✅ ANSUT columns detected! Switching to ANSUT mode');
          setHasAnsutColumns(true);
          if (typeof window !== 'undefined') localStorage.setItem('has_ansut_columns', 'true');
          // On continue avec la suite du code normal
        }
      }

      const { data, error } = await supabase
        .from('properties')
        .select(
          'id, title, address, city, neighborhood, property_type, main_image, ansut_verified, ansut_verification_date, owner_id'
        )
        .eq('ansut_verified', false)
        .order('created_at', { ascending: false });

      if (error) {
        // Column missing on some environments: fallback without ansut fields/filter
        const errorCode = (error as { code?: string }).code;
        if (errorCode === '42703' || errorCode === 'PGRST204' || errorCode === '22P02') {
          setHasAnsutColumns(false);
          if (typeof window !== 'undefined') localStorage.setItem('has_ansut_columns', 'false');
          await fetchFallback();
          return;
        }
        // If it's a 400 Bad Request, try without the filter
        if (errorCode === 'PGRST100' || errorCode === '400') {
          console.warn('Bad request, retrying without ansut_verified filter');
          await fetchFallback();
          setHasAnsutColumns(false);
          if (typeof window !== 'undefined') localStorage.setItem('has_ansut_columns', 'false');
          return;
        }
        throw error;
      }
      setHasAnsutColumns(true);
      if (typeof window !== 'undefined') localStorage.setItem('has_ansut_columns', 'true');
      setProperties((data || []) as Property[]);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Erreur lors du chargement des propriétés');
    } finally {
      setLoading(false);
    }
  };
  const filteredProperties = properties.filter((property) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const addressText = formatAddress(property.address, property.city).toLowerCase();
    return (
      property.title.toLowerCase().includes(query) ||
      property.city.toLowerCase().includes(query) ||
      addressText.includes(query)
    );
  });

  const handleChecklistToggle = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const allChecksPassed = checklist.every((item) => item.checked);

  const handleCertify = async () => {
    console.log('=== handleCertify START ===');
    console.log('selectedProperty:', selectedProperty?.id);
    console.log('user:', user?.email);
    console.log('allChecksPassed:', allChecksPassed);
    console.log('hasAnsutColumns:', hasAnsutColumns);
    console.log('checklist:', checklist);

    if (!selectedProperty) {
      console.log('❌ No selected property');
      toast.error('Sélectionnez une propriété à certifier.');
      return;
    }
    if (!user) {
      console.log('❌ No user');
      toast.error('Session expirée, veuillez vous reconnecter.');
      return;
    }
    if (!allChecksPassed) {
      console.log('❌ Not all checks passed');
      const unchecked = checklist.filter((c) => !c.checked);
      console.log('Unchecked items:', unchecked);
      toast.error('Cochez tous les points de conformité avant de certifier.');
      return;
    }
    if (!hasAnsutColumns) {
      console.log('❌ Missing ANSUT columns');
      toast.error(
        'Le schéma de la base ne contient pas les colonnes ANSUT. Ajoutez-les avant de certifier (ansut_verified, ansut_verification_date, ansut_certificate_url).'
      );
      return;
    }

    console.log('✅ All checks passed, starting certification...');
    setCertifying(true);
    try {
      // Update property with ANSUT certification
      const updatePayload: Record<string, unknown> = {
        ansut_verified: true,
        ansut_verification_date: new Date().toISOString(),
        ansut_certificate_url: certificationData.ansutCertificateUrl || null,
      };

      console.log('Update payload:', updatePayload);

      const { error: updateError } = await supabase
        .from('properties')
        .update(updatePayload)
        .eq('id', selectedProperty.id);

      if (updateError) {
        console.log('❌ Update error:', updateError);
        const code = (updateError as { code?: string }).code;
        if (code === '42703' || code === 'PGRST204') {
          toast.error(
            'Le schéma de la base ne contient pas les colonnes ANSUT (ansut_verified / ansut_certificate_url...).'
          );
          return;
        }
        throw updateError;
      }

      console.log('✅ Property updated successfully');

      // Log the certification action (best-effort)
      try {
        await supabase.rpc('log_admin_action', {
          p_action: 'PROPERTY_CERTIFIED_ANSUT',
          p_entity_type: 'properties',
          p_entity_id: selectedProperty.id,
          p_details: {
            certified_by: user.email,
            checklist_passed: checklist.map((c) => ({
              id: c.id,
              label: c.label,
              passed: c.checked,
            })),
            notes: certificationData.notes,
          },
        });
      } catch (logError) {
        console.warn('Certification logged locally only (log_admin_action unavailable):', logError);
      }

      toast.success('Propriété certifiée ANSUT avec succès');

      // Remove from list and reset
      setProperties((prev) => prev.filter((p) => p.id !== selectedProperty.id));
      setSelectedProperty(null);
      resetForm();
    } catch (error) {
      console.error('Certification error:', error);
      toast.error('Erreur lors de la certification');
    } finally {
      setCertifying(false);
    }
  };

  const resetForm = () => {
    setChecklist((prev) => prev.map((item) => ({ ...item, checked: false })));
    setCertificationData({ ansutCertificateUrl: '', notes: '', photoUrls: [] });
  };

  return (
    <div className="min-h-screen bg-background">
      <TrustAgentHeader title="Certification Propriétés ANSUT" />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Properties List */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Propriétés en attente
                  <Badge variant="secondary">{properties.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchQuery(e.target.value)
                    }
                    className="pl-10"
                  />
                </div>

                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : filteredProperties.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">Toutes les propriétés sont certifiées</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {filteredProperties.map((property) => (
                      <div
                        key={property.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedProperty?.id === property.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => {
                          setSelectedProperty(property);
                          resetForm();
                        }}
                      >
                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            {property.main_image ? (
                              <img
                                src={property.main_image}
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{property.title}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {property.city}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {property.property_type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Certification Form */}
          <div className="lg:col-span-2">
            {selectedProperty ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Certification ANSUT
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Property Info */}
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-lg bg-background overflow-hidden flex-shrink-0">
                        {selectedProperty.main_image ? (
                          <img
                            src={selectedProperty.main_image}
                            alt={selectedProperty.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{selectedProperty.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {formatAddress(selectedProperty.address, selectedProperty.city)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge>{selectedProperty.property_type}</Badge>
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            En attente
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Checklist de conformité</h4>
                    <div className="space-y-2">
                      {checklist.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            item.checked ? 'border-green-500 bg-green-50' : 'hover:bg-muted'
                          }`}
                          onClick={() => handleChecklistToggle(item.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${item.checked ? 'bg-green-100' : 'bg-muted'}`}
                            >
                              <item.icon
                                className={`h-5 w-5 ${item.checked ? 'text-green-600' : 'text-muted-foreground'}`}
                              />
                            </div>
                            <span className={item.checked ? 'text-green-700 font-medium' : ''}>
                              {item.label}
                            </span>
                            <div className="ml-auto">
                              {item.checked ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certificate Upload */}
                  <div className="space-y-2">
                    <Label>URL du certificat ANSUT (optionnel)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={certificationData.ansutCertificateUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCertificationData((prev) => ({
                            ...prev,
                            ansutCertificateUrl: e.target.value,
                          }))
                        }
                      />
                      <Button variant="outline" size="small" className="p-2 min-h-0">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes et observations</Label>
                    <Textarea
                      placeholder="Observations sur l'état du bien, remarques particulières..."
                      value={certificationData.notes}
                      onChange={(e) =>
                        setCertificationData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={4}
                    />
                  </div>

                  {/* Progress */}
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progression</span>
                      <span className="text-sm text-muted-foreground">
                        {checklist.filter((c) => c.checked).length}/{checklist.length} vérifications
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-background overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(checklist.filter((c) => c.checked).length / checklist.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    className="w-full"
                    onClick={() => {
                      console.log('🔘 BUTTON CLICKED!');
                      console.log('🔘 Button disabled:', certifying || !allChecksPassed);
                      console.log('🔘 certifying:', certifying);
                      console.log('🔘 allChecksPassed:', allChecksPassed);
                      handleCertify();
                    }}
                    disabled={certifying || !allChecksPassed}
                  >
                    {certifying ? (
                      'Certification en cours...'
                    ) : !allChecksPassed ? (
                      `${checklist.filter((c) => !c.checked).length} vérification(s) manquante(s)`
                    ) : (
                      <>Certifier cette propriété</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Sélectionnez une propriété dans la liste pour commencer la certification ANSUT
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
