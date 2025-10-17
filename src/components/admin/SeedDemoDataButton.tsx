import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Database, Loader2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { logger } from '@/services/logger';

type SeedStatus = 'idle' | 'seeding' | 'success' | 'error';

interface SeedResult {
  users: number;
  properties: number;
  applications: number;
  leases: number;
  favorites: number;
  messages: number;
  searches: number;
  reviews: number;
  overdueApplications: number;
}

interface SeedFunctionResponse {
  result?: Partial<SeedResult>;
  error?: string;
  requestId?: string;
}

const EMPTY_RESULT: SeedResult = {
  users: 0,
  properties: 0,
  applications: 0,
  leases: 0,
  favorites: 0,
  messages: 0,
  searches: 0,
  reviews: 0,
  overdueApplications: 0
};

export const SeedDemoDataButton = () => {
  const [status, setStatus] = useState<SeedStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<SeedResult>(EMPTY_RESULT);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const steps = useMemo(
    () => [
      { p: 10, label: 'Initialisation' },
      { p: 35, label: 'Préparation des utilisateurs' },
      { p: 60, label: 'Création propriétés & candidatures' },
      { p: 85, label: 'Baux, favoris, messages' },
      { p: 100, label: 'Nettoyage & vérification' }
    ],
    []
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const escalateProgress = useCallback(async () => {
    for (const s of steps) {
      await new Promise((r) => setTimeout(r, 250));
      if (!mountedRef.current) return;
      setProgress((prev) => (s.p > prev ? s.p : prev));
    }
  }, [steps]);

  const safeSet = useCallback(<T,>(setter: (v: T | ((prev: T) => T)) => void, next: T | ((prev: T) => T)) => {
    if (mountedRef.current) setter(next);
  }, []);

  const resetAll = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
    setProgress(0);
    setStats(EMPTY_RESULT);
    setError(null);
  }, []);

  const invokeSeed = useCallback(async (): Promise<SeedFunctionResponse> => {
    abortRef.current = new AbortController();

    const { data, error: functionError } = await supabase.functions.invoke<SeedFunctionResponse>(
      'seed-demo-data',
      {
        body: { idempotencyKey: crypto.randomUUID() },
        signal: abortRef.current.signal,
      }
    );

    if (functionError) {
      throw new Error(functionError.message || 'Échec de la fonction Edge');
    }

    return data ?? {};
  }, []);

  const handleSeedData = useCallback(async () => {
    setDialogOpen(false);
    safeSet(setError, null);
    safeSet(setStatus, 'seeding');
    safeSet(setProgress, 5);

    try {
      escalateProgress();

      const data = await invokeSeed();

      if (data.error) {
        throw new Error(data.error);
      }

      const merged: SeedResult = {
        ...EMPTY_RESULT,
        ...data.result,
      };

      startTransition(() => {
        safeSet(setStats, merged);
        safeSet(setProgress, 100);
        safeSet(setStatus, 'success');
      });

      toast.success('Données de démo créées avec succès !', {
        description: `${merged.users} utilisateurs, ${merged.properties} propriétés, ${merged.applications} candidatures, ${merged.leases} baux créés.`
      });
    } catch (err: unknown) {
      logger.error('Error seeding demo data', { error: err });
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Erreur lors de la création des données';

      safeSet(setStatus, 'error');
      safeSet(setError, message);
      safeSet(setProgress, 0);

      toast.error('Erreur lors de la création des données', {
        description: message
      });
    } finally {
      abortRef.current = null;
    }
  }, [escalateProgress, invokeSeed, safeSet]);

  const seeding = status === 'seeding';
  const success = status === 'success';
  const failed = status === 'error';

  const StatusIcon = () => {
    if (seeding) return <Loader2 className="h-5 w-5 animate-spin" aria-hidden />;
    if (success) return <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden />;
    if (failed) return <XCircle className="h-5 w-5 text-destructive" aria-hidden />;
    return <Database className="h-5 w-5" aria-hidden />;
  };

  const statusText =
    seeding ? 'Génération en cours…'
    : success ? 'Données créées avec succès !'
    : failed ? 'Erreur lors de la génération'
    : 'Prêt à générer les données';

  return (
    <Card aria-busy={seeding} aria-live="polite">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" aria-hidden />
          Générer des données de démonstration
        </CardTitle>
        <CardDescription>
          Crée un jeu de données complet pour tester la plateforme : utilisateurs, propriétés, candidatures, baux, etc.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full"
              disabled={seeding}
              onClick={() => setDialogOpen(true)}
            >
              {seeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours…
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Générer les données
                </>
              )}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Générer les données de démonstration ?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  Cette action va créer un ensemble complet de données de test incluant :
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>≈ 17 utilisateurs (propriétaires, agences, locataires, admins)</li>
                    <li>≈ 18 propriétés dans différents quartiers d'Abidjan</li>
                    <li>≈ 25 candidatures (dont 3 en retard)</li>
                    <li>≈ 4 baux (dont 2 certifiés ANSUT)</li>
                    <li>Favoris, messages et avis</li>
                  </ul>
                  <p className="mt-2 text-sm">
                    <strong>Note :</strong> L'opération peut prendre quelques instants.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={seeding}>Annuler</AlertDialogCancel>
              <AlertDialogAction disabled={seeding} onClick={handleSeedData}>
                Générer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {(status !== 'idle') && (
          <div className="space-y-2" role="status" aria-label={statusText}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon />
                <span className="text-sm font-medium">{statusText}</span>
              </div>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <strong>Erreur :</strong> {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-500/10 p-4 space-y-3">
            <h4 className="font-semibold text-green-700 dark:text-green-400">
              Données créées avec succès
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
              <div>• {stats.users} utilisateurs</div>
              <div>• {stats.properties} propriétés</div>
              <div>• {stats.applications} candidatures</div>
              <div>• {stats.leases} baux</div>
              <div>• {stats.favorites} favoris</div>
              <div>• {stats.messages} messages</div>
              <div>• {stats.searches} recherches</div>
              <div>• {stats.reviews} avis</div>
              {stats.overdueApplications > 0 && (
                <div>• {stats.overdueApplications} candidatures en retard traitées</div>
              )}
            </div>

            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={resetAll}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Réinitialiser l'état
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
