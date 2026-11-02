import React from 'react';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AuthErrorBoundary extends React.Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    // Check if error is related to authentication/JWT
    const isAuthError =
      error.message.includes('JWT') ||
      error.message.includes('Invalid token') ||
      error.message.includes('Expected 3 parts in JWT') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('401') ||
      error.message.includes('SESSION_EXPIRED');

    if (isAuthError) {
      return { hasError: true, error };
    }

    // For non-auth errors, let them bubble up
    return { hasError: false, error: null };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AuthErrorBoundary caught an error:', error, errorInfo);

    // Clean up potentially corrupted auth data
    if (this.state.hasError) {
      try {
        const keysToRemove = [
          'supabase.auth.token',
          'supabase.auth.refreshToken',
          'supabase.auth.expiresAt',
        ];
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch (cleanupError) {
        console.warn('Could not clean auth tokens:', cleanupError);
      }
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} reset={this.reset} />;
      }

      return <AuthErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

interface AuthErrorFallbackProps {
  error: Error;
  reset: () => void;
}

function AuthErrorFallback({ error }: AuthErrorFallbackProps) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleSignIn = () => {
    // Clear any remaining auth data and redirect to sign in
    try {
      const keysToRemove = [
        'supabase.auth.token',
        'supabase.auth.refreshToken',
        'supabase.auth.expiresAt',
      ];
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (cleanupError) {
      console.warn('Could not clean auth tokens:', cleanupError);
    }

    // Redirect to sign in page or reload
    window.location.href = '/auth/signin';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">Session expirée</h2>

        <p className="text-gray-600 mb-6 text-center">
          Votre session a expiré ou est invalide. Veuillez vous reconnecter pour continuer.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Se reconnecter
          </button>

          <button
            onClick={handleReload}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser la page
          </button>
        </div>

        {process.env['NODE_ENV'] === 'development' && (
          <details className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <summary className="cursor-pointer font-medium text-gray-700">
              Détails de l'erreur (développement)
            </summary>
            <pre className="mt-2 text-xs text-gray-600 overflow-auto">{error.message}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default AuthErrorBoundary;
