import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { logger } from '@/services/logger';

export const ApplicationsOverviewCompact = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplicationStats = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('rental_applications')
          .select('status')
          .eq('applicant_id', user.id);

        if (error) throw error;

        const pending = data?.filter(a => a.status === 'pending').length || 0;
        const accepted = data?.filter(a => a.status === 'accepted' || a.status === 'approved').length || 0;
        const total = data?.length || 0;

        setStats({ pending, accepted, total });
      } catch (error) {
        logger.logError(error, { context: 'ApplicationsOverviewCompact', action: 'fetch' });
      } finally{
        setLoading(false);
      }
    };

    fetchApplicationStats();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Chargement...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Mes candidatures</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-4">
          <Link 
            to="/candidatures?status=pending"
            className="flex-1 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="flex-1">
                <div className="text-2xl font-bold">{stats.pending}</div>
                <div className="text-xs text-muted-foreground">En attente</div>
              </div>
            </div>
          </Link>

          <Link 
            to="/candidatures?status=accepted"
            className="flex-1 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <div className="text-2xl font-bold">{stats.accepted}</div>
                <div className="text-xs text-muted-foreground">Acceptées</div>
              </div>
            </div>
          </Link>

          <Link 
            to="/candidatures"
            className="flex-1 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};