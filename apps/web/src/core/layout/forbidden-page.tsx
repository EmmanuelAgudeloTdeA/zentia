import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonClasses, EmptyState, LockIcon } from '../../shared/ui';

export function ForbiddenPage() {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={<LockIcon size={40} />}
      title={t('forbidden.title')}
      description={t('forbidden.description')}
      action={
        <Link to="/" className={buttonClasses('primary')}>
          {t('notFound.goHome')}
        </Link>
      }
    />
  );
}
