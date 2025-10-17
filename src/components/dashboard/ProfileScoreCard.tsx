import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TenantScoreMeter } from './TenantScoreMeter';
import { supabase } from '@/lib/supabase';

export const ProfileScoreCard = () => {
  const { profile, user } = useAuth();
  const [tenantScore, setTenantScore] = useState(0);

  useEffect(() => {
    const fetchTenantScore = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_verifications')
        .select('tenant_score')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.tenant_score) {
        setTenantScore(data.tenant_score);
      }
    };

    fetchTenantScore();
  }, [user]);

  // Calculate profile completion
  const calculateCompletion = () => {
    if (!profile) return 0;
    
    const checks = [
      profile.full_name,
      profile.phone,
      profile.city,
      profile.bio,
      profile.avatar_url,
      profile.oneci_verified,
      profile.face_verified,
    ];
    
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  };

  const getVerificationStatus = () => {
    if (!profile) return { count: 0, total: 2 };
    
    const verifications = [
      profile.oneci_verified,
      profile.face_verified,
    ];
    
    return {
      count: verifications.filter(Boolean).length,
      total: verifications.length,
    };
  };

  const completionPercentage = calculateCompletion();
  const verificationStatus = getVerificationStatus();
  const isFullyVerified = verificationStatus.count === verificationStatus.total;

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Votre Profil
          </CardTitle>
          {isFullyVerified ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Vérifié
            </Badge>
          ) : (
            <Badge variant="outline" className="border-yellow-600 text-yellow-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              En cours
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tenant Score Meter */}
        {tenantScore > 0 && (
          <div className="flex justify-center">
            <TenantScoreMeter score={tenantScore} />
          </div>
        )}

        {/* Profile Completion */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Profil complété</span>
            <span className="font-semibold">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Verification Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Vérifications</span>
            <span className="font-semibold">
              {verificationStatus.count}/{verificationStatus.total}
            </span>
          </div>
          <div className="flex gap-2">
            <div className={`flex-1 h-2 rounded-full ${profile?.oneci_verified ? 'bg-green-600' : 'bg-muted'}`} />
            <div className={`flex-1 h-2 rounded-full ${profile?.face_verified ? 'bg-green-600' : 'bg-muted'}`} />
          </div>
          <div className="flex gap-1 text-xs text-muted-foreground">
            <span>ONECI</span>
            <span>•</span>
            <span>Face ID</span>
          </div>
        </div>

        {/* Score Explanation */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Comment améliorer votre score :</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              {!profile?.oneci_verified && <li>Vérifiez votre identité ONECI (+40 points)</li>}
              {!profile?.face_verified && <li>Effectuez la vérification faciale (+30 points)</li>}
              {!profile?.phone && <li>Ajoutez votre numéro de téléphone (+5 points)</li>}
              {!profile?.bio && <li>Complétez votre biographie (+10 points)</li>}
            </ul>
          </AlertDescription>
        </Alert>

        {/* Action Button */}
        {!isFullyVerified && (
          <Button asChild variant="outline" className="w-full">
            <Link to="/verification">
              Compléter ma vérification
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
