import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Database, Users, Home, CreditCard, FileText, Download, Play, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/shared/ui/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUserRoles } from '@/hooks/shared/useUserRoles';

// Types pour les options de génération
interface GenerationOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultCount: number;
  maxCount: number;
}

interface GenerationProgress {
  total: number;
  completed: number;
  currentStep: string;
  isComplete: boolean;
}

export default function TestDataGeneratorPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  // États
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({
    users: 10,
    properties: 5,
    transactions: 20,
    contracts: 5,
    logs: 50,
  });
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [includeRelationships, setIncludeRelationships] = useState(true);
  const [clearExisting, setClearExisting] = useState(false);

  // Options de génération
  const generationOptions: GenerationOption[] = [
    {
      id: 'users',
      label: 'Utilisateurs',
      description: 'Génère des utilisateurs avec différents rôles et profils',
      icon: Users,
      defaultCount: 10,
      maxCount: 1000,
    },
    {
      id: 'properties',
      label: 'Propriétés',
      description: 'Crée des propriétés avec images et détails',
      icon: Home,
      defaultCount: 5,
      maxCount: 500,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      description: 'Génère des transactions financières',
      icon: CreditCard,
      defaultCount: 20,
      maxCount: 10000,
    },
    {
      id: 'contracts',
      label: 'Contrats',
      description: 'Crée des contrats de location',
      icon: FileText,
      defaultCount: 5,
      maxCount: 1000,
    },
    {
      id: 'logs',
      label: 'Journaux',
      description: 'Génère des journaux système et d\'activité',
      icon: Database,
      defaultCount: 50,
      maxCount: 100000,
    },
  ];

  // Mutation pour générer des données (simulée)
  const generateMutation = useMutation({
    mutationFn: async (options: Record<string, number>) => {
      // Simulation d'une génération
      return new Promise<void>((resolve) => {
        const totalSteps = Object.keys(options.selectedOptions).length;
        let completed = 0;

        const interval = setInterval(() => {
          completed++;
          const progress = {
            total: totalSteps,
            completed,
            currentStep: generationOptions[completed - 1]?.label || 'Terminé',
            isComplete: completed >= totalSteps,
          };
          setGenerationProgress(progress);

          if (completed >= totalSteps) {
            clearInterval(interval);
            resolve();
          }
        }, 1000);
      });
    },
    onSuccess: () => {
      toast.success('Données de test générées avec succès');
      setGenerationProgress(null);
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la génération: ${error.message}`);
      setGenerationProgress(null);
    },
  });

  // Redirection si non admin
  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      navigate('/admin/tableau-de-bord');
    }
  }, [isAdmin, rolesLoading, navigate]);

  // Gestionnaires
  const handleCountChange = (optionId: string, count: number) => {
    const option = generationOptions.find(o => o.id === optionId);
    if (!option) return;

    const clampedCount = Math.max(1, Math.min(count, option.maxCount));
    setSelectedOptions(prev => ({ ...prev, [optionId]: clampedCount }));
  };

  const handleSelectAll = () => {
    const allOptions: Record<string, number> = {};
    generationOptions.forEach(option => {
      allOptions[option.id] = option.defaultCount;
    });
    setSelectedOptions(allOptions);
  };

  const handleDeselectAll = () => {
    setSelectedOptions({});
  };

  const handleGenerate = () => {
    const selectedCount = Object.keys(selectedOptions).length;
    if (selectedCount === 0) {
      toast.error('Sélectionnez au moins un type de données à générer');
      return;
    }

    if (clearExisting) {
      if (!confirm('ATTENTION: Cette action va supprimer toutes les données existantes. Continuer ?')) {
        return;
      }
    }

    const totalItems = Object.values(selectedOptions).reduce((sum, count) => sum + count, 0);
    if (totalItems > 10000) {
      toast.error('Le nombre total d\'éléments ne peut pas dépasser 10 000');
      return;
    }

    generateMutation.mutate({
      selectedOptions,
      includeRelationships,
      clearExisting,
    });
  };

  const handleExport = () => {
    const data = {
      selectedOptions,
      includeRelationships,
      clearExisting,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `test_data_config_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Configuration exportée avec succès');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCancel = () => {
    if (generationProgress && !generationProgress.isComplete) {
      if (confirm('Annuler la génération en cours ?')) {
        setGenerationProgress(null);
        generateMutation.reset();
      }
    }
  };

  // Statistiques
  const stats = {
    selectedTypes: Object.keys(selectedOptions).length,
    totalItems: Object.values(selectedOptions).reduce((sum, count) => sum + count, 0),
    estimatedTime: Math.ceil(Object.values(selectedOptions).reduce((sum, count) => sum + count, 0) / 100),
  };

  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#F16522] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="w-full">
        {/* En-tête */}
        <AdminPageHeader
          title="Générateur de données de test"
          description="Générez des données de test réalistes pour le développement et les tests"
          icon={Database}
          breadcrumbs={[
            { label: 'Administration', href: '/admin/tableau-de-bord' },
            { label: 'Générateur' },
          ]}
          actions={
            <div className="flex gap-3">
              <Button
                onClick={handleExport}
                className="flex items-center gap-2 border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] bg-white"
              >
                <Download className="w-4 h-4" />
                Exporter config
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || Object.keys(selectedOptions).length === 0}
                className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white"
              >
                <Play className="w-4 h-4" />
                Générer
              </Button>
            </div>
          }
        />

        {/* Avertissement */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-yellow-800">Attention</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Cette fonctionnalité est destinée aux environnements de développement et de test uniquement.
                Les données générées sont fictives et ne doivent pas être utilisées en production.
              </p>
            </div>
          </div>
        </div>

        {/* Options de génération */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {generationOptions.map((option) => {
            const Icon = option.icon;
            const count = selectedOptions[option.id] || 0;
            const isSelected = count > 0;

            return (
              <div
                key={option.id}
                className={`bg-white rounded-2xl border ${isSelected ? 'border-[#F16522]' : 'border-[#EFEBE9]'} p-6 transition-colors`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${isSelected ? 'bg-[#FFF5F0]' : 'bg-[#FAF7F4]'}`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-[#F16522]' : 'text-[#6B5A4E]'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2C1810]">{option.label}</h3>
                      <p className="text-sm text-[#6B5A4E]">{option.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCountChange(option.id, isSelected ? 0 : option.defaultCount)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${isSelected ? 'bg-[#F16522] text-white' : 'bg-[#EFEBE9] text-[#6B5A4E]'}`}
                  >
                    {isSelected ? 'Sélectionné' : 'Sélectionner'}
                  </button>
                </div>

                {isSelected && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-[#2C1810]">Nombre</label>
                        <span className="text-sm text-[#6B5A4E]">
                          {count} / {option.maxCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleCountChange(option.id, count - 1)}
                          disabled={count <= 1}
                          className="w-8 h-8 flex items-center justify-center bg-[#EFEBE9] rounded-lg disabled:opacity-50"
                        >
                          -
                        </button>
                        <Input
                          type="number"
                          value={count}
                          onChange={(e) => handleCountChange(option.id, parseInt(e.target.value) || 0)}
                          min={1}
                          max={option.maxCount}
                          className="text-center"
                        />
                        <button
                          onClick={() => handleCountChange(option.id, count + 1)}
                          disabled={count >= option.maxCount}
                          className="w-8 h-8 flex items-center justify-center bg-[#EFEBE9] rounded-lg disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCountChange(option.id, 10)}
                        className="flex-1 px-3 py-2 bg-[#FAF7F4] text-[#6B5A4E] rounded-lg text-sm hover:bg-[#EFEBE9]"
                      >
                        10
                      </button>
                      <button
                        onClick={() => handleCountChange(option.id, 50)}
                        className="flex-1 px-3 py-2 bg-[#FAF7F4] text-[#6B5A4E] rounded-lg text-sm hover:bg-[#EFEBE9]"
                      >
                        50
                      </button>
                      <button
                        onClick={() => handleCountChange(option.id, 100)}
                        className="flex-1 px-3 py-2 bg-[#FAF7F4] text-[#6B5A4E] rounded-lg text-sm hover:bg-[#EFEBE9]"
                      >
                        100
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Options avancées */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6 mb-8">
          <h3 className="text-lg font-bold text-[#2C1810] mb-4">Options avancées</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[#2C1810]">Inclure les relations</h4>
                  <p className="text-sm text-[#6B5A4E]">
                    Crée des relations entre les données (utilisateurs → propriétés → contrats)
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRelationships}
                    onChange={(e) => setIncludeRelationships(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F16522]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[#2C1810]">Supprimer les données existantes</h4>
                  <p className="text-sm text-[#6B5A4E]">
                    Efface toutes les données avant de générer les nouvelles
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearExisting}
                    onChange={(e) => setClearExisting(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>

            <div className="bg-[#FAF7F4] rounded-xl p-4">
              <h4 className="font-medium text-[#2C1810] mb-3">Résumé</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#6B5A4E]">Types sélectionnés:</span>
                  <span className="font-medium">{stats.selectedTypes} / {generationOptions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B5A4E]">Total éléments:</span>
                  <span className="font-medium">{stats.totalItems.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B5A4E]">Temps estimé:</span>
                  <span className="font-medium">~{stats.estimatedTime} secondes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B5A4E]">Relations:</span>
                  <span className="font-medium">{includeRelationships ? 'Oui' : 'Non'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions globales */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            onClick={handleSelectAll}
            className="border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] bg-white"
          >
            Tout sélectionner
          </Button>
          <Button
            onClick={handleDeselectAll}
            className="border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] bg-white"
          >
            Tout désélectionner
          </Button>
        </div>

        {/* Guide d'utilisation */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
          <h3 className="text-lg font-bold text-[#2C1810] mb-4">Guide d'utilisation</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-[#EFEBE9] rounded-full flex items-center justify-center text-sm font-bold text-[#2C1810]">
                1
              </div>
              <div>
                <p className="font-medium text-[#2C1810]">Sélectionnez les types de données</p>
                <p className="text-sm text-[#6B5A4E]">
                  Cochez les cases pour sélectionner les types de données à générer
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-[#EFEBE9] rounded-full flex items-center justify-center text-sm font-bold text-[#2C1810]">
                2
              </div>
              <div>
                <p className="font-medium text-[#2C1810]">Ajustez les quantités</p>
                <p className="text-sm text-[#6B5A4E]">
                  Utilisez les boutons + et - ou entrez directement les quantités
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-[#EFEBE9] rounded-full flex items-center justify-center text-sm font-bold text-[#2C1810]">
                3
              </div>
              <div>
                <p className="font-medium text-[#2C1810]">Générez les données</p>
                <p className="text-sm text-[#6B5A4E]">
                  Cliquez sur le bouton Générer pour créer les données de test
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
