/**
 * FeatureFlagsPage - Page de gestion des Feature Flags
 *
 * Permet de créer, modifier et gérer les feature flags pour déploiement progressif
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Plus,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  History,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  SlidersHorizontal,
  Users,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { useManageFeatureFlags } from '@/features/admin/hooks/useFeatureFlags';
import type { FeatureFlagWithStats, FlagType } from '@/features/admin/services/featureFlags.service';
import { AdminPageHeader } from '@/shared/ui/admin';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { FormatService } from '@/services/format/formatService';

// Composant Modal pour créer/éditer un flag
function FeatureFlagModal({
  flag,
  onSave,
  onCancel,
}: {
  flag?: FeatureFlagWithStats;
  onSave: (data: {
    name: string;
    description: string;
    flag_type: FlagType;
    rollout_percentage: number;
    is_active: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: flag?.name || '',
    description: flag?.description || '',
    flag_type: flag?.flag_type || 'boolean' as FlagType,
    rollout_percentage: flag?.rollout_percentage || 0,
    is_active: flag?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const flagTypes: { value: FlagType; label: string; description: string }[] = [
    {
      value: 'boolean',
      label: 'Booléen',
      description: 'Activé ou désactivé pour tout le monde',
    },
    {
      value: 'percentage',
      label: 'Pourcentage',
      description: 'Activé pour X% des utilisateurs',
    },
    {
      value: 'multivariate',
      label: 'Multivarié',
      description: 'Plusieurs variantes avec distribution',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEBE9]">
          <h2 className="text-xl font-bold text-[#2C1810]">
            {flag ? 'Modifier le Feature Flag' : 'Nouveau Feature Flag'}
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-[#FAF7F4] rounded-lg">
            <XCircle className="w-5 h-5 text-[#6B5A4E]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">
              Nom du flag <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: new_verification_flow"
              required
              disabled={!!flag}
              className="w-full"
            />
            {flag && (
              <p className="text-xs text-[#6B5A4E] mt-1">Le nom ne peut pas être modifié</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez ce feature flag..."
              rows={3}
              className="w-full px-3 py-2 border border-[#EFEBE9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F16522]"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {flagTypes.map((type) => (
                <label
                  key={type.value}
                  className={cn(
                    'flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors',
                    formData.flag_type === type.value
                      ? 'border-[#F16522] bg-[#FFF5F0]'
                      : 'border-[#EFEBE9] hover:border-[#F16522]'
                  )}
                >
                  <input
                    type="radio"
                    name="flag_type"
                    value={type.value}
                    checked={formData.flag_type === type.value}
                    onChange={(e) => setFormData({ ...formData, flag_type: e.target.value as FlagType })}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-[#2C1810]">{type.label}</p>
                    <p className="text-xs text-[#6B5A4E]">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Rollout percentage (pour percentage et multivariate) */}
          {(formData.flag_type === 'percentage' || formData.flag_type === 'multivariate') && (
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-1">
                Pourcentage de rollout <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.rollout_percentage}
                  onChange={(e) => setFormData({ ...formData, rollout_percentage: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-[#EFEBE9] rounded-full appearance-none cursor-pointer accent-[#F16522]"
                />
                <span className="w-16 text-center font-medium text-[#2C1810]">
                  {formData.rollout_percentage}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#6B5A4E] mt-1">
                <span>Désactivé (0%)</span>
                <span>Tout le monde (100%)</span>
              </div>
            </div>
          )}

          {/* Actif */}
          <div className="flex items-center justify-between p-3 bg-[#FAF7F4] rounded-xl">
            <div className="flex items-center gap-2">
              {formData.is_active ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400" />
              )}
              <span className="font-medium text-[#2C1810]">
                {formData.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#F16522] focus:ring-offset-2',
                formData.is_active ? 'bg-[#F16522]' : 'bg-gray-300'
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
                  formData.is_active ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#EFEBE9]">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="px-4 py-2"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={saving || !formData.name.trim()}
            className="px-4 py-2 bg-[#F16522] hover:bg-[#d9571d] text-white"
          >
            {saving ? 'Enregistrement...' : flag ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FeatureFlagsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const {
    flags,
    isLoading,
    refetch,
    createFlag,
    updateFlag,
    deleteFlag,
    toggleFlag,
    updateRollout,
  } = useManageFeatureFlags();

  const [showModal, setShowModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlagWithStats | undefined>();
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);

  // Redirection si non admin
  if (!isAdmin) {
    navigate('/admin/tableau-de-bord');
    return null;
  }

  const handleCreate = async (data: {
    name: string;
    description: string;
    flag_type: FlagType;
    rollout_percentage: number;
    is_active: boolean;
  }) => {
    try {
      await createFlag(data);
      toast.success('Feature flag créé avec succès');
      setShowModal(false);
    } catch (error: unknown) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdate = async (data: {
    name: string;
    description: string;
    flag_type: FlagType;
    rollout_percentage: number;
    is_active: boolean;
  }) => {
    if (!editingFlag) return;
    try {
      await updateFlag(editingFlag.id, data);
      toast.success('Feature flag mis à jour');
      setShowModal(false);
      setEditingFlag(undefined);
    } catch (error: unknown) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (flagId: string, flagName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le feature flag "${flagName}" ?`)) {
      return;
    }

    try {
      await deleteFlag(flagId);
      toast.success('Feature flag supprimé');
    } catch (error: unknown) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleToggle = async (flagId: string, currentState: boolean) => {
    try {
      await toggleFlag(flagId, !currentState);
      toast.success(`Feature flag ${!currentState ? 'activé' : 'désactivé'}`);
    } catch (error: unknown) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRolloutChange = async (flagId: string, newPercentage: number) => {
    try {
      await updateRollout(flagId, newPercentage);
      toast.success(`Rollout mis à jour: ${newPercentage}%`);
    } catch (error: unknown) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getFlagTypeIcon = (type: FlagType) => {
    switch (type) {
      case 'boolean':
        return <ToggleLeft className="w-4 h-4" />;
      case 'percentage':
        return <SlidersHorizontal className="w-4 h-4" />;
      case 'multivariate':
        return <Users className="w-4 h-4" />;
    }
  };

  const getFlagTypeColor = (type: FlagType) => {
    switch (type) {
      case 'boolean':
        return 'bg-blue-100 text-blue-700';
      case 'percentage':
        return 'bg-purple-100 text-purple-700';
      case 'multivariate':
        return 'bg-green-100 text-green-700';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#F16522] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <AdminPageHeader
          title="Feature Flags"
          description="Gérez les fonctionnalités activées selon les utilisateurs et le contexte"
          icon={Settings}
          onRefresh={() => refetch()}
          refreshing={isLoading}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Feature Flags' },
          ]}
          actions={
            <Button
              onClick={() => {
                setEditingFlag(undefined);
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white"
            >
              <Plus className="w-4 h-4" />
              Nouveau Flag
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Total Flags</p>
            <p className="text-2xl font-bold text-[#2C1810]">{flags.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Actifs</p>
            <p className="text-2xl font-bold text-green-600">
              {flags.filter((f) => f.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Inactifs</p>
            <p className="text-2xl font-bold text-gray-600">
              {flags.filter((f) => !f.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Rollout Moyen</p>
            <p className="text-2xl font-bold text-[#F16522]">
              {flags.length > 0
                ? Math.round(flags.reduce((sum, f) => sum + f.rollout_percentage, 0) / flags.length)
                : 0}%
            </p>
          </div>
        </div>

        {/* Flags List */}
        {flags.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-12 text-center">
            <Globe className="w-16 h-16 text-[#EFEBE9] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#2C1810] mb-2">Aucun Feature Flag</h3>
            <p className="text-[#6B5A4E] mb-6">
              Créez votre premier feature flag pour contrôler le déploiement de nouvelles fonctionnalités
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-[#F16522] hover:bg-[#d9571d] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer un Flag
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden"
              >
                {/* Main Row */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#FAF7F4] transition-colors"
                  onClick={() =>
                    setExpandedFlag(expandedFlag === flag.id ? null : flag.id)
                  }
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Type Badge */}
                    <div className={cn('p-2 rounded-lg', getFlagTypeColor(flag.flag_type))}>
                      {getFlagTypeIcon(flag.flag_type)}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#2C1810]">{flag.name}</h3>
                        {flag.is_active ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      {flag.description && (
                        <p className="text-sm text-[#6B5A4E] mt-0.5">{flag.description}</p>
                      )}
                    </div>

                    {/* Stats Badge */}
                    <div className="flex items-center gap-3 text-xs">
                      {flag.flag_type !== 'boolean' && (
                        <span className="px-2 py-1 bg-[#FAF7F4] text-[#6B5A4E] rounded-full">
                          {FormatService.formatPercentage(flag.rollout_percentage)} rollout
                        </span>
                      )}
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                        {flag.evaluations_last_7_days || 0} évals/7j
                      </span>
                      {flag.flag_type === 'multivariate' && flag.variants_count > 0 && (
                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full">
                          {flag.variants_count} variantes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-[#6B5A4E] transition-transform',
                      expandedFlag === flag.id && 'transform rotate-180'
                    )}
                  />
                </div>

                {/* Expanded Content */}
                {expandedFlag === flag.id && (
                  <div className="border-t border-[#EFEBE9] p-4 bg-[#FAF7F4]">
                    {/* Rollout Control for percentage/multivariate */}
                    {(flag.flag_type === 'percentage' || flag.flag_type === 'multivariate') && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[#2C1810]">Rollout Percentage</span>
                          <span className="text-sm font-bold text-[#F16522]">{flag.rollout_percentage}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={flag.rollout_percentage}
                          onChange={(e) => handleRolloutChange(flag.id, parseInt(e.target.value))}
                          className="w-full h-2 bg-[#EFEBE9] rounded-full appearance-none cursor-pointer accent-[#F16522]"
                        />
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          setEditingFlag(flag);
                          setShowModal(true);
                        }}
                        variant="outline"
                        className="flex items-center gap-2 px-3 py-1.5 text-sm"
                      >
                        <Edit className="w-3 h-3" />
                        Modifier
                      </Button>
                      <Button
                        onClick={() => handleToggle(flag.id, flag.is_active)}
                        variant="outline"
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 text-sm',
                          flag.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'
                        )}
                      >
                        {flag.is_active ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Désactiver
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            Activer
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleDelete(flag.id, flag.name)}
                        variant="outline"
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Supprimer
                      </Button>
                    </div>

                    {/* Audit History Link */}
                    <button
                      onClick={() => navigate(`/admin/feature-flags/${flag.id}/history`)}
                      className="mt-3 flex items-center gap-2 text-xs text-[#6B5A4E] hover:text-[#F16522]"
                    >
                      <History className="w-3 h-3" />
                      Voir l'historique
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <FeatureFlagModal
            flag={editingFlag}
            onSave={editingFlag ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowModal(false);
              setEditingFlag(undefined);
            }}
          />
        )}
      </div>
    </div>
  );
}
