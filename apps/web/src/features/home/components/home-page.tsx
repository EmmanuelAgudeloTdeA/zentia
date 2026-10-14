import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <section className="space-y-2">
      <h1 className="text-3xl font-bold">{t('home.title', { appName: t('app.name') })}</h1>
      <p className="text-slate-600">{t('home.description')}</p>
    </section>
  );
}
