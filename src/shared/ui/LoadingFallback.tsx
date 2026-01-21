interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingFallback({
  message = 'Chargement...',
  fullScreen = true,
}: LoadingFallbackProps) {
  const containerClass = fullScreen
    ? 'flex items-center justify-center min-h-screen bg-background'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClass}>
      <div className="text-center space-y-4">
        {/* Animated Logo/Spinner */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse"></div>
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
        </div>
        <p className="text-muted-foreground font-medium animate-pulse">{message}</p>
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-14 w-14 border-4',
  };

  return (
    <div className="flex items-center justify-center py-6">
      <div className="relative">
        <div className={`rounded-full border-muted animate-pulse ${sizeClasses[size]}`}></div>
        <div
          className={`absolute inset-0 rounded-full border-transparent border-t-primary animate-spin ${sizeClasses[size]}`}
        ></div>
      </div>
    </div>
  );
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-muted"></div>
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
        </div>
        {message && <p className="text-muted-foreground font-medium">{message}</p>}
      </div>
    </div>
  );
}
