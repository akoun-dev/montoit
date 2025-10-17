import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, Heart, FileText, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/services/logger';

interface Activity {
  id: string;
  type: 'view' | 'favorite' | 'application' | 'search';
  title: string;
  description: string;
  timestamp: string;
  icon: any;
  color: string;
}

interface ActivityTimelineProps {
  className?: string;
}

export const ActivityTimeline = ({ className }: ActivityTimelineProps) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) return;

      try {
        // Fetch recent applications
        const { data: applications } = await supabase
          .from('rental_applications')
          .select('id, created_at, property_id, properties(title)')
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        // Fetch recent favorites
        const { data: favorites } = await supabase
          .from('user_favorites')
          .select('id, created_at, property_id, properties(title)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        // Fetch recent searches
        const { data: searches } = await supabase
          .from('search_history')
          .select('id, created_at, search_filters')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        const combinedActivities: Activity[] = [];

        // Add applications
        applications?.forEach(app => {
          combinedActivities.push({
            id: app.id,
            type: 'application',
            title: 'Nouvelle candidature',
            description: `Candidature envoyée pour ${(app as any).properties?.title || 'un bien'}`,
            timestamp: app.created_at,
            icon: FileText,
            color: 'text-warning',
          });
        });

        // Add favorites
        favorites?.forEach(fav => {
          combinedActivities.push({
            id: fav.id,
            type: 'favorite',
            title: 'Favori ajouté',
            description: `${(fav as any).properties?.title || 'Un bien'} ajouté aux favoris`,
            timestamp: fav.created_at,
            icon: Heart,
            color: 'text-pink-600',
          });
        });

        // Add searches
        searches?.forEach(search => {
          const filters = search.search_filters as any;
          combinedActivities.push({
            id: search.id,
            type: 'search',
            title: 'Recherche effectuée',
            description: filters?.city ? `Recherche à ${filters.city}` : 'Nouvelle recherche',
            timestamp: search.created_at,
            icon: Search,
            color: 'text-blue-600',
          });
        });

        // Sort by timestamp
        combinedActivities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(combinedActivities.slice(0, 5));
      } catch (error) {
        logger.logError(error, { context: 'ActivityTimeline', action: 'fetch' });
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [user]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Il y a quelques minutes';
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInHours < 48) return 'Hier';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune activité récente
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activité récente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className="flex gap-3 pb-4 border-b last:border-b-0 last:pb-0"
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center ${activity.color}`}>
                <activity.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {formatTimestamp(activity.timestamp)}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
