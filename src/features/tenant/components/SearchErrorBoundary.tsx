import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, Home, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class SearchErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SearchErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    window.location.href = '/recherche';
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">Une erreur est survenue</h1>

              <p className="text-lg text-gray-600 mb-8">
                La page de recherche a rencontré un problème technique. Nos équipes ont été
                notifiées et travaillent sur une solution.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-left">
                  <h3 className="font-semibold text-red-900 mb-2">
                    Détails de l'erreur (dev only)
                  </h3>
                  <pre className="text-xs text-red-800 overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
                >
                  <RefreshCcw className="h-5 w-5" />
                  Réessayer
                </button>

                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <Home className="h-5 w-5" />
                  Retour à l'accueil
                </a>
              </div>

              <p className="mt-8 text-sm text-gray-500">
                Si le problème persiste, veuillez{' '}
                <a href="/contact" className="text-orange-600 hover:text-orange-700 font-medium">
                  contacter le support
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SearchErrorBoundary;
