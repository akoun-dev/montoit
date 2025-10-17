import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { FormDraft } from '@/types/supabase-extended';
import { logger } from '@/services/logger';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  formType: string;
  initialData?: T;
  debounceMs?: number;
  enableLocalStorage?: boolean;
}

export const useAutoSave = <T extends Record<string, any>>({
  formType,
  initialData,
  debounceMs = 3000,
  enableLocalStorage = true,
}: UseAutoSaveOptions<T>) => {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const localStorageKey = `draft_${formType}`;

  // Check for existing drafts on mount
  useEffect(() => {
    checkForDrafts();
  }, [formType]);

  const checkForDrafts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check Supabase
      const { data } = await (supabase as any)
        .from('form_drafts')
        .select('*')
        .eq('user_id', user.id)
        .eq('form_type', formType)
        .maybeSingle();

      if (data) {
        setHasDraft(true);
        return;
      }

      // Check LocalStorage
      if (enableLocalStorage) {
        const localDraft = localStorage.getItem(localStorageKey);
        if (localDraft) {
          setHasDraft(true);
        }
      }
    } catch (error) {
      logger.debug('Failed to check for drafts', { storageKey: localStorageKey });
    }
  };

  const saveDraft = useCallback(async (formData: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus('pending');

    timeoutRef.current = setTimeout(async () => {
      setStatus('saving');

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Save to LocalStorage immediately (offline support)
        if (enableLocalStorage) {
          localStorage.setItem(localStorageKey, JSON.stringify({
            data: formData,
            timestamp: new Date().toISOString(),
          }));
        }

        // Save to Supabase if online
        if (user) {
          // First try to update existing draft
          const { data: existing } = await (supabase as any)
            .from('form_drafts')
            .select('id')
            .eq('user_id', user.id)
            .eq('form_type', formType)
            .maybeSingle();

          if (existing) {
            const { error } = await (supabase as any)
              .from('form_drafts')
              .update({ draft_data: formData })
              .eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await (supabase as any)
              .from('form_drafts')
              .insert({
                user_id: user.id,
                form_type: formType,
                draft_data: formData,
              });
            if (error) throw error;
          }
        }

        setStatus('saved');
        setLastSaved(new Date());
        setHasDraft(true);

      } catch (error) {
        logger.warn('Auto-save failed, data saved locally', { storageKey: localStorageKey });
        setStatus('error');
        toast({
          title: "Erreur de sauvegarde",
          description: "Les données sont sauvegardées localement",
          variant: "destructive",
        });
      }
    }, debounceMs);
  }, [formType, debounceMs, enableLocalStorage, toast]);

  const loadDraft = async (): Promise<T | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Try LocalStorage only
        if (enableLocalStorage) {
          const localDraft = localStorage.getItem(localStorageKey);
          if (localDraft) {
            const parsed = JSON.parse(localDraft);
            return parsed.data;
          }
        }
        return null;
      }

      // Try Supabase first
      const { data } = await (supabase as any)
        .from('form_drafts')
        .select('draft_data')
        .eq('user_id', user.id)
        .eq('form_type', formType)
        .maybeSingle();

      if (data) {
        return (data as any).draft_data as T;
      }

      // Fallback to LocalStorage
      if (enableLocalStorage) {
        const localDraft = localStorage.getItem(localStorageKey);
        if (localDraft) {
          const parsed = JSON.parse(localDraft);
          return parsed.data;
        }
      }

      return null;
    } catch (error) {
      logger.debug('Failed to load draft', { storageKey: localStorageKey });
      return null;
    }
  };

  const clearDraft = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Clear LocalStorage
      if (enableLocalStorage) {
        localStorage.removeItem(localStorageKey);
      }

      // Clear Supabase
      if (user) {
        await (supabase as any)
          .from('form_drafts')
          .delete()
          .eq('user_id', user.id)
          .eq('form_type', formType);
      }

      setHasDraft(false);
      setStatus('idle');
      setLastSaved(null);
    } catch (error) {
      logger.debug('Failed to clear draft', { storageKey: localStorageKey });
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    lastSaved,
    hasDraft,
    saveDraft,
    loadDraft,
    clearDraft,
  };
};
