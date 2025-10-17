import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Shield,
  FileText,
  ExternalLink
} from 'lucide-react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDialog?: boolean;
  level?: 'error' | 'warning' | 'info';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * Composant ErrorBoundary robuste pour la plateforme Mon Toit
 * Capture les erreurs React, les rapporte à Sentry, et fournit une expérience utilisateur de qualité
 */
class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateErrorId()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('🚨 ErrorBoundary: Erreur capturée');
    console.error('Erreur:', error);
    console.error('Error Info:', errorInfo);
    console.groupEnd();

    // Mettre à jour le state avec les informations d'erreur
    this.setState({
      error,
      errorInfo,
      errorId: ErrorBoundary.generateErrorId()
    });

    // Reporter l'erreur à Sentry
    this.reportErrorToSentry(error, errorInfo);

    // Appeler le callback onError si fourni
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('Erreur dans le callback onError:', callbackError);
      }
    }

    // Logger l'erreur pour debugging
    this.logErrorForDebugging(error, errorInfo);
  }

  componentWillUnmount() {
    // Nettoyer les timeouts lors du démontage
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private reportErrorToSentry = (error: Error, errorInfo: ErrorInfo) => {
    try {
      Sentry.withScope((scope) => {
        scope.setTag('component', 'ErrorBoundary');
        scope.setTag('error_id', this.state.errorId || 'unknown');
        scope.setTag('retry_count', this.state.retryCount.toString());
        scope.setLevel(this.props.level || 'error');

        scope.setContext('errorInfo', {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        });

        // Ajouter des informations sur l'utilisateur si disponible
        if (window.__USER_CONTEXT__) {
          scope.setUser(window.__USER_CONTEXT__);
        }

        scope.setExtra('error_boundary_props', {
          hasFallback: !!this.props.fallback,
          showDialog: this.props.showDialog,
          level: this.props.level
        });

        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack
            }
          }
        });
      });
    } catch (sentryError) {
      console.error('Impossible de reporter l\'erreur à Sentry:', sentryError);
    }
  };

  private logErrorForDebugging = (error: Error, errorInfo: ErrorInfo) => {
    const logData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      retryCount: this.state.retryCount
    };

    try {
      // Stocker l'erreur dans localStorage pour debugging
      const existingErrors = JSON.parse(localStorage.getItem('debug_errors') || '[]');
      existingErrors.push(logData);

      // Garder seulement les 10 dernières erreurs
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem('debug_errors', JSON.stringify(recentErrors));
    } catch (storageError) {
      console.warn('Impossible de stocker l\'erreur dans localStorage:', storageError);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      console.warn('Nombre maximum de tentatives atteint');
      return;
    }

    console.log(`Tentative de retry ${this.state.retryCount + 1}/${this.maxRetries}`);

    // Ajouter un délai progressif entre les tentatives
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 5000);

    const timeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }, delay);

    this.retryTimeouts.push(timeout);
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private canRetry = (): boolean => {
    return this.state.retryCount < this.maxRetries;
  };

  private getErrorMessage = (): string => {
    const { error } = this.state;
    if (!error) return 'Une erreur inattendue est survenue';

    // Messages d'erreur conviviaux selon le type d'erreur
    if (error.name === 'ChunkLoadError') {
      return 'Impossible de charger les ressources nécessaires. Veuillez rafraîchir la page.';
    }

    if (error.message.includes('Network')) {
      return 'Problème de connexion détecté. Veuillez vérifier votre connexion internet.';
    }

    if (error.message.includes('Permission')) {
      return 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.';
    }

    return 'Une erreur technique est survenue. Nos équipes en ont été informées.';
  };

  render() {
    if (this.state.hasError) {
      // Si un fallback personnalisé est fourni, l'utiliser
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-lg border-destructive/50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">
                Oups ! Une erreur est survenue
              </CardTitle>
              <CardDescription className="text-lg">
                {this.getErrorMessage()}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* ID d'erreur pour référence */}
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertTitle>Code d'erreur</AlertTitle>
                <AlertDescription className="font-mono text-sm">
                  {this.state.errorId}
                </AlertDescription>
              </Alert>

              {/* Actions possibles */}
              <div className="space-y-3">
                {this.canRetry() && (
                  <Button
                    onClick={this.handleRetry}
                    className="w-full gap-2"
                    disabled={this.state.retryCount >= this.maxRetries}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer ({this.maxRetries - this.state.retryCount} tentatives restantes)
                  </Button>
                )}

                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Réinitialiser la page
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="ghost"
                  className="w-full gap-2"
                >
                  <Home className="w-4 h-4" />
                  Retour à l'accueil
                </Button>
              </div>

              {/* Informations de sécurité */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Sécurité</AlertTitle>
                <AlertDescription>
                  Cette erreur a été automatiquement signalée à notre équipe technique.
                  Vos données personnelles sont protégées.
                </AlertDescription>
              </Alert>

              {/* Informations de débogage (en développement) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="border rounded-lg p-3">
                  <summary className="cursor-pointer text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Informations techniques (débogage)
                  </summary>
                  <div className="space-y-2 text-xs font-mono">
                    <div>
                      <strong>Erreur:</strong> {this.state.error.message}
                    </div>
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap bg-muted p-2 rounded mt-1">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap bg-muted p-2 rounded mt-1">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                    <div>
                      <strong>Tentatives:</strong> {this.state.retryCount}/{this.maxRetries}
                    </div>
                  </div>
                </details>
              )}

              {/* Contact support */}
              <div className="text-center text-sm text-muted-foreground">
                <p>Si l'erreur persiste, contactez notre support technique:</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="secondary">
                    support@mon-toit.ci
                  </Badge>
                  <Badge variant="outline">
                    +225 27 22 00 00 00
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Hook pour accéder au contexte d'erreur global
export const useErrorContext = () => {
  const [errors, setErrors] = React.useState<any[]>([]);

  React.useEffect(() => {
    try {
      const storedErrors = JSON.parse(localStorage.getItem('debug_errors') || '[]');
      setErrors(storedErrors);
    } catch (error) {
      console.warn('Impossible de charger les erreurs:', error);
    }
  }, []);

  const clearErrors = () => {
    localStorage.removeItem('debug_errors');
    setErrors([]);
  };

  return { errors, clearErrors };
};

// Export du ErrorBoundary de Sentry pour compatibilité
export const SentryErrorBoundary = Sentry.withErrorBoundary(ErrorBoundary);