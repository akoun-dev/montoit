import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Eye, CheckSquare, Square, Edit, Archive, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { logger } from '@/services/logger';
import type { Property as PropertyType } from '@/types';
import { PROPERTY_STATUS_LABELS, PROPERTY_STATUS_COLORS } from '@/constants';

type Property = Pick<PropertyType, 
  'id' | 'title' | 'city' | 'monthly_rent' | 'status' | 'created_at' | 'owner_id'
> & {
  profiles: {
    full_name: string;
  };
};

const AdminProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  
  // Bulk action dialogs
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showRentDialog, setShowRentDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  
  // Bulk action values
  const [bulkStatus, setBulkStatus] = useState('disponible');
  const [rentModificationType, setRentModificationType] = useState<'fixed' | 'percentage'>('percentage');
  const [rentModificationValue, setRentModificationValue] = useState('');
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          title,
          city,
          monthly_rent,
          status,
          created_at,
          owner_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      if (data && data.length > 0) {
        const ownerIds = [...new Set(data.map(p => p.owner_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ownerIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const propertiesWithProfiles = data.map(property => ({
          ...property,
          profiles: profilesMap.get(property.owner_id) || { full_name: 'Inconnu' }
        }));

        setProperties(propertiesWithProfiles);
      } else {
        setProperties([]);
      }
    } catch (error) {
      logger.error('Failed to fetch properties for admin', { error });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les biens',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePropertyStatus = async (propertyId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Bien ${newStatus === 'disponible' ? 'approuvé' : 'rejeté'}`,
      });

      fetchProperties();
    } catch (error) {
      logger.error('Failed to update property status', { error, propertyId, newStatus });
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le bien',
        variant: 'destructive',
      });
    }
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedProperties.length === properties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(properties.map(p => p.id));
    }
  };

  const toggleSelectProperty = (propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const clearSelection = () => {
    setSelectedProperties([]);
    setConfirmationChecked(false);
  };

  // Bulk actions
  const handleBulkStatusChange = async () => {
    if (!confirmationChecked) return;

    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: bulkStatus })
        .in('id', selectedProperties);

      if (error) throw error;

      // Log audit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action_type: 'bulk_property_update',
          target_type: 'properties',
          target_id: selectedProperties[0],
          notes: `Statut modifié pour ${selectedProperties.length} propriétés`,
          new_values: { status: bulkStatus, count: selectedProperties.length }
        });
      }

      toast({
        title: 'Succès',
        description: `${selectedProperties.length} propriété(s) mise(s) à jour`,
      });

      setShowStatusDialog(false);
      clearSelection();
      fetchProperties();
    } catch (error) {
      logger.error('Bulk status update failed', { error });
      toast({
        title: 'Erreur',
        description: 'Échec de la modification groupée',
        variant: 'destructive',
      });
    }
  };

  const handleBulkRentChange = async () => {
    if (!confirmationChecked || !rentModificationValue) return;

    try {
      const selectedProps = properties.filter(p => selectedProperties.includes(p.id));
      const updates = selectedProps.map(prop => {
        const currentRent = prop.monthly_rent;
        const newRent = rentModificationType === 'percentage'
          ? currentRent * (1 + parseFloat(rentModificationValue) / 100)
          : currentRent + parseFloat(rentModificationValue);
        
        return {
          id: prop.id,
          monthly_rent: Math.round(newRent)
        };
      });

      // Update each property
      for (const update of updates) {
        const { error } = await supabase
          .from('properties')
          .update({ monthly_rent: update.monthly_rent })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      // Log audit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action_type: 'bulk_property_update',
          target_type: 'properties',
          target_id: selectedProperties[0],
          notes: `Loyer modifié pour ${selectedProperties.length} propriétés (${rentModificationType}: ${rentModificationValue})`,
          new_values: { type: rentModificationType, value: rentModificationValue, count: selectedProperties.length }
        });
      }

      toast({
        title: 'Succès',
        description: `Loyer mis à jour pour ${selectedProperties.length} propriété(s)`,
      });

      setShowRentDialog(false);
      clearSelection();
      setRentModificationValue('');
      fetchProperties();
    } catch (error) {
      logger.error('Bulk rent update failed', { error });
      toast({
        title: 'Erreur',
        description: 'Échec de la modification des loyers',
        variant: 'destructive',
      });
    }
  };

  const handleBulkArchive = async () => {
    if (!confirmationChecked) return;

    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'archivé' })
        .in('id', selectedProperties);

      if (error) throw error;

      // Log audit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action_type: 'bulk_property_update',
          target_type: 'properties',
          target_id: selectedProperties[0],
          notes: `${selectedProperties.length} propriétés archivées`,
          new_values: { status: 'archivé', count: selectedProperties.length }
        });
      }

      toast({
        title: 'Succès',
        description: `${selectedProperties.length} propriété(s) archivée(s)`,
      });

      setShowArchiveDialog(false);
      clearSelection();
      fetchProperties();
    } catch (error) {
      logger.error('Bulk archive failed', { error });
      toast({
        title: 'Erreur',
        description: "Échec de l'archivage groupé",
        variant: 'destructive',
      });
    }
  };

  const getPreviewData = () => {
    return properties
      .filter(p => selectedProperties.includes(p.id))
      .map(prop => {
        if (showStatusDialog) {
          return {
            title: prop.title,
            current: PROPERTY_STATUS_LABELS[prop.status] || prop.status,
            new: PROPERTY_STATUS_LABELS[bulkStatus] || bulkStatus
          };
        } else if (showRentDialog && rentModificationValue) {
          const currentRent = prop.monthly_rent;
          const newRent = rentModificationType === 'percentage'
            ? currentRent * (1 + parseFloat(rentModificationValue) / 100)
            : currentRent + parseFloat(rentModificationValue);
          return {
            title: prop.title,
            current: `${currentRent.toLocaleString()} FCFA`,
            new: `${Math.round(newRent).toLocaleString()} FCFA`
          };
        } else if (showArchiveDialog) {
          return {
            title: prop.title,
            current: PROPERTY_STATUS_LABELS[prop.status] || prop.status,
            new: 'Archivé'
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'disponible' ? 'default' : status === 'refuse' ? 'destructive' : 'outline';
    return <Badge variant={variant}>{PROPERTY_STATUS_LABELS[status] || status}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestion des biens immobiliers</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedProperties.length > 0 && (
            <Alert className="mb-4 border-primary">
              <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  <span className="font-medium">{selectedProperties.length} propriété(s) sélectionnée(s)</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Désélectionner tout
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Changer statut
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowRentDialog(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Modifier loyer
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setShowArchiveDialog(true)}>
                    <Archive className="h-4 w-4 mr-1" />
                    Archiver
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedProperties.length === properties.length && properties.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Loyer</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Aucun bien trouvé
                  </TableCell>
                </TableRow>
              ) : (
                properties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProperties.includes(property.id)}
                        onCheckedChange={() => toggleSelectProperty(property.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{property.title}</TableCell>
                    <TableCell>{property.profiles.full_name}</TableCell>
                    <TableCell>{property.city}</TableCell>
                    <TableCell>{property.monthly_rent.toLocaleString()} FCFA</TableCell>
                    <TableCell>{getStatusBadge(property.status)}</TableCell>
                    <TableCell>{new Date(property.created_at).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to={`/property/${property.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {property.status === 'en_attente' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updatePropertyStatus(property.id, 'disponible')}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updatePropertyStatus(property.id, 'refuse')}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog: Changer le statut */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut de {selectedProperties.length} propriété(s)</DialogTitle>
            <DialogDescription>
              Sélectionnez le nouveau statut à appliquer aux propriétés sélectionnées
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nouveau statut</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="loué">Loué</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="archivé">Archivé</SelectItem>
                  <SelectItem value="refuse">Refusé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {getPreviewData().length > 0 && (
              <div className="border rounded-lg p-3 max-h-64 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Aperçu des modifications :</p>
                <div className="space-y-2">
                  {getPreviewData().map((item: any, idx) => (
                    <div key={idx} className="text-xs border-b pb-2 last:border-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground">
                        <span>{item.current}</span> → <span className="text-primary font-medium">{item.new}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-status"
                checked={confirmationChecked}
                onCheckedChange={(checked) => setConfirmationChecked(checked as boolean)}
              />
              <Label htmlFor="confirm-status" className="text-sm cursor-pointer">
                Je confirme ces modifications
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowStatusDialog(false); setConfirmationChecked(false); }}>
              Annuler
            </Button>
            <Button onClick={handleBulkStatusChange} disabled={!confirmationChecked}>
              Confirmer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Modifier le loyer */}
      <Dialog open={showRentDialog} onOpenChange={setShowRentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le loyer de {selectedProperties.length} propriété(s)</DialogTitle>
            <DialogDescription>
              Choisissez le type de modification et la valeur
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Type de modification</Label>
              <RadioGroup value={rentModificationType} onValueChange={(v) => setRentModificationType(v as 'fixed' | 'percentage')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <Label htmlFor="percentage" className="cursor-pointer">Pourcentage (%)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="cursor-pointer">Montant fixe (FCFA)</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Valeur {rentModificationType === 'percentage' ? '(%)' : '(FCFA)'}</Label>
              <Input
                type="number"
                value={rentModificationValue}
                onChange={(e) => setRentModificationValue(e.target.value)}
                placeholder={rentModificationType === 'percentage' ? 'Ex: 10 pour +10%' : 'Ex: 50000'}
              />
            </div>

            {rentModificationValue && getPreviewData().length > 0 && (
              <div className="border rounded-lg p-3 max-h-64 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Aperçu des modifications :</p>
                <div className="space-y-2">
                  {getPreviewData().map((item: any, idx) => (
                    <div key={idx} className="text-xs border-b pb-2 last:border-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground">
                        <span>{item.current}</span> → <span className="text-primary font-medium">{item.new}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-rent"
                checked={confirmationChecked}
                onCheckedChange={(checked) => setConfirmationChecked(checked as boolean)}
              />
              <Label htmlFor="confirm-rent" className="text-sm cursor-pointer">
                Je confirme ces modifications
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRentDialog(false); setConfirmationChecked(false); setRentModificationValue(''); }}>
              Annuler
            </Button>
            <Button onClick={handleBulkRentChange} disabled={!confirmationChecked || !rentModificationValue}>
              Confirmer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Archiver */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiver {selectedProperties.length} propriété(s)</DialogTitle>
            <DialogDescription className="text-destructive">
              Attention : Cette action marquera les propriétés comme archivées. Elles ne seront plus visibles dans les recherches publiques.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {getPreviewData().length > 0 && (
              <div className="border rounded-lg p-3 max-h-64 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Propriétés concernées :</p>
                <div className="space-y-2">
                  {getPreviewData().map((item: any, idx) => (
                    <div key={idx} className="text-xs border-b pb-2 last:border-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground">
                        <span>{item.current}</span> → <span className="text-destructive font-medium">{item.new}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-archive"
                checked={confirmationChecked}
                onCheckedChange={(checked) => setConfirmationChecked(checked as boolean)}
              />
              <Label htmlFor="confirm-archive" className="text-sm cursor-pointer">
                Je confirme vouloir archiver ces propriétés
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowArchiveDialog(false); setConfirmationChecked(false); }}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleBulkArchive} disabled={!confirmationChecked}>
              Archiver les propriétés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminProperties;
