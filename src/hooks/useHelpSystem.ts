import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { HelpInteraction } from '@/types/supabase-extended';
import { logger } from '@/services/logger';

export interface HelpContent {
  id: string;
  title: string;
  description: string;
  category: string;
  videoUrl?: string;
  steps?: string[];
}

export const useHelpSystem = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const trackInteraction = useCallback(async (
    helpType: 'tooltip' | 'tour' | 'search' | 'help_center',
    contentId: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any).from('help_interactions').insert({
        user_id: user.id,
        help_type: helpType,
        content_id: contentId,
      });
    } catch (error) {
      logger.debug('Failed to track help interaction', { helpType, contentId });
    }
  }, []);

  const openHelp = useCallback(() => {
    setIsHelpOpen(true);
    trackInteraction('help_center', 'opened');
  }, [trackInteraction]);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  const searchHelp = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      trackInteraction('search', query);
    }
  }, [trackInteraction]);

  return {
    isHelpOpen,
    searchQuery,
    openHelp,
    closeHelp,
    searchHelp,
    trackInteraction,
  };
};
