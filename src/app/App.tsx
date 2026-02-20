// Force complete rebuild - 2025-12-07T18:30:00Z
import { Suspense, useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { routes } from './routes';
import LoadingFallback from '@/shared/ui/LoadingFallback';
import { initOneciService } from '@/services/oneci';
import { apiKeysConfig } from '@/shared/config/api-keys.config';

const router = createBrowserRouter(routes);

function App() {
  // Initialiser le service ONECI au démarrage de l'application
  useEffect(() => {
    const oneciConfig = apiKeysConfig.verification.oneci;
    if (oneciConfig.isConfigured) {
      initOneciService({
        apiKey: oneciConfig.apiKey,
        secretKey: oneciConfig.secretKey,
        apiUrl: oneciConfig.apiBase,
      });
      console.log('[App] ONECI service initialized');
    } else {
      console.warn('[App] ONECI service not configured');
    }
  }, []);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

export default App;
