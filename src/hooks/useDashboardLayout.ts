import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserPreferences } from '@/types/supabase-extended';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';

export type WidgetType = 
  | 'profile_score'
  | 'applications_overview'
  | 'property_stats'
  | 'urgent_actions'
  | 'quick_actions'
  | 'activity_timeline'
  | 'market_insights'
  | 'revenue_forecast';

export interface DashboardLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_LAYOUTS: { [key: string]: DashboardLayout[] } = {
  locataire: [
    { i: 'profile_score', x: 0, y: 0, w: 4, h: 2 },
    { i: 'applications_overview', x: 4, y: 0, w: 8, h: 2 },
    { i: 'urgent_actions', x: 0, y: 2, w: 6, h: 2 },
    { i: 'quick_actions', x: 6, y: 2, w: 6, h: 2 },
    { i: 'activity_timeline', x: 0, y: 4, w: 12, h: 3 },
  ],
  proprietaire: [
    { i: 'property_stats', x: 0, y: 0, w: 6, h: 2 },
    { i: 'applications_overview', x: 6, y: 0, w: 6, h: 2 },
    { i: 'urgent_actions', x: 0, y: 2, w: 6, h: 2 },
    { i: 'revenue_forecast', x: 6, y: 2, w: 6, h: 2 },
    { i: 'quick_actions', x: 0, y: 4, w: 12, h: 2 },
    { i: 'market_insights', x: 0, y: 6, w: 12, h: 3 },
  ],
};

const DEFAULT_ENABLED_WIDGETS: { [key: string]: WidgetType[] } = {
  locataire: ['profile_score', 'applications_overview', 'urgent_actions', 'quick_actions', 'activity_timeline'],
  proprietaire: ['property_stats', 'applications_overview', 'urgent_actions', 'revenue_forecast', 'quick_actions', 'market_insights'],
};

export const useDashboardLayout = (userType: string) => {
  const [layouts, setLayouts] = useState<DashboardLayout[]>(DEFAULT_LAYOUTS[userType] || []);
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetType[]>(DEFAULT_ENABLED_WIDGETS[userType] || []);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, [userType]);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('user_preferences')
        .select('dashboard_layout, enabled_widgets')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const prefs = data as unknown as UserPreferences;
        if (prefs.dashboard_layout && Object.keys(prefs.dashboard_layout).length > 0) {
          setLayouts(prefs.dashboard_layout as DashboardLayout[]);
        }
        if (prefs.enabled_widgets && Array.isArray(prefs.enabled_widgets)) {
          setEnabledWidgets(prefs.enabled_widgets as WidgetType[]);
        }
      }
    } catch (error) {
      logger.error('Failed to load dashboard preferences');
    } finally {
      setLoading(false);
    }
  };

  const saveLayout = async (newLayouts: DashboardLayout[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setLayouts(newLayouts);

      const { error } = await (supabase as any)
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          dashboard_layout: newLayouts,
          enabled_widgets: enabledWidgets,
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to save dashboard layout');
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la disposition",
        variant: "destructive",
      });
    }
  };

  const toggleWidget = async (widget: WidgetType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newEnabledWidgets = enabledWidgets.includes(widget)
        ? enabledWidgets.filter(w => w !== widget)
        : [...enabledWidgets, widget];

      setEnabledWidgets(newEnabledWidgets);

      const { error } = await (supabase as any)
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          dashboard_layout: layouts,
          enabled_widgets: newEnabledWidgets,
        });

      if (error) throw error;

      toast({
        title: "Widget " + (enabledWidgets.includes(widget) ? "désactivé" : "activé"),
        description: "Votre dashboard a été mis à jour",
      });
    } catch (error) {
      logger.error('Failed to toggle widget', { widget });
      toast({
        title: "Erreur",
        description: "Impossible de modifier le widget",
        variant: "destructive",
      });
    }
  };

  const resetLayout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const defaultLayout = DEFAULT_LAYOUTS[userType] || [];
      const defaultWidgets = DEFAULT_ENABLED_WIDGETS[userType] || [];

      setLayouts(defaultLayout);
      setEnabledWidgets(defaultWidgets);

      const { error } = await (supabase as any)
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          dashboard_layout: defaultLayout,
          enabled_widgets: defaultWidgets,
        });

      if (error) throw error;

      toast({
        title: "Dashboard réinitialisé",
        description: "La disposition par défaut a été restaurée",
      });
    } catch (error) {
      logger.error('Failed to reset dashboard layout');
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser le dashboard",
        variant: "destructive",
      });
    }
  };

  return {
    layouts,
    enabledWidgets,
    loading,
    saveLayout,
    toggleWidget,
    resetLayout,
  };
};
