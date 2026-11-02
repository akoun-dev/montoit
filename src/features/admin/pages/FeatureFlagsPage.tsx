import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Flag,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Shield,
  Map,
  CreditCard,
  Bot,
  Bell,
  LucideIcon,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { toast } from '@/hooks/shared/useSafeToast';

interface FeatureFlag {
  id: string;
  feature_name: string;
  is_enabled: boolean;
  description: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const categoryIcons: Record<string, LucideIcon> = {
  verification: Shield,
  maps: Map,
  payments: CreditCard,
  signature: Shield,
  ai: Bot,
  notifications: Bell,
  default: Flag,
};

const categoryLabels: Record<string, string> = {
  verification: 'Vérification',
  maps: 'Cartes',
  payments: 'Paiements',
  signature: 'Signature',
  ai: 'Intelligence Artificielle',
  notifications: 'Notifications',
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('feature_name');

      if (error) throw error;

      const mappedFlags: FeatureFlag[] = (data || []).map((d) => ({
        id: d.id,
        feature_name: d.feature_name,
        is_enabled: d.is_enabled ?? false,
        description: d.description,
        config: d.config as Record<string, unknown> | null,
        created_at: d.created_at ?? '',
        updated_at: d.updated_at ?? '',
      }));

      setFlags(mappedFlags);
    } catch (err) {
      console.error('Error loading feature flags:', err);
      toast.error('Erreur lors du chargement des feature flags');
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flag: FeatureFlag) => {
    setToggling(flag.id);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: !flag.is_enabled, updated_at: new Date().toISOString() })
        .eq('id', flag.id);

      if (error) throw error;

      toast.success(`${flag.feature_name} ${!flag.is_enabled ? 'activé' : 'désactivé'}`);
      loadFlags();
    } catch (err) {
      console.error('Error toggling flag:', err);
      toast.error('Erreur lors de la modification');
    } finally {
      setToggling(null);
    }
  };

  const getCategory = (flag: FeatureFlag): string => {
    const config = flag.config;
    return (config?.['category'] as string) || 'default';
  };

  const groupedFlags = flags.reduce(
    (acc, flag) => {
      const category = getCategory(flag);
      if (!acc[category]) acc[category] = [];
      acc[category].push(flag);
      return acc;
    },
    {} as Record<string, FeatureFlag[]>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Flag className="w-7 h-7 text-primary" />
            Feature Flags
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez l'activation des fonctionnalités de la plateforme
          </p>
        </div>
        <Button onClick={loadFlags} variant="outline" size="small">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground">{flags.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Activés</p>
          <p className="text-2xl font-bold text-green-600">
            {flags.filter((f) => f.is_enabled).length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Désactivés</p>
          <p className="text-2xl font-bold text-amber-600">
            {flags.filter((f) => !f.is_enabled).length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Catégories</p>
          <p className="text-2xl font-bold text-foreground">{Object.keys(groupedFlags).length}</p>
        </div>
      </div>

      {/* Flags by Category */}
      <div className="space-y-6">
        {Object.entries(groupedFlags).map(([category, categoryFlags]) => {
          const IconComponent = categoryIcons[category] ?? Flag;
          return (
            <div key={category} className="bg-card rounded-2xl shadow-card overflow-hidden">
              <div className="bg-muted/50 px-6 py-4 border-b border-border flex items-center gap-3">
                <IconComponent className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">
                  {categoryLabels[category] || category}
                </h2>
                <span className="ml-auto text-sm text-muted-foreground">
                  {categoryFlags.filter((f) => f.is_enabled).length}/{categoryFlags.length} actifs
                </span>
              </div>
              <div className="divide-y divide-border">
                {categoryFlags.map((flag) => (
                  <FlagRow
                    key={flag.id}
                    flag={flag}
                    toggling={toggling === flag.id}
                    onToggle={() => toggleFlag(flag)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlagRow({
  flag,
  toggling,
  onToggle,
}: {
  flag: FeatureFlag;
  toggling: boolean;
  onToggle: () => void;
}) {
  const config = flag.config;
  const requiresApiKey = config?.['requires_api_key'] as boolean;

  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-foreground">{flag.feature_name}</h3>
          {requiresApiKey && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Nécessite API Key
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{flag.description}</p>
      </div>

      <button
        onClick={onToggle}
        disabled={toggling}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          flag.is_enabled
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {toggling ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : flag.is_enabled ? (
          <ToggleRight className="w-5 h-5" />
        ) : (
          <ToggleLeft className="w-5 h-5" />
        )}
        <span className="font-medium">{flag.is_enabled ? 'Actif' : 'Inactif'}</span>
      </button>
    </div>
  );
}
