import { MessageSquare, Search, Users, FileText, CheckCircle } from 'lucide-react';

interface MediationWorkflowProps {
  stages?: {
    stage: string;
    count: number;
    color: 'blue' | 'yellow' | 'orange' | 'purple' | 'green';
    description: string;
  }[];
}

export default function MediationWorkflow({ stages }: MediationWorkflowProps) {
  // Étapes par défaut du workflow de médiation
  const defaultStages = [
    {
      stage: 'Réception',
      count: 5,
      color: 'blue' as const,
      description: 'Nouveaux litiges reçus',
    },
    {
      stage: 'Analyse',
      count: 8,
      color: 'yellow' as const,
      description: "En cours d'analyse",
    },
    {
      stage: 'Négociation',
      count: 6,
      color: 'orange' as const,
      description: 'Discussions en cours',
    },
    {
      stage: 'Proposition',
      count: 4,
      color: 'purple' as const,
      description: 'Propositions envoyées',
    },
    {
      stage: 'Résolution',
      count: 12,
      color: 'green' as const,
      description: 'Accords trouvés',
    },
  ];

  const workflowStages = stages || defaultStages;

  const getStageIcon = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'réception':
        return MessageSquare;
      case 'analyse':
        return Search;
      case 'négociation':
        return Users;
      case 'proposition':
        return FileText;
      case 'résolution':
        return CheckCircle;
      default:
        return FileText;
    }
  };

  const getColorClasses = (color: string) => {
    const classes: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      green: 'bg-green-50 border-green-200 text-green-800',
    };
    return classes[color] || classes['blue'];
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-blue-600" />
        Workflow de Médiation
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {workflowStages.map((stage, index) => {
          const Icon = getStageIcon(stage.stage);
          return (
            <div key={stage.stage} className="relative">
              <div
                className={`p-4 rounded-lg border-2 ${getColorClasses(stage.color)} text-center transition-all hover:shadow-md`}
              >
                <Icon className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-medium mb-1">{stage.stage}</p>
                <p className="text-2xl font-bold mb-1">{stage.count}</p>
                <p className="text-xs opacity-75">{stage.description}</p>
              </div>

              {/* Flèche de connexion */}
              {index < workflowStages.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                  <div className="w-4 h-0.5 bg-gray-300"></div>
                  <div className="absolute right-0 top-0 transform -translate-y-1/2 translate-x-1">
                    <div className="w-0 h-0 border-l-[4px] border-l-gray-300 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent"></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende du workflow */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>🟦 Nouveau</span>
          <span>🟨 En cours</span>
          <span>🟧 Négociation</span>
          <span>🟪 Proposition</span>
          <span>🟩 Résolu</span>
        </div>
      </div>
    </div>
  );
}
