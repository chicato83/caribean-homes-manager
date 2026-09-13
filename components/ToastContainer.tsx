import React from 'react';
import { useToast } from '../contexts/ToastContext';
import { CheckCircle, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  error: 'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  warning: 'border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  info: 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map(toast => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border-l-4 min-w-[300px] max-w-[400px] animate-slide-in ${colors[toast.type]}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
