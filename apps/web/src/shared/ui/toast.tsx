import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import { AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon, CloseIcon, InfoIcon } from './icons';

export type ToastTone = 'success' | 'danger' | 'warning' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  show: (tone: ToastTone, message: string) => void;
  dismiss: (id: number) => void;
}

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 5_000;
let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (tone, message) =>
    set((state) => ({
      toasts: [...state.toasts, { id: nextId++, tone, message }].slice(-MAX_TOASTS),
    })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show('success', message),
  error: (message: string) => useToastStore.getState().show('danger', message),
  info: (message: string) => useToastStore.getState().show('info', message),
};

const TONE_STYLES: Record<ToastTone, { bar: string; icon: ReactNode }> = {
  success: { bar: 'bg-success-border', icon: <CheckCircleIcon size={18} /> },
  danger: { bar: 'bg-danger-solid', icon: <AlertCircleIcon size={18} /> },
  warning: { bar: 'bg-warning-border', icon: <AlertTriangleIcon size={18} /> },
  info: { bar: 'bg-primary-400', icon: <InfoIcon size={18} /> },
};

function ToastView({ item, closeLabel }: { item: ToastItem; closeLabel: string }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const persistent = item.tone === 'danger';

  useEffect(() => {
    if (persistent) return;
    const timer = window.setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [dismiss, item.id, persistent]);

  const style = TONE_STYLES[item.tone];
  return (
    <div
      role={persistent ? 'alert' : 'status'}
      className="relative flex items-start gap-3 overflow-hidden rounded-lg bg-neutral-900 py-3 pr-3 pl-5 text-body text-white shadow-lg"
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
      <span className="mt-px shrink-0">{style.icon}</span>
      <p className="min-w-0 flex-1">{item.message}</p>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label={closeLabel}
        className="-m-1 shrink-0 rounded-sm p-1 text-white/70 hover:text-white"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}

export function Toaster({ closeLabel }: { closeLabel: string }) {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-60 flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96"
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastView item={item} closeLabel={closeLabel} />
        </div>
      ))}
    </div>
  );
}
