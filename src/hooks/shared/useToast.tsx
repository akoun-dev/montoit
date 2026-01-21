import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastAction {
  label: string;
  onClick: () => void;
}

let toastCount = 0;
const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

function notify(listenerSet: Set<(toasts: Toast[]) => void>, toastList: Toast[]) {
  listenerSet.forEach((listener) => listener([...toastList]));
}

export function toast(
  message: string,
  options?: { type?: ToastType; description?: string; duration?: number; action?: ToastAction }
) {
  const id = `toast-${++toastCount}`;
  const newToast: Toast = {
    id,
    type: options?.type || 'info',
    message,
    description: options?.description,
    duration: options?.duration || 5000,
  };

  toasts.push(newToast);
  notify(listeners, toasts);

  if (newToast.duration) {
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify(listeners, toasts);
    }, newToast.duration);
  }

  return id;
}

toast.success = (message: string, options?: { description?: string; duration?: number }) => {
  return toast(message, { ...options, type: 'success' });
};

toast.error = (message: string, options?: { description?: string; duration?: number }) => {
  return toast(message, { ...options, type: 'error' });
};

toast.info = (message: string, options?: { description?: string; duration?: number }) => {
  return toast(message, { ...options, type: 'info' });
};

toast.warning = (message: string, options?: { description?: string; duration?: number }) => {
  return toast(message, { ...options, type: 'warning' });
};

toast.dismiss = (id: string) => {
  toasts = toasts.filter((t) => t.id !== id);
  notify(listeners, toasts);
};

export function useToast() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    toasts: currentToasts,
    toast,
    dismiss: toast.dismiss,
  };
}

export function ToastContainer() {
  const { toasts: currentToasts, dismiss } = useToast();

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <XCircle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };

  if (currentToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {currentToasts.map((t) => (
        <div
          key={t.id}
          className={`${bgColors[t.type]} border-2 rounded-xl p-4 shadow-lg animate-slide-up flex items-start gap-3 min-w-[320px]`}
        >
          <div className="flex-shrink-0">{icons[t.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{t.message}</p>
            {t.description && <p className="text-sm text-gray-600 mt-1">{t.description}</p>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
