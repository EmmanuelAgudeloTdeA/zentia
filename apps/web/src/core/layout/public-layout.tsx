import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { LanguageSwitch } from '../i18n';
import { BrandLogo } from './brand-mark';

export function PublicLayout() {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-linear-120 from-primary-950 via-primary-800 to-primary-600 px-4 py-16">
      <div className="absolute top-4 right-4">
        <LanguageSwitch tone="dark" />
      </div>
      <main className="w-full max-w-100 rounded-xl border-t-4 border-primary-600 bg-neutral-0 px-6 py-8 shadow-lg sm:px-8">
        <div className="flex justify-center">
          <BrandLogo size="lg" />
          <span className="sr-only">{t('app.name')}</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
