import { Shield, Award, Heart, Star, TrendingUp, CheckCircle, Lock } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  earned: boolean;
  color: string;
}

interface AchievementBadgesProps {
  oneciVerified: boolean;
  faceVerified: boolean;
  tenantScore: number;
  paymentCount?: number;
  className?: string;
}

export default function AchievementBadges({
  oneciVerified,
  faceVerified,
  tenantScore,
  paymentCount = 0,
  className = '',
}: AchievementBadgesProps) {
  const achievements: Achievement[] = [
    {
      id: 'identity_verified',
      title: 'Identité Vérifiée',
      description: 'CNI validée par ONECI',
      icon: Shield,
      earned: oneciVerified,
      color: 'from-green-400 to-emerald-500',
    },
    {
      id: 'face_confirmed',
      title: 'Visage Confirmé',
      description: 'Vérification biométrique réussie',
      icon: CheckCircle,
      earned: faceVerified,
      color: 'from-purple-400 to-pink-500',
    },
    {
      id: 'trusted_tenant',
      title: 'Locataire de Confiance',
      description: 'Score supérieur à 70',
      icon: Star,
      earned: tenantScore >= 70,
      color: 'from-yellow-400 to-orange-500',
    },
    {
      id: 'reliable_payer',
      title: 'Payeur Fiable',
      description: '5+ paiements à temps',
      icon: TrendingUp,
      earned: paymentCount >= 5,
      color: 'from-teal-400 to-green-500',
    },
    {
      id: 'five_stars',
      title: 'Cinq Étoiles',
      description: 'Excellente réputation',
      icon: Award,
      earned: tenantScore >= 90,
      color: 'from-amber-400 to-yellow-500',
    },
  ];

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Badges d'Excellence</h3>
        <span className="text-sm font-bold text-terracotta-600">
          {earnedCount}/{achievements.length} obtenus
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {achievements.map((achievement) => {
          const Icon = achievement.icon;

          return (
            <div
              key={achievement.id}
              className={`
                relative group rounded-xl p-4 text-center transition-all duration-200
                ${
                  achievement.earned
                    ? 'bg-gradient-to-br ' +
                      achievement.color +
                      ' text-white shadow-md hover:shadow-xl transform hover:-translate-y-1'
                    : 'bg-gray-100 text-gray-400'
                }
              `}
            >
              <div className="flex flex-col items-center space-y-2">
                <div
                  className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  ${achievement.earned ? 'bg-white/20' : 'bg-gray-200'}
                `}
                >
                  {achievement.earned ? <Icon className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                </div>
                <div>
                  <p className="font-bold text-sm">{achievement.title}</p>
                  <p className="text-xs opacity-80 mt-1">{achievement.description}</p>
                </div>
              </div>

              {achievement.earned && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {earnedCount < achievements.length && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800 text-center">
            Continuez à compléter vos vérifications pour débloquer plus de badges!
          </p>
        </div>
      )}
    </div>
  );
}
