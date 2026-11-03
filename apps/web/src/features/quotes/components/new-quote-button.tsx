import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { useSessionStore } from '../../../core/auth';
import { PlusIcon } from '../../../shared/ui';
import { NEW_QUOTE_PATH } from './quote-paths';

/** Acceso directo del encabezado; se oculta con el cambio de contraseña obligatorio y en el propio editor. */
export function NewQuoteButton() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const user = useSessionStore((state) => state.user);
  if (!user || user.mustChangePassword || pathname === NEW_QUOTE_PATH) return null;
  return (
    <Link
      to={NEW_QUOTE_PATH}
      aria-label={t('quotes.new')}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-neutral-0 px-3 text-button text-primary-900 uppercase shadow-sm hover:bg-primary-50"
    >
      <PlusIcon size={16} />
      <span className="hidden sm:inline">{t('quotes.new')}</span>
    </Link>
  );
}
