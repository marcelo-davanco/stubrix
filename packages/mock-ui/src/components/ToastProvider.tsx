import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastMessage = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
};

type ToastContextData = {
  toast: (message: Omit<ToastMessage, 'id'>) => void;
};

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export function useToast() {
  return useContext(ToastContext);
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: ToastMessage;
  onClose: () => void;
}) {
  const styles = {
    success: {
      icon: <CheckCircle2 size={18} className="text-green-400" />,
      border: 'border-green-500/25',
      accent: 'bg-green-500/8',
    },
    error: {
      icon: <AlertCircle size={18} className="text-red-400" />,
      border: 'border-red-500/25',
      accent: 'bg-red-500/8',
    },
    info: {
      icon: <Info size={18} className="text-blue-400" />,
      border: 'border-blue-500/25',
      accent: 'bg-blue-500/8',
    },
    warning: {
      icon: <AlertCircle size={18} className="text-yellow-400" />,
      border: 'border-yellow-500/25',
      accent: 'bg-yellow-500/8',
    },
  }[toast.type];

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex w-80 items-start gap-3 rounded-xl border p-4 shadow-xl ${styles.accent} ${styles.border} bg-[#1a1a2e]`}
    >
      <div className="mt-0.5 shrink-0">{styles.icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 rounded-md p-1 text-text-secondary/50 transition-colors hover:bg-white/10 hover:text-text-primary"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, description }: Omit<ToastMessage, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
