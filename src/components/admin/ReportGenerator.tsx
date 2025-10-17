import { useState } from 'react';
import type { Owner } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/services/logger';
import { Loader2, Send, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const ReportGenerator = () => {
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [period, setPeriod] = useState<'last_month' | 'this_month' | 'custom'>('last_month');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([]);

  const loadOwners = async () => {
    const { data } = await supabase
      .from('properties')
      .select('owner_id, profiles!inner(full_name)')
      .not('owner_id', 'is', null);

    const uniqueOwners = Array.from(
      new Map(data?.map(item => [item.owner_id, item.profiles]) || []).entries()
    ).map(([id, profile]: [string, any]): Owner => ({
      id,
      full_name: profile.full_name,
      email: profile.email || 'N/A',
    }));

    setOwners(uniqueOwners);
  };

  const handleGenerateAndSend = async () => {
    if (!selectedOwner) {
      toast.error('Veuillez sélectionner un propriétaire');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          mode: 'manual',
          owner_id: selectedOwner,
          start_date: period === 'custom' ? startDate?.toISOString() : undefined,
          end_date: period === 'custom' ? endDate?.toISOString() : undefined,
          report_type: reportType
        }
      });

      if (error) throw error;

      toast.success(`Rapport généré et envoyé avec succès ! (${data.successful}/${data.processed})`);
    } catch (error: any) {
      logger.error('Failed to generate report', { component: 'ReportGenerator', reportType, error: error.message });
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Générateur de Rapports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Propriétaire</Label>
          <Select value={selectedOwner} onValueChange={setSelectedOwner}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un propriétaire" />
            </SelectTrigger>
            <SelectContent>
              {owners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.full_name} ({owner.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadOwners} className="mt-2">
            Charger les propriétaires
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Période</Label>
          <Tabs value={period} onValueChange={(v: any) => setPeriod(v)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="last_month">Mois dernier</TabsTrigger>
              <TabsTrigger value="this_month">Ce mois</TabsTrigger>
              <TabsTrigger value="custom">Personnalisé</TabsTrigger>
            </TabsList>
          </Tabs>

          {period === 'custom' && (
            <div className="flex gap-4 mt-4">
              <div className="flex-1 space-y-2">
                <Label>Du</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP', { locale: fr }) : 'Sélectionner'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1 space-y-2">
                <Label>Au</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP', { locale: fr }) : 'Sélectionner'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Type de rapport</Label>
          <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensuel</SelectItem>
              <SelectItem value="quarterly">Trimestriel</SelectItem>
              <SelectItem value="annual">Annuel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleGenerateAndSend} 
          disabled={!selectedOwner || loading}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Générer et envoyer
        </Button>
      </CardContent>
    </Card>
  );
};
