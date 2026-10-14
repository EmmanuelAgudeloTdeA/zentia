import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';
import { LanguageSwitcher } from '../i18n';

export function AppLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Link to="/" className="text-lg font-semibold">
          {t('app.name')}
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
