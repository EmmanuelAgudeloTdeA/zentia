import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('notFound.title')}</h1>
      <Link to="/" className="text-blue-700 underline">
        {t('notFound.goHome')}
      </Link>
    </section>
  );
}
