import { useEffect } from 'react';
import type { Toast } from './types';
import { clsx } from './utils';

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export default function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={clsx(
        'flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ring-inset animate-[slideInRight_0.3s_ease-out]',
        toast.variant === 'success'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-rose-50 text-rose-700 ring-rose-200'
      )}
    >
      <span
        className={clsx(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
          toast.variant === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
        )}
      >
        {toast.variant === 'success' ? '✓' : '✕'}
      </span>
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity text-current">✕</button>
    </div>
  );
}
