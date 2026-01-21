import { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Button,
  Input,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Switch,
} from '@/shared/ui';
import { toast } from 'sonner';
import { Settings, Building2, Save, Phone, Mail, Globe, MapPin, Percent } from 'lucide-react';

interface AgencySettings {
  id: string;
  agency_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  description: string | null;
  commission_rate: number;
  monthly_target: number;
  settings: {
    auto_approve_agents?: boolean;
    notify_on_new_request?: boolean;
    default_commission_split?: number;
  };
}

export default function AgencySettingsPage() {
  const { user } = useAuth();
  const [agency, setAgency] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAgency = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setAgency({
        id: data.id,
        agency_name: data.agency_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        website: data.website,
        description: data.description,
        commission_rate: data.commission_rate ?? 10,
        monthly_target: data.monthly_target ?? 0,
        settings:
          typeof data.settings === 'object' && data.settings !== null
            ? (data.settings as AgencySettings['settings'])
            : {},
      });
    } catch (error) {
      console.error('Error loading agency:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgency();
  }, [user, loadAgency]);

  const handleSave = async () => {
    if (!agency) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('agencies')
        .update({
          agency_name: agency.agency_name,
          email: agency.email,
          phone: agency.phone,
          address: agency.address,
          city: agency.city,
          website: agency.website,
          description: agency.description,
          commission_rate: agency.commission_rate,
          monthly_target: agency.monthly_target,
          settings: agency.settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agency.id);

      if (error) throw error;

      toast.success('Paramètres enregistrés');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof AgencySettings, value: unknown) => {
    if (!agency) return;
    setAgency({ ...agency, [field]: value });
  };

  const updateSetting = (key: string, value: unknown) => {
    if (!agency) return;
    setAgency({
      ...agency,
      settings: { ...agency.settings, [key]: value },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 mx-auto text-[#2C1810]/20 mb-4" />
          <h2 className="text-xl font-semibold text-[#2C1810]">Agence non trouvée</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] py-8">
      <div className="mx-auto px-4 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2C1810]">Paramètres de l'agence</h1>
            <p className="text-[#2C1810]/60 mt-1">Configurez les informations et préférences</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#F16522] hover:bg-[#D14E12]"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Informations générales */}
          <Card className="bg-white border-[#EFEBE9]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#F16522]" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nom de l'agence</Label>
                <Input
                  value={agency.agency_name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateField('agency_name', e.target.value)
                  }
                  className="border-[#EFEBE9]"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={agency.description || ''}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    updateField('description', e.target.value)
                  }
                  placeholder="Description de votre agence..."
                  rows={3}
                  className="border-[#EFEBE9]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={agency.email || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateField('email', e.target.value)
                    }
                    className="border-[#EFEBE9]"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Téléphone
                  </Label>
                  <Input
                    value={agency.phone || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateField('phone', e.target.value)
                    }
                    className="border-[#EFEBE9]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Adresse
                  </Label>
                  <Input
                    value={agency.address || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateField('address', e.target.value)
                    }
                    className="border-[#EFEBE9]"
                  />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input
                    value={agency.city || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateField('city', e.target.value)
                    }
                    className="border-[#EFEBE9]"
                  />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Site web
                </Label>
                <Input
                  value={agency.website || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateField('website', e.target.value)
                  }
                  placeholder="https://..."
                  className="border-[#EFEBE9]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Commissions et objectifs */}
          <Card className="bg-white border-[#EFEBE9]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-[#F16522]" />
                Commissions et objectifs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Taux de commission par défaut (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={agency.commission_rate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateField('commission_rate', Number(e.target.value))
                    }
                    className="border-[#EFEBE9]"
                  />
                  <p className="text-sm text-[#2C1810]/60 mt-1">
                    Commission prélevée sur les loyers
                  </p>
                </div>
                <div>
                  <Label>Objectif mensuel (FCFA)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={agency.monthly_target}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateField('monthly_target', Number(e.target.value))
                    }
                    className="border-[#EFEBE9]"
                  />
                </div>
              </div>
              <div>
                <Label>Part agent par défaut (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={agency.settings.default_commission_split || 50}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateSetting('default_commission_split', Number(e.target.value))
                  }
                  className="border-[#EFEBE9]"
                />
                <p className="text-sm text-[#2C1810]/60 mt-1">
                  Part de la commission reversée à l'agent
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Préférences */}
          <Card className="bg-white border-[#EFEBE9]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#F16522]" />
                Préférences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#2C1810]">Notifications nouvelles demandes</p>
                  <p className="text-sm text-[#2C1810]/60">
                    Recevoir une notification quand un agent soumet une candidature
                  </p>
                </div>
                <Switch
                  checked={agency.settings.notify_on_new_request || false}
                  onCheckedChange={(checked: boolean) =>
                    updateSetting('notify_on_new_request', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#2C1810]">Approbation automatique</p>
                  <p className="text-sm text-[#2C1810]/60">
                    Approuver automatiquement les demandes d'agents (non recommandé)
                  </p>
                </div>
                <Switch
                  checked={agency.settings.auto_approve_agents || false}
                  onCheckedChange={(checked: boolean) =>
                    updateSetting('auto_approve_agents', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
