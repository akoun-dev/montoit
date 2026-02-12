import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  User,
  FileCheck,
  CheckCircle,
  XCircle,
  TrendingUp,
  Award,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { ScoringService, ScoreBreakdown, TENANT_SCORING_WEIGHTS } from '@/services/scoringService';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import Button from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import TrustScoreCard from '@/shared/ui/TrustScoreCard';

const ScorePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScore = async () => {
      if (!user?.id) return;

      try {
        const breakdown = await ScoringService.calculateGlobalTrustScore(user.id);
        if (breakdown.globalScore === 0 && profile) {
          const verificationTotal =
            TENANT_SCORING_WEIGHTS.facial + TENANT_SCORING_WEIGHTS.oneci;
          const profileResult = ScoringService.calculateProfileScore(profile);
          const profileComplete = ScoringService.isProfileComplete(profileResult.details);
          const facialVerified = profile.facial_verification_status === 'verified';
          const oneciVerified = !!profile.oneci_verified;

          const { data: approvedDossier } = await supabase
            .from('verification_applications')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .maybeSingle();
          const dossierApproved = !!approvedDossier;

          const profileContribution = profileComplete ? TENANT_SCORING_WEIGHTS.profileComplete : 0;
          const facialContribution = facialVerified ? TENANT_SCORING_WEIGHTS.facial : 0;
          const oneciContribution = oneciVerified ? TENANT_SCORING_WEIGHTS.oneci : 0;
          const dossierContribution = dossierApproved ? TENANT_SCORING_WEIGHTS.dossier : 0;

          const verificationScore = Math.round(
            ((facialContribution + oneciContribution) / verificationTotal) * 100
          );
          const historyScore = dossierApproved ? 100 : 0;
          const globalScore =
            profileContribution + facialContribution + oneciContribution + dossierContribution;

          const recommendation =
            globalScore >= 70 ? 'approved' : globalScore >= 50 ? 'conditional' : 'rejected';

          setScoreBreakdown({
            profileScore: profileComplete ? 100 : 0,
            verificationScore,
            historyScore,
            globalScore,
            recommendation,
            details: {
              profile: profileResult.details,
              verification: {
                oneci: oneciVerified,
                facial: facialVerified,
                dossier: dossierApproved,
                total: verificationScore,
              },
              history: {
                paymentReliability: historyScore,
                propertyCondition: historyScore,
                leaseCompliance: historyScore,
                total: historyScore,
              },
            },
          });
          return;
        }

        setScoreBreakdown(breakdown);
      } catch (error) {
        console.error('Error loading score:', error);
        if (profile) {
          const verificationTotal =
            TENANT_SCORING_WEIGHTS.facial + TENANT_SCORING_WEIGHTS.oneci;
          const profileResult = ScoringService.calculateProfileScore(profile);
          const profileComplete = ScoringService.isProfileComplete(profileResult.details);
          const facialVerified = profile.facial_verification_status === 'verified';
          const oneciVerified = !!profile.oneci_verified;

          const profileContribution = profileComplete ? TENANT_SCORING_WEIGHTS.profileComplete : 0;
          const facialContribution = facialVerified ? TENANT_SCORING_WEIGHTS.facial : 0;
          const oneciContribution = oneciVerified ? TENANT_SCORING_WEIGHTS.oneci : 0;

          const verificationScore = Math.round(
            ((facialContribution + oneciContribution) / verificationTotal) * 100
          );
          const globalScore = profileContribution + facialContribution + oneciContribution;
          const recommendation =
            globalScore >= 70 ? 'approved' : globalScore >= 50 ? 'conditional' : 'rejected';

          setScoreBreakdown({
            profileScore: profileComplete ? 100 : 0,
            verificationScore,
            historyScore: 0,
            globalScore,
            recommendation,
            details: {
              profile: profileResult.details,
              verification: {
                oneci: oneciVerified,
                facial: facialVerified,
                dossier: false,
                total: verificationScore,
              },
              history: {
                paymentReliability: 0,
                propertyCondition: 0,
                leaseCompliance: 0,
                total: 0,
              },
            },
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadScore();
  }, [user?.id, profile]);

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
    { key: 'fullName', label: 'Nom complet' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'city', label: 'Ville' },
    { key: 'address', label: 'Adresse' },
    { key: 'gender', label: 'Genre' },
  ];

  const verificationItems = [
    {
      key: 'oneci',
      label: 'Vérification ONECI',
      points: TENANT_SCORING_WEIGHTS.oneci,
      description: "Carte d'identité nationale",
    },
    {
      key: 'facial',
      label: 'NEOFACE',
      points: TENANT_SCORING_WEIGHTS.facial,
      description: 'Vérification biométrique',
    },
  ];

  const profileComplete = ScoringService.isProfileComplete(details.profile);
  const missingVerificationPoints =
    (details.verification.facial ? 0 : TENANT_SCORING_WEIGHTS.facial) +
    (details.verification.oneci ? 0 : TENANT_SCORING_WEIGHTS.oneci);

  return (
    <div>
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
                  {!profileComplete && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Compléter le profil</span>
                        </div>
                        <Badge variant="secondary">
                          +{TENANT_SCORING_WEIGHTS.profileComplete}%
                        </Badge>
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
                          <span className="font-medium text-sm">Vérifications</span>
                        </div>
                        <Badge variant="secondary">+{missingVerificationPoints}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        ONECI ({TENANT_SCORING_WEIGHTS.oneci}%) + NEOFACE (
                        {TENANT_SCORING_WEIGHTS.facial}%)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => navigate('/locataire/verification-oneci')}
                          className="w-full text-xs"
                        >
                          ONECI
                        </Button>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => navigate('/verification-biometrique?reset=true')}
                          className="w-full text-xs"
                        >
                          Reconnaissance faciale
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Dossier locataire */}
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-sm text-orange-900">
                          Dossier locataire
                        </span>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                        +{TENANT_SCORING_WEIGHTS.dossier}%
                      </Badge>
                    </div>
                    <p className="text-sm text-orange-700 mb-2">
                      Dossier locataire validé = +{TENANT_SCORING_WEIGHTS.dossier}% sur votre score
                    </p>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => navigate('/locataire/profil?tab=dossier')}
                      className="w-full bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-300"
                    >
                      Commencer la vérification du dossier locataire
                    </Button>
                  </div>
                </>
              )}

              {scoreBreakdown.globalScore >= 100 && (
                <div className="text-center py-4">
                  <Award className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="font-medium text-green-600">Score parfait !</p>
                  <p className="text-sm text-muted-foreground">
                    Félicitations ! Vous avez atteint le score maximum
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
            <div className="mb-3 text-sm text-muted-foreground">
              Profil complet = <strong>+{TENANT_SCORING_WEIGHTS.profileComplete}%</strong>
            </div>
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
                      {isComplete ? 'Renseigné' : 'Requis'}
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
                        <span className="text-green-600">+{item.points}% obtenus</span>
                      ) : (
                        <span className="text-muted-foreground">{item.points}% disponibles</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Dossier locataire */}
            <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-orange-900">Dossier locataire</span>
                  <p className="text-sm text-orange-700">
                    Dossier locataire validé par nos services
                  </p>
                </div>
                <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                  +{TENANT_SCORING_WEIGHTS.dossier}%
                </Badge>
              </div>
              <p className="text-xs text-orange-600">
                Si votre dossier est approuvé, vous gagnez +{TENANT_SCORING_WEIGHTS.dossier}% sur
                votre score
              </p>
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
              Le Trust Score locataire est calculé à partir de 4 composantes :
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 mt-3">
              <li>
                <strong>Profil complet ({TENANT_SCORING_WEIGHTS.profileComplete}%)</strong> : Toutes
                les informations requises du profil sont renseignées.
              </li>
              <li>
                <strong>NEOFACE ({TENANT_SCORING_WEIGHTS.facial}%)</strong> : Vérification
                biométrique.
              </li>
              <li>
                <strong>Vérification ONECI ({TENANT_SCORING_WEIGHTS.oneci}%)</strong> : CNI
                authentifiée.
              </li>
              <li>
                <strong>Dossier locataire validé ({TENANT_SCORING_WEIGHTS.dossier}%)</strong> :
                Dossier locataire approuvé.
              </li>
            </ul>
            <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-900">
                <strong>🎯 Dossier locataire validé :</strong> vous gagnez automatiquement
                <span className="font-bold text-orange-600">
                  {' '}
                  +{TENANT_SCORING_WEIGHTS.dossier}%
                </span>
                .
              </p>
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>💡 Astuce :</strong> Profil complet + Facial + ONECI + Dossier locataire
                validé = <span className="font-bold text-blue-600">100%</span>.
              </p>
            </div>
            <div className="mt-4 p-3 bg-primary/5 rounded-lg">
              <p className="text-sm">
                <strong>Recommandation :</strong> Un score de 70+ vous donne le statut "Approuvé",
                50-69 "Sous conditions", et moins de 50 "Non recommandé".
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScorePage;
