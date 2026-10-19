import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonClasses, CompassIcon, EmptyState } from '../../shared/ui';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={<CompassIcon size={40} />}
      title={t('notFound.title')}
      description={t('notFound.description')}
      action={
        <Link to="/" className={buttonClasses('primary')}>
          {t('notFound.goHome')}
        </Link>
      }
    />
  );
}
