import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { CloseIcon } from '../../shared/ui';
import { LanguageSwitch } from '../i18n';
import type { NavItem } from '../navigation';

interface NavDrawerProps {
  id: string;
  items: readonly NavItem[];
  onClose: () => void;
}

export function NavDrawer({ id, items, onClose }: NavDrawerProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-neutral-900/50" aria-hidden="true" onClick={onClose} />
      <aside
        id={id}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('layout.nav.label')}
        className="absolute inset-y-0 left-0 flex w-72 max-w-full flex-col bg-neutral-0 shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <span className="text-h3 text-neutral-900">{t('app.name')}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('layout.nav.close')}
            className="inline-flex size-10 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100"
          >
            <CloseIcon />
          </button>
        </div>
        <nav aria-label={t('layout.nav.label')} className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2.5 text-body font-medium ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-neutral-200 p-4">
          <LanguageSwitch tone="light" />
        </div>
      </aside>
    </div>
  );
}
