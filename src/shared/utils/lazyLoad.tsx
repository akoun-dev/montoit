import { lazy, Suspense, ComponentType } from 'react';
import LoadingFallback from '@/shared/ui/GlobalLoadingSkeleton';

/**
 * Lazy loading with retry for chunk loading errors
 * Retries the import on failure to handle network issues
 */

export const lazyWithRetry = (
  componentImport: () => Promise<{ default: ComponentType<any> }>,
  retries = 3,
  delay = 1000
) => {
  return lazy(async () => {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔄 Lazy load attempt ${i + 1}/${retries}`);
        const module = await componentImport();
        console.log('✅ Lazy load successful');
        return module;
      } catch (error) {
        console.error(`❌ Lazy load attempt ${i + 1} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        if (i < retries - 1) {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - throw error instead of hard refresh
    console.error('❌ All lazy load retries failed:', lastError);
    throw lastError || new Error('Failed to load component after multiple retries');
  });
};

/**
 * HOC to wrap lazy components with Suspense
 * Provides consistent loading state across all lazy-loaded pages
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Loadable = <P extends Record<string, any>>(Component: ComponentType<P>) => {
  const LoadableComponent = (props: P) => (
    <Suspense fallback={<LoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );

  LoadableComponent.displayName = `Loadable(${Component.displayName || Component.name || 'Component'})`;

  return LoadableComponent;
};
