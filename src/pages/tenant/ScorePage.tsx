import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  User,
  FileCheck,
  History,
  CheckCircle,
  XCircle,
  TrendingUp,
  Award,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { ScoringService, ScoreBreakdown } from '@/services/scoringService';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import Button from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import TrustScoreCard from '@/shared/ui/TrustScoreCard';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';

const ScorePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScore = async () => {
      if (!user?.id) return;

      try {
        const breakdown = await ScoringService.calculateGlobalTrustScore(user.id);
        setScoreBreakdown(breakdown);
      } catch (error) {
        console.error('Error loading score:', error);
      } finally {
        setLoading(false);
      }
    };

    loadScore();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="w-full px-4 py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!scoreBreakdown) {
    return (
      <div className="w-full px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Impossible de charger votre score</h2>
          <p className="text-muted-foreground mb-4">
            Veuillez vous connecter pour voir votre Trust Score
          </p>
          <Button onClick={() => navigate('/connexion')}>Se connecter</Button>
        </div>
      </div>
    );
  }

  const { details } = scoreBreakdown;

  const profileItems = [
    { key: 'fullName', label: 'Nom complet', points: 15 },
    { key: 'phone', label: 'Téléphone', points: 15 },
    { key: 'city', label: 'Ville', points: 15 },
    { key: 'bio', label: 'Biographie', points: 15 },
    { key: 'avatar', label: 'Photo de profil', points: 20 },
    { key: 'address', label: 'Adresse', points: 20 },
  ];

  const verificationItems = [
    { key: 'oneci', label: 'Vérification ONECI', points: 30, description: 'Identité nationale' },
    {
      key: 'facial',
      label: 'Vérification faciale',
      points: 25,
      description: 'Reconnaissance faciale',
    },
    {
      key: 'ansut',
      label: 'Certification ANSUT',
      points: 20,
      description: 'Certification officielle',
    },
  ];

  return (
    <TenantDashboardLayout title="Mon Score">
      <div className="w-full">
        {/* Header Banner */}
        <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center flex-shrink-0">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Mon Score</h1>
              <p className="text-[#E8D4C5] mt-1">
                Votre score de confiance détermine vos chances d'obtenir une location
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Carte du score principal */}
          <TrustScoreCard scoreBreakdown={scoreBreakdown} showDetails={true} />

          {/* Actions recommandées */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Améliorez votre score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scoreBreakdown.globalScore < 100 && (
                <>
                  {/* Profil incomplet */}
                  {scoreBreakdown.profileScore < 100 && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Compléter le profil</span>
                        </div>
                        <Badge variant="secondary">+{100 - scoreBreakdown.profileScore} pts</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Ajoutez les informations manquantes à votre profil
                      </p>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => navigate('/locataire/profil')}
                        className="w-full"
                      >
                        Modifier le profil
                      </Button>
                    </div>
                  )}

                  {/* Vérifications manquantes */}
                  {scoreBreakdown.verificationScore < 100 && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Ajouter des vérifications</span>
                        </div>
                        <Badge variant="secondary">
                          +{100 - scoreBreakdown.verificationScore} pts
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Vérifiez votre identité pour gagner la confiance des propriétaires
                      </p>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => navigate('/verification')}
                        className="w-full"
                      >
                        Lancer une vérification
                      </Button>
                    </div>
                  )}

                  {/* Historique */}
                  {scoreBreakdown.historyScore < 70 && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            Déclarer vos locations passées
                          </span>
                        </div>
                        <Badge variant="secondary">+5 à +50 pts</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Ajoutez vos locations passées pour améliorer votre score d'historique
                      </p>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => navigate('/profil/historique-locations')}
                        className="w-full"
                      >
                        Ajouter mon historique
                      </Button>
                    </div>
                  )}
                </>
              )}

              {scoreBreakdown.globalScore >= 70 && (
                <div className="text-center py-4">
                  <Award className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="font-medium text-green-600">Excellent score !</p>
                  <p className="text-sm text-muted-foreground">
                    Vous avez un profil de confiance élevé
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Détail du score de profil */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Score de Profil - Détail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profileItems.map((item) => {
                const isComplete = details.profile[item.key as keyof typeof details.profile];
                return (
                  <div
                    key={item.key}
                    className={`p-3 rounded-lg border ${
                      isComplete ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      {isComplete ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isComplete ? `+${item.points} points` : `${item.points} points disponibles`}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Détail du score de vérification */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck className="h-5 w-5 text-primary" />
              Score de Vérification - Détail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {verificationItems.map((item) => {
                const isVerified =
                  details.verification[item.key as keyof typeof details.verification];
                return (
                  <div
                    key={item.key}
                    className={`p-4 rounded-lg border ${
                      isVerified ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{item.label}</span>
                      {isVerified ? (
                        <Badge variant="success">Vérifié</Badge>
                      ) : (
                        <Badge variant="secondary">Non vérifié</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <p className="text-xs mt-2">
                      {isVerified ? (
                        <span className="text-green-600">+{item.points} points obtenus</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {item.points} points disponibles
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Explication du système */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-primary" />
              Comment fonctionne le Trust Score ?
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-muted-foreground">
              Le Trust Score est calculé à partir de trois composantes pondérées :
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 mt-3">
              <li>
                <strong>Score de Profil (20%)</strong> : Basé sur la complétude de votre profil
                (nom, téléphone, adresse, photo, etc.)
              </li>
              <li>
                <strong>Score de Vérification (40%)</strong> : Basé sur les vérifications
                officielles (ONECI, CNAM, reconnaissance faciale, ANSUT)
              </li>
              <li>
                <strong>Score d'Historique (40%)</strong> : Basé sur vos locations précédentes et
                les évaluations des propriétaires
              </li>
            </ul>
            <div className="mt-4 p-3 bg-primary/5 rounded-lg">
              <p className="text-sm">
                <strong>Recommandation :</strong> Un score de 70+ vous donne le statut "Approuvé",
                50-69 "Sous conditions", et moins de 50 "Non recommandé".
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TenantDashboardLayout>
  );
};

export default ScorePage;
