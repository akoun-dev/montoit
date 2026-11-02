import { useState } from 'react';
import {
  Settings,
  Save,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Percent,
  Clock,
  Shield,
  Lock,
  Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useAllBusinessRules,
  useUpdateBusinessRule,
  useToggleBusinessRule,
} from '@/hooks/shared/useBusinessRule';
import { RULE_CATEGORIES, type RuleCategory } from '@/services/businessRulesService';

// Map categories to icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  payments: <DollarSign className="w-5 h-5" />,
  commissions: <Percent className="w-5 h-5" />,
  fees: <Percent className="w-5 h-5" />,
  delays: <Clock className="w-5 h-5" />,
  verification: <Shield className="w-5 h-5" />,
  gates: <Lock className="w-5 h-5" />,
  limits: <Gauge className="w-5 h-5" />,
};

interface DbBusinessRule {
  id: string;
  rule_key: string;
  category: string;
  rule_name: string;
  rule_type: 'number' | 'boolean' | 'percentage' | 'json';
  value_number: number | null;
  value_boolean: boolean | null;
  value_json: Record<string, unknown> | null;
  description: string | null;
  is_enabled: boolean;
  min_value: number | null;
  max_value: number | null;
}

export default function BusinessRulesPage() {
  const [activeCategory, setActiveCategory] = useState<RuleCategory>('payments');
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const { rules, isLoading, error, refetch } = useAllBusinessRules();
  const updateMutation = useUpdateBusinessRule();
  const toggleMutation = useToggleBusinessRule();

  // Group rules by category
  const rulesByCategory = (rules as DbBusinessRule[]).reduce<Record<string, DbBusinessRule[]>>(
    (acc, rule) => {
      const category = rule.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category]?.push(rule);
      return acc;
    },
    {}
  );

  const handleEditStart = (rule: DbBusinessRule) => {
    setEditingRule(rule.rule_key);
    if (rule.rule_type === 'boolean') {
      setEditValue(rule.value_boolean === true ? 'true' : 'false');
    } else {
      setEditValue(String(rule.value_number ?? '0'));
    }
  };

  const handleSave = async (rule: DbBusinessRule) => {
    try {
      let value: number | boolean;

      if (rule.rule_type === 'boolean') {
        value = editValue === 'true';
      } else {
        value = Number(editValue);

        // Validate against min/max
        if (rule.min_value !== null && value < rule.min_value) {
          toast.error(`La valeur doit être au moins ${rule.min_value}`);
          return;
        }
        if (rule.max_value !== null && value > rule.max_value) {
          toast.error(`La valeur doit être au maximum ${rule.max_value}`);
          return;
        }
      }

      await updateMutation.mutateAsync({ key: rule.rule_key, value });
      toast.success('Règle mise à jour avec succès');
      setEditingRule(null);
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleToggle = async (rule: DbBusinessRule) => {
    try {
      await toggleMutation.mutateAsync({
        key: rule.rule_key,
        isEnabled: !rule.is_enabled,
      });
      toast.success(rule.is_enabled ? 'Règle désactivée' : 'Règle activée');
    } catch {
      toast.error('Erreur lors de la modification');
    }
  };

  const formatValue = (rule: DbBusinessRule) => {
    if (rule.rule_type === 'boolean') {
      return rule.value_boolean ? 'Oui' : 'Non';
    }
    if (rule.rule_type === 'percentage') {
      return `${rule.value_number}%`;
    }
    if (rule.rule_type === 'number') {
      // Check if it's a monetary value
      if (rule.category === 'payments' || rule.category === 'limits') {
        return `${rule.value_number?.toLocaleString('fr-FR')} FCFA`;
      }
      // Check if it's a delay
      if (rule.category === 'delays') {
        const days = rule.value_number ?? 0;
        return days === 0 ? 'J-0' : days > 0 ? `J-${days}` : `J+${Math.abs(days)}`;
      }
      return String(rule.value_number);
    }
    return JSON.stringify(rule.value_json);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-destructive mb-2">Erreur de chargement</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'Impossible de charger les règles métier'}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Settings className="w-7 h-7 text-primary" />
              Règles Métier
            </h1>
            <p className="text-muted-foreground mt-1">
              Paramétrez les règles de fonctionnement de la plateforme
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          {Object.entries(RULE_CATEGORIES).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key as RuleCategory)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeCategory === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {CATEGORY_ICONS[key]}
              {label}
              {rulesByCategory[key] && (
                <span className="text-xs opacity-70">({rulesByCategory[key].length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Rules List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {rulesByCategory[activeCategory]?.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 hover:bg-muted/30 transition-colors ${
                  !rule.is_enabled ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Rule Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{rule.rule_name}</h3>
                      {rule.is_enabled ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      Clé: {rule.rule_key}
                      {rule.min_value !== null && ` | Min: ${rule.min_value}`}
                      {rule.max_value !== null && ` | Max: ${rule.max_value}`}
                    </p>
                  </div>

                  {/* Value Display/Edit */}
                  <div className="flex items-center gap-3">
                    {editingRule === rule.rule_key ? (
                      <div className="flex items-center gap-2">
                        {rule.rule_type === 'boolean' ? (
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                          >
                            <option value="true">Oui</option>
                            <option value="false">Non</option>
                          </select>
                        ) : (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            min={rule.min_value ?? undefined}
                            max={rule.max_value ?? undefined}
                            className="w-32 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                          />
                        )}
                        <button
                          onClick={() => handleSave(rule)}
                          disabled={updateMutation.isPending}
                          className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        ></button>
                        <button
                          onClick={() => setEditingRule(null)}
                          className="p-2 border border-border rounded-lg hover:bg-muted"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditStart(rule)}
                        className="px-4 py-2 bg-muted rounded-lg font-semibold text-foreground hover:bg-muted/80 transition-colors min-w-[120px] text-right"
                      >
                        {formatValue(rule)}
                      </button>
                    )}

                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggle(rule)}
                      disabled={toggleMutation.isPending}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.is_enabled
                          ? 'text-green-500 hover:bg-green-50'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                      title={rule.is_enabled ? 'Désactiver' : 'Activer'}
                    >
                      {rule.is_enabled ? (
                        <ToggleRight className="w-6 h-6" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )) ?? (
              <div className="p-8 text-center text-muted-foreground">
                Aucune règle dans cette catégorie
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />À propos des règles métier
          </h3>
          <ul className="mt-2 text-sm text-muted-foreground space-y-1">
            <li>• Les modifications sont enregistrées immédiatement</li>
            <li>• Désactiver une règle la masque côté utilisateur mais conserve sa valeur</li>
            <li>• Toutes les modifications sont enregistrées dans le journal d'audit</li>
            <li>• Les valeurs min/max empêchent les erreurs de configuration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
