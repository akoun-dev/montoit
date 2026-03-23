// Force complete rebuild - 2025-12-07T18:30:00Z
import { Suspense, useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { routes } from './routes';
import LoadingFallback from '@/shared/ui/LoadingFallback';
import { initOneciService } from '@/services/oneci';
import { apiKeysConfig } from '@/shared/config/api-keys.config';
import { AuthModalProvider } from '@/contexts/AuthModalContext';
import AuthModal from '@/features/auth/components/AuthModal';
import { useAuthModal } from '@/contexts/AuthModalContext';

const router = createBrowserRouter(routes);

function AppContent() {
  const { isOpen, closeAuthModal, message } = useAuthModal();

  return (
    <>
      <RouterProvider router={router} />
      <AuthModal isOpen={isOpen} onClose={closeAuthModal} message={message} />
    </>
  );
}

function App() {
  // Initialiser le service ONECI au démarrage de l'application
  useEffect(() => {
    const oneciConfig = apiKeysConfig.verification.oneci;
    if (oneciConfig.apiKey && oneciConfig.secretKey) {
      initOneciService({
        apiKey: oneciConfig.apiKey,
        secretKey: oneciConfig.secretKey,
        apiUrl: oneciConfig.apiBase,
      });
      console.log('[App] ONECI service initialized with client-side credentials');
    } else {
      console.info('[App] ONECI verification will use the Supabase edge function proxy');
    }
  }, []);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthModalProvider>
        <AppContent />
      </AuthModalProvider>
    </Suspense>
  );
}

export default App;
