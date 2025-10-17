import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from "@sentry/react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { logger } from '@/services/logger';
import { ERROR_MESSAGES } from '@/constants';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
    
    // Send to Sentry with React context
    if (import.meta.env.PROD) {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Une erreur s'est produite
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {ERROR_MESSAGES.SERVER_ERROR}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Une erreur inattendue s'est produite. Vous pouvez essayer de recharger la page ou retourner à l'accueil.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="mb-4">
                  <summary className="text-xs cursor-pointer mb-2 text-muted-foreground">
                    Détails techniques (développement)
                  </summary>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => window.location.reload()}
                  variant="default"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recharger la page
                </Button>
                <Button 
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Retour à l'accueil
                </Button>
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
