import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Agency, MandateSubmission } from '@/types/admin';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAgencyMandates } from '@/hooks/useAgencyMandates';
import { useProperties } from '@/hooks/useProperties';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, Building2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContextualTooltip } from '@/components/help/ContextualTooltip';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

const formSchema = z.object({
  agency_id: z.string().min(1, 'Sélectionnez une agence'),
  property_id: z.string().optional(),
  mandate_type: z.enum(['location', 'gestion_complete', 'vente']),
  commission_rate: z.coerce.number().min(0).max(100).optional(),
  fixed_fee: z.coerce.number().min(0).optional(),
  billing_frequency: z.enum(['mensuel', 'trimestriel', 'annuel', 'par_transaction']).optional(),
  start_date: z.date(),
  end_date: z.date().optional(),
  notes: z.string().optional(),
  permissions: z.object({
    can_view_properties: z.boolean().default(true),
    can_edit_properties: z.boolean().default(false),
    can_create_properties: z.boolean().default(false),
    can_delete_properties: z.boolean().default(false),
    can_view_applications: z.boolean().default(true),
    can_manage_applications: z.boolean().default(false),
    can_create_leases: z.boolean().default(false),
    can_view_financials: z.boolean().default(false),
    can_manage_maintenance: z.boolean().default(false),
    can_communicate_tenants: z.boolean().default(true),
    can_manage_documents: z.boolean().default(false),
  }),
}).refine((data) => {
  if (data.end_date && data.start_date) {
    return data.end_date > data.start_date;
  }
  return true;
}, {
  message: "La date de fin doit être postérieure à la date de début",
  path: ["end_date"],
});

interface InviteAgencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteAgencyDialog({ open, onOpenChange }: InviteAgencyDialogProps) {
  const { createMandate, asOwner } = useAgencyMandates();
  const { data: properties = [] } = useProperties();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [agenciesOpen, setAgenciesOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<MandateSubmission | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mandate_type: 'location',
      start_date: new Date(),
      permissions: {
        can_view_properties: true,
        can_edit_properties: false,
        can_create_properties: false,
        can_delete_properties: false,
        can_view_applications: true,
        can_manage_applications: false,
        can_create_leases: false,
        can_view_financials: false,
        can_manage_maintenance: false,
        can_communicate_tenants: true,
        can_manage_documents: false,
      },
    },
  });

  // Fetch agencies from profiles
  useEffect(() => {
    const fetchAgencies = async () => {
      setLoadingAgencies(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, city, created_at')
        .eq('user_type', 'agence')
        .order('full_name');
      
      if (!error && data) {
        setAgencies(data.map(a => ({
          ...a,
          user_type: 'agence' as const,
        })));
      }
      setLoadingAgencies(false);
    };
    
    if (open) {
      fetchAgencies();
    }
  }, [open]);

  // Check for duplicate mandates
  useEffect(() => {
    const agencyId = form.watch('agency_id');
    const propertyId = form.watch('property_id');
    
    if (agencyId) {
      const hasDuplicate = asOwner.some(
        m => m.agency_id === agencyId && 
        m.status === 'active' &&
        (m.property_id === propertyId || (!propertyId && !m.property_id))
      );
      setDuplicateWarning(hasDuplicate);
    }
  }, [form.watch('agency_id'), form.watch('property_id'), asOwner]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (duplicateWarning) {
      return;
    }
    
    // Préparer la soumission pour confirmation
    const submissionData: MandateSubmission = {
      agency_id: values.agency_id,
      property_id: values.property_id || null,
      mandate_type: values.mandate_type,
      commission_rate: values.commission_rate,
      fixed_fee: values.fixed_fee,
      billing_frequency: values.billing_frequency,
      start_date: values.start_date.toISOString().split('T')[0],
      end_date: values.end_date?.toISOString().split('T')[0],
      notes: values.notes,
      permissions: {
        can_view_properties: values.permissions.can_view_properties,
        can_edit_properties: values.permissions.can_edit_properties,
        can_create_properties: values.permissions.can_create_properties,
        can_delete_properties: values.permissions.can_delete_properties,
        can_view_applications: values.permissions.can_view_applications,
        can_manage_applications: values.permissions.can_manage_applications,
        can_create_leases: values.permissions.can_create_leases,
        can_view_financials: values.permissions.can_view_financials,
        can_manage_maintenance: values.permissions.can_manage_maintenance,
        can_communicate_tenants: values.permissions.can_communicate_tenants,
        can_manage_documents: values.permissions.can_manage_documents,
      },
    };
    
    setPendingSubmission(submissionData);
    setConfirmDialogOpen(true);
  };

  const handleConfirmedSubmit = () => {
    if (pendingSubmission) {
      createMandate(pendingSubmission);
      setConfirmDialogOpen(false);
      setPendingSubmission(null);
      onOpenChange(false);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Inviter une agence</DialogTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/mandates/help" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Aide
              </Link>
            </Button>
          </div>
          <DialogDescription>
            Donnez à une agence immobilière l'accès à vos biens pour qu'elle les gère en votre nom
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Sélection agence avec recherche */}
            <FormField
              control={form.control}
              name="agency_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-2">
                        Agence
                        <ContextualTooltip
                          id="select_agency"
                          title="Choisir une agence"
                          content="Sélectionnez l'agence immobilière à qui vous souhaitez confier la gestion de votre bien. Assurez-vous que l'agence est bien enregistrée sur la plateforme."
                        />
                      </FormLabel>
                      <Popover open={agenciesOpen} onOpenChange={setAgenciesOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? agencies.find((agency) => agency.id === field.value)?.full_name
                            : "Rechercher une agence..."}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Rechercher une agence..." />
                        <CommandEmpty>Aucune agence trouvée.</CommandEmpty>
                        <CommandGroup>
                          {agencies.map((agency) => (
                            <CommandItem
                              value={agency.full_name}
                              key={agency.id}
                              onSelect={() => {
                                form.setValue("agency_id", agency.id);
                                setAgenciesOpen(false);
                              }}
                            >
                              <Building2 className="mr-2 h-4 w-4" />
                              <div className="flex flex-col">
                                <span className="font-medium">{agency.full_name}</span>
                                {agency.city && (
                                  <span className="text-xs text-muted-foreground">{agency.city}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Recherchez et sélectionnez l'agence qui gérera vos biens
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning for duplicate mandate */}
            {duplicateWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Un mandat actif existe déjà avec cette agence pour cette portée. 
                  Veuillez terminer le mandat existant avant d'en créer un nouveau.
                </AlertDescription>
              </Alert>
            )}

            {/* Type de mandat */}
            <FormField
              control={form.control}
              name="mandate_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de mandat</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="location">Location</SelectItem>
                      <SelectItem value="gestion_complete">Gestion complète</SelectItem>
                      <SelectItem value="vente">Vente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bien spécifique ou global */}
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Bien concerné (optionnel)
                    <ContextualTooltip
                      id="mandate_scope"
                      title="Mandat spécifique vs Global"
                      content="Mandat spécifique : l'agence gère UN seul bien. Mandat global : l'agence gère TOUS vos biens actuels et futurs. Idéal pour une gestion centralisée."
                    />
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous mes biens (mandat global)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Tous mes biens</SelectItem>
                      {properties.map(property => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Laissez vide pour un mandat global sur tous vos biens
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditions financières */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="commission_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Commission (%)
                      <ContextualTooltip
                        id="commission_rate"
                        title="Commission"
                        content="Pourcentage prélevé sur les loyers perçus. Exemple : 10% signifie que l'agence touchera 10% du loyer mensuel. Négociez ce taux avec votre agence."
                      />
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fixed_fee"
                render={({ field }) => (
                  <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Frais fixes (FCFA)
                        <ContextualTooltip
                          id="fixed_fee"
                          title="Frais fixes"
                          content="Montant fixe payé à l'agence indépendamment des loyers. Exemple : 50 000 FCFA/mois. Vous pouvez combiner commission + frais fixes selon votre accord."
                        />
                      </FormLabel>
                      <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="billing_frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fréquence de facturation</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mensuel">Mensuel</SelectItem>
                      <SelectItem value="trimestriel">Trimestriel</SelectItem>
                      <SelectItem value="annuel">Annuel</SelectItem>
                      <SelectItem value="par_transaction">Par transaction</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de début</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", { locale: fr }) : "Sélectionner"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de fin (optionnel)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", { locale: fr }) : "Indéterminé"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Permissions</CardTitle>
                <CardDescription>Définissez ce que l'agence peut faire</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField
                  control={form.control}
                  name="permissions.can_view_properties"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm font-normal">Voir les propriétés</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="permissions.can_edit_properties"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm font-normal">Modifier les propriétés</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="permissions.can_view_applications"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm font-normal">Voir les candidatures</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="permissions.can_manage_applications"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm font-normal">Gérer les candidatures</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="permissions.can_create_leases"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm font-normal">Créer des baux</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button 
                type="submit"
                disabled={!!duplicateWarning}
              >
                Envoyer l'invitation
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point d'inviter une agence à gérer {pendingSubmission?.property_id ? 'ce bien' : 'tous vos biens'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {pendingSubmission && (
            <div className="space-y-2 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Type de mandat:</span>
                <span className="font-medium">
                  {pendingSubmission.mandate_type === 'location' ? 'Location' : 
                   pendingSubmission.mandate_type === 'gestion_complete' ? 'Gestion complète' : 'Vente'}
                </span>
                
                <span className="text-muted-foreground">Portée:</span>
                <span className="font-medium">
                  {pendingSubmission.property_id ? 'Bien spécifique' : 'Tous les biens'}
                </span>
                
                <span className="text-muted-foreground">Début:</span>
                <span className="font-medium">
                  {format(new Date(pendingSubmission.start_date), 'dd MMMM yyyy', { locale: fr })}
                </span>
                
                {pendingSubmission.end_date && (
                  <>
                    <span className="text-muted-foreground">Fin:</span>
                    <span className="font-medium">
                      {format(new Date(pendingSubmission.end_date), 'dd MMMM yyyy', { locale: fr })}
                    </span>
                  </>
                )}
                
                {pendingSubmission.commission_rate && (
                  <>
                    <span className="text-muted-foreground">Commission:</span>
                    <span className="font-medium">{pendingSubmission.commission_rate}%</span>
                  </>
                )}
                
                {pendingSubmission.fixed_fee && (
                  <>
                    <span className="text-muted-foreground">Frais fixes:</span>
                    <span className="font-medium">{pendingSubmission.fixed_fee} FCFA</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSubmission(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSubmit}>
              Confirmer l'invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
