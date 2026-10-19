import { useTranslation } from 'react-i18next';
import { errorKey } from '../../core/errors';
import { Alert } from './alert';
import { Button } from './button';

interface ErrorMessageProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  const { t } = useTranslation();

  return (
    <Alert
      tone="danger"
      action={
        onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        ) : undefined
      }
    >
      {t(errorKey(error))}
    </Alert>
  );
}
