import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export const PageHeaderSlotContext = createContext<HTMLElement | null>(null);

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  backTo?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, backTo, actions }: PageHeaderProps) {
  const { t } = useTranslation();
  const slot = useContext(PageHeaderSlotContext);
  if (!slot) return null;

  return createPortal(
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {backTo ? (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1 rounded-md text-body-sm font-medium text-white/80 hover:text-white"
          >
            <span aria-hidden="true">←</span>
            {t('common.back')}
          </Link>
        ) : null}
        <h1 className="text-h1 text-white">{title}</h1>
        {description ? <p className="mt-1 text-body text-white/80">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>,
    slot,
  );
}
