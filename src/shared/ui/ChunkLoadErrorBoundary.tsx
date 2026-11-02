import { Component, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChunkLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> | null {
    const isChunkError =
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk') ||
      error.message.includes('Unable to preload CSS');

    if (isChunkError) {
      return { hasError: true, error };
    }

    throw error;
  }

  override componentDidUpdate(_prevProps: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      setTimeout(() => {
        // Force hard reload avec cache-busting
        const baseUrl = window.location.href.split('?')[0];
        window.location.href = baseUrl + '?t=' + Date.now();
      }, 100);
    }
  }

  handleManualReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
          <p className="text-muted-foreground mb-4">Rechargement automatique...</p>
          <Button onClick={this.handleManualReload} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recharger manuellement
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkLoadErrorBoundary;
