import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const borderClass =
            toast.type === 'success'
              ? 'border-l-4 border-l-[#16A34A]'
              : toast.type === 'error'
                ? 'border-l-4 border-l-[#DC2626]'
                : 'border-l-4 border-l-[#2563EB]';
          const Icon =
            toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info;
          const iconColor =
            toast.type === 'success'
              ? 'text-[#16A34A]'
              : toast.type === 'error'
                ? 'text-[#DC2626]'
                : 'text-[#2563EB]';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto bg-white shadow-lg rounded-lg border border-slate-200 p-3.5 flex items-start gap-3 ${borderClass}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#172B4D]">{toast.title}</p>
                {toast.message && <p className="text-xs text-[#64748B] mt-0.5">{toast.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

