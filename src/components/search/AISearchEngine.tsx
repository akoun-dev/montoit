import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Lightbulb, Sparkles, Zap, Target, Compass, Clock, TrendingUp, Search, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MotionDiv } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  preferences: {
    propertyTypes: string[];
    neighborhoods: string[];
    priceRange: { min: number; max: number };
    bedrooms: number;
    furnished: boolean;
  };
  searchHistory: string[];
  viewedProperties: string[];
  favorites: string[];
}

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'property' | 'neighborhood' | 'deal';
  confidence: number;
  reasoning: string;
  propertyCount?: number;
  averagePrice?: number;
  tags: string[];
}

interface AISearchEngineProps {
  onRecommendationSelect: (recommendation: AIRecommendation) => void;
  compact?: boolean;
  showReasoning?: boolean;
}

export const AISearchEngine: React.FC<AISearchEngineProps> = ({
  onRecommendationSelect,
  compact = false,
  showReasoning = true
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState(0);

  // Simulate AI analysis
  const generateRecommendations = async () => {
    setIsGenerating(true);
    setProgress(0);

    // Step 1: Analyze user profile
    setProgress(25);
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 2: Process market data
    setProgress(50);
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 3: Generate recommendations
    setProgress(75);
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 4: Finalize results
    setProgress(100);

    // Mock AI recommendations based on user context
    const mockRecommendations: AIRecommendation[] = [
      {
        id: '1',
        title: 'Appartements de luxe à Cocody',
        description: 'Découvrez des appartements prestigieux avec vue sur lagune, idéaux pour les professionnels',
        type: 'neighborhood',
        confidence: 92,
        reasoning: 'Basé sur vos recherches récentes et votre budget, Cocody correspond parfaitement à vos critères',
        propertyCount: 24,
        averagePrice: 350000,
        tags: ['Luxe', 'Vue lagune', 'Sécurisé', 'Proche commerces']
      },
      {
        id: '2',
        title: 'Opportunités immobilières à Marcory',
        description: 'Investissement rentable avec rendement potentiel de 8-10% annuel',
        type: 'deal',
        confidence: 88,
        reasoning: 'Zone en forte demande avec excellente plus-value potentielle',
        propertyCount: 15,
        averagePrice: 180000,
        tags: ['Investissement', 'Rendement élevé', 'Centre-ville', 'Transport']
      },
      {
        id: '3',
        title: 'Villas familiales à Riviera',
        description: 'Maisons spacieuses avec jardin, parfaites pour les familles',
        type: 'property',
        confidence: 85,
        reasoning: 'Correspond à votre préférence pour les espaces extérieurs',
        propertyCount: 8,
        averagePrice: 450000,
        tags: ['Familial', 'Jardin', '4+ chambres', 'Écoles nearby']
      },
      {
        id: '4',
        title: 'Studios meublés au Plateau',
        description: 'Solutions de logement clés en main pour jeunes professionnels',
        type: 'property',
        confidence: 79,
        reasoning: 'Optimal pour les déplacements professionnels et accès aux services',
        propertyCount: 32,
        averagePrice: 120000,
        tags: ['Meublé', 'Centre-ville', 'Métro', 'Services']
      },
      {
        id: '5',
        title: 'Nouveaux projets à Abata',
        description: 'Programmes immobiliers neufs avec garanties constructeur',
        type: 'deal',
        confidence: 75,
        reasoning: 'Opportunité d\'investissement dans une zone en développement',
        propertyCount: 12,
        averagePrice: 280000,
        tags: ['Neuf', 'Garantie', 'Émergent', 'Plus-value']
      }
    ];

    setRecommendations(mockRecommendations);
    setIsGenerating(false);
    setProgress(0);
  };

  // Load user profile (mock)
  useEffect(() => {
    if (user) {
      // In real app, this would fetch from your API
      setUserProfile({
        preferences: {
          propertyTypes: ['Appartement', 'Villa'],
          neighborhoods: ['Cocody', 'Marcory'],
          priceRange: { min: 150000, max: 500000 },
          bedrooms: 3,
          furnished: true
        },
        searchHistory: ['appartement cocody', 'villa avec piscine', 'bureau plateau'],
        viewedProperties: ['prop1', 'prop2', 'prop3'],
        favorites: ['prop1', 'prop4']
      });
    }
  }, [user]);

  // Auto-generate on mount
  useEffect(() => {
    generateRecommendations();
  }, []);

  const getIconForType = (type: AIRecommendation['type']) => {
    switch (type) {
      case 'neighborhood':
        return <Compass className="h-5 w-5" />;
      case 'deal':
        return <TrendingUp className="h-5 w-5" />;
      case 'property':
        return <Home className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: AIRecommendation['type']) => {
    switch (type) {
      case 'neighborhood':
        return 'text-blue-600 bg-blue-50';
      case 'deal':
        return 'text-green-600 bg-green-50';
      case 'property':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 80) return 'text-yellow-600';
    return 'text-orange-600';
  };

  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Recommandations IA
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isGenerating ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 animate-pulse" />
                Analyse en cours...
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.slice(0, 3).map((rec) => (
                <MotionDiv
                  key={rec.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: parseInt(rec.id) * 0.1 }}
                >
                  <Button
                    variant="ghost"
                    onClick={() => onRecommendationSelect(rec)}
                    className="w-full justify-start h-auto p-3"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={cn("p-2 rounded-lg", getTypeColor(rec.type))}>
                        {getIconForType(rec.type)}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm">{rec.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {rec.propertyCount} biens • Moyenne: {(rec.averagePrice! / 1000).toFixed(0)}k FCFA
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-xs font-medium", getConfidenceColor(rec.confidence))}>
                          {rec.confidence}%
                        </div>
                      </div>
                    </div>
                  </Button>
                </MotionDiv>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Header */}
      <MotionDiv
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-primary/10 rounded-full">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Assistant Immobilier IA
            </h2>
            <p className="text-muted-foreground">
              Des recommandations personnalisées basées sur vos préférences
            </p>
          </div>
        </div>

        {/* User Profile Summary */}
        {userProfile && (
          <Card className="max-w-2xl mx-auto bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Lightbulb className="h-4 w-4" />
                Basé sur votre profil et vos recherches
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Budget: {(userProfile.preferences.priceRange.max / 1000).toFixed(0)}k FCFA
                </Badge>
                <Badge variant="secondary">
                  {userProfile.preferences.bedrooms}+ chambres
                </Badge>
                <Badge variant="secondary">
                  {userProfile.preferences.propertyTypes.join(', ')}
                </Badge>
                <Badge variant="secondary">
                  {userProfile.preferences.neighborhoods.join(', ')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </MotionDiv>

      {/* Generating State */}
      {isGenerating && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6 text-center space-y-4">
            <div className="relative">
              <Brain className="h-12 w-12 mx-auto text-primary animate-pulse" />
              <Sparkles className="h-6 w-6 absolute -top-2 -right-2 text-yellow-500 animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Analyse intelligente en cours</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Notre IA analyse des milliers d'annonces pour trouver les meilleures opportunités
              </p>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{progress}% complété</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {!isGenerating && recommendations.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((rec, index) => (
            <MotionDiv
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-elevation-3 transition-all duration-300 cursor-pointer group"
                    onClick={() => onRecommendationSelect(rec)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={cn("p-2 rounded-lg", getTypeColor(rec.type))}>
                      {getIconForType(rec.type)}
                    </div>
                    <div className="text-right">
                      <div className={cn("text-sm font-bold", getConfidenceColor(rec.confidence))}>
                        {rec.confidence}%
                      </div>
                      <div className="text-xs text-muted-foreground">confiance</div>
                    </div>
                  </div>
                  <CardTitle className="text-lg leading-tight">{rec.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {rec.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      {rec.propertyCount && (
                        <span className="text-muted-foreground">
                          <strong>{rec.propertyCount}</strong> biens
                        </span>
                      )}
                      {rec.averagePrice && (
                        <span className="text-muted-foreground">
                          Moy: <strong>{(rec.averagePrice / 1000).toFixed(0)}k</strong> FCFA
                        </span>
                      )}
                    </div>
                    <Target className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {rec.tags.slice(0, 3).map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {rec.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{rec.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* AI Reasoning */}
                  {showReasoning && (
                    <div className="bg-muted/50 rounded-lg p-3 border-l-4 border-primary">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary">Analyse IA</span>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        "{rec.reasoning}"
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </MotionDiv>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={generateRecommendations}
          disabled={isGenerating}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          Régénérer les recommandations
        </Button>
        <Button
          onClick={() => navigate('/search')}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          Voir toutes les annonces
        </Button>
      </div>
    </div>
  );
};

export default AISearchEngine;