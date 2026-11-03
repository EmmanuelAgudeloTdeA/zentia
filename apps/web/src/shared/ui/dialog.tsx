import { useEffect, useId, useRef, type ReactNode } from 'react';
import { CloseIcon } from './icons';

export type DialogSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'max-w-110',
  md: 'max-w-140',
  lg: 'max-w-180',
};

const FOCUSABLE =
  'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), a[href]';

interface DialogProps {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  onClose: () => void;
  closeLabel: string;
  /** Si es false, ni Esc ni el clic en el fondo cierran el diálogo. */
  dismissible?: boolean;
}

export function Dialog({
  title,
  description,
  children,
  footer,
  size = 'md',
  onClose,
  closeLabel,
  dismissible = true,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = () => [...(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const body = panel?.querySelector<HTMLElement>('[data-dialog-body]');
    (body?.querySelector<HTMLElement>(FOCUSABLE) ?? focusable()[0])?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onCloseRef.current();
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [dismissible]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-neutral-900/50"
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`relative z-[51] flex max-h-full w-full flex-col rounded-xl bg-neutral-0 shadow-lg ${SIZE_CLASSES[size]}`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-h2 text-neutral-900">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-2 text-body text-neutral-600">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-m-1 shrink-0 rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div data-dialog-body className="min-h-0 overflow-y-auto px-6 pt-4 pb-6">
          {children}
        </div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
