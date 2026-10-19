import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../core/layout';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <PageHeader
      title={t('home.title', { appName: t('app.name') })}
      description={t('home.description')}
    />
  );
}
