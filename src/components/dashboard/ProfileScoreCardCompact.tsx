import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { TenantScoreMeter } from './TenantScoreMeter';
import { supabase } from '@/lib/supabase';

export const ProfileScoreCardCompact = () => {
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

  const verificationCount = [
    profile?.oneci_verified,
    profile?.face_verified,
  ].filter(Boolean).length;
  
  const isFullyVerified = verificationCount === 2;

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 h-[180px]">
      <CardContent className="p-3 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Votre Profil</span>
          </div>
          {isFullyVerified ? (
            <Badge variant="default" className="bg-green-600 text-xs px-1.5 py-0">
              <CheckCircle2 className="h-3 w-3" />
            </Badge>
          ) : (
            <Badge variant="outline" className="border-yellow-600 text-yellow-600 text-xs px-1.5 py-0">
              <AlertCircle className="h-3 w-3" />
            </Badge>
          )}
        </div>

        {tenantScore > 0 && (
          <div className="flex-1 flex items-center justify-center my-1">
            <div className="scale-75">
              <TenantScoreMeter score={tenantScore} />
            </div>
          </div>
        )}

        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Vérifications</span>
            <span className="font-semibold">{verificationCount}/2</span>
          </div>
          <div className="flex gap-1">
            <div className={`flex-1 h-1.5 rounded-full ${profile?.oneci_verified ? 'bg-green-600' : 'bg-muted'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${profile?.face_verified ? 'bg-green-600' : 'bg-muted'}`} />
          </div>
        </div>

        {!isFullyVerified && (
          <Button asChild variant="outline" size="sm" className="w-full mt-2 h-7 text-xs">
            <Link to="/verification">
              Compléter
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};